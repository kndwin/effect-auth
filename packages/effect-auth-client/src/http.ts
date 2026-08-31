import { Context } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware, HttpApiSchema, HttpApiSecurity } from "effect/unstable/httpapi";
import {
  RequestEmailVerificationInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  SignInWithEmailInput,
  SignUpWithEmailInput,
  VerifyEmailInput,
} from "./email.schema";
import { AuthErrorSchema, OAuthCallbackQuerySchema, OAuthSignInQuerySchema, OkSchema, ProviderIdParamsSchema, PublicSessionSchema, Unauthorized, type CurrentSession } from "./schema";

const RedirectResponseSchema = HttpApiSchema.Empty(302);
const AuthErrorResponseSchema = AuthErrorSchema.pipe(HttpApiSchema.status(400));
const UnauthorizedResponseSchema = Unauthorized.pipe(HttpApiSchema.status(401));

export const sessionCookieSecurity = HttpApiSecurity.apiKey({
  in: "cookie",
  key: "auth_session",
});

export class CurrentUser extends Context.Service<CurrentUser, CurrentSession>()("effect-auth/CurrentUser") {}

export class RequireSession extends HttpApiMiddleware.Service<RequireSession, { provides: CurrentUser }>()(
  "effect-auth/RequireSession",
  {
    error: UnauthorizedResponseSchema,
    security: {
      session: sessionCookieSecurity,
    },
  },
) {}

export const authGroup = HttpApiGroup.make("auth").add(
  HttpApiEndpoint.get("signIn", "/auth/:provider", {
    error: AuthErrorResponseSchema,
    params: ProviderIdParamsSchema,
    query: OAuthSignInQuerySchema,
    success: RedirectResponseSchema,
  }),
  HttpApiEndpoint.get("callback", "/auth/:provider/callback", {
    error: AuthErrorResponseSchema,
    params: ProviderIdParamsSchema,
    query: OAuthCallbackQuerySchema,
    success: RedirectResponseSchema,
  }),
  HttpApiEndpoint.get("me", "/auth/me", {
    error: AuthErrorResponseSchema,
    success: PublicSessionSchema,
  }),
  HttpApiEndpoint.post("logout", "/auth/logout", {
    error: AuthErrorResponseSchema,
    success: PublicSessionSchema,
  }),
);

export const authEmailGroup = HttpApiGroup.make("authEmail").add(
  HttpApiEndpoint.post("signUp", "/auth/email/sign-up", {
    error: AuthErrorResponseSchema,
    payload: SignUpWithEmailInput,
    success: OkSchema,
  }),
  HttpApiEndpoint.post("signIn", "/auth/email/sign-in", {
    error: AuthErrorResponseSchema,
    payload: SignInWithEmailInput,
    success: PublicSessionSchema,
  }),
  HttpApiEndpoint.post("verify", "/auth/email/verify", {
    error: AuthErrorResponseSchema,
    payload: VerifyEmailInput,
    success: PublicSessionSchema,
  }),
  HttpApiEndpoint.post("requestVerification", "/auth/email/request-verification", {
    error: AuthErrorResponseSchema,
    payload: RequestEmailVerificationInput,
    success: OkSchema,
  }),
  HttpApiEndpoint.post("requestPasswordReset", "/auth/email/request-password-reset", {
    error: AuthErrorResponseSchema,
    payload: RequestPasswordResetInput,
    success: OkSchema,
  }),
  HttpApiEndpoint.post("resetPassword", "/auth/email/reset-password", {
    error: AuthErrorResponseSchema,
    payload: ResetPasswordInput,
    success: PublicSessionSchema,
  }),
);

export const authApi = HttpApi.make("effect-auth").add(authGroup).add(authEmailGroup);
