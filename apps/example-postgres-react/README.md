# example-postgres-react

Self-contained Postgres + `@kndwin/effect-auth-server` + React client.

```
client/          Vite UI (port 5173), proxies `/auth` → `:3000`
server/main.ts   Bun auth API (port 3000), SQL storage
docker-compose.yml   Postgres 16 on `:5432`
```

```sh
bun --cwd apps/example-postgres-react run dev
```

Starts Docker Postgres (waits for healthy), then the auth server and Vite together.
