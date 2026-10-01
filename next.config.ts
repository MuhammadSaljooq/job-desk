import path from "node:path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // E2E runs its own server next to `pnpm dev`, so it builds into a separate folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // A stray package-lock.json in the home directory makes Next guess the wrong
  // workspace root; pin it to this project.
  turbopack: { root: path.resolve(import.meta.dirname) },
  outputFileTracingRoot: path.resolve(import.meta.dirname),
}

export default nextConfig
