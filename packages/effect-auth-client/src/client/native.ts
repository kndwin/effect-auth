import { Context, Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http";
import { makeWith, signInUrl } from "../client";
import type { NativeAuthClientOptions, NativeAuthClientShape } from "./native.schema";

export type {
  NativeAuthClientOptions,
  NativeAuthClientShape,
  NativeAuthStorage,
} from "./native.schema";

const sessionTokenFromSetCookie = (cookieName: string, header: string | undefined) => {
  if (header === undefined || !header.startsWith(`${cookieName}=`)) {
    return undefined;
  }
  const value = decodeURIComponent(header.slice(cookieName.length + 1).split(";")[0] ?? "");
  return value === "" ? null : value;
};

export class NativeAuthClient extends Context.Service<NativeAuthClient, NativeAuthClientShape>()(
  "effect-auth/NativeAuthClient",
) {
  static readonly layer = (options: NativeAuthClientOptions) => Layer.effect(
    NativeAuthClient,
    Effect.gen(function* () {
      const cookieName = options.cookieName ?? "auth_session";
      const storageKey = options.storageKey ?? "effect-auth/session-token";
      const storage = options.storage;

      const httpClient = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequestEffect((request) => storage.getItem(storageKey).pipe(
          Effect.map((token) => token === null
            ? request
            : HttpClientRequest.setHeader(request, "cookie", `${cookieName}=${encodeURIComponent(token)}`)),
          Effect.orDie,
        )),
        HttpClient.tap((response) => {
          const token = sessionTokenFromSetCookie(cookieName, response.headers["set-cookie"]);
          if (token === undefined) {
            return Effect.void;
          }
          return (token === null ? storage.removeItem(storageKey) : storage.setItem(storageKey, token)).pipe(
            Effect.orDie,
          );
        }),
      );
      const client = yield* makeWith(httpClient, { baseUrl: options.baseUrl });

      const getSession = Effect.fn("NativeAuthClient.getSession")(() => client.auth.me({}));

      return {
        email: {
          requestPasswordReset: Effect.fn("NativeAuthClient.email.requestPasswordReset")((input) =>
            client.authEmail.requestPasswordReset({ payload: input })),
          requestVerification: Effect.fn("NativeAuthClient.email.requestVerification")((input) =>
            client.authEmail.requestVerification({ payload: input })),
          resetPassword: Effect.fn("NativeAuthClient.email.resetPassword")((input) =>
            client.authEmail.resetPassword({ payload: input })),
          signIn: Effect.fn("NativeAuthClient.email.signIn")((input) =>
            client.authEmail.signIn({ payload: input })),
          signUp: Effect.fn("NativeAuthClient.email.signUp")((input) =>
            client.authEmail.signUp({ payload: input })),
          verify: Effect.fn("NativeAuthClient.email.verify")((input) =>
            client.authEmail.verify({ payload: input })),
        },
        getSession,
        getSessionToken: Effect.fn("NativeAuthClient.getSessionToken")(() => storage.getItem(storageKey)),
        signIn: {
          social: Effect.fn("NativeAuthClient.signIn.social")(function* ({ provider }) {
            const url = new URL(signInUrl(provider, { baseUrl: options.baseUrl }));
            url.searchParams.set("redirectTo", options.callbackUrl);
            const callback = yield* options.openAuthSession({
              callbackUrl: options.callbackUrl,
              url: url.toString(),
            });
            if (callback !== null && URL.canParse(callback)) {
              const token = new URL(callback).searchParams.get("auth_token");
              if (token !== null) {
                yield* storage.setItem(storageKey, token);
              }
            }
            return yield* getSession();
          }),
        },
        signOut: Effect.fn("NativeAuthClient.signOut")(function* () {
          const session = yield* client.auth.logout({});
          yield* storage.removeItem(storageKey);
          return session;
        }),
      };
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer));
}
