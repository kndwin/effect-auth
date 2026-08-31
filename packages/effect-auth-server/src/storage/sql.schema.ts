import { Schema } from "effect";

export class SqlStorageTables extends Schema.Class<SqlStorageTables>("SqlStorageTables")({
  emailIdentities: Schema.optionalKey(Schema.String),
  emailTokens: Schema.optionalKey(Schema.String),
  oauthStates: Schema.optionalKey(Schema.String),
  providerAccounts: Schema.optionalKey(Schema.String),
  sessions: Schema.optionalKey(Schema.String),
  users: Schema.optionalKey(Schema.String),
}) {}

export class SqlStorageOptions extends Schema.Class<SqlStorageOptions>("SqlStorageOptions")({
  tables: Schema.optionalKey(SqlStorageTables),
}) {}

export const SqlStorageTablesSchema = SqlStorageTables;
export const SqlStorageOptionsSchema = SqlStorageOptions;
