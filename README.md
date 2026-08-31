# effect-auth

Authentication for [Effect](https://effect.website) v4 — services, layers, schemas, and an `HttpApi` contract.

Peer: **Effect `4.0.0-beta.92`**. Packages are not published yet; use this workspace.

## Get started

```sh
bun install
```

```ts
import { Effect, Layer } from "effect";
import { KeyValueStore } from "effect/unstable/persistence";
import { Auth, EmailAndPassword } from "@kndwin/effect-auth-server";
import { AuthStorageKeyValue } from "@kndwin/effect-auth-server/storage/key-value";

const sender = {
  send: (message: { to: string; subject: string; text?: string }) =>
    Effect.sync(() => console.log(`[email] ${message.subject} → ${message.to}\n${message.text ?? ""}`)),
};

export const AuthLive = Auth.make({
  appName: "Acme",
  appUrl: "http://localhost:3000",
  trustedOrigins: ["http://localhost:5173"],
  auth: [
    EmailAndPassword.define({ from: "login@localhost", sender }),
  ],
}).toLayer().pipe(
  AuthStorageKeyValue.provide(),
  Layer.provide(KeyValueStore.layerMemory),
);
```

Mount the shipped API and serve it:

```ts
import { HttpRouter } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { BunHttpServer } from "@effect/platform-bun";
import { authApi, AuthHttp } from "@kndwin/effect-auth-server";

const ApiLive = HttpApiBuilder.layer(authApi).pipe(
  Layer.provide(AuthHttp.layer(authApi)),
  Layer.provide(AuthLive),
);

Layer.launch(
  HttpRouter.serve(ApiLive).pipe(
    Layer.provide(BunHttpServer.layer({ port: 3000 })),
  ),
);
```

From the browser:

```ts
import { BrowserAuthClient } from "@kndwin/effect-auth-client/browser";

const auth = yield* BrowserAuthClient;
yield* auth.email.signIn({ email, password });
```

Examples (Docker Postgres + Bun auth API + Vite UI):

- [`apps/example-postgres-react`](apps/example-postgres-react) — React (`:5173`) + API `:3000` + Postgres `:5432`
- [`apps/example-postgres-foldkit`](apps/example-postgres-foldkit) — Foldkit (`:5174`) + API `:3001` + Postgres `:5433`

```sh
bun --cwd apps/example-postgres-react run dev
bun --cwd apps/example-postgres-foldkit run dev
```

## Packages

| Package | |
| --- | --- |
| [`@kndwin/effect-auth-server`](packages/effect-auth-server) | `Auth`, HTTP, email, SQL + KeyValue storage |
| [`@kndwin/effect-auth-client`](packages/effect-auth-client) | Browser + native clients |
| [`@kndwin/effect-auth-oauth`](packages/effect-auth-oauth) | GitHub + Google providers |
| [`@kndwin/effect-auth-plugin-organization`](packages/effect-auth-plugin-organization) | Orgs, members, invitations |

```sh
bun tsc --noEmit
```
