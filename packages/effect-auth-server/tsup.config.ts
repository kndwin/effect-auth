import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    schema: "src/schema.ts",
    server: "src/server.ts",
    "server/schema": "src/server.schema.ts",
    http: "src/http.ts",
    "http/schema": "src/http.schema.ts",
    "http.live": "src/http.live.ts",
    email: "src/email.ts",
    "email/schema": "src/email.schema.ts",
    "email/templates": "src/email/templates.tsx",
    providers: "src/providers.ts",
    "providers/schema": "src/providers.schema.ts",
    "providers/oauth": "src/providers/oauth.ts",
    storage: "src/storage.ts",
    "storage/schema": "src/storage.schema.ts",
    "storage/sql": "src/storage/sql.ts",
    "storage/sql/schema": "src/storage/sql.schema.ts",
    "storage/key-value": "src/storage/key-value.ts",
    "storage/key-value/schema": "src/storage/key-value.schema.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2022",
  outDir: "dist",
  external: [/^effect(\/.*)?$/, /^@effect\/.*$/, /^@react-email\/.*$/, "react", "react-dom", /^@kndwin\/.*/],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
