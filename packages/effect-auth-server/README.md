# `@kndwin/effect-auth-server`

`Auth.make` / `Auth.define`, session HTTP, email/password, and storage adapters.

```ts
import { Auth, EmailAndPassword } from "@kndwin/effect-auth-server";
import { AuthStorageKeyValue } from "@kndwin/effect-auth-server/storage/key-value";
import { AuthStorageSql } from "@kndwin/effect-auth-server/storage/sql";
```

- `@kndwin/effect-auth-server/storage/sql` — dialect-agnostic `SqlClient` adapter (`AuthStorageSql.ddl()` for migrations)
- `@kndwin/effect-auth-server/storage/key-value` — `KeyValueStore` adapter

OAuth providers: [`@kndwin/effect-auth-oauth`](../effect-auth-oauth).  
Organization plugin: [`@kndwin/effect-auth-plugin-organization`](../effect-auth-plugin-organization).
