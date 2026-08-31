import { Context, Effect, Layer } from "effect";
import { AuthClient } from "../client";
import type { AuthClientShape } from "../client.schema";
import type { BrowserAuthClientOptions, BrowserAuthClientShape } from "./browser.schema";

export {
  BrowserAuthClientOptionsSchema,
  BrowserAuthClientSocialSignInOptionsSchema,
} from "./browser.schema";
export type {
  BrowserAuthClientOptions,
  BrowserAuthClientOptionsInput,
  BrowserAuthClientShape,
  BrowserAuthClientSocialSignInOptions,
} from "./browser.schema";

export class BrowserAuthClient extends Context.Service<BrowserAuthClient, BrowserAuthClientShape>()(
  "effect-auth/BrowserAuthClient",
) {
  static readonly make = (client: AuthClientShape, options: BrowserAuthClientOptions = {}): BrowserAuthClientShape => {
    const redirect = options.redirect ?? ((url: string) => window.location.assign(url));

    return {
      email: client.email,
      getSession: client.getSession,
      signIn: {
        social: Effect.fn("BrowserAuthClient.signIn.social")(({ provider }) => Effect.sync(() => redirect(client.signInUrl(provider)))),
      },
      signOut: client.signOut,
    };
  };

  static readonly layer = (options: BrowserAuthClientOptions = {}) => Layer.effect(
    BrowserAuthClient,
    Effect.gen(function* () {
      const client = yield* AuthClient;
      return BrowserAuthClient.make(client, options);
    }),
  ).pipe(Layer.provide(AuthClient.fetchLayer(options)));
}
