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

export default nextConfig;
