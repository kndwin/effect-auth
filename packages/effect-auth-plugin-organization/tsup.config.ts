import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    schema: "src/organization.schema.ts",
    sql: "src/sql.ts",
    client: "src/client.ts",
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
});
