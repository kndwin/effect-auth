import { Duration, Effect, Layer } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiSecurity, type HttpApi, type HttpApiGroup } from "effect/unstable/httpapi";
import { AuthEmail } from "./email";
import { authEmailGroup, authGroup, CurrentUser, RequireSession } from "./http";
import { AuthError, Ok, PublicSession, Unauthorized } from "./schema";
import { Auth, AuthConfig, isAppSchemeUrl, isTrustedOrigin } from "./server";
import type { AnyAuthPlugin, AuthConfigShape, CreateSessionResult } from "./server.schema";

export const sessionCookieName = (config: AuthConfigShape) => config.cookieName ?? "auth_session";

export const sessionCookieSecure = (config: AuthConfigShape) =>
  config.cookieSecure ?? config.appUrl.startsWith("https://");

const sessionCookieSecurityFor = (config: AuthConfigShape) => HttpApiSecurity.apiKey({
  in: "cookie",
  key: sessionCookieName(config),
});

export const setSessionCookie = (config: AuthConfigShape, token: string) => HttpApiBuilder.securitySetCookie(
  sessionCookieSecurityFor(config),
  token,
  {
    domain: config.cookieDomain,
    maxAge: Duration.seconds(config.sessionMaxAgeSeconds ?? 60 * 60 * 24 * 30),
    path: "/",
    sameSite: "lax",
    secure: sessionCookieSecure(config),
  },
);

export const clearSessionCookie = (config: AuthConfigShape) => HttpApiBuilder.securitySetCookie(
  sessionCookieSecurityFor(config),
  "",
  {
    domain: config.cookieDomain,
    maxAge: Duration.zero,
    path: "/",
    sameSite: "lax",
    secure: sessionCookieSecure(config),
  },
);

export const sessionTokenFromRequest = (config: AuthConfigShape, request: HttpServerRequest.HttpServerRequest) =>
  request.cookies[sessionCookieName(config)] ?? null;

// Rejects state-changing requests from untrusted origins. Requests without an
// Origin header (same-origin navigations, curl, server-to-server) pass.
const checkRequestOrigin = Effect.fn("AuthHttp.checkRequestOrigin")(function* (
  config: AuthConfigShape,
  request: HttpServerRequest.HttpServerRequest,
) {
  const origin = request.headers["origin"];
  if (origin !== undefined && !isTrustedOrigin(config, origin)) {
    return yield* Effect.fail(new AuthError({ error: "Untrusted request origin" }));
  }
});

export const toAuthError = (error: unknown) => new AuthError({
  error: error instanceof Error ? error.message : "Authentication failed",
});

type AnyApi = HttpApi.HttpApi<string, any>;

const authGroupLayer = (api: AnyApi) => HttpApiBuilder.group(
  api as HttpApi.HttpApi<string, typeof authGroup>,
  "auth",
  (handlers) =>
    handlers
      .handle("signIn", ({ params, query }) =>
        Effect.fn("AuthHttp.signIn")(function* () {
          const auth = yield* Auth;
          const url = yield* auth.handleSignIn({ provider: params.provider, redirectTo: query.redirectTo }).pipe(
            Effect.mapError(toAuthError),
          );
          return HttpServerResponse.redirect(url);
        })(),
      )
      .handle("callback", ({ params, query }) =>
        Effect.fn("AuthHttp.callback")(function* () {
          const auth = yield* Auth;
          const config = yield* AuthConfig;
          const result = yield* auth.handleCallback({
            code: query.code,
            provider: params.provider,
            state: query.state,
          }).pipe(Effect.mapError(toAuthError));
          yield* setSessionCookie(config, result.token);
          // Native apps can't read the cookie set inside the system browser, so
          // trusted app-scheme redirect targets get the session token appended.
          // Requires an explicit trustedOrigins allowlist — never for http(s).
          const handOffToken =
            isAppSchemeUrl(result.redirectTo) &&
            config.trustedOrigins !== undefined &&
            isTrustedOrigin(config, result.redirectTo);
          const location = handOffToken
            ? `${result.redirectTo}${result.redirectTo.includes("?") ? "&" : "?"}auth_token=${encodeURIComponent(result.token)}`
            : result.redirectTo;
          return HttpServerResponse.redirect(location);
        })(),
      )
      .handle("me", ({ request }) =>
        Effect.fn("AuthHttp.me")(function* () {
          const auth = yield* Auth;
          const config = yield* AuthConfig;
          const session = yield* auth.getCurrentUser(sessionTokenFromRequest(config, request)).pipe(
            Effect.mapError(toAuthError),
          );
          return new PublicSession({ session });
        })(),
      )
      .handle("logout", ({ request }) =>
        Effect.fn("AuthHttp.logout")(function* () {
          const auth = yield* Auth;
          const config = yield* AuthConfig;
          yield* checkRequestOrigin(config, request);
          yield* auth.logout(sessionTokenFromRequest(config, request)).pipe(Effect.mapError(toAuthError));
          yield* clearSessionCookie(config);
          return new PublicSession({ session: null });
        })(),
      ),
);

const sessionResponse = Effect.fn("AuthHttp.sessionResponse")(function* (result: CreateSessionResult) {
  const auth = yield* Auth;
  const config = yield* AuthConfig;
  const session = yield* auth.validateSession(result.token).pipe(Effect.mapError(toAuthError));
  yield* setSessionCookie(config, result.token);
  return new PublicSession({ session });
});

const authEmailGroupLayer = (api: AnyApi) => HttpApiBuilder.group(
  api as HttpApi.HttpApi<string, typeof authEmailGroup>,
  "authEmail",
  (handlers) =>
    handlers
      .handle("signUp", ({ payload, request }) =>
        Effect.fn("AuthEmailHttp.signUp")(function* () {
          const config = yield* AuthConfig;
          yield* checkRequestOrigin(config, request);
          const email = yield* AuthEmail;
          yield* email.signUp(payload).pipe(Effect.mapError(toAuthError));
          return new Ok({ ok: true });
        })(),
      )
      .handle("signIn", ({ payload, request }) =>
        Effect.fn("AuthEmailHttp.signIn")(function* () {
          const config = yield* AuthConfig;
          yield* checkRequestOrigin(config, request);
          const email = yield* AuthEmail;
          const result = yield* email.signIn(payload).pipe(Effect.mapError(toAuthError));
          return yield* sessionResponse(result);
        })(),
      )
      .handle("verify", ({ payload, request }) =>
        Effect.fn("AuthEmailHttp.verify")(function* () {
          const config = yield* AuthConfig;
          yield* checkRequestOrigin(config, request);
          const email = yield* AuthEmail;
          const result = yield* email.verifyEmail(payload).pipe(Effect.mapError(toAuthError));
          return yield* sessionResponse(result);
        })(),
      )
      .handle("requestVerification", ({ payload, request }) =>
        Effect.fn("AuthEmailHttp.requestVerification")(function* () {
          const config = yield* AuthConfig;
          yield* checkRequestOrigin(config, request);
          const email = yield* AuthEmail;
          yield* email.requestEmailVerification(payload).pipe(Effect.mapError(toAuthError));
          return new Ok({ ok: true });
        })(),
      )
      .handle("requestPasswordReset", ({ payload, request }) =>
        Effect.fn("AuthEmailHttp.requestPasswordReset")(function* () {
          const config = yield* AuthConfig;
          yield* checkRequestOrigin(config, request);
          const email = yield* AuthEmail;
          yield* email.requestPasswordReset(payload).pipe(Effect.mapError(toAuthError));
          return new Ok({ ok: true });
        })(),
      )
      .handle("resetPassword", ({ payload, request }) =>
        Effect.fn("AuthEmailHttp.resetPassword")(function* () {
          const config = yield* AuthConfig;
          yield* checkRequestOrigin(config, request);
          const email = yield* AuthEmail;
          const result = yield* email.resetPassword(payload).pipe(Effect.mapError(toAuthError));
          return yield* sessionResponse(result);
        })(),
      ),
);

type EmailRequirement<Groups extends HttpApiGroup.Any> =
  "authEmail" extends HttpApiGroup.Name<Groups> ? AuthEmail : never;

// Implements every effect-auth group present in the consumer's api: `authGroup`
// handlers always, `authEmail` handlers when the group was added, plus any plugin
// handler layers. Requiring AuthEmail only when authEmailGroup is in the api keeps
// OAuth-only apps compiling without an email method.
const layer = <Id extends string, Groups extends HttpApiGroup.Any>(
  api: HttpApi.HttpApi<Id, Groups>,
  options?: { readonly plugins?: ReadonlyArray<AnyAuthPlugin> },
): Layer.Layer<
  HttpApiGroup.ApiGroup<Id, "auth"> | HttpApiGroup.ApiGroup<Id, "authEmail">,
  never,
  Auth | AuthConfig | EmailRequirement<Groups>
> => {
  const groups = api.groups as Record<string, unknown>;
  const layers: Array<Layer.Layer<never, any, any>> = [];
  if (groups["auth"]) {
    layers.push(authGroupLayer(api));
  }
  if (groups["authEmail"]) {
    layers.push(authEmailGroupLayer(api));
  }
  for (const plugin of options?.plugins ?? []) {
    if (plugin.httpLayer) {
      layers.push(plugin.httpLayer(api));
    }
  }
  if (layers.length === 0) {
    throw new Error("AuthHttp.layer: the api contains neither authGroup nor authEmailGroup");
  }
  return Layer.mergeAll(...layers as [Layer.Layer<never, any, any>]) as unknown as Layer.Layer<
    HttpApiGroup.ApiGroup<Id, "auth"> | HttpApiGroup.ApiGroup<Id, "authEmail">,
    never,
    Auth | AuthConfig | EmailRequirement<Groups>
  >;
};

export const AuthHttp = { layer };

export const RequireSessionLive = Layer.effect(
  RequireSession,
  Effect.gen(function* () {
    const auth = yield* Auth;
    const config = yield* AuthConfig;
    return {
      session: (httpEffect) =>
        Effect.fn("RequireSession.session")(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const token = sessionTokenFromRequest(config, request);
          const session = token ? yield* Effect.orDie(auth.validateSession(token)) : null;
          if (!session) {
            return yield* Effect.fail(new Unauthorized({ message: "A valid session is required" }));
          }
          return yield* Effect.provideService(httpEffect, CurrentUser, session);
        })(),
    };
  }),
);
