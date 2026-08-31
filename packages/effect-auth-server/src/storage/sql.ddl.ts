import type { SqlStorageOptions } from "./sql.schema";

// Reference DDL for the tables AuthStorageSql expects. Consumers copy these
// statements into their own migration tooling (the adapter never runs DDL).
export const ddl = (options: SqlStorageOptions = {}): ReadonlyArray<string> => {
  const tables = {
    emailIdentities: options.tables?.emailIdentities ?? "auth_email_identities",
    emailTokens: options.tables?.emailTokens ?? "auth_email_tokens",
    oauthStates: options.tables?.oauthStates ?? "auth_oauth_states",
    providerAccounts: options.tables?.providerAccounts ?? "auth_provider_accounts",
    sessions: options.tables?.sessions ?? "auth_sessions",
    users: options.tables?.users ?? "auth_users",
  };
  return [
    `create table if not exists ${tables.users} (
  id text primary key,
  email text,
  name text,
  username text,
  avatar_url text,
  created_at text not null,
  updated_at text not null
)`,
    `create table if not exists ${tables.sessions} (
  id text primary key,
  user_id text not null,
  token_hash text not null,
  created_at text not null,
  expires_at text not null
)`,
    `create table if not exists ${tables.providerAccounts} (
  provider text not null,
  provider_account_id text not null,
  user_id text not null,
  created_at text not null,
  primary key (provider, provider_account_id)
)`,
    `create table if not exists ${tables.oauthStates} (
  state text primary key,
  provider text not null,
  redirect_to text,
  created_at text not null
)`,
    `create table if not exists ${tables.emailIdentities} (
  email text primary key,
  user_id text not null,
  password_hash text not null,
  email_verified_at text,
  created_at text not null,
  updated_at text not null
)`,
    `create table if not exists ${tables.emailTokens} (
  id text primary key,
  email text not null,
  token_hash text not null,
  purpose text not null,
  expires_at text not null,
  created_at text not null
)`,
  ];
};
