export {};

const server = Bun.spawn(["bun", "--watch", "server/main.ts"], {
  stdout: "inherit",
  stderr: "inherit",
});
const client = Bun.spawn(["bunx", "vite", "--config", "vite.config.ts"], {
  stdout: "inherit",
  stderr: "inherit",
});

const shutdown = () => {
  server.kill();
  client.kill();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.all([server.exited, client.exited]);
