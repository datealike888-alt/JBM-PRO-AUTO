import type { NextConfig } from "next";

const commonSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "frame-src 'self' https://www.google.com https://www.youtube.com",
    ].join('; '),
  },
];

const apiSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cache-Control', value: 'no-store' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'thesvg.org',
        pathname: '/icons/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/launch',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=*, microphone=*, gyroscope=*, accelerometer=*' },
          { key: 'Content-Security-Policy', value: "base-uri 'self'; frame-ancestors *; object-src 'none'; script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; frame-src 'self' https: blob:" },
        ],
      },
      {
        source: '/courses/:id/learn',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=*, microphone=*, gyroscope=*, accelerometer=*' },
          { key: 'Content-Security-Policy', value: "base-uri 'self'; frame-ancestors 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; frame-src 'self' https: blob:" },
        ],
      },
      {
        source: '/api/:path*',
        headers: apiSecurityHeaders,
      },
      {
        source: '/(.*)',
        headers: commonSecurityHeaders,
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
    // Large LMS packages are uploaded via multipart/form-data on API routes.
    // Next.js proxies request bodies through middleware and defaults to ~10MB.
    // Raise this limit so TinCan/iSpring zip uploads do not fail at 10MB.
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
