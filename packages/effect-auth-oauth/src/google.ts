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
  GoogleTokenResponseSchema,
  GoogleUserResponseSchema,
  type GoogleProviderOptions,
  type GoogleProviderShape,
} from "./google.schema";

export type { GoogleProviderOptions, GoogleProviderShape } from "./google.schema";
export { GoogleTokenResponseSchema, GoogleUserResponseSchema } from "./google.schema";

const makeGoogleProvider = (options: GoogleProviderOptions): GoogleProviderShape => {
  const scopes = options.scopes ?? ["openid", "email", "profile"];

  return {
    id: "google",
    createAuthorizationUrl: Effect.fn("GoogleProvider.createAuthorizationUrl")(({ redirectUri, state }) =>
      authorizationUrl("https://accounts.google.com/o/oauth2/v2/auth", {
        client_id: options.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes.join(" "),
        state,
      }),
    ),
    exchangeCode: Effect.fn("GoogleProvider.exchangeCode")(({ code, redirectUri }) =>
      postFormJson("https://oauth2.googleapis.com/token", {
        client_id: options.clientId,
        client_secret: options.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }, GoogleTokenResponseSchema).pipe(
        Effect.map((body) => new OAuthTokens({
          accessToken: body.access_token,
          refreshToken: body.refresh_token,
        })),
      ),
    ),
    getProfile: Effect.fn("GoogleProvider.getProfile")(({ accessToken }) =>
      getJson("https://openidconnect.googleapis.com/v1/userinfo", {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      }, GoogleUserResponseSchema).pipe(
        Effect.map((profile) => new OAuthProfile({
          avatarUrl: profile.picture ?? null,
          email: profile.email ?? null,
          id: profile.sub,
          name: profile.name ?? ([profile.given_name, profile.family_name].filter(Boolean).join(" ") || profile.email) ?? null,
          username: profile.email ?? null,
        })),
      ),
    ),
  };
};

export class GoogleProvider extends Context.Service<GoogleProvider, GoogleProviderShape>()(
  "effect-auth/GoogleProvider",
) {
  static readonly make = makeGoogleProvider;

  static readonly define = makeGoogleProvider;

  static readonly layer = (options: GoogleProviderOptions) => Layer.sync(
    GoogleProvider,
    () => GoogleProvider.make(options),
  );

  static readonly layerAuthProvider = (options: GoogleProviderOptions) => AuthProviders.layer([
    GoogleProvider.make(options),
  ]);
}
