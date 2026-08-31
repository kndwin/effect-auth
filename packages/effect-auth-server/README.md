# `@effect-auth/server`

`Auth.make` / `Auth.define`, session HTTP, email/password, and storage adapters.

```ts
import { Auth, EmailAndPassword } from "@effect-auth/server";
import { AuthStorageKeyValue } from "@effect-auth/server/storage/key-value";
import { AuthStorageSql } from "@effect-auth/server/storage/sql";
```

- `@effect-auth/server/storage/sql` — dialect-agnostic `SqlClient` adapter (`AuthStorageSql.ddl()` for migrations)
- `@effect-auth/server/storage/key-value` — `KeyValueStore` adapter

OAuth providers: [`@effect-auth/oauth`](../effect-auth-oauth).  
Organization plugin: [`@effect-auth/plugin-organization`](../effect-auth-plugin-organization).
