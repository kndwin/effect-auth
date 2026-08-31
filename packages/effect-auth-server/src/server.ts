import { Context, Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import { createHash, randomUUID } from "node:crypto";
import { AuthProviders } from "./providers";
import type { AuthProvider } from "./providers.schema";
import { AuthFailure, CurrentSession, PublicSessionInfo, Unauthorized } from "./schema";
import { AuthStorage } from "./storage";
import {
  CreateSessionResult,
  HandleCallbackResult,
  isAuthMethod,
  type AnyAuthPlugin,
  type AuthConfigShape,
  type AuthDefineOptions,
  type AuthMethod,
  type AuthMethodInput,
  type AuthMethodsProvides,
  type AuthPluginProvides,
  type AuthPluginRequires,
  type AuthShape,
} from "./server.schema";
import { resolveUrl, toAbsoluteBaseUrl } from "./url";

export type {
  AnyAuthPlugin,
  AuthConfigShape,
  AuthDefineOptions,
  AuthMethod,
  AuthMethodContext,
  AuthMethodInput,
  AuthPluginProvides,
  AuthPluginRequires,
  AuthPluginShape,
  AuthShape,
} from "./server.schema";
export { isAuthMethod } from "./server.schema";

export type AuthMakeOptions<
  M extends ReadonlyArray<AuthMethodInput> = ReadonlyArray<AuthMethodInput>,
  P extends ReadonlyArray<AnyAuthPlugin> = ReadonlyArray<never>,
> = AuthConfigShape & {
  readonly auth?: M;
  readonly plugins?: P;
};

export interface AuthInstance<
  M extends ReadonlyArray<AuthMethodInput> = ReadonlyArray<AuthMethodInput>,
  P extends ReadonlyArray<AnyAuthPlugin> = ReadonlyArray<never>,
> {
  readonly _tag: "AuthInstance";
  readonly options: AuthMakeOptions<M, P>;
  toLayer(): Layer.Layer<
    Auth | AuthConfig | AuthMethodsProvides<M[number]> | AuthPluginProvides<P[number]>,
    never,
    AuthStorage | AuthPluginRequires<P[number]>
  >;
}

export class AuthConfig extends Context.Service<AuthConfig, AuthConfigShape>()("effect-auth/AuthConfig") {}

export class Auth extends Context.Service<Auth, AuthShape>()("effect-auth/Auth") {
  static readonly Default = Layer.effect(
    Auth,
    Effect.gen(function* () {
      const config = yield* AuthConfig;
      const providers = yield* AuthProviders;
      const storage = yield* AuthStorage;
      const httpClient = yield* HttpClient.HttpClient;
      const cookieName = config.cookieName ?? "auth_session";
      const maxAgeSeconds = config.sessionMaxAgeSeconds ?? 60 * 60 * 24 * 30;
      const callbackPath = config.callbackPath ?? ((provider: string) => `/auth/${provider}/callback`);

      const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
      const nowIso = () => new Date().toISOString();
      const appUrl = toAbsoluteBaseUrl(config.appUrl);
      const redirectUri = (provider: string) => resolveUrl(callbackPath(provider), appUrl);

      const createSession = Effect.fn("Auth.createSession")(function* (userId: string) {
        const token = `session_${randomUUID()}.${randomUUID()}`;
        const createdAt = nowIso();
        const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();
        yield* storage.createSession({
          createdAt,
          expiresAt,
          id: token.slice(0, token.indexOf(".")),
          tokenHash: hashToken(token),
          userId,
        });
        return new CreateSessionResult({ expiresAt, token });
      });

      const validateSession = Effect.fn("Auth.validateSession")(function* (token: string) {
        const sessionId = token.slice(0, token.indexOf("."));
        if (!sessionId) {
          return null;
        }
        const session = yield* storage.findSession(sessionId);
        if (!session || session.tokenHash !== hashToken(token) || new Date(session.expiresAt).getTime() <= Date.now()) {
          return null;
        }
        const user = yield* storage.findUser(session.userId);
        if (!user) {
          return null;
        }
        return new CurrentSession({
          session: new PublicSessionInfo({
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            id: session.id,
          }),
          user,
        });
      });

      const revokeSession = Effect.fn("Auth.revokeSession")((token: string) => {
        const sessionId = token.slice(0, token.indexOf("."));
        return sessionId ? storage.deleteSession(sessionId) : Effect.void;
      });

      return {
        createSession,
        getCurrentUser: Effect.fn("Auth.getCurrentUser")((token: string | null | undefined) => token ? validateSession(token) : Effect.succeed(null)),
        handleCallback: Effect.fn("Auth.handleCallback")(function* ({ code, provider, state }) {
          const oauthState = yield* storage.getOAuthState(state);
          if (!oauthState || oauthState.provider !== provider) {
            return yield* Effect.fail(new Unauthorized({ message: "Invalid OAuth state" }));
          }
          yield* storage.removeOAuthState(state);
          const authProvider = yield* providers.get(provider);
          if (!authProvider) {
            return yield* Effect.fail(new AuthFailure({ message: `Unknown auth provider: ${provider}` }));
          }
          const tokens = yield* authProvider.exchangeCode({ code, redirectUri: redirectUri(provider) }).pipe(
            Effect.provideService(HttpClient.HttpClient, httpClient),
          );
          const profile = yield* authProvider.getProfile(tokens).pipe(
            Effect.provideService(HttpClient.HttpClient, httpClient),
          );
          // Trusted providers link to an existing user with the same email
          // instead of creating a duplicate user for the first OAuth sign-in.
          const linkByEmail =
            (config.accountLinking?.trustedProviders.includes(provider) ?? false) && profile.email
              ? yield* storage.findUserByEmail(profile.email)
              : null;
          const { user } = yield* storage.upsertProviderAccount({
            provider,
            providerAccountId: profile.id,
            user: {
              avatarUrl: profile.avatarUrl ?? null,
              email: profile.email ?? null,
              id: linkByEmail?.id,
              name: profile.name ?? null,
              username: profile.username ?? null,
            },
          });
          const session = yield* createSession(user.id);
          return new HandleCallbackResult({ redirectTo: oauthState.redirectTo ?? appUrl, token: session.token });
        }),
        handleSignIn: Effect.fn("Auth.handleSignIn")(function* ({ provider, redirectTo }) {
          const authProvider = yield* providers.get(provider);
          if (!authProvider) {
            return yield* Effect.fail(new AuthFailure({ message: `Unknown auth provider: ${provider}` }));
          }
          if (redirectTo !== undefined && !isTrustedRedirect(config, redirectTo)) {
            return yield* Effect.fail(new Unauthorized({ message: "Untrusted redirect target" }));
          }
          const state = randomUUID();
          yield* storage.setOAuthState({ createdAt: nowIso(), provider, redirectTo, state });
          return yield* authProvider.createAuthorizationUrl({ redirectUri: redirectUri(provider), state });
        }),
        logout: Effect.fn("Auth.logout")((token: string | null | undefined) => token ? revokeSession(token) : Effect.void),
        revokeSession,
        validateSession,
      };
    }),
  );

  static readonly layerConfig = (config: AuthConfigShape) => Layer.succeed(AuthConfig, config);

  static readonly make = <
    const M extends ReadonlyArray<AuthMethodInput>,
    const P extends ReadonlyArray<AnyAuthPlugin> = ReadonlyArray<never>,
  >(
    options: AuthMakeOptions<M, P>,
  ): AuthInstance<M, P> => {
    const instance: AuthInstance<M, P> = {
      _tag: "AuthInstance",
      options,
      toLayer: () => Auth.toLayer(instance),
    };
    return instance;
  };

  static readonly toLayer = <
    M extends ReadonlyArray<AuthMethodInput>,
    P extends ReadonlyArray<AnyAuthPlugin>,
  >(
    instance: AuthInstance<M, P>,
  ): Layer.Layer<
    Auth | AuthConfig | AuthMethodsProvides<M[number]> | AuthPluginProvides<P[number]>,
    never,
    AuthStorage | AuthPluginRequires<P[number]>
  > => {
    const { auth = [] as unknown as M, plugins = [] as unknown as P, ...config } = instance.options as AuthMakeOptions<M, P>;
    return Auth.define({
      ...(config as AuthConfigShape),
      auth: auth as M,
      plugins: plugins as P,
    } as AuthDefineOptions<M, P>);
  };

  // One composition point: plain `AuthProvider`s become OAuth sign-in, `AuthMethod`s
  // (e.g. EmailAndPassword.define) contribute their own service layers, and plugins
  // contribute theirs. Also exposes AuthConfig so HTTP layers and middleware can
  // read cookie settings without the consumer providing the config a second time.
  static readonly define = <
    const Methods extends ReadonlyArray<AuthMethodInput>,
    const Plugins extends ReadonlyArray<AnyAuthPlugin> = ReadonlyArray<never>,
  >(
    { auth, plugins, ...config }: AuthDefineOptions<Methods, Plugins>,
  ): Layer.Layer<
    Auth | AuthConfig | AuthMethodsProvides<Methods[number]> | AuthPluginProvides<Plugins[number]>,
    never,
    AuthStorage | AuthPluginRequires<Plugins[number]>
  > => {
    const providers: Array<AuthProvider> = [];
    const methods: Array<AuthMethod<any>> = [];
    for (const item of auth) {
      if (isAuthMethod(item)) {
        methods.push(item);
      } else {
        providers.push(item);
      }
    }
    const core = Layer.mergeAll(
      Auth.Default.pipe(
        Layer.provide(Auth.layerConfig(config)),
        Layer.provide(AuthProviders.layer(providers)),
        Layer.provide(FetchHttpClient.layer),
      ),
      Auth.layerConfig(config),
    );
    const context = { config, core };
    const layers: Array<Layer.Layer<never, any, any>> = [
      core,
      ...methods.map((method) => method.layer(context)),
      ...(plugins ?? []).flatMap((plugin) => plugin.layer ? [plugin.layer(context)] : []),
    ];
    return Layer.mergeAll(...layers as [Layer.Layer<never, any, any>]) as unknown as Layer.Layer<
      Auth | AuthConfig | AuthMethodsProvides<Methods[number]> | AuthPluginProvides<Plugins[number]>,
      never,
      AuthStorage | AuthPluginRequires<Plugins[number]>
    >;
  };
}

export const isTrustedOrigin = (config: AuthConfigShape, origin: string) =>
  config.trustedOrigins === undefined ||
  config.trustedOrigins.some((trusted) => trusted.endsWith("://") ? origin.startsWith(trusted) : origin === trusted);

export const isAppSchemeUrl = (target: string) =>
  /^[a-z][a-z0-9+.-]*:\/\//i.test(target) && !/^https?:\/\//i.test(target);

// Open-redirect guard for handleSignIn's redirectTo: relative targets always
// pass; absolute targets must match trustedOrigins when an allowlist is set.
export const isTrustedRedirect = (config: AuthConfigShape, target: string) => {
  if (config.trustedOrigins === undefined || !/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) {
    return true;
  }
  if (isAppSchemeUrl(target)) {
    return isTrustedOrigin(config, target);
  }
  return URL.canParse(target) && isTrustedOrigin(config, new URL(target).origin);
};

export const makeSessionCookie = (token: string, options: { readonly maxAgeSeconds?: number; readonly name?: string; readonly secure?: boolean } = {}) => [
  `${options.name ?? "auth_session"}=${encodeURIComponent(token)}`,
  "Path=/",
  "HttpOnly",
  "SameSite=Lax",
  options.secure ? "Secure" : null,
  typeof options.maxAgeSeconds === "number" ? `Max-Age=${options.maxAgeSeconds}` : null,
].filter(Boolean).join("; ");

export const expireSessionCookie = (options: { readonly name?: string; readonly secure?: boolean } = {}) =>
  makeSessionCookie("", { maxAgeSeconds: 0, name: options.name, secure: options.secure });

export { AuthProviders } from "./providers";
export { AuthStorage } from "./storage";
export { authApi, authEmailGroup, authGroup, CurrentUser, RequireSession, sessionCookieSecurity } from "./http";
export { AuthHttp, clearSessionCookie, RequireSessionLive, setSessionCookie } from "./http.live";
