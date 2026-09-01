/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignore ESLint errors during `next build`
    ignoreDuringBuilds: true,
  },

  // OPTIONAL: also ignore TypeScript build errors
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
