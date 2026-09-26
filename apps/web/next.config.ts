import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@google/genai', 'openai', 'ws', 'google-auth-library'],
};

export default nextConfig;
