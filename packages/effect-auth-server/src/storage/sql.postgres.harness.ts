import { execFileSync } from "node:child_process";
import { PgClient } from "@effect/sql-pg";
import { Effect, Redacted } from "effect";
import { SqlClient } from "effect/unstable/sql";
import { afterAll, beforeAll } from "vitest";

const containerName = `tracked-effect-auth-pg-${process.pid}`;
const database = "effect_auth_test";
const password = "effect-auth-test-password";
const username = "postgres";
let postgresPort = 0;

const docker = (args: ReadonlyArray<string>) => execFileSync("docker", args, { encoding: "utf8" }).trim();

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const removeContainer = () => {
  try {
    docker(["rm", "--force", containerName]);
  } catch {
    // The container may already have been removed by Docker's --rm handling.
  }
};

export const postgresClientLayer = () => PgClient.layer({
  database,
  host: "127.0.0.1",
  maxConnections: 1,
  password: Redacted.make(password),
  port: postgresPort,
  username,
});

const checkAuthenticatedSqlConnection = () => Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql.unsafe("select 1");
}).pipe(Effect.provide(postgresClientLayer()));

export const registerPostgresHarness = () => {
  beforeAll(async () => {
    try {
      docker([
        "run",
        "--name",
        containerName,
        "--detach",
        "--rm",
        "--env",
        `POSTGRES_DB=${database}`,
        "--env",
        `POSTGRES_PASSWORD=${password}`,
        "--publish",
        "127.0.0.1::5432",
        "postgres:16-alpine",
      ]);

      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (attempt > 0) {
          await wait(250);
        }
        try {
          const port = docker(["port", containerName, "5432/tcp"]).split(":").at(-1);
          if (port) {
            postgresPort = Number(port);
            await Effect.runPromise(checkAuthenticatedSqlConnection());
            return;
          }
        } catch {
          // The server may be listening before authentication and SQL are ready.
        }
      }
      throw new Error("Timed out waiting for disposable PostgreSQL");
    } catch (error) {
      removeContainer();
      throw error;
    }
  }, 120_000);

  afterAll(() => {
    removeContainer();
  });
};
