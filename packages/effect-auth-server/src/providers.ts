import { Context, Effect, Layer } from "effect";
import type { AuthProvider, AuthProvidersShape } from "./providers.schema";

export type { AuthProvider, AuthProvidersShape } from "./providers.schema";
export { OAuthProfile, OAuthTokens } from "./providers.schema";
export { authorizationUrl, getJson, postFormJson } from "./providers/oauth";

export class AuthProviders extends Context.Service<AuthProviders, AuthProvidersShape>()("effect-auth/AuthProviders") {
  static readonly layer = (providers: ReadonlyArray<AuthProvider>) =>
    Layer.sync(AuthProviders, () => ({
      get: Effect.fn("AuthProviders.get")((provider: string) => Effect.succeed(
        providers.find((item) => item.id === provider) ?? null,
      )),
      list: Effect.succeed(providers),
    }));

  static readonly fromIterable = AuthProviders.layer;
}
