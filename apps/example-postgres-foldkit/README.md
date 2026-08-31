# example-postgres-foldkit

Self-contained Postgres + `@effect-auth/server` + Foldkit client.

```
client/          Vite UI (port 5174), proxies `/auth` → `:3001`
server/main.ts   Bun auth API (port 3001), SQL storage
docker-compose.yml   Postgres 16 on `:5433`
```

```sh
bun --cwd apps/example-postgres-foldkit run dev
```

Starts Docker Postgres (waits for healthy), then the auth server and Vite together.
