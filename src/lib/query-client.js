import { QueryClient } from '@tanstack/react-query';

// Defaults tuned for warehouse-derived data:
// - staleTime 60s: warehouse refreshes nightly + reviewer assessments are
//   small low-frequency writes, so a 1-minute freshness window is safe and
//   makes navigation between pages feel instant (hits cache instead of
//   re-fetching every time).
// - gcTime 30min: keep results around so hopping between Dashboard / list /
//   org profile and back doesn't re-fetch.
// - refetchOnMount: 'always' if stale, else false — combined with staleTime
//   this means a user who clicks Dashboard → Orgs → Dashboard within a minute
//   sees the cached page instantly, but a user who comes back after 5 minutes
//   gets fresh data.
// - retry 1: warehouse occasionally hiccups; one quick retry is enough.
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60_000,
			gcTime: 30 * 60_000,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			refetchOnReconnect: 'always',
			retry: 1,
		},
	},
});
