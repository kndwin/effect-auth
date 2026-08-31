import { PgClient } from "@effect/sql-pg";
import { Auth, AuthHttp, authApi, EmailAndPassword } from "@kndwin/server";
import { AuthStorageSql } from "@kndwin/server/storage/sql";
import { Effect, Layer, Redacted } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { SqlClient } from "effect/unstable/sql";
import { BunHttpServer } from "@effect/platform-bun";

const port = Number(process.env.AUTH_PORT ?? 3001);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5174";
const appUrl = process.env.APP_URL ?? `http://localhost:${port}`;

const sender = {
  send: (message: { to: string; subject: string; text?: string }) =>
    Effect.sync(() => console.log(`[email] ${message.subject} → ${message.to}\n${message.text ?? ""}`)),
};

const pgLayer = PgClient.layer({
  database: process.env.POSTGRES_DB ?? "effect_auth",
  host: process.env.POSTGRES_HOST ?? "127.0.0.1",
  password: Redacted.make(process.env.POSTGRES_PASSWORD ?? "effect-auth"),
  port: Number(process.env.POSTGRES_PORT ?? 5433),
  username: process.env.POSTGRES_USER ?? "postgres",
});

const migrate = Layer.effectDiscard(
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Effect.forEach(AuthStorageSql.ddl(), (statement) => sql.unsafe(statement));
  }),
).pipe(Layer.provide(pgLayer));

const AuthLive = Auth.make({
  appName: "effect-auth example",
  appUrl,
  cookieSecure: false,
  trustedOrigins: [clientOrigin],
  auth: [EmailAndPassword.define({ from: "login@localhost", sender })],
}).toLayer().pipe(
  AuthStorageSql.provide(),
  Layer.provide(pgLayer),
);

const ApiLive = HttpApiBuilder.layer(authApi).pipe(
  Layer.provide(AuthHttp.layer(authApi)),
  Layer.provide(AuthLive),
  Layer.provide(migrate),
);

await Effect.runPromise(
  Layer.launch(
    HttpRouter.serve(ApiLive).pipe(
      Layer.provide(BunHttpServer.layer({ port })),
    ),
  ),
);
