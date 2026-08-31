# `@kndwin/effect-auth-client`

Effect-native clients for the shipped auth HTTP API.

```ts
import { BrowserAuthClient } from "@kndwin/effect-auth-client/browser";

export const AuthClientLive = BrowserAuthClient.layer({
  baseUrl: "http://localhost:3000",
});
```

- `@kndwin/effect-auth-client` — `AuthClient` (session + email)
- `@kndwin/effect-auth-client/browser` — cookie session + `signIn.social` redirects
- `@kndwin/effect-auth-client/native` — injected secret store + auth-session browser
