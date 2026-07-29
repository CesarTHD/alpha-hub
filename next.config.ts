import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Contratos em PDF enviados na importação D4Sign/upload manual costumam passar do 1MB padrão.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
