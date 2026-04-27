import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
//
// Dev-server port + host are read from env so devs can run multiple frontends
// side-by-side without editing this file. We use loadEnv with an empty prefix
// so non-VITE_ vars (FRONTEND_PORT, FRONTEND_HOST, FRONTEND_STRICT_PORT) come
// through alongside the VITE_* ones, and we fall back to process.env for
// shell-exported overrides. Server-only vars are intentionally NOT prefixed
// with VITE_ so they don't leak into the client bundle.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(process.env.FRONTEND_PORT ?? env.FRONTEND_PORT ?? 5174);
  const host = process.env.FRONTEND_HOST ?? env.FRONTEND_HOST ?? 'localhost';
  const strictPort =
    (process.env.FRONTEND_STRICT_PORT ?? env.FRONTEND_STRICT_PORT) === 'true';

  // Vite's allowedHosts is a DNS-rebinding defense — by default it rejects any
  // Host header outside localhost/127.0.0.1. When the dev or preview server
  // sits behind a reverse proxy (Cloudflare, nginx, traefik) the proxy forwards
  // the public hostname and Vite would 400 the request. Comma-separated list,
  // or the literal "all" / "true" to disable the check entirely.
  // Example: FRONTEND_ALLOWED_HOSTS=funding.hackathon.orbiseed.com,.orbiseed.com
  const rawAllowed = process.env.FRONTEND_ALLOWED_HOSTS ?? env.FRONTEND_ALLOWED_HOSTS ?? '';
  const allowedHosts =
    rawAllowed.trim().toLowerCase() === 'all' || rawAllowed.trim().toLowerCase() === 'true'
      ? true
      : rawAllowed
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

  return {
    logLevel: 'error',
    server: { port, host, strictPort, allowedHosts },
    preview: { port, host, strictPort, allowedHosts },
    plugins: [
      base44({
        // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
        // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
        legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
        hmrNotifier: true,
        navigationNotifier: true,
        analyticsTracker: true,
        visualEditAgent: true
      }),
      react(),
    ],
  };
});