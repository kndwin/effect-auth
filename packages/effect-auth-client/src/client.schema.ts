import { Schema, type Effect } from "effect";
import type {
  RequestEmailVerificationInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  SignInWithEmailInput,
  SignUpWithEmailInput,
  VerifyEmailInput,
} from "./email.schema";
import type { Ok, PublicSession } from "./schema";

export class AuthClientOptionsModel extends Schema.Class<AuthClientOptionsModel>("AuthClientOptions")({
  baseUrl: Schema.optionalKey(Schema.Union([Schema.String, Schema.URL])),
}) {}

export const AuthClientOptionsSchema = AuthClientOptionsModel;

export type AuthClientOptions = typeof AuthClientOptionsSchema.Type;

export class AuthClientSocialSignInOptions extends Schema.Class<AuthClientSocialSignInOptions>(
  "AuthClientSocialSignInOptions",
)({
  provider: Schema.String,
}) {}

export const AuthClientSocialSignInOptionsSchema = AuthClientSocialSignInOptions;

export type AuthEmailClientShape = {
  readonly requestPasswordReset: (input: RequestPasswordResetInput) => Effect.Effect<Ok, unknown>;
  readonly requestVerification: (input: RequestEmailVerificationInput) => Effect.Effect<Ok, unknown>;
  readonly resetPassword: (input: ResetPasswordInput) => Effect.Effect<PublicSession, unknown>;
  readonly signIn: (input: SignInWithEmailInput) => Effect.Effect<PublicSession, unknown>;
  readonly signUp: (input: SignUpWithEmailInput) => Effect.Effect<Ok, unknown>;
  readonly verify: (input: VerifyEmailInput) => Effect.Effect<PublicSession, unknown>;
};

export type AuthClientShape = {
  readonly email: AuthEmailClientShape;
  readonly getSession: () => Effect.Effect<PublicSession, unknown>;
  readonly signInUrl: (provider: string) => string;
  readonly signOut: () => Effect.Effect<PublicSession, unknown>;
};
