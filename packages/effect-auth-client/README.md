# `@effect-auth/client`

Effect-native clients for the shipped auth HTTP API.

```ts
import { BrowserAuthClient } from "@effect-auth/client/browser";

export const AuthClientLive = BrowserAuthClient.layer({
  baseUrl: "http://localhost:3000",
});
```

- `@effect-auth/client` — `AuthClient` (session + email)
- `@effect-auth/client/browser` — cookie session + `signIn.social` redirects
- `@effect-auth/client/native` — injected secret store + auth-session browser
