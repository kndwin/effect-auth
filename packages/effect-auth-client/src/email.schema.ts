import { Schema, type Effect } from "effect";
import type { CreateSessionResult } from "./server.schema";

export class AuthEmailConfigModel extends Schema.Class<AuthEmailConfigModel>("AuthEmailConfig")({
  appName: Schema.String,
  appUrl: Schema.optionalKey(Schema.String),
  from: Schema.String,
  resetPasswordMaxAgeSeconds: Schema.optionalKey(Schema.Number),
  verificationMaxAgeSeconds: Schema.optionalKey(Schema.Number),
}) {}

export const AuthEmailConfigSchema = AuthEmailConfigModel;

export type AuthEmailConfigInput = typeof AuthEmailConfigSchema.Type;

export type PasswordHasherShape = {
  readonly hash: (password: string) => Effect.Effect<string, unknown>;
  readonly needsRehash?: (hash: string) => boolean;
  readonly verify: (input: {
    readonly hash: string;
    readonly password: string;
  }) => Effect.Effect<boolean, unknown>;
};

export type AuthEmailConfigShape = AuthEmailConfigInput & {
  readonly passwordHasher?: PasswordHasherShape;
  readonly resetPasswordPath?: (token: string) => string;
  readonly signUpPolicy?: (email: string) => Effect.Effect<boolean, unknown>;
  readonly verificationPath?: (token: string) => string;
};

export type EmailAndPasswordDefineOptions = Omit<AuthEmailConfigShape, "appName" | "appUrl"> & {
  readonly appName?: string;
  readonly sender: EmailSenderShape;
};

export class EmailMessage extends Schema.Class<EmailMessage>("EmailMessage")({
  from: Schema.String,
  html: Schema.String,
  subject: Schema.String,
  text: Schema.optionalKey(Schema.String),
  to: Schema.String,
}) {}

export class SignUpWithEmailInput extends Schema.Class<SignUpWithEmailInput>("SignUpWithEmailInput")({
  email: Schema.String,
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  password: Schema.String,
  redirectTo: Schema.optionalKey(Schema.String),
}) {}

export class SignInWithEmailInput extends Schema.Class<SignInWithEmailInput>("SignInWithEmailInput")({
  email: Schema.String,
  password: Schema.String,
}) {}

export class RequestEmailVerificationInput extends Schema.Class<RequestEmailVerificationInput>(
  "RequestEmailVerificationInput",
)({
  email: Schema.String,
  redirectTo: Schema.optionalKey(Schema.String),
}) {}

export class VerifyEmailInput extends Schema.Class<VerifyEmailInput>("VerifyEmailInput")({
  token: Schema.String,
}) {}

export class RequestPasswordResetInput extends Schema.Class<RequestPasswordResetInput>(
  "RequestPasswordResetInput",
)({
  email: Schema.String,
  redirectTo: Schema.optionalKey(Schema.String),
}) {}

export class ResetPasswordInput extends Schema.Class<ResetPasswordInput>("ResetPasswordInput")({
  password: Schema.String,
  token: Schema.String,
}) {}

export type EmailSenderShape = {
  readonly send: (message: EmailMessage) => Effect.Effect<void, unknown>;
};

export type AuthEmailShape = {
  readonly requestEmailVerification: (input: RequestEmailVerificationInput) => Effect.Effect<void, unknown>;
  readonly requestPasswordReset: (input: RequestPasswordResetInput) => Effect.Effect<void, unknown>;
  readonly resetPassword: (input: ResetPasswordInput) => Effect.Effect<CreateSessionResult, unknown>;
  readonly signIn: (input: SignInWithEmailInput) => Effect.Effect<CreateSessionResult, unknown>;
  readonly signUp: (input: SignUpWithEmailInput) => Effect.Effect<void, unknown>;
  readonly verifyEmail: (input: VerifyEmailInput) => Effect.Effect<CreateSessionResult, unknown>;
};
