# @kndwin/effect-auth

Umbrella barrel for `effect-auth` — `Effect` v4 auth with one install.

```sh
bun add @kndwin/effect-auth effect
```

```ts
import { Auth } from "@kndwin/effect-auth"; // re-exports @kndwin/effect-auth-server
import { BrowserAuthClient } from "@kndwin/effect-auth/client";
import { github } from "@kndwin/effect-auth/oauth/github";
import { Organization } from "@kndwin/effect-auth/plugin-organization";
```

Granular packages remain available:

- `@kndwin/effect-auth-server`
- `@kndwin/effect-auth-client`
- `@kndwin/effect-auth-oauth`
- `@kndwin/effect-auth-plugin-organization`
