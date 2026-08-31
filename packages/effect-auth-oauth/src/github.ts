import { Context, Effect, Layer } from "effect";
import {
  AuthProviders,
  OAuthProfile,
  OAuthTokens,
  authorizationUrl,
  getJson,
  postFormJson,
} from "@kndwin/server";
import {
  GitHubTokenResponseSchema,
  GitHubUserResponseSchema,
  type GitHubProviderOptions,
  type GitHubProviderShape,
} from "./github.schema";

export type { GitHubProviderOptions, GitHubProviderShape } from "./github.schema";
export { GitHubTokenResponseSchema, GitHubUserResponseSchema } from "./github.schema";

const makeGitHubProvider = (options: GitHubProviderOptions): GitHubProviderShape => {
  const origin = options.baseUrl?.replace(/\/$/, "") ?? "https://github.com";
  const apiOrigin = options.baseUrl?.replace(/\/$/, "") ?? "https://api.github.com";
  const scopes = options.scopes ?? ["read:user", "user:email"];

  return {
    id: "github",
    createAuthorizationUrl: Effect.fn("GitHubProvider.createAuthorizationUrl")(({ redirectUri, state }) =>
      authorizationUrl(`${origin}/login/oauth/authorize`, {
        client_id: options.clientId,
        redirect_uri: redirectUri,
        scope: scopes.join(" "),
        state,
      }),
    ),
    exchangeCode: Effect.fn("GitHubProvider.exchangeCode")(({ code, redirectUri }) =>
      postFormJson(`${origin}/login/oauth/access_token`, {
        client_id: options.clientId,
        client_secret: options.clientSecret,
        code,
        redirect_uri: redirectUri,
      }, GitHubTokenResponseSchema).pipe(
        Effect.map((body) => new OAuthTokens({ accessToken: body.access_token })),
      ),
    ),
    getProfile: Effect.fn("GitHubProvider.getProfile")(({ accessToken }) =>
      getJson(`${apiOrigin}/user`, {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "effect-auth",
      }, GitHubUserResponseSchema).pipe(
        Effect.map((profile) => new OAuthProfile({
          avatarUrl: profile.avatar_url ?? null,
          email: profile.email ?? null,
          id: String(profile.id),
          name: profile.name ?? profile.login,
          username: profile.login,
        })),
      ),
    ),
  };
};

export class GitHubProvider extends Context.Service<GitHubProvider, GitHubProviderShape>()(
  "effect-auth/GitHubProvider",
) {
  static readonly make = makeGitHubProvider;

  static readonly define = makeGitHubProvider;

  static readonly layer = (options: GitHubProviderOptions) => Layer.sync(
    GitHubProvider,
    () => GitHubProvider.make(options),
  );

  static readonly layerAuthProvider = (options: GitHubProviderOptions) => AuthProviders.layer([
    GitHubProvider.make(options),
  ]);
}
