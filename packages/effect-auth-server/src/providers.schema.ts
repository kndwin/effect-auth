import { Schema, type Effect } from "effect";
import type { HttpClient } from "effect/unstable/http";

export class OAuthProfile extends Schema.Class<OAuthProfile>("OAuthProfile")({
  avatarUrl: Schema.optionalKey(Schema.NullOr(Schema.String)),
  email: Schema.optionalKey(Schema.NullOr(Schema.String)),
  id: Schema.String,
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  username: Schema.optionalKey(Schema.NullOr(Schema.String)),
}) {}

export const OAuthProfileSchema = OAuthProfile;

export class OAuthTokens extends Schema.Class<OAuthTokens>("OAuthTokens")({
  accessToken: Schema.String,
  refreshToken: Schema.optionalKey(Schema.String),
}) {}

export const OAuthTokensSchema = OAuthTokens;

export class CreateAuthorizationUrlOptions extends Schema.Class<CreateAuthorizationUrlOptions>(
  "CreateAuthorizationUrlOptions",
)({
  redirectUri: Schema.String,
  state: Schema.String,
}) {}

export class ExchangeCodeOptions extends Schema.Class<ExchangeCodeOptions>("ExchangeCodeOptions")({
  code: Schema.String,
  redirectUri: Schema.String,
}) {}

export type AuthProvider = {
  readonly id: string;
  readonly createAuthorizationUrl: (options: CreateAuthorizationUrlOptions) => Effect.Effect<URL, unknown>;
  readonly exchangeCode: (options: ExchangeCodeOptions) => Effect.Effect<OAuthTokens, unknown, HttpClient.HttpClient>;
  readonly getProfile: (tokens: OAuthTokens) => Effect.Effect<OAuthProfile, unknown, HttpClient.HttpClient>;
};

export type AuthProvidersShape = {
  readonly get: (provider: string) => Effect.Effect<AuthProvider | null, never>;
  readonly list: Effect.Effect<ReadonlyArray<AuthProvider>, never>;
};
