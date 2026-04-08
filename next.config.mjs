/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next.js 14: tell server runtime NOT to bundle these native packages
    serverComponentsExternalPackages: [
      "better-sqlite3",
      "@lancedb/lancedb",
      "@lancedb/lancedb-darwin-arm64",
      "@lancedb/lancedb-linux-x64-gnu",
      "@lancedb/lancedb-linux-arm64-gnu",
      "@xenova/transformers",
      "onnxruntime-node",
      "mammoth",
      "pdf-parse",
    ],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // node-loader handles .node native addon files
      config.module.rules.push({
        test: /\.node$/,
        loader: "node-loader",
      });

      // Fully externalize the native packages so webpack stops following
      // their import chains
      const nativePackages = [
        "@lancedb/lancedb",
        "@lancedb/lancedb-darwin-arm64",
        "@lancedb/lancedb-linux-x64-gnu",
        "@lancedb/lancedb-linux-arm64-gnu",
        "@xenova/transformers",
        "onnxruntime-node",
        "better-sqlite3",
        "mammoth",
        "pdf-parse",
      ];

      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        async function ({ request }) {
          if (!request) return undefined;
          if (nativePackages.some((p) => request === p || request.startsWith(p + "/"))) {
            return `commonjs ${request}`;
          }
          if (/\.node$/.test(request)) {
            return `commonjs ${request}`;
          }
          return undefined;
        },
      ].filter(Boolean);
    }

    config.ignoreWarnings = [
      { module: /onnxruntime-node/ },
      { module: /@xenova\/transformers/ },
      { module: /@lancedb/ },
    ];

    return config;
  },
};

export default nextConfig;
