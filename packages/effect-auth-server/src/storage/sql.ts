import { Effect, Layer } from "effect";
import { SqlClient } from "effect/unstable/sql";
import { EmailIdentity, EmailToken, ProviderAccount, Session, User } from "../schema";
import { AuthStorage } from "../storage";
import { ddl } from "./sql.ddl";
import type { SqlStorageOptions } from "./sql.schema";

export { ddl } from "./sql.ddl";
export type { SqlStorageOptions } from "./sql.schema";

interface UserRow {
  readonly avatar_url: string | null;
  readonly created_at: string;
  readonly email: string | null;
  readonly id: string;
  readonly name: string | null;
  readonly updated_at: string;
  readonly username: string | null;
}

interface SessionRow {
  readonly created_at: string;
  readonly expires_at: string;
  readonly id: string;
  readonly token_hash: string;
  readonly user_id: string;
}

interface ProviderAccountRow {
  readonly created_at: string;
  readonly provider: string;
  readonly provider_account_id: string;
  readonly user_id: string;
}

interface EmailIdentityRow {
  readonly created_at: string;
  readonly email: string;
  readonly email_verified_at: string | null;
  readonly password_hash: string;
  readonly updated_at: string;
  readonly user_id: string;
}

interface EmailTokenRow {
  readonly created_at: string;
  readonly email: string;
  readonly expires_at: string;
  readonly id: string;
  readonly purpose: "verify-email" | "reset-password";
  readonly token_hash: string;
}

interface OAuthStateRow {
  readonly created_at: string;
  readonly provider: string;
  readonly redirect_to: string | null;
  readonly state: string;
}

const userFromRow = (row: UserRow): User => new User({
  avatarUrl: row.avatar_url,
  createdAt: row.created_at,
  email: row.email,
  id: row.id,
  name: row.name,
  updatedAt: row.updated_at,
  username: row.username,
});

const sessionFromRow = (row: SessionRow): Session => new Session({
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  id: row.id,
  tokenHash: row.token_hash,
  userId: row.user_id,
});

const accountFromRow = (row: ProviderAccountRow): ProviderAccount => new ProviderAccount({
  createdAt: row.created_at,
  provider: row.provider,
  providerAccountId: row.provider_account_id,
  userId: row.user_id,
});

const emailIdentityFromRow = (row: EmailIdentityRow): EmailIdentity => new EmailIdentity({
  createdAt: row.created_at,
  email: row.email,
  emailVerifiedAt: row.email_verified_at,
  passwordHash: row.password_hash,
  updatedAt: row.updated_at,
  userId: row.user_id,
});

const emailTokenFromRow = (row: EmailTokenRow): EmailToken => new EmailToken({
  createdAt: row.created_at,
  email: row.email,
  expiresAt: row.expires_at,
  id: row.id,
  purpose: row.purpose,
  tokenHash: row.token_hash,
});

// All statements go through the sql template tag, so placeholders and
// identifier escaping follow the active dialect (sqlite, pg, mysql, ...).
export const layer = (options: SqlStorageOptions = {}) => Layer.effect(
  AuthStorage,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const tables = {
      emailIdentities: sql(options.tables?.emailIdentities ?? "auth_email_identities"),
      emailTokens: sql(options.tables?.emailTokens ?? "auth_email_tokens"),
      oauthStates: sql(options.tables?.oauthStates ?? "auth_oauth_states"),
      providerAccounts: sql(options.tables?.providerAccounts ?? "auth_provider_accounts"),
      sessions: sql(options.tables?.sessions ?? "auth_sessions"),
      users: sql(options.tables?.users ?? "auth_users"),
    };

    const first = <A extends object>(rows: ReadonlyArray<A>) => rows[0] ?? null;

    const findUserRow = Effect.fn("AuthStorageSql.findUserRow")((userId: string) => sql<UserRow>`
      select id, email, name, username, avatar_url, created_at, updated_at
      from ${tables.users} where id = ${userId} limit 1
    `.pipe(Effect.map(first)));

    const writeUser = Effect.fn("AuthStorageSql.writeUser")(function* (user: User, previous: UserRow | null) {
      if (previous) {
        yield* sql`update ${tables.users} set ${sql.update({
          avatar_url: user.avatarUrl,
          email: user.email,
          name: user.name,
          updated_at: user.updatedAt,
          username: user.username ?? null,
        })} where id = ${user.id}`;
      } else {
        yield* sql`insert into ${tables.users} ${sql.insert({
          avatar_url: user.avatarUrl,
          created_at: user.createdAt,
          email: user.email,
          id: user.id,
          name: user.name,
          updated_at: user.updatedAt,
          username: user.username ?? null,
        })}`;
      }
    });

    const findEmailIdentityRow = Effect.fn("AuthStorageSql.findEmailIdentityRow")((email: string) => sql<EmailIdentityRow>`
      select email, user_id, password_hash, email_verified_at, created_at, updated_at
      from ${tables.emailIdentities} where email = ${email.toLowerCase()} limit 1
    `.pipe(Effect.map(first)));

    return {
      createSession: Effect.fn("AuthStorageSql.createSession")((input) => sql`
        insert into ${tables.sessions} ${sql.insert({
          created_at: input.createdAt,
          expires_at: input.expiresAt,
          id: input.id,
          token_hash: input.tokenHash,
          user_id: input.userId,
        })}
      `.pipe(Effect.as(new Session(input)))),
      deleteSession: Effect.fn("AuthStorageSql.deleteSession")((sessionId: string) =>
        sql`delete from ${tables.sessions} where id = ${sessionId}`.pipe(Effect.asVoid)),
      findSession: Effect.fn("AuthStorageSql.findSession")((sessionId: string) => sql<SessionRow>`
        select id, user_id, token_hash, created_at, expires_at
        from ${tables.sessions} where id = ${sessionId} limit 1
      `.pipe(Effect.map((rows) => {
        const row = first(rows);
        return row ? sessionFromRow(row) : null;
      }))),
      findUser: Effect.fn("AuthStorageSql.findUser")((userId: string) => findUserRow(userId).pipe(
        Effect.map((row) => row ? userFromRow(row) : null),
      )),
      findUserByEmail: Effect.fn("AuthStorageSql.findUserByEmail")((email: string) => sql<UserRow>`
        select id, email, name, username, avatar_url, created_at, updated_at
        from ${tables.users} where email = ${email.toLowerCase()} limit 1
      `.pipe(Effect.map((rows) => {
        const row = first(rows);
        return row ? userFromRow(row) : null;
      }))),
      findUserByProviderAccount: Effect.fn("AuthStorageSql.findUserByProviderAccount")((provider: string, providerAccountId: string) => sql<UserRow>`
        select u.id, u.email, u.name, u.username, u.avatar_url, u.created_at, u.updated_at
        from ${tables.users} u inner join ${tables.providerAccounts} a on a.user_id = u.id
        where a.provider = ${provider} and a.provider_account_id = ${providerAccountId} limit 1
      `.pipe(Effect.map((rows) => {
        const row = first(rows);
        return row ? userFromRow(row) : null;
      }))),
      findEmailIdentity: Effect.fn("AuthStorageSql.findEmailIdentity")((email: string) => findEmailIdentityRow(email).pipe(
        Effect.map((row) => row ? emailIdentityFromRow(row) : null),
      )),
      findEmailToken: Effect.fn("AuthStorageSql.findEmailToken")((tokenId: string) => sql<EmailTokenRow>`
        select id, email, token_hash, purpose, expires_at, created_at
        from ${tables.emailTokens} where id = ${tokenId} limit 1
      `.pipe(Effect.map((rows) => {
        const row = first(rows);
        return row ? emailTokenFromRow(row) : null;
      }))),
      getOAuthState: Effect.fn("AuthStorageSql.getOAuthState")((state: string) => sql<OAuthStateRow>`
        select state, provider, redirect_to, created_at
        from ${tables.oauthStates} where state = ${state} limit 1
      `.pipe(Effect.map((rows) => {
        const row = first(rows);
        return row ? {
          createdAt: row.created_at,
          provider: row.provider,
          redirectTo: row.redirect_to ?? undefined,
          state: row.state,
        } : null;
      }))),
      removeEmailToken: Effect.fn("AuthStorageSql.removeEmailToken")((tokenId: string) =>
        sql`delete from ${tables.emailTokens} where id = ${tokenId}`.pipe(Effect.asVoid)),
      removeOAuthState: Effect.fn("AuthStorageSql.removeOAuthState")((state: string) =>
        sql`delete from ${tables.oauthStates} where state = ${state}`.pipe(Effect.asVoid)),
      setEmailToken: Effect.fn("AuthStorageSql.setEmailToken")((input) => sql`
        insert into ${tables.emailTokens} ${sql.insert({
          created_at: input.createdAt,
          email: input.email.toLowerCase(),
          expires_at: input.expiresAt,
          id: input.id,
          purpose: input.purpose,
          token_hash: input.tokenHash,
        })}
      `.pipe(Effect.as(new EmailToken({
        createdAt: input.createdAt,
        email: input.email.toLowerCase(),
        expiresAt: input.expiresAt,
        id: input.id,
        purpose: input.purpose,
        tokenHash: input.tokenHash,
      })))),
      setOAuthState: Effect.fn("AuthStorageSql.setOAuthState")((state) => sql`
        insert into ${tables.oauthStates} ${sql.insert({
          created_at: state.createdAt,
          provider: state.provider,
          redirect_to: state.redirectTo ?? null,
          state: state.state,
        })}
      `.pipe(Effect.asVoid)),
      updateEmailPassword: Effect.fn("AuthStorageSql.updateEmailPassword")(function* (input) {
        const now = new Date().toISOString();
        const email = input.email.toLowerCase();
        yield* sql`update ${tables.emailIdentities} set ${sql.update({
          password_hash: input.passwordHash,
          updated_at: now,
        })} where email = ${email}`;
        const row = yield* findEmailIdentityRow(email);
        if (!row) {
          return yield* Effect.fail(new Error("Email identity not found"));
        }
        return emailIdentityFromRow(row);
      }),
      verifyEmailIdentity: Effect.fn("AuthStorageSql.verifyEmailIdentity")(function* (email: string, verifiedAt: string) {
        const normalized = email.toLowerCase();
        yield* sql`update ${tables.emailIdentities} set ${sql.update({
          email_verified_at: verifiedAt,
          updated_at: verifiedAt,
        })} where email = ${normalized}`;
        const row = yield* findEmailIdentityRow(normalized);
        if (!row) {
          return yield* Effect.fail(new Error("Email identity not found"));
        }
        return emailIdentityFromRow(row);
      }),
      upsertEmailIdentity: Effect.fn("AuthStorageSql.upsertEmailIdentity")(function* (input) {
        const now = new Date().toISOString();
        const email = input.email.toLowerCase();
        const existing = yield* findEmailIdentityRow(email);
        const userId = existing?.user_id ?? input.user.id ?? crypto.randomUUID();
        const previous = yield* findUserRow(userId);
        const user = new User({
          avatarUrl: input.user.avatarUrl ?? previous?.avatar_url ?? null,
          createdAt: previous?.created_at ?? now,
          email,
          id: userId,
          name: input.user.name ?? previous?.name ?? null,
          updatedAt: now,
          username: input.user.username ?? previous?.username ?? null,
        });
        yield* writeUser(user, previous);

        const identity = new EmailIdentity({
          createdAt: existing?.created_at ?? now,
          email,
          emailVerifiedAt: input.emailVerifiedAt ?? existing?.email_verified_at ?? null,
          passwordHash: input.passwordHash,
          updatedAt: now,
          userId,
        });

        if (existing) {
          yield* sql`update ${tables.emailIdentities} set ${sql.update({
            email_verified_at: identity.emailVerifiedAt,
            password_hash: identity.passwordHash,
            updated_at: identity.updatedAt,
            user_id: identity.userId,
          })} where email = ${identity.email}`;
        } else {
          yield* sql`insert into ${tables.emailIdentities} ${sql.insert({
            created_at: identity.createdAt,
            email: identity.email,
            email_verified_at: identity.emailVerifiedAt,
            password_hash: identity.passwordHash,
            updated_at: identity.updatedAt,
            user_id: identity.userId,
          })}`;
        }
        return { identity, user };
      }),
      upsertProviderAccount: Effect.fn("AuthStorageSql.upsertProviderAccount")(function* (input) {
        const now = new Date().toISOString();
        const existingRows = yield* sql<ProviderAccountRow>`
          select provider, provider_account_id, user_id, created_at
          from ${tables.providerAccounts}
          where provider = ${input.provider} and provider_account_id = ${input.providerAccountId} limit 1
        `;
        const existing = first(existingRows);
        const userId = existing?.user_id ?? input.user.id ?? crypto.randomUUID();
        const previous = yield* findUserRow(userId);
        const user = new User({
          avatarUrl: input.user.avatarUrl ?? previous?.avatar_url ?? null,
          createdAt: previous?.created_at ?? now,
          email: input.user.email ?? previous?.email ?? null,
          id: userId,
          name: input.user.name ?? previous?.name ?? null,
          updatedAt: now,
          username: input.user.username ?? previous?.username ?? null,
        });
        yield* writeUser(user, previous);

        const account = existing ? accountFromRow(existing) : new ProviderAccount({
          createdAt: now,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          userId,
        });
        if (!existing) {
          yield* sql`insert into ${tables.providerAccounts} ${sql.insert({
            created_at: account.createdAt,
            provider: account.provider,
            provider_account_id: account.providerAccountId,
            user_id: account.userId,
          })}`;
        }

        return { account, user };
      }),
    };
  }),
);

export const provide = (options: SqlStorageOptions = {}) => Layer.provide(layer(options));

export const AuthStorageSql = { ddl, layer, provide };
