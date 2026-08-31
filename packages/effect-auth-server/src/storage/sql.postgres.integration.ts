import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/unstable/sql";
import { AuthStorage } from "../storage";
import { postgresClientLayer, registerPostgresHarness } from "./sql.postgres.harness";
import { AuthStorageSql } from "./sql";

registerPostgresHarness();

describe("PostgreSQL auth storage", () => {
  it("persists users, identities, and sessions", async () => {
    const program = Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* Effect.forEach(AuthStorageSql.ddl(), (statement) => sql.unsafe(statement));

      const auth = yield* AuthStorage;
      const now = "2026-07-11T00:00:00.000Z";
      const user = yield* auth.upsertEmailIdentity({
        email: "Owner@Example.com",
        emailVerifiedAt: now,
        passwordHash: "scrypt$hash",
        user: { email: "Owner@Example.com", name: "Owner" },
      });
      const foundUser = yield* auth.findUserByEmail("owner@example.com");
      const identity = yield* auth.findEmailIdentity("OWNER@EXAMPLE.COM");

      const session = yield* auth.createSession({
        createdAt: now,
        expiresAt: "2026-07-12T00:00:00.000Z",
        id: "session-1",
        tokenHash: "token-hash",
        userId: user.user.id,
      });
      const foundSession = yield* auth.findSession(session.id);
      yield* auth.deleteSession(session.id);
      const deletedSession = yield* auth.findSession(session.id);

      return {
        deletedSession,
        foundSession,
        foundUser,
        identity,
        userId: user.user.id,
      };
    }).pipe(
      Effect.provide(AuthStorageSql.layer()),
      Effect.provide(postgresClientLayer()),
    );

    const result = await Effect.runPromise(program);

    assert.strictEqual(result.foundUser?.id, result.userId);
    assert.strictEqual(result.identity?.email, "owner@example.com");
    assert.strictEqual(result.foundSession?.id, "session-1");
    assert.strictEqual(result.deletedSession, null);
  });
});
