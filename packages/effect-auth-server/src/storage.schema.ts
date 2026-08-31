import { Schema, type Effect } from "effect";
import type { EmailIdentity, EmailToken, ProviderAccount, Session, User } from "./schema";

export class CreateUserInput extends Schema.Class<CreateUserInput>("CreateUserInput")({
  avatarUrl: Schema.optionalKey(Schema.NullOr(Schema.String)),
  email: Schema.optionalKey(Schema.NullOr(Schema.String)),
  id: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  username: Schema.optionalKey(Schema.NullOr(Schema.String)),
}) {}

export class UpsertProviderAccountInput extends Schema.Class<UpsertProviderAccountInput>(
  "UpsertProviderAccountInput",
)({
  provider: Schema.String,
  providerAccountId: Schema.String,
  user: CreateUserInput,
}) {}

export class CreateSessionInput extends Schema.Class<CreateSessionInput>("CreateSessionInput")({
  createdAt: Schema.String,
  expiresAt: Schema.String,
  id: Schema.String,
  tokenHash: Schema.String,
  userId: Schema.String,
}) {}

export class OAuthState extends Schema.Class<OAuthState>("OAuthState")({
  createdAt: Schema.String,
  provider: Schema.String,
  redirectTo: Schema.optionalKey(Schema.String),
  state: Schema.String,
}) {}

export const CreateUserInputSchema = CreateUserInput;
export const UpsertProviderAccountInputSchema = UpsertProviderAccountInput;
export const CreateSessionInputSchema = CreateSessionInput;
export const OAuthStateSchema = OAuthState;

export class UpsertEmailIdentityInput extends Schema.Class<UpsertEmailIdentityInput>(
  "UpsertEmailIdentityInput",
)({
  email: Schema.String,
  emailVerifiedAt: Schema.optionalKey(Schema.NullOr(Schema.String)),
  passwordHash: Schema.String,
  user: CreateUserInput,
}) {}

export class SetEmailTokenInput extends Schema.Class<SetEmailTokenInput>("SetEmailTokenInput")({
  createdAt: Schema.String,
  email: Schema.String,
  expiresAt: Schema.String,
  id: Schema.String,
  purpose: Schema.Union([Schema.Literal("verify-email"), Schema.Literal("reset-password")]),
  tokenHash: Schema.String,
}) {}

export class UpdateEmailPasswordInput extends Schema.Class<UpdateEmailPasswordInput>(
  "UpdateEmailPasswordInput",
)({
  email: Schema.String,
  passwordHash: Schema.String,
}) {}

export const UpsertEmailIdentityInputSchema = UpsertEmailIdentityInput;
export const SetEmailTokenInputSchema = SetEmailTokenInput;
export const UpdateEmailPasswordInputSchema = UpdateEmailPasswordInput;

export type AuthStorageShape = {
  readonly createSession: (input: CreateSessionInput) => Effect.Effect<Session, unknown>;
  readonly deleteSession: (sessionId: string) => Effect.Effect<void, unknown>;
  readonly findSession: (sessionId: string) => Effect.Effect<Session | null, unknown>;
  readonly findUser: (userId: string) => Effect.Effect<User | null, unknown>;
  readonly findUserByEmail: (email: string) => Effect.Effect<User | null, unknown>;
  readonly findUserByProviderAccount: (provider: string, providerAccountId: string) => Effect.Effect<User | null, unknown>;
  readonly findEmailIdentity: (email: string) => Effect.Effect<EmailIdentity | null, unknown>;
  readonly findEmailToken: (tokenId: string) => Effect.Effect<EmailToken | null, unknown>;
  readonly getOAuthState: (state: string) => Effect.Effect<OAuthState | null, unknown>;
  readonly removeOAuthState: (state: string) => Effect.Effect<void, unknown>;
  readonly removeEmailToken: (tokenId: string) => Effect.Effect<void, unknown>;
  readonly setOAuthState: (state: OAuthState) => Effect.Effect<void, unknown>;
  readonly setEmailToken: (input: SetEmailTokenInput) => Effect.Effect<EmailToken, unknown>;
  readonly updateEmailPassword: (input: UpdateEmailPasswordInput) => Effect.Effect<EmailIdentity, unknown>;
  readonly verifyEmailIdentity: (email: string, verifiedAt: string) => Effect.Effect<EmailIdentity, unknown>;
  readonly upsertEmailIdentity: (input: UpsertEmailIdentityInput) => Effect.Effect<{ readonly identity: EmailIdentity; readonly user: User }, unknown>;
  readonly upsertProviderAccount: (input: UpsertProviderAccountInput) => Effect.Effect<{ readonly account: ProviderAccount; readonly user: User }, unknown>;
};
