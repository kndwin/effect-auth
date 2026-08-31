import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/client.ts",
    schema: "src/client.schema.ts",
    browser: "src/client/browser.ts",
    native: "src/client/native.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2022",
  outDir: "dist",
  external: [/^effect(\/.*)?$/, /^@effect\/.*$/, /^@effect-auth\/.*/],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
