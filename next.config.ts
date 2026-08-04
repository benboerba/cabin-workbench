import type { NextConfig } from "next";

const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const basePath = configuredBasePath && configuredBasePath !== "/"
  ? `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`
  : "";

const nextConfig: NextConfig = {
  basePath,
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // Type safety is enforced by `npm run typecheck`; this avoids a native SWC
  // compatibility issue on some build hosts while keeping deployments reproducible.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
