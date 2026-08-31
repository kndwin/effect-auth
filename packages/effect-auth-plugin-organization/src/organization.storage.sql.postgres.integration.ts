import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/unstable/sql";
import { AuthStorage } from "@kndwin/effect-auth-server";
import { AuthStorageSql } from "@kndwin/effect-auth-server/storage/sql";
import { postgresClientLayer, registerPostgresHarness } from "@kndwin/effect-auth-server/storage/sql.postgres.harness";
import { OrganizationStorage } from "./organization.storage";
import { OrganizationStorageSql } from "./sql";

registerPostgresHarness();

describe("PostgreSQL organization storage", () => {
  it("persists organizations, members, and invitations", async () => {
    const storageLayer = Layer.mergeAll(
      AuthStorageSql.layer(),
      OrganizationStorageSql.layer(),
    );
    const program = Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* Effect.forEach([...AuthStorageSql.ddl(), ...OrganizationStorageSql.ddl()], (statement) => sql.unsafe(statement));

      const auth = yield* AuthStorage;
      const organizations = yield* OrganizationStorage;
      const now = "2026-07-11T00:00:00.000Z";
      const user = yield* auth.upsertEmailIdentity({
        email: "Owner@Example.com",
        emailVerifiedAt: now,
        passwordHash: "scrypt$hash",
        user: { email: "Owner@Example.com", name: "Owner" },
      });
      const session = yield* auth.createSession({
        createdAt: now,
        expiresAt: "2026-07-12T00:00:00.000Z",
        id: "session-1",
        tokenHash: "token-hash",
        userId: user.user.id,
      });
      const organization = yield* organizations.createOrganization({
        createdAt: now,
        id: "organization-1",
        logo: null,
        name: "Acme Team",
        slug: "acme-team",
      });
      const member = yield* organizations.addMember({
        createdAt: now,
        id: "member-1",
        organizationId: organization.id,
        role: "owner",
        userId: user.user.id,
      });
      const invitation = yield* organizations.createInvitation({
        createdAt: now,
        email: "Member@Example.com",
        expiresAt: "2026-07-12T00:00:00.000Z",
        id: "invitation-1",
        inviterId: user.user.id,
        organizationId: organization.id,
        role: "member",
      });
      yield* organizations.setActiveOrganization({
        organizationId: organization.id,
        sessionId: session.id,
        userId: user.user.id,
      });
      const activeOrganizationId = yield* organizations.getActiveOrganizationId({
        sessionId: session.id,
        userId: user.user.id,
      });
      const listedMembers = yield* organizations.listMembers(organization.id);
      const listedInvitations = yield* organizations.listInvitationsForEmail("member@example.com");
      const acceptedInvitation = yield* organizations.updateInvitationStatus({
        invitationId: invitation.id,
        status: "accepted",
      });

      return {
        acceptedInvitation,
        activeOrganizationId,
        listedInvitations,
        listedMembers,
        member,
        organization,
      };
    }).pipe(
      Effect.provide(storageLayer),
      Effect.provide(postgresClientLayer()),
    );

    const result = await Effect.runPromise(program);

    assert.strictEqual(result.organization.slug, "acme-team");
    assert.strictEqual(result.member.role, "owner");
    assert.strictEqual(result.listedMembers.length, 1);
    assert.strictEqual(result.listedInvitations.length, 1);
    assert.strictEqual(result.listedInvitations[0]?.email, "member@example.com");
    assert.strictEqual(result.acceptedInvitation.status, "accepted");
    assert.strictEqual(result.activeOrganizationId, "organization-1");
  });
});
