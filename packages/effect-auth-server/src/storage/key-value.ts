import { Effect, Layer, Schema } from "effect";
import { KeyValueStore } from "effect/unstable/persistence";
import {
  EmailIdentity,
  EmailIdentitySchema,
  EmailTokenSchema,
  ProviderAccount,
  ProviderAccountSchema,
  SessionSchema,
  User,
  UserSchema,
  type Session,
} from "../schema";
import { AuthStorage, type OAuthState } from "../storage";
import { OAuthStateSchema } from "../storage.schema";
import type { KeyValueStorageOptions } from "./key-value.schema";

export type { KeyValueStorageOptions } from "./key-value.schema";

const jsonSchema = <S extends Schema.Constraint>(schema: S) => Schema.fromJsonString(schema);

const decodeJson = <S extends Schema.Constraint>(schema: S) => (value: string | undefined) =>
  value === undefined
    ? Effect.succeed(null)
    : Schema.decodeUnknownEffect(jsonSchema(schema))(value);

const encodeJson = <S extends Schema.Constraint>(schema: S) => (value: S["Type"]) =>
  Schema.encodeEffect(jsonSchema(schema))(value);

export const layer = (options: KeyValueStorageOptions = {}) => Layer.effect(
  AuthStorage,
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore;
    const prefix = options.prefix ?? "effect-auth";
    const key = (...parts: ReadonlyArray<string>) => [prefix, ...parts].join(":");
    const getJson = <S extends Schema.Constraint>(schema: S) => (storageKey: string) =>
      store.get(storageKey).pipe(Effect.flatMap(decodeJson(schema)));
    const setJson = <S extends Schema.Constraint>(schema: S) => (storageKey: string, value: S["Type"]) =>
      encodeJson(schema)(value).pipe(Effect.flatMap((encoded) => store.set(storageKey, encoded)));

    return {
      createSession: Effect.fn("AuthStorageKeyValue.createSession")((input) =>
        setJson(SessionSchema)(key("session", input.id), input).pipe(Effect.as(input as Session))),
      deleteSession: Effect.fn("AuthStorageKeyValue.deleteSession")((sessionId: string) => store.remove(key("session", sessionId))),
      findSession: Effect.fn("AuthStorageKeyValue.findSession")((sessionId: string) => getJson(SessionSchema)(key("session", sessionId))),
      findUser: Effect.fn("AuthStorageKeyValue.findUser")((userId: string) => getJson(UserSchema)(key("user", userId))),
      findUserByEmail: Effect.fn("AuthStorageKeyValue.findUserByEmail")(function* (email: string) {
        const identity = yield* getJson(EmailIdentitySchema)(key("email", email.toLowerCase()));
        return identity ? yield* getJson(UserSchema)(key("user", identity.userId)) : null;
      }),
      findUserByProviderAccount: Effect.fn("AuthStorageKeyValue.findUserByProviderAccount")(function* (provider: string, providerAccountId: string) {
        const account = yield* getJson(ProviderAccountSchema)(key("provider", provider, providerAccountId));
        return account ? yield* getJson(UserSchema)(key("user", account.userId)) : null;
      }),
      findEmailIdentity: Effect.fn("AuthStorageKeyValue.findEmailIdentity")((email: string) => getJson(EmailIdentitySchema)(key("email", email.toLowerCase()))),
      findEmailToken: Effect.fn("AuthStorageKeyValue.findEmailToken")((tokenId: string) => getJson(EmailTokenSchema)(key("email-token", tokenId))),
      getOAuthState: Effect.fn("AuthStorageKeyValue.getOAuthState")((state: string) => getJson(OAuthStateSchema)(key("oauth-state", state))),
      removeEmailToken: Effect.fn("AuthStorageKeyValue.removeEmailToken")((tokenId: string) => store.remove(key("email-token", tokenId))),
      removeOAuthState: Effect.fn("AuthStorageKeyValue.removeOAuthState")((state: string) => store.remove(key("oauth-state", state))),
      setEmailToken: Effect.fn("AuthStorageKeyValue.setEmailToken")((input) =>
        setJson(EmailTokenSchema)(key("email-token", input.id), input).pipe(Effect.as(input))),
      setOAuthState: Effect.fn("AuthStorageKeyValue.setOAuthState")((state: OAuthState) =>
        setJson(OAuthStateSchema)(key("oauth-state", state.state), state)),
      updateEmailPassword: Effect.fn("AuthStorageKeyValue.updateEmailPassword")(function* (input) {
        const storageKey = key("email", input.email.toLowerCase());
        const identity = yield* getJson(EmailIdentitySchema)(storageKey);
        if (!identity) {
          return yield* Effect.fail(new Error("Email identity not found"));
        }
        const next = new EmailIdentity({
          ...identity,
          passwordHash: input.passwordHash,
          updatedAt: new Date().toISOString(),
        });
        yield* setJson(EmailIdentitySchema)(storageKey, next);
        return next;
      }),
      verifyEmailIdentity: Effect.fn("AuthStorageKeyValue.verifyEmailIdentity")(function* (email: string, verifiedAt: string) {
        const storageKey = key("email", email.toLowerCase());
        const identity = yield* getJson(EmailIdentitySchema)(storageKey);
        if (!identity) {
          return yield* Effect.fail(new Error("Email identity not found"));
        }
        const next = new EmailIdentity({
          ...identity,
          emailVerifiedAt: verifiedAt,
          updatedAt: verifiedAt,
        });
        yield* setJson(EmailIdentitySchema)(storageKey, next);
        return next;
      }),
      upsertEmailIdentity: Effect.fn("AuthStorageKeyValue.upsertEmailIdentity")(function* (input) {
        const now = new Date().toISOString();
        const email = input.email.toLowerCase();
        const previous = yield* getJson(EmailIdentitySchema)(key("email", email));
        const userId = previous?.userId ?? input.user.id ?? crypto.randomUUID();
        const previousUser = yield* getJson(UserSchema)(key("user", userId));
        const user = new User({
          avatarUrl: input.user.avatarUrl ?? previousUser?.avatarUrl ?? null,
          createdAt: previousUser?.createdAt ?? now,
          email,
          id: userId,
          name: input.user.name ?? previousUser?.name ?? null,
          updatedAt: now,
          username: input.user.username ?? previousUser?.username ?? null,
        });
        const identity = new EmailIdentity({
          createdAt: previous?.createdAt ?? now,
          email,
          emailVerifiedAt: input.emailVerifiedAt ?? previous?.emailVerifiedAt ?? null,
          passwordHash: input.passwordHash,
          updatedAt: now,
          userId,
        });
        yield* setJson(UserSchema)(key("user", userId), user);
        yield* setJson(EmailIdentitySchema)(key("email", email), identity);
        return { identity, user };
      }),
      upsertProviderAccount: Effect.fn("AuthStorageKeyValue.upsertProviderAccount")(function* (input) {
        const now = new Date().toISOString();
        const existing = yield* getJson(ProviderAccountSchema)(key("provider", input.provider, input.providerAccountId));
        const userId = existing?.userId ?? input.user.id ?? crypto.randomUUID();
        const previous = yield* getJson(UserSchema)(key("user", userId));
        const user = new User({
          avatarUrl: input.user.avatarUrl ?? previous?.avatarUrl ?? null,
          createdAt: previous?.createdAt ?? now,
          email: input.user.email ?? previous?.email ?? null,
          id: userId,
          name: input.user.name ?? previous?.name ?? null,
          updatedAt: now,
          username: input.user.username ?? previous?.username ?? null,
        });
        const account = new ProviderAccount({
          createdAt: existing?.createdAt ?? now,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          userId,
        });
        yield* setJson(UserSchema)(key("user", userId), user);
        yield* setJson(ProviderAccountSchema)(key("provider", input.provider, input.providerAccountId), account);
        return { account, user };
      }),
    };
  }),
);

export const provide = (options: KeyValueStorageOptions = {}) => Layer.provide(layer(options));

export const AuthStorageKeyValue = { layer, provide };
