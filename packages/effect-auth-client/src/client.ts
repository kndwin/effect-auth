import { Context, Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { authApi } from "./http";
import type { AuthClientOptions, AuthClientShape } from "./client.schema";
import { resolveUrl, toAbsoluteBaseUrl } from "./url";

export { AuthClientOptionsSchema, AuthClientSocialSignInOptionsSchema } from "./client.schema";
export type { AuthClientOptions, AuthClientShape } from "./client.schema";
export { PublicSession, User } from "./schema";

export const signInUrl = (provider: string, options: AuthClientOptions = {}) =>
  resolveUrl(
    `auth/${provider}`,
    `${options.baseUrl?.toString().replace(/\/?$/, "/") ?? ""}`,
    globalThis.location?.origin ?? "http://localhost",
  );

const httpClientBaseUrl = (options: AuthClientOptions) =>
  options.baseUrl === undefined
    ? undefined
    : toAbsoluteBaseUrl(options.baseUrl.toString(), globalThis.location?.origin ?? "http://localhost");

export const make = (options: AuthClientOptions = {}) => HttpApiClient.make(authApi, {
  baseUrl: httpClientBaseUrl(options),
});

export const makeWith = (httpClient: HttpClient.HttpClient, options: AuthClientOptions = {}) => HttpApiClient.makeWith(authApi, {
  baseUrl: httpClientBaseUrl(options),
  httpClient,
});

export const layerFetch = Layer.provide(
  FetchHttpClient.layer,
  Layer.succeed(FetchHttpClient.RequestInit, { credentials: "include" }),
);

export type AuthClientInstance = {
  readonly _tag: "AuthClient";
  readonly options: AuthClientOptions;
  readonly toLayer: () => Layer.Layer<AuthClient>;
};

export class AuthClient extends Context.Service<AuthClient, AuthClientShape>()("effect-auth/AuthClient") {
  static readonly layer = (options: AuthClientOptions = {}) => Layer.effect(
    AuthClient,
    Effect.gen(function* () {
      const client = yield* make(options);

      return {
        email: {
          requestPasswordReset: Effect.fn("AuthClient.email.requestPasswordReset")((input) => client.authEmail.requestPasswordReset({ payload: input })),
          requestVerification: Effect.fn("AuthClient.email.requestVerification")((input) => client.authEmail.requestVerification({ payload: input })),
          resetPassword: Effect.fn("AuthClient.email.resetPassword")((input) => client.authEmail.resetPassword({ payload: input })),
          signIn: Effect.fn("AuthClient.email.signIn")((input) => client.authEmail.signIn({ payload: input })),
          signUp: Effect.fn("AuthClient.email.signUp")((input) => client.authEmail.signUp({ payload: input })),
          verify: Effect.fn("AuthClient.email.verify")((input) => client.authEmail.verify({ payload: input })),
        },
        getSession: Effect.fn("AuthClient.getSession")(() => client.auth.me({})),
        signInUrl: (provider: string) => signInUrl(provider, options),
        signOut: Effect.fn("AuthClient.signOut")(() => client.auth.logout({})),
      };
    }),
  );

  static readonly fetchLayer = (options: AuthClientOptions = {}) => AuthClient.layer(options).pipe(
    Layer.provide(layerFetch),
  );

  /**
   * Create a portable AuthClient instance. The returned object carries the
   * options and can produce a Layer via `.toLayer()` or `AuthClient.toLayer(instance)`.
   */
  static readonly make = (options: AuthClientOptions = {}): AuthClientInstance => {
    const instance: AuthClientInstance = {
      _tag: "AuthClient",
      options,
      toLayer: () => AuthClient.toLayer(instance),
    };
    return instance;
  };

  /**
   * Convert an `AuthClientInstance` (or raw options) into a Layer that provides `AuthClient`.
   * Internally uses `HttpApiClient.make` with `FetchHttpClient` and `credentials: "include"`.
   */
  static readonly toLayer = (
    instance: AuthClientInstance | AuthClientOptions,
  ): Layer.Layer<AuthClient> => {
    const options: AuthClientOptions = "_tag" in instance ? (instance as AuthClientInstance).options : (instance as AuthClientOptions);
    return AuthClient.fetchLayer(options);
  };
}

export const getSession = (options: AuthClientOptions = {}) => Effect.gen(function* () {
  const client = yield* AuthClient;
  return yield* client.getSession();
}).pipe(Effect.provide(AuthClient.fetchLayer(options)));

export const signOut = (options: AuthClientOptions = {}) => Effect.gen(function* () {
  const client = yield* AuthClient;
  return yield* client.signOut();
}).pipe(Effect.provide(AuthClient.fetchLayer(options)));
