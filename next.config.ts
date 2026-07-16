import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "*.loca.lt", "*.trycloudflare.com"],
};

export default nextConfig;
