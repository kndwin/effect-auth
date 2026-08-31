# `@kndwin/plugin-organization`

Organizations, members, and invitations as an `Auth` plugin.

```ts
import { Layer } from "effect";
import { Auth } from "@kndwin/server";
import { AuthStorageSql } from "@kndwin/server/storage/sql";
import { Organization } from "@kndwin/plugin-organization";
import { OrganizationStorageSql } from "@kndwin/plugin-organization/sql";

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

- `@kndwin/plugin-organization` — `Organization.define`, HTTP, `RequireOrganization`
- `@kndwin/plugin-organization/sql` — SQL storage
- `@kndwin/plugin-organization/client` — `OrganizationClient`
