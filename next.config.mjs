import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {import('next').NextConfig} */
const backendPublic =
  process.env.API_PROXY_TARGET ??
  'http://localhost/krekelbergkassa/krekelbergkassa-backend/public';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: `${backendPublic}/api/:path*`,
    },
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  redirects: async () => [
    {
      source: '/portal/verify',
      destination: '/nl/portal/verify',
      permanent: false,
    },
  ],
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
  ],
};

export default function config(phase) {
  return {
    ...nextConfig,
    // A production build must not replace chunks used by a running dev server.
    distDir: process.env.NEXT_DIST_DIR ?? (phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next'),
    ...(process.env.E2E_LOW_MEMORY === '1' ? {
      experimental: { cpus: 1 },
      // Isolated browser batches do not need compressed persistent dev caches.
      // Avoid buffering those packs while Chromium runs on constrained hosts.
      webpack(config) {
        config.cache = false;
        return config;
      },
    } : {}),
  };
}
