import { Effect, Layer } from "effect";
import { SqlClient } from "effect/unstable/sql";
import { OrgInvitation, Organization, OrgMember, type InvitationStatus, type OrgRole } from "./organization.schema";
import { OrganizationStorage } from "./organization.storage";

export type OrganizationSqlTables = {
  readonly active?: string;
  readonly invitations?: string;
  readonly members?: string;
  readonly organizations?: string;
};

export type OrganizationSqlOptions = {
  readonly tables?: OrganizationSqlTables;
};

const tableNames = (options: OrganizationSqlOptions) => ({
  active: options.tables?.active ?? "auth_org_active",
  invitations: options.tables?.invitations ?? "auth_org_invitations",
  members: options.tables?.members ?? "auth_org_members",
  organizations: options.tables?.organizations ?? "auth_organizations",
});

// Reference DDL — copy into your migration tooling (the adapter never runs DDL).
// auth_org_active holds the plugin-owned session extension: one row per session
// (scope = "session") plus a per-user default (scope = "user").
export const ddl = (options: OrganizationSqlOptions = {}): ReadonlyArray<string> => {
  const tables = tableNames(options);
  return [
    `create table if not exists ${tables.organizations} (
  id text primary key,
  name text not null,
  slug text not null unique,
  logo text,
  created_at text not null
)`,
    `create table if not exists ${tables.members} (
  id text primary key,
  organization_id text not null,
  user_id text not null,
  role text not null,
  created_at text not null,
  unique (organization_id, user_id)
)`,
    `create table if not exists ${tables.invitations} (
  id text primary key,
  organization_id text not null,
  email text not null,
  role text not null,
  status text not null,
  inviter_id text not null,
  expires_at text not null,
  created_at text not null
)`,
    `create table if not exists ${tables.active} (
  scope text not null,
  key text not null,
  organization_id text not null,
  primary key (scope, key)
)`,
  ];
};

interface OrganizationRow {
  readonly created_at: string;
  readonly id: string;
  readonly logo: string | null;
  readonly name: string;
  readonly slug: string;
}

interface MemberRow {
  readonly created_at: string;
  readonly id: string;
  readonly organization_id: string;
  readonly role: OrgRole;
  readonly user_id: string;
}

interface InvitationRow {
  readonly created_at: string;
  readonly email: string;
  readonly expires_at: string;
  readonly id: string;
  readonly inviter_id: string;
  readonly organization_id: string;
  readonly role: OrgRole;
  readonly status: InvitationStatus;
}

interface ActiveRow {
  readonly organization_id: string;
}

const organizationFromRow = (row: OrganizationRow): Organization => new Organization({
  createdAt: row.created_at,
  id: row.id,
  logo: row.logo,
  name: row.name,
  slug: row.slug,
});

const memberFromRow = (row: MemberRow): OrgMember => new OrgMember({
  createdAt: row.created_at,
  id: row.id,
  organizationId: row.organization_id,
  role: row.role,
  userId: row.user_id,
});

const invitationFromRow = (row: InvitationRow): OrgInvitation => new OrgInvitation({
  createdAt: row.created_at,
  email: row.email,
  expiresAt: row.expires_at,
  id: row.id,
  inviterId: row.inviter_id,
  organizationId: row.organization_id,
  role: row.role,
  status: row.status,
});

export const layer = (options: OrganizationSqlOptions = {}) => Layer.effect(
  OrganizationStorage,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const names = tableNames(options);
    const tables = {
      active: sql(names.active),
      invitations: sql(names.invitations),
      members: sql(names.members),
      organizations: sql(names.organizations),
    };

    const first = <A extends object>(rows: ReadonlyArray<A>) => rows[0] ?? null;

    const findInvitationRow = Effect.fn("OrganizationStorageSql.findInvitationRow")((invitationId: string) => sql<InvitationRow>`
      select id, organization_id, email, role, status, inviter_id, expires_at, created_at
      from ${tables.invitations} where id = ${invitationId} limit 1
    `.pipe(Effect.map(first)));

    const setActiveScope = Effect.fn("OrganizationStorageSql.setActiveScope")(function* (
      scope: "session" | "user",
      key: string,
      organizationId: string,
    ) {
      yield* sql`delete from ${tables.active} where scope = ${scope} and key = ${key}`;
      yield* sql`insert into ${tables.active} ${sql.insert({
        key,
        organization_id: organizationId,
        scope,
      })}`;
    });

    const getActiveScope = Effect.fn("OrganizationStorageSql.getActiveScope")((scope: "session" | "user", key: string) => sql<ActiveRow>`
      select organization_id from ${tables.active} where scope = ${scope} and key = ${key} limit 1
    `.pipe(Effect.map((rows) => first(rows)?.organization_id ?? null)));

    return {
      addMember: Effect.fn("OrganizationStorageSql.addMember")((input) => sql`
        insert into ${tables.members} ${sql.insert({
          created_at: input.createdAt,
          id: input.id,
          organization_id: input.organizationId,
          role: input.role,
          user_id: input.userId,
        })}
      `.pipe(Effect.as(new OrgMember(input)))),
      createInvitation: Effect.fn("OrganizationStorageSql.createInvitation")((input) => sql`
        insert into ${tables.invitations} ${sql.insert({
          created_at: input.createdAt,
          email: input.email.toLowerCase(),
          expires_at: input.expiresAt,
          id: input.id,
          inviter_id: input.inviterId,
          organization_id: input.organizationId,
          role: input.role,
          status: "pending",
        })}
      `.pipe(Effect.as(new OrgInvitation({
        createdAt: input.createdAt,
        email: input.email.toLowerCase(),
        expiresAt: input.expiresAt,
        id: input.id,
        inviterId: input.inviterId,
        organizationId: input.organizationId,
        role: input.role,
        status: "pending",
      })))),
      createOrganization: Effect.fn("OrganizationStorageSql.createOrganization")((input) => sql`
        insert into ${tables.organizations} ${sql.insert({
          created_at: input.createdAt,
          id: input.id,
          logo: input.logo,
          name: input.name,
          slug: input.slug,
        })}
      `.pipe(Effect.as(new Organization(input)))),
      findInvitation: Effect.fn("OrganizationStorageSql.findInvitation")((invitationId: string) =>
        findInvitationRow(invitationId).pipe(Effect.map((row) => row ? invitationFromRow(row) : null))),
      findMember: Effect.fn("OrganizationStorageSql.findMember")(({ organizationId, userId }) => sql<MemberRow>`
        select id, organization_id, user_id, role, created_at
        from ${tables.members} where organization_id = ${organizationId} and user_id = ${userId} limit 1
      `.pipe(Effect.map((rows) => {
        const row = first(rows);
        return row ? memberFromRow(row) : null;
      }))),
      findOrganization: Effect.fn("OrganizationStorageSql.findOrganization")((organizationId: string) => sql<OrganizationRow>`
        select id, name, slug, logo, created_at from ${tables.organizations} where id = ${organizationId} limit 1
      `.pipe(Effect.map((rows) => {
        const row = first(rows);
        return row ? organizationFromRow(row) : null;
      }))),
      findOrganizationBySlug: Effect.fn("OrganizationStorageSql.findOrganizationBySlug")((slug: string) => sql<OrganizationRow>`
        select id, name, slug, logo, created_at from ${tables.organizations} where slug = ${slug} limit 1
      `.pipe(Effect.map((rows) => {
        const row = first(rows);
        return row ? organizationFromRow(row) : null;
      }))),
      getActiveOrganizationId: Effect.fn("OrganizationStorageSql.getActiveOrganizationId")(function* ({ sessionId, userId }) {
        const forSession = yield* getActiveScope("session", sessionId);
        if (forSession !== null) {
          return forSession;
        }
        return yield* getActiveScope("user", userId);
      }),
      listInvitationsForEmail: Effect.fn("OrganizationStorageSql.listInvitationsForEmail")((email: string) => sql<InvitationRow>`
        select id, organization_id, email, role, status, inviter_id, expires_at, created_at
        from ${tables.invitations} where email = ${email.toLowerCase()} and status = ${"pending"}
      `.pipe(Effect.map((rows) => rows.map(invitationFromRow)))),
      listInvitationsForOrganization: Effect.fn("OrganizationStorageSql.listInvitationsForOrganization")((organizationId: string) => sql<InvitationRow>`
        select id, organization_id, email, role, status, inviter_id, expires_at, created_at
        from ${tables.invitations} where organization_id = ${organizationId} and status = ${"pending"}
      `.pipe(Effect.map((rows) => rows.map(invitationFromRow)))),
      listMembers: Effect.fn("OrganizationStorageSql.listMembers")((organizationId: string) => sql<MemberRow>`
        select id, organization_id, user_id, role, created_at
        from ${tables.members} where organization_id = ${organizationId}
      `.pipe(Effect.map((rows) => rows.map(memberFromRow)))),
      listOrganizationsForUser: Effect.fn("OrganizationStorageSql.listOrganizationsForUser")((userId: string) => sql<OrganizationRow>`
        select o.id, o.name, o.slug, o.logo, o.created_at
        from ${tables.organizations} o inner join ${tables.members} m on m.organization_id = o.id
        where m.user_id = ${userId}
      `.pipe(Effect.map((rows) => rows.map(organizationFromRow)))),
      setActiveOrganization: Effect.fn("OrganizationStorageSql.setActiveOrganization")(function* ({ organizationId, sessionId, userId }) {
        yield* setActiveScope("session", sessionId, organizationId);
        yield* setActiveScope("user", userId, organizationId);
      }),
      updateInvitationStatus: Effect.fn("OrganizationStorageSql.updateInvitationStatus")(function* ({ invitationId, status }) {
        yield* sql`update ${tables.invitations} set ${sql.update({ status })} where id = ${invitationId}`;
        const row = yield* findInvitationRow(invitationId);
        if (!row) {
          return yield* Effect.fail(new Error("Invitation not found"));
        }
        return invitationFromRow(row);
      }),
    };
  }),
);

export const provide = (options: OrganizationSqlOptions = {}) => Layer.provide(layer(options));

export const OrganizationStorageSql = { ddl, layer, provide };
