import { Context, Effect, Layer } from "effect";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { AuthFailure, Unauthorized } from "./schema";
import { Auth } from "./server";
import { AuthMethodTag, type AuthMethod } from "./server.schema";
import { AuthStorage } from "./storage";
import {
  EmailMessage,
  type AuthEmailConfigShape,
  type AuthEmailShape,
  type EmailAndPasswordDefineOptions,
  type EmailSenderShape,
  type PasswordHasherShape,
} from "./email.schema";
import { renderResetPassword, renderVerifyEmail } from "./email/templates";
import { isAbsoluteUrl, resolveUrl, toAbsoluteBaseUrl } from "./url";

export type {
  AuthEmailConfigShape,
  AuthEmailShape,
  EmailAndPasswordDefineOptions,
  EmailSenderShape,
  EmailMessage,
  PasswordHasherShape,
  RequestEmailVerificationInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  SignInWithEmailInput,
  SignUpWithEmailInput,
  VerifyEmailInput,
} from "./email.schema";

export class AuthEmailConfig extends Context.Service<AuthEmailConfig, AuthEmailConfigShape>()(
  "effect-auth/AuthEmailConfig",
) {}

export class EmailSender extends Context.Service<EmailSender, EmailSenderShape>()(
  "effect-auth/EmailSender",
) {}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const nowIso = () => new Date().toISOString();

const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
};

const verifyPassword = (password: string, stored: string) => {
  const [algorithm, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const defaultPasswordHasher: PasswordHasherShape = {
  hash: (password) => Effect.sync(() => hashPassword(password)),
  needsRehash: (hash) => !hash.startsWith("scrypt$"),
  verify: ({ hash, password }) => Effect.sync(() => verifyPassword(password, hash)),
};

const createRawToken = () => `email_${randomUUID()}.${randomUUID()}`;
const tokenId = (token: string) => token.slice(0, token.indexOf("."));

export class AuthEmail extends Context.Service<AuthEmail, AuthEmailShape>()("effect-auth/AuthEmail") {
  static readonly Default = Layer.effect(
    AuthEmail,
    Effect.gen(function* () {
      const auth = yield* Auth;
      const config = yield* AuthEmailConfig;
      const sender = yield* EmailSender;
      const storage = yield* AuthStorage;
      const verificationMaxAgeSeconds = config.verificationMaxAgeSeconds ?? 60 * 60 * 24;
      const resetPasswordMaxAgeSeconds = config.resetPasswordMaxAgeSeconds ?? 60 * 30;
      const verificationPath = config.verificationPath ?? ((token: string) => `/auth/email/verify?token=${encodeURIComponent(token)}`);
      const resetPasswordPath = config.resetPasswordPath ?? ((token: string) => `/auth/email/reset?token=${encodeURIComponent(token)}`);
      const appUrl = toAbsoluteBaseUrl(config.appUrl ?? "http://localhost");
      const hasher = config.passwordHasher ?? defaultPasswordHasher;

      const sendTokenEmail = Effect.fn("AuthEmail.sendTokenEmail")(function* (
        email: string,
        purpose: "verify-email" | "reset-password",
        redirectTo?: string,
      ) {
        const token = createRawToken();
        const createdAt = nowIso();
        const maxAgeSeconds = purpose === "verify-email" ? verificationMaxAgeSeconds : resetPasswordMaxAgeSeconds;
        const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();
        yield* storage.setEmailToken({
          createdAt,
          email,
          expiresAt,
          id: tokenId(token),
          purpose,
          tokenHash: hashToken(token),
        });
        const path = purpose === "verify-email" ? verificationPath(token) : resetPasswordPath(token);
        const baseUrl = redirectTo && isAbsoluteUrl(redirectTo) ? redirectTo : appUrl;
        const url = resolveUrl(path, baseUrl);
        const html = yield* Effect.promise(() => purpose === "verify-email"
          ? renderVerifyEmail({ appName: config.appName, url })
          : renderResetPassword({ appName: config.appName, url }));
        yield* sender.send(new EmailMessage({
          from: config.from,
          html,
          subject: purpose === "verify-email" ? `Verify your ${config.appName} email` : `Reset your ${config.appName} password`,
          text: url,
          to: email,
        }));
      });

      const consumeToken = Effect.fn("AuthEmail.consumeToken")(function* (token: string, purpose: "verify-email" | "reset-password") {
        const id = tokenId(token);
        if (!id) {
          return yield* Effect.fail(new Unauthorized({ message: "Invalid email token" }));
        }
        const record = yield* storage.findEmailToken(id);
        if (!record || record.purpose !== purpose || record.tokenHash !== hashToken(token) || new Date(record.expiresAt).getTime() <= Date.now()) {
          return yield* Effect.fail(new Unauthorized({ message: "Invalid email token" }));
        }
        yield* storage.removeEmailToken(id);
        return record;
      });

      return {
        requestEmailVerification: Effect.fn("AuthEmail.requestEmailVerification")(function* ({ email, redirectTo }) {
          const normalized = normalizeEmail(email);
          const identity = yield* storage.findEmailIdentity(normalized);
          if (!identity) {
            return yield* Effect.fail(new AuthFailure({ message: "Email account not found" }));
          }
          if (!identity.emailVerifiedAt) {
            yield* sendTokenEmail(normalized, "verify-email", redirectTo);
          }
        }),
        requestPasswordReset: Effect.fn("AuthEmail.requestPasswordReset")(function* ({ email, redirectTo }) {
          const normalized = normalizeEmail(email);
          const identity = yield* storage.findEmailIdentity(normalized);
          if (identity) {
            yield* sendTokenEmail(normalized, "reset-password", redirectTo);
          }
        }),
        resetPassword: Effect.fn("AuthEmail.resetPassword")(function* ({ password, token }) {
          const record = yield* consumeToken(token, "reset-password");
          const passwordHash = yield* hasher.hash(password);
          const identity = yield* storage.updateEmailPassword({ email: record.email, passwordHash });
          return yield* auth.createSession(identity.userId);
        }),
        signIn: Effect.fn("AuthEmail.signIn")(function* ({ email, password }) {
          const identity = yield* storage.findEmailIdentity(normalizeEmail(email));
          const verified = identity
            ? yield* hasher.verify({ hash: identity.passwordHash, password })
            : false;
          if (!identity || !verified) {
            return yield* Effect.fail(new Unauthorized({ message: "Invalid email or password" }));
          }
          if (!identity.emailVerifiedAt) {
            return yield* Effect.fail(new Unauthorized({ message: "Email address is not verified" }));
          }
          if (hasher.needsRehash?.(identity.passwordHash)) {
            // Transparently migrate legacy hashes on successful sign-in.
            const passwordHash = yield* hasher.hash(password);
            yield* storage.updateEmailPassword({ email: identity.email, passwordHash });
          }
          return yield* auth.createSession(identity.userId);
        }),
        signUp: Effect.fn("AuthEmail.signUp")(function* ({ email, name, password, redirectTo }) {
          const normalized = normalizeEmail(email);
          if (config.signUpPolicy) {
            const allowed = yield* config.signUpPolicy(normalized);
            if (!allowed) {
              return yield* Effect.fail(new Unauthorized({ message: "Sign-up is not allowed for this email" }));
            }
          }
          const passwordHash = yield* hasher.hash(password);
          yield* storage.upsertEmailIdentity({
            email: normalized,
            passwordHash,
            user: { email: normalized, name: name ?? null },
          });
          yield* sendTokenEmail(normalized, "verify-email", redirectTo);
        }),
        verifyEmail: Effect.fn("AuthEmail.verifyEmail")(function* ({ token }) {
          const record = yield* consumeToken(token, "verify-email");
          const identity = yield* storage.verifyEmailIdentity(record.email, nowIso());
          return yield* auth.createSession(identity.userId);
        }),
      };
    }),
  );

  static readonly layerConfig = (config: AuthEmailConfigShape) => Layer.succeed(AuthEmailConfig, config);

  static readonly layerSender = (sender: EmailSenderShape) => Layer.succeed(EmailSender, sender);

  // Also exposes AuthEmailConfig, mirroring Auth.define.
  static readonly define = (config: AuthEmailConfigShape) => Layer.mergeAll(
    AuthEmail.Default.pipe(Layer.provide(AuthEmail.layerConfig(config))),
    AuthEmail.layerConfig(config),
  );
}

// Email/password sign-in as an auth method for `Auth.define({ auth: [...] })`.
// Inherits appName/appUrl from the Auth config when not overridden.
export const EmailAndPassword = {
  define: ({ sender, ...options }: EmailAndPasswordDefineOptions): AuthMethod<AuthEmail | AuthEmailConfig> => ({
    _tag: AuthMethodTag,
    id: "email-and-password",
    layer: ({ config, core }) => AuthEmail.define({
      ...options,
      appName: options.appName ?? config.appName ?? new URL(toAbsoluteBaseUrl(config.appUrl)).hostname,
      appUrl: config.appUrl,
    }).pipe(
      Layer.provide(core),
      Layer.provide(AuthEmail.layerSender(sender)),
    ),
  }),
};
