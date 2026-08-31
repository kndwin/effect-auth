import { Context, Effect, Layer } from "effect";
import { randomUUID } from "node:crypto";
import { AuthFailure, AuthStorage, Unauthorized } from "@kndwin/server";
import {
  FullOrganizationResponse,
  OrgMemberWithUser,
  type OrganizationDefineOptions,
  type OrganizationShape,
  type OrgRole,
} from "./organization.schema";
import { OrganizationStorage } from "./organization.storage";

export * from "./organization.schema";
export { OrganizationStorage } from "./organization.storage";

const nowIso = () => new Date().toISOString();

const slugify = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `org-${randomUUID().slice(0, 8)}`;

const canManage = (role: OrgRole | null): role is "owner" | "admin" => role === "owner" || role === "admin";

export class OrganizationService extends Context.Service<OrganizationService, OrganizationShape>()(
  "effect-auth/organization/Organization",
) {
  static readonly make = (options: OrganizationDefineOptions = {}) => Layer.effect(
    OrganizationService,
    Effect.gen(function* () {
      const storage = yield* OrganizationStorage;
      const authStorage = yield* AuthStorage;
      const invitationMaxAgeSeconds = options.invitationMaxAgeSeconds ?? 60 * 60 * 24 * 7;

      const membershipRole = Effect.fn("Organization.membershipRole")(function* ({
        organizationId,
        userId,
      }: {
        readonly organizationId: string;
        readonly userId: string;
      }) {
        const member = yield* storage.findMember({ organizationId, userId });
        return member?.role ?? null;
      });

      const requireRole = Effect.fn("Organization.requireRole")(function* (
        input: { readonly organizationId: string; readonly userId: string },
        check: (role: OrgRole | null) => boolean,
        message: string,
      ) {
        const role = yield* membershipRole(input);
        if (!check(role)) {
          return yield* Effect.fail(new Unauthorized({ message }));
        }
        return role as OrgRole;
      });

      const addMember = Effect.fn("Organization.addMember")((input: {
        readonly organizationId: string;
        readonly role: OrgRole;
        readonly userId: string;
      }) => storage.addMember({
        createdAt: nowIso(),
        id: `orgmem_${randomUUID()}`,
        organizationId: input.organizationId,
        role: input.role,
        userId: input.userId,
      }));

      return {
        acceptInvitation: Effect.fn("Organization.acceptInvitation")(function* ({ email, invitationId, userId }) {
          const invitation = yield* storage.findInvitation(invitationId);
          if (!invitation || invitation.status !== "pending" || new Date(invitation.expiresAt).getTime() <= Date.now()) {
            return yield* Effect.fail(new AuthFailure({ message: "Invitation is no longer valid" }));
          }
          if (email === null || invitation.email !== email.toLowerCase()) {
            return yield* Effect.fail(new Unauthorized({ message: "Invitation was issued to a different email" }));
          }
          const existing = yield* storage.findMember({ organizationId: invitation.organizationId, userId });
          if (!existing) {
            yield* addMember({ organizationId: invitation.organizationId, role: invitation.role, userId });
          }
          return yield* storage.updateInvitationStatus({ invitationId, status: "accepted" });
        }),
        cancelInvitation: Effect.fn("Organization.cancelInvitation")(function* ({ invitationId, userId }) {
          const invitation = yield* storage.findInvitation(invitationId);
          if (!invitation || invitation.status !== "pending") {
            return yield* Effect.fail(new AuthFailure({ message: "Invitation is no longer valid" }));
          }
          yield* requireRole(
            { organizationId: invitation.organizationId, userId },
            canManage,
            "Only owners and admins can cancel invitations",
          );
          return yield* storage.updateInvitationStatus({ invitationId, status: "cancelled" });
        }),
        create: Effect.fn("Organization.create")(function* ({ logo, name, slug, userId }) {
          const resolvedSlug = slug ?? slugify(name);
          const existing = yield* storage.findOrganizationBySlug(resolvedSlug);
          if (existing) {
            return yield* Effect.fail(new AuthFailure({ message: `Organization slug is already taken: ${resolvedSlug}` }));
          }
          const organization = yield* storage.createOrganization({
            createdAt: nowIso(),
            id: `org_${randomUUID()}`,
            logo: logo ?? null,
            name,
            slug: resolvedSlug,
          });
          yield* addMember({ organizationId: organization.id, role: "owner", userId });
          if (options.hooks?.afterCreateOrganization) {
            // Hook failures must never fail organization creation.
            yield* options.hooks.afterCreateOrganization({ organization, userId }).pipe(
              Effect.catchCause((cause) =>
                Effect.logError("afterCreateOrganization hook failed", cause)),
            );
          }
          return organization;
        }),
        getActiveOrganization: Effect.fn("Organization.getActiveOrganization")(function* ({ sessionId, userId }) {
          const organizationId = yield* storage.getActiveOrganizationId({ sessionId, userId });
          if (organizationId === null) {
            return null;
          }
          const role = yield* membershipRole({ organizationId, userId });
          if (role === null) {
            return null;
          }
          const organization = yield* storage.findOrganization(organizationId);
          return organization ? { organization, role } : null;
        }),
        getFullOrganization: Effect.fn("Organization.getFullOrganization")(function* ({ organizationId, userId }) {
          yield* requireRole({ organizationId, userId }, (role) => role !== null, "Organization membership required");
          const organization = yield* storage.findOrganization(organizationId);
          if (!organization) {
            return yield* Effect.fail(new AuthFailure({ message: "Organization not found" }));
          }
          const members = yield* storage.listMembers(organizationId);
          const withUsers = yield* Effect.forEach(members, (member) =>
            authStorage.findUser(member.userId).pipe(
              Effect.map((user) => new OrgMemberWithUser({ member, user })),
            ));
          const invitations = yield* storage.listInvitationsForOrganization(organizationId);
          return new FullOrganizationResponse({ invitations, members: withUsers, organization });
        }),
        inviteMember: Effect.fn("Organization.inviteMember")(function* ({ email, inviterId, organizationId, role }) {
          yield* requireRole(
            { organizationId, userId: inviterId },
            canManage,
            "Only owners and admins can invite members",
          );
          return yield* storage.createInvitation({
            createdAt: nowIso(),
            email,
            expiresAt: new Date(Date.now() + invitationMaxAgeSeconds * 1000).toISOString(),
            id: `orginv_${randomUUID()}`,
            inviterId,
            organizationId,
            role,
          });
        }),
        list: Effect.fn("Organization.list")((userId: string) => storage.listOrganizationsForUser(userId)),
        listInvitations: Effect.fn("Organization.listInvitations")(function* ({ organizationId, userId }) {
          yield* requireRole({ organizationId, userId }, canManage, "Only owners and admins can list invitations");
          return yield* storage.listInvitationsForOrganization(organizationId);
        }),
        listUserInvitations: Effect.fn("Organization.listUserInvitations")(function* (email) {
          if (email === null) {
            return [];
          }
          return yield* storage.listInvitationsForEmail(email);
        }),
        membershipRole,
        rejectInvitation: Effect.fn("Organization.rejectInvitation")(function* ({ email, invitationId }) {
          const invitation = yield* storage.findInvitation(invitationId);
          if (!invitation || invitation.status !== "pending") {
            return yield* Effect.fail(new AuthFailure({ message: "Invitation is no longer valid" }));
          }
          if (email === null || invitation.email !== email.toLowerCase()) {
            return yield* Effect.fail(new Unauthorized({ message: "Invitation was issued to a different email" }));
          }
          return yield* storage.updateInvitationStatus({ invitationId, status: "rejected" });
        }),
        setActive: Effect.fn("Organization.setActive")(function* ({ organizationId, sessionId, userId }) {
          yield* requireRole({ organizationId, userId }, (role) => role !== null, "Organization membership required");
          yield* storage.setActiveOrganization({ organizationId, sessionId, userId });
        }),
      };
    }),
  );
}

