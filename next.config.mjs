/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" produces a small self-contained server (.next/standalone/server.js)
  // which keeps the Docker image small.
  output: 'standalone',
  reactStrictMode: true,
};

export default nextConfig;
