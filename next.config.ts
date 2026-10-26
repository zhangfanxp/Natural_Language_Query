import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const localIPv4Origins = Object.values(networkInterfaces())
  .flatMap((interfaces) => interfaces ?? [])
  .filter((networkInterface) => networkInterface.family === "IPv4" && !networkInterface.internal)
  .map((networkInterface) => networkInterface.address);

const configuredDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Next dev blocks its client-side assets and HMR for alternate hostnames by default.
  // Allow loopback and this Mac's current LAN IPv4 addresses so IP-based access hydrates.
  allowedDevOrigins: [...new Set(["127.0.0.1", "::1", ...localIPv4Origins, ...configuredDevOrigins])],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
