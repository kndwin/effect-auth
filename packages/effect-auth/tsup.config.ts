import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server.ts",
    client: "src/client.ts",
    oauth: "src/oauth.ts",
    "oauth/github": "src/oauth/github.ts",
    "oauth/google": "src/oauth/google.ts",
    "plugin-organization": "src/plugin-organization.ts",
    "plugin-organization/client": "src/plugin-organization/client.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2022",
  outDir: "dist",
  external: [/^effect(\/.*)?$/, /^@effect\/.*$/, /^@kndwin\/.*/],
});
