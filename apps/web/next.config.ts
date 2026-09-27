import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@google/genai', 'openai', 'ws', 'google-auth-library'],
  turbopack: {
    resolveAlias: {
      '@yatrasarthi/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@yatrasarthi/graph': path.resolve(__dirname, '../../packages/graph/src/tripGraph.ts'),
      '@yatrasarthi/llm': path.resolve(__dirname, '../../packages/llm/src/index.ts'),
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@yatrasarthi/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@yatrasarthi/graph': path.resolve(__dirname, '../../packages/graph/src/tripGraph.ts'),
      '@yatrasarthi/llm': path.resolve(__dirname, '../../packages/llm/src/index.ts'),
    };
    return config;
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})(nextConfig);
