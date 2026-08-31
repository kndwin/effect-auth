# `@effect-auth/plugin-organization`

Organizations, members, and invitations as an `Auth` plugin.

```ts
import { Layer } from "effect";
import { Auth } from "@effect-auth/server";
import { AuthStorageSql } from "@effect-auth/server/storage/sql";
import { Organization } from "@effect-auth/plugin-organization";
import { OrganizationStorageSql } from "@effect-auth/plugin-organization/sql";

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

- `@effect-auth/plugin-organization` — `Organization.define`, HTTP, `RequireOrganization`
- `@effect-auth/plugin-organization/sql` — SQL storage
- `@effect-auth/plugin-organization/client` — `OrganizationClient`
