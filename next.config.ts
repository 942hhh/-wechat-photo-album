import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp"],
  allowedDevOrigins: [
    "192.168.101.8",
    "192.168.196.88",
    "192.168.145.88",
    "localhost",
  ],
};

export default nextConfig;