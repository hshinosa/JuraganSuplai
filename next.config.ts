import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: [
    "https://*.ngrok-free.app",
    "https://*.ngrok.io",
  ],
};

export default nextConfig;
