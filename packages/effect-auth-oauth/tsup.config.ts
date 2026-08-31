import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    github: "src/github.ts",
    "github/schema": "src/github.schema.ts",
    google: "src/google.ts",
    "google/schema": "src/google.schema.ts",
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
