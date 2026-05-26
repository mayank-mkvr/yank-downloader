import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./bin/linux/**/*', './node_modules/ffmpeg-static/**/*'],
    },
  },
};

export default nextConfig;
