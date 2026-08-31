import { Schema } from "effect";
import type { AuthProvider } from "@kndwin/server";

export class GitHubProviderOptionsModel extends Schema.Class<GitHubProviderOptionsModel>(
  "GitHubProviderOptions",
)({
  clientId: Schema.String,
  clientSecret: Schema.String,
  scopes: Schema.optionalKey(Schema.Array(Schema.String)),
}) {}

export const GitHubProviderOptionsSchema = GitHubProviderOptionsModel;

export type GitHubProviderOptionsInput = typeof GitHubProviderOptionsSchema.Type;

export type GitHubProviderOptions = GitHubProviderOptionsInput & {
  readonly baseUrl?: string;
};

export type GitHubProviderShape = AuthProvider;

export class GitHubTokenResponse extends Schema.Class<GitHubTokenResponse>("GitHubTokenResponse")({
  access_token: Schema.String,
}) {}

export const GitHubTokenResponseSchema = GitHubTokenResponse;

export class GitHubUserResponse extends Schema.Class<GitHubUserResponse>("GitHubUserResponse")({
  avatar_url: Schema.optionalKey(Schema.NullOr(Schema.String)),
  email: Schema.optionalKey(Schema.NullOr(Schema.String)),
  id: Schema.Number,
  login: Schema.String,
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
}) {}

export const GitHubUserResponseSchema = GitHubUserResponse;
