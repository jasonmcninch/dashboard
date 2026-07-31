import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Resolved from import.meta.url rather than __dirname: this config is loaded as
// an ES module, where __dirname is either undefined or points at the wrong
// directory, which makes Turbopack resolve dependencies from the parent folder.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Pin the workspace root. A stray package-lock.json in the home directory
    // otherwise makes Turbopack infer ~/ as the root, which changes how
    // `output: "standalone"` traces files into the Docker image.
    root: projectRoot,
  },
};

export default nextConfig;
