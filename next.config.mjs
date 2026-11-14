import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {import('next').NextConfig} */
const backendPublic =
  process.env.API_PROXY_TARGET ??
  'http://127.0.0.1:8000';

function publicBackendTarget(target) {
  if (!target) return '';
  try {
    const url = new URL(target);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    return url.origin + url.pathname;
  } catch {
    return '';
  }
}

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
    env: {
      QUALITY_API_PROXY_TARGET: publicBackendTarget(process.env.API_PROXY_TARGET ??
        (phase === PHASE_DEVELOPMENT_SERVER ? backendPublic : '')),
      QUALITY_BUILD_REVISION: /^[a-f0-9]{40}$/.test(process.env.QUALITY_BUILD_REVISION ?? '')
        ? process.env.QUALITY_BUILD_REVISION : '',
    },
    // A production build must not replace chunks used by a running dev server.
    distDir: process.env.NEXT_DIST_DIR ?? (phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next'),
    ...(process.env.PORTAL_LIVE_TSCONFIG ? { typescript: { tsconfigPath: process.env.PORTAL_LIVE_TSCONFIG } } : {}),
    ...(process.env.E2E_LOW_MEMORY === '1' || process.env.PORTAL_LIVE_TSCONFIG ? {
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
