import type { Effect } from "effect";
import type { AuthEmailClientShape } from "../client.schema";
import type { PublicSession } from "../schema";

export type NativeAuthStorage = {
  readonly getItem: (key: string) => Effect.Effect<string | null, unknown>;
  readonly removeItem: (key: string) => Effect.Effect<void, unknown>;
  readonly setItem: (key: string, value: string) => Effect.Effect<void, unknown>;
};

export type NativeAuthClientOptions = {
  readonly baseUrl: string | URL;
  readonly callbackUrl: string;
  readonly cookieName?: string;
  readonly openAuthSession: (input: {
    readonly callbackUrl: string;
    readonly url: string;
  }) => Effect.Effect<string | null, unknown>;
  readonly storage: NativeAuthStorage;
  readonly storageKey?: string;
};

export type NativeAuthClientShape = {
  readonly email: AuthEmailClientShape;
  readonly getSession: () => Effect.Effect<PublicSession, unknown>;
  readonly getSessionToken: () => Effect.Effect<string | null, unknown>;
  readonly signIn: {
    readonly social: (options: { readonly provider: string }) => Effect.Effect<PublicSession, unknown>;
  };
  readonly signOut: () => Effect.Effect<PublicSession, unknown>;
};
