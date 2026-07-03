/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep standalone only for production builds. In dev this can cause
  // stale/mixed chunk resolution (e.g. runtime requiring ./583.js).
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      canvas: false,
    };

    return config;
  },
};

export default nextConfig;