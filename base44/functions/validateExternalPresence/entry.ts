import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * External Validation Layer for the Proof of Capacity Engine
 * 
 * Validates:
 *   1. Website presence & quality (via fetch)
 *   2. Address plausibility (via OpenStreetMap Nominatim — free, no key)
 *   3. Derives a presence_score (0-100) and plain-language explanation
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { organizationName, address, city, province, website } = await req.json();

    // ─── FEATURE 1: WEBSITE VALIDATION ───────────────────────────────────────
    let websiteStatus = 'No website';
    let websiteDetail = 'No website URL provided for this organization.';
    let websiteScore = 0;

    if (website) {
      try {
        const url = website.startsWith('http') ? website : `https://${website}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CapacityEngine/1.0)' },
        });
        clearTimeout(timeout);

        // 403 often means the site IS live but blocks bots — treat as "active, unverifiable content"
        if (res.status === 403 || res.status === 401) {
          websiteStatus = 'Active — bot-protected';
          websiteScore = 65;
          websiteDetail = 'Website is reachable but blocks automated content reading (common for legitimate organizations). Site is confirmed live.';
        } else if (res.ok) {
          const html = await res.text();
          const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const hasContactPage = /contact|contact us|reach us|get in touch/i.test(html);
          const hasAboutPage = /about|about us|who we are|our mission/i.test(html);
          const hasMeaningfulContent = textContent.length > 500;
          const hasPrograms = /program|service|initiative|project|mission/i.test(html);

          if (hasMeaningfulContent && (hasContactPage || hasAboutPage) && hasPrograms) {
            websiteStatus = 'Active and credible';
            websiteScore = 90;
            websiteDetail = `Website is live and contains meaningful content including program/service descriptions${hasContactPage ? ' and a contact page' : ''}.`;
          } else if (hasMeaningfulContent) {
            websiteStatus = 'Active — limited content';
            websiteScore = 55;
            websiteDetail = 'Website is reachable but content is limited. No clear program or contact information found.';
          } else {
            websiteStatus = 'Minimal / placeholder';
            websiteScore = 20;
            websiteDetail = 'Website exists but appears to be a placeholder or contains very little content.';
          }
        } else if (res.status >= 500) {
          websiteStatus = 'Inactive / unreachable';
          websiteScore = 5;
          websiteDetail = `Website returned HTTP ${res.status}. The server appears to be down or misconfigured.`;
        } else {
          websiteStatus = 'Inactive / unreachable';
          websiteScore = 5;
          websiteDetail = `Website returned HTTP ${res.status}. The URL may be broken or the site is no longer active.`;
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          websiteStatus = 'Inactive / unreachable';
          websiteScore = 5;
          websiteDetail = 'Website request timed out. The site may be down or inaccessible.';
        } else {
          websiteStatus = 'Inactive / unreachable';
          websiteScore = 5;
          websiteDetail = 'Website could not be reached. The URL may be invalid or the site is offline.';
        }
      }
    }

    // ─── FEATURE 2: ADDRESS VALIDATION (OpenStreetMap Nominatim) ─────────────
    let isValidAddress = false;
    let locationType = 'Unknown';
    let addressConfidence = 0;
    let addressDetail = 'No address information provided.';
    let addressScore = 30; // neutral default

    const addressQuery = [address, city, province].filter(Boolean).join(', ');

    if (addressQuery.trim()) {
      try {
        const encodedQuery = encodeURIComponent(addressQuery);
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`;
        
        const geoRes = await fetch(nominatimUrl, {
          headers: { 'User-Agent': 'CapacityEngine/1.0 (capacity-assessment-tool)' },
        });

        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            const result = geoData[0];
            isValidAddress = true;
            const confidence = parseFloat(result.importance || 0) * 100;
            addressConfidence = Math.min(100, Math.round(confidence));

            // Classify location type from OSM category/type
            const osmType = result.type || '';
            const osmClass = result.class || '';
            const addressDetails = result.address || {};

            if (['commercial', 'office', 'retail', 'industrial'].includes(osmClass) ||
                ['office', 'commercial', 'building', 'yes'].includes(osmType) ||
                addressDetails.office || addressDetails.commercial) {
              locationType = 'Commercial';
              addressScore = 80;
              addressDetail = `Address resolves to a commercial/office location in ${city || addressDetails.city || 'the specified city'}.`;
            } else if (['residential', 'house', 'apartments', 'detached'].includes(osmType) ||
                       osmClass === 'place' || addressDetails.house_number) {
              locationType = 'Residential';
              addressScore = 35;
              addressDetail = `Address resolves to what appears to be a residential location in ${city || addressDetails.city || 'the specified area'}.`;
            } else {
              locationType = 'Unknown / Mixed Use';
              addressScore = 50;
              addressDetail = `Address is valid and geocoded in ${city || addressDetails.city || 'the specified area'}, but location type could not be classified (${osmClass || 'unclassified'}).`;
            }
          } else {
            isValidAddress = false;
            addressScore = 10;
            addressDetail = 'Address could not be geocoded. The address may be incomplete, incorrect, or not publicly registered.';
          }
        } else {
          addressScore = 30;
          addressDetail = 'Address geocoding service unavailable. Could not validate address externally.';
        }
      } catch (e) {
        addressScore = 30;
        addressDetail = 'Address validation could not be completed due to a network error.';
      }
    }

    // ─── FEATURE 3: PRESENCE SCORE (0-100) ───────────────────────────────────
    // Weighted combination: website 55%, address 45%
    const presenceScore = Math.round((websiteScore * 0.55) + (addressScore * 0.45));

    // ─── FEATURE 4: EXPLANATION LAYER ────────────────────────────────────────
    let presenceLabel;
    let explanationText;

    if (presenceScore >= 70) {
      presenceLabel = 'Strong External Presence';
      explanationText = `${organizationName || 'This organization'} shows strong external presence. ${websiteDetail} ${addressDetail}`;
    } else if (presenceScore >= 45) {
      presenceLabel = 'Moderate External Presence';
      explanationText = `${organizationName || 'This organization'} shows moderate external presence with some verifiable signals. ${websiteDetail} ${addressDetail} These signals are supporting indicators only.`;
    } else if (presenceScore >= 20) {
      presenceLabel = 'Low External Presence';
      explanationText = `${organizationName || 'This organization'} shows limited external presence. ${websiteDetail} ${addressDetail} Low external presence may indicate an early-stage or community-based organization, and should be weighed alongside other evidence.`;
    } else {
      presenceLabel = 'Minimal External Presence';
      explanationText = `${organizationName || 'This organization'} has minimal externally verifiable presence. ${websiteDetail} ${addressDetail} This does not indicate misconduct, but reviewers should seek additional evidence before funding decisions are finalized.`;
    }

    return Response.json({
      websiteStatus,
      websiteDetail,
      websiteScore,
      isValidAddress,
      locationType,
      addressConfidence,
      addressDetail,
      addressScore,
      presenceScore,
      presenceLabel,
      explanationText,
      // For integration with scoring engine — these are the signals to feed in
      signals: {
        infrastructureCapacitySignal: presenceScore,   // feeds into Capacity Readiness
        verifiabilityGapSignal: 100 - presenceScore,   // feeds into Integrity Concern (inverted)
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});