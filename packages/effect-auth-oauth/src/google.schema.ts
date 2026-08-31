import { Schema } from "effect";
import type { AuthProvider } from "@kndwin/server";

export class GoogleProviderOptionsModel extends Schema.Class<GoogleProviderOptionsModel>(
  "GoogleProviderOptions",
)({
  clientId: Schema.String,
  clientSecret: Schema.String,
  scopes: Schema.optionalKey(Schema.Array(Schema.String)),
}) {}

export const GoogleProviderOptionsSchema = GoogleProviderOptionsModel;

export type GoogleProviderOptionsInput = typeof GoogleProviderOptionsSchema.Type;

export type GoogleProviderOptions = GoogleProviderOptionsInput;

export type GoogleProviderShape = AuthProvider;

export class GoogleTokenResponse extends Schema.Class<GoogleTokenResponse>("GoogleTokenResponse")({
  access_token: Schema.String,
  refresh_token: Schema.optionalKey(Schema.String),
}) {}

export const GoogleTokenResponseSchema = GoogleTokenResponse;

export class GoogleUserResponse extends Schema.Class<GoogleUserResponse>("GoogleUserResponse")({
  email: Schema.optionalKey(Schema.NullOr(Schema.String)),
  email_verified: Schema.optionalKey(Schema.Boolean),
  family_name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  given_name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  picture: Schema.optionalKey(Schema.NullOr(Schema.String)),
  sub: Schema.String,
}) {}

export const GoogleUserResponseSchema = GoogleUserResponse;
