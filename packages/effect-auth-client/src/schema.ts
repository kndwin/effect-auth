import { Schema } from "effect";

export class User extends Schema.Class<User>("User")({
  avatarUrl: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  email: Schema.NullOr(Schema.String),
  id: Schema.String,
  name: Schema.NullOr(Schema.String),
  updatedAt: Schema.String,
  username: Schema.optionalKey(Schema.NullOr(Schema.String)),
}) {}

export const UserSchema = User;

export class Session extends Schema.Class<Session>("Session")({
  createdAt: Schema.String,
  expiresAt: Schema.String,
  id: Schema.String,
  tokenHash: Schema.String,
  userId: Schema.String,
}) {}

export const SessionSchema = Session;

export class ProviderAccount extends Schema.Class<ProviderAccount>("ProviderAccount")({
  createdAt: Schema.String,
  provider: Schema.String,
  providerAccountId: Schema.String,
  userId: Schema.String,
}) {}

export const ProviderAccountSchema = ProviderAccount;

export class EmailIdentity extends Schema.Class<EmailIdentity>("EmailIdentity")({
  createdAt: Schema.String,
  email: Schema.String,
  emailVerifiedAt: Schema.NullOr(Schema.String),
  passwordHash: Schema.String,
  updatedAt: Schema.String,
  userId: Schema.String,
}) {}

export const EmailIdentitySchema = EmailIdentity;

export class EmailToken extends Schema.Class<EmailToken>("EmailToken")({
  createdAt: Schema.String,
  email: Schema.String,
  expiresAt: Schema.String,
  id: Schema.String,
  purpose: Schema.Union([Schema.Literal("verify-email"), Schema.Literal("reset-password")]),
  tokenHash: Schema.String,
}) {}

export const EmailTokenSchema = EmailToken;

export class PublicSessionInfo extends Schema.Class<PublicSessionInfo>("PublicSessionInfo")({
  createdAt: Schema.String,
  expiresAt: Schema.String,
  id: Schema.String,
}) {}

export const PublicSessionInfoSchema = PublicSessionInfo;

export class CurrentSession extends Schema.Class<CurrentSession>("CurrentSession")({
  session: PublicSessionInfo,
  user: UserSchema,
}) {}

export const CurrentSessionSchema = CurrentSession;

export class PublicSession extends Schema.Class<PublicSession>("PublicSession")({
  session: Schema.NullOr(CurrentSessionSchema),
}) {}

export const PublicSessionSchema = PublicSession;

export class AuthError extends Schema.Class<AuthError>("AuthError")({
  error: Schema.String,
}) {}

export const AuthErrorSchema = AuthError;

export class Ok extends Schema.Class<Ok>("Ok")({
  ok: Schema.Literal(true),
}) {}

export const OkSchema = Ok;

export class ProviderIdParams extends Schema.Class<ProviderIdParams>("ProviderIdParams")({
  provider: Schema.String,
}) {}

export const ProviderIdParamsSchema = ProviderIdParams;

export class OAuthSignInQuery extends Schema.Class<OAuthSignInQuery>("OAuthSignInQuery")({
  redirectTo: Schema.optionalKey(Schema.String),
}) {}

export const OAuthSignInQuerySchema = OAuthSignInQuery;

export class OAuthCallbackQuery extends Schema.Class<OAuthCallbackQuery>("OAuthCallbackQuery")({
  code: Schema.String,
  state: Schema.String,
}) {}

export const OAuthCallbackQuerySchema = OAuthCallbackQuery;

export class Unauthorized extends Schema.TaggedErrorClass<Unauthorized>()("Unauthorized", {
  message: Schema.String,
}) {}

export class AuthFailure extends Schema.TaggedErrorClass<AuthFailure>()("AuthFailure", {
  message: Schema.String,
}) {}
