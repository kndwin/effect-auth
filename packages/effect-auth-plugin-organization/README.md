# `@kndwin/effect-auth-plugin-organization`

Organizations, members, and invitations as an `Auth` plugin.

```ts
import { Layer } from "effect";
import { Auth } from "@kndwin/effect-auth-server";
import { AuthStorageSql } from "@kndwin/effect-auth-server/storage/sql";
import { Organization } from "@kndwin/effect-auth-plugin-organization";
import { OrganizationStorageSql } from "@kndwin/effect-auth-plugin-organization/sql";

const plugin = Organization.define();

const AuthLive = Auth.make({
  appUrl: "http://localhost:3000",
  auth: [/* ... */],
  plugins: [plugin],
}).toLayer().pipe(
  AuthStorageSql.provide(),
  Layer.provide(OrganizationStorageSql.layer()),
);

// AuthHttp.layer(api, { plugins: [plugin] })
```

- `@kndwin/effect-auth-plugin-organization` — `Organization.define`, HTTP, `RequireOrganization`
- `@kndwin/effect-auth-plugin-organization/sql` — SQL storage
- `@kndwin/effect-auth-plugin-organization/client` — `OrganizationClient`
