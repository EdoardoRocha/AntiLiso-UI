import type { NextConfig } from 'next';

function resolveBackendOrigin(): string {
  const candidates = [process.env.BACKEND_API_URL, process.env.NEXT_PUBLIC_API_URL];

  for (const candidate of candidates) {
    const normalized = (candidate ?? '').trim().replace(/\/+$/, '');
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }
  }

  return 'http://localhost:3333';
}

const backendOrigin = resolveBackendOrigin();

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async rewrites() {
    return [
      {
        source: '/api-backend/:path*',
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
