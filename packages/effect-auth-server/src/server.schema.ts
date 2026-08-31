import { Schema, type Effect, type Layer } from "effect";
import type { HttpApi } from "effect/unstable/httpapi";
import type { AuthProvider } from "./providers.schema";
import type { CurrentSession } from "./schema";
import type { Auth, AuthConfig } from "./server";
import type { AuthStorage } from "./storage";

export class AuthConfigModel extends Schema.Class<AuthConfigModel>("AuthConfig")({
  // OAuth sign-ins from these providers link to an existing user with the
  // same email instead of creating a new user. Only list providers that
  // verify email addresses.
  accountLinking: Schema.optionalKey(Schema.Struct({
    trustedProviders: Schema.Array(Schema.String),
  })),
  appName: Schema.optionalKey(Schema.String),
  appUrl: Schema.String,
  // Share the session cookie across subdomains (e.g. ".example.com").
  cookieDomain: Schema.optionalKey(Schema.String),
  cookieName: Schema.optionalKey(Schema.String),
  cookieSecure: Schema.optionalKey(Schema.Boolean),
  sessionMaxAgeSeconds: Schema.optionalKey(Schema.Number),
  // When set, state-changing auth endpoints reject requests whose Origin
  // header is present but not listed. Entries ending in "://" (app schemes
  // like "myapp://") match by prefix; anything else matches exactly.
  trustedOrigins: Schema.optionalKey(Schema.Array(Schema.String)),
}) {}

export const AuthConfigSchema = AuthConfigModel;

export type AuthConfigInput = typeof AuthConfigSchema.Type;

export type AuthConfigShape = AuthConfigInput & {
  readonly callbackPath?: (provider: string) => string;
};

export const AuthMethodTag = "effect-auth/AuthMethod" as const;

export type AuthMethodContext = {
  readonly config: AuthConfigShape;
  // The core Auth layer, memoized by reference — method layers can depend on it
  // without building a second Auth instance.
  readonly core: Layer.Layer<Auth | AuthConfig, never, AuthStorage>;
};

// A self-describing sign-in method: `Auth.define` collects plain `AuthProvider`s
// into the OAuth flow, and merges each method's layer into its output. `Provides`
// tracks the services the method contributes at the type level.
export type AuthMethod<Provides = never> = {
  readonly _tag: typeof AuthMethodTag;
  readonly id: string;
  readonly layer: (context: AuthMethodContext) => Layer.Layer<Provides, never, AuthStorage>;
};

export type AuthMethodInput = AuthProvider | AuthMethod<any>;

export type AuthMethodsProvides<Item> = Item extends AuthMethod<infer Provides> ? Provides : never;

export const isAuthMethod = (item: AuthMethodInput): item is AuthMethod<any> =>
  "_tag" in item && item._tag === AuthMethodTag;

// A plugin contributes service layers via `Auth.define({ plugins })` and HTTP
// handler layers via `AuthHttp.layer(api, { plugins })`. `Provides`/`Requires`
// surface the plugin's services in Auth.define's layer type (e.g. the
// organization plugin provides Organization and requires OrganizationStorage).
export type AuthPluginShape<Provides = never, Requires = never> = {
  readonly id: string;
  readonly layer?: (context: AuthMethodContext) => Layer.Layer<Provides, never, AuthStorage | Requires>;
  readonly httpLayer?: (api: HttpApi.HttpApi<string, any>) => Layer.Layer<any, never, any>;
};

export type AnyAuthPlugin = AuthPluginShape<any, any>;

export type AuthPluginProvides<Plugin> = Plugin extends AuthPluginShape<infer Provides, any> ? Provides : never;

export type AuthPluginRequires<Plugin> = Plugin extends AuthPluginShape<any, infer Requires> ? Requires : never;

export type AuthDefineOptions<
  Methods extends ReadonlyArray<AuthMethodInput> = ReadonlyArray<AuthMethodInput>,
  Plugins extends ReadonlyArray<AnyAuthPlugin> = ReadonlyArray<never>,
> = AuthConfigShape & {
  readonly auth: Methods;
  readonly plugins?: Plugins;
};

export class CreateSessionResult extends Schema.Class<CreateSessionResult>("CreateSessionResult")({
  expiresAt: Schema.String,
  token: Schema.String,
}) {}

export class HandleCallbackInput extends Schema.Class<HandleCallbackInput>("HandleCallbackInput")({
  code: Schema.String,
  provider: Schema.String,
  state: Schema.String,
}) {}

export class HandleCallbackResult extends Schema.Class<HandleCallbackResult>("HandleCallbackResult")({
  redirectTo: Schema.String,
  token: Schema.String,
}) {}

export class HandleSignInInput extends Schema.Class<HandleSignInInput>("HandleSignInInput")({
  provider: Schema.String,
  redirectTo: Schema.optionalKey(Schema.String),
}) {}

export type AuthShape = {
  readonly createSession: (userId: string) => Effect.Effect<CreateSessionResult, unknown>;
  readonly getCurrentUser: (token: string | null | undefined) => Effect.Effect<CurrentSession | null, unknown>;
  readonly handleCallback: (input: HandleCallbackInput) => Effect.Effect<HandleCallbackResult, unknown>;
  readonly handleSignIn: (input: HandleSignInInput) => Effect.Effect<URL, unknown>;
  readonly logout: (token: string | null | undefined) => Effect.Effect<void, unknown>;
  readonly revokeSession: (token: string) => Effect.Effect<void, unknown>;
  readonly validateSession: (token: string) => Effect.Effect<CurrentSession | null, unknown>;
};
