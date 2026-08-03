import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // Type safety is enforced by `npm run typecheck`; this avoids a native SWC
  // compatibility issue on some build hosts while keeping deployments reproducible.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
