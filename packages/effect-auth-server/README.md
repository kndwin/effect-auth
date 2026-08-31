# `@kndwin/server`

`Auth.make` / `Auth.define`, session HTTP, email/password, and storage adapters.

```ts
import { Auth, EmailAndPassword } from "@kndwin/server";
import { AuthStorageKeyValue } from "@kndwin/server/storage/key-value";
import { AuthStorageSql } from "@kndwin/server/storage/sql";
```

- `@kndwin/server/storage/sql` — dialect-agnostic `SqlClient` adapter (`AuthStorageSql.ddl()` for migrations)
- `@kndwin/server/storage/key-value` — `KeyValueStore` adapter

OAuth providers: [`@kndwin/oauth`](../effect-auth-oauth).  
Organization plugin: [`@kndwin/plugin-organization`](../effect-auth-plugin-organization).
