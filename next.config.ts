import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mounted at shadcndeck.com/chartcn via a rewrite in the shadcndeck-landing
  // repo's next.config.ts. This keeps this app's own links, assets, and
  // routes self-prefixed so they resolve correctly under that path.
  basePath: "/chartcn",
  // Pin the workspace root to this project; otherwise Turbopack picks up
  // lockfiles in parent folders and warns about an inferred root.
  turbopack: {
    root: path.join(__dirname),
  },
  // With a basePath, the bare origin (e.g. localhost:3000/) is a 404. Send it
  // to the app instead. In production the landing site only proxies
  // /chartcn/*, so this only affects direct visits to this app's own origin.
  async redirects() {
    return [
      {
        source: "/",
        destination: "/chartcn",
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
