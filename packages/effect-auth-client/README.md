# `@kndwin/client`

Effect-native clients for the shipped auth HTTP API.

```ts
import { BrowserAuthClient } from "@kndwin/client/browser";

export const AuthClientLive = BrowserAuthClient.layer({
  baseUrl: "http://localhost:3000",
});
```

- `@kndwin/client` — `AuthClient` (session + email)
- `@kndwin/client/browser` — cookie session + `signIn.social` redirects
- `@kndwin/client/native` — injected secret store + auth-session browser
