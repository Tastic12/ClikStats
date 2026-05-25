import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @xenova/transformers and its onnxruntime-node dependency contain native
  // assets that Next.js can't safely bundle. Mark them as external so they
  // load as plain Node modules at runtime in server routes.
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'sharp'],
};

export default nextConfig;
