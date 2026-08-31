import { Schema, type Effect } from "effect";
import { UserSchema } from "@kndwin/effect-auth-server";

export const OrgRoleSchema = Schema.Union([
  Schema.Literal("owner"),
  Schema.Literal("admin"),
  Schema.Literal("member"),
]);

export type OrgRole = typeof OrgRoleSchema.Type;

export const InvitationStatusSchema = Schema.Union([
  Schema.Literal("pending"),
  Schema.Literal("accepted"),
  Schema.Literal("rejected"),
  Schema.Literal("cancelled"),
]);

export type InvitationStatus = typeof InvitationStatusSchema.Type;

export class Organization extends Schema.Class<Organization>("Organization")({
  createdAt: Schema.String,
  id: Schema.String,
  logo: Schema.NullOr(Schema.String),
  name: Schema.String,
  slug: Schema.String,
}) {}

export const OrganizationSchema = Organization;

export class OrgMember extends Schema.Class<OrgMember>("OrgMember")({
  createdAt: Schema.String,
  id: Schema.String,
  organizationId: Schema.String,
  role: OrgRoleSchema,
  userId: Schema.String,
}) {}

export const OrgMemberSchema = OrgMember;

export class OrgMemberWithUser extends Schema.Class<OrgMemberWithUser>("OrgMemberWithUser")({
  member: OrgMemberSchema,
  user: Schema.NullOr(UserSchema),
}) {}

export class OrgInvitation extends Schema.Class<OrgInvitation>("OrgInvitation")({
  createdAt: Schema.String,
  email: Schema.String,
  expiresAt: Schema.String,
  id: Schema.String,
  inviterId: Schema.String,
  organizationId: Schema.String,
  role: OrgRoleSchema,
  status: InvitationStatusSchema,
}) {}

export const OrgInvitationSchema = OrgInvitation;

export class CurrentOrganizationValue extends Schema.Class<CurrentOrganizationValue>("CurrentOrganization")({
  organizationId: Schema.String,
  role: OrgRoleSchema,
}) {}

// HTTP payloads

export class CreateOrganizationInput extends Schema.Class<CreateOrganizationInput>("CreateOrganizationInput")({
  logo: Schema.optionalKey(Schema.NullOr(Schema.String)),
  name: Schema.String,
  slug: Schema.optionalKey(Schema.String),
}) {}

export class OrganizationIdInput extends Schema.Class<OrganizationIdInput>("OrganizationIdInput")({
  organizationId: Schema.String,
}) {}

export class InviteMemberInput extends Schema.Class<InviteMemberInput>("InviteMemberInput")({
  email: Schema.String,
  organizationId: Schema.String,
  role: OrgRoleSchema,
}) {}

export class InvitationIdInput extends Schema.Class<InvitationIdInput>("InvitationIdInput")({
  invitationId: Schema.String,
}) {}

// HTTP responses

export class OrganizationsResponse extends Schema.Class<OrganizationsResponse>("OrganizationsResponse")({
  organizations: Schema.Array(OrganizationSchema),
}) {}

export class FullOrganizationResponse extends Schema.Class<FullOrganizationResponse>("FullOrganizationResponse")({
  invitations: Schema.Array(OrgInvitationSchema),
  members: Schema.Array(OrgMemberWithUser),
  organization: OrganizationSchema,
}) {}

export class ActiveOrganizationResponse extends Schema.Class<ActiveOrganizationResponse>("ActiveOrganizationResponse")({
  organization: Schema.NullOr(OrganizationSchema),
  role: Schema.NullOr(OrgRoleSchema),
}) {}

export class InvitationsResponse extends Schema.Class<InvitationsResponse>("InvitationsResponse")({
  invitations: Schema.Array(OrgInvitationSchema),
}) {}

// Storage inputs

export class CreateOrganizationStorageInput extends Schema.Class<CreateOrganizationStorageInput>(
  "CreateOrganizationStorageInput",
)({
  createdAt: Schema.String,
  id: Schema.String,
  logo: Schema.NullOr(Schema.String),
  name: Schema.String,
  slug: Schema.String,
}) {}

export class AddMemberInput extends Schema.Class<AddMemberInput>("AddMemberInput")({
  createdAt: Schema.String,
  id: Schema.String,
  organizationId: Schema.String,
  role: OrgRoleSchema,
  userId: Schema.String,
}) {}

export class CreateInvitationInput extends Schema.Class<CreateInvitationInput>("CreateInvitationInput")({
  createdAt: Schema.String,
  email: Schema.String,
  expiresAt: Schema.String,
  id: Schema.String,
  inviterId: Schema.String,
  organizationId: Schema.String,
  role: OrgRoleSchema,
}) {}

export type OrganizationStorageShape = {
  readonly addMember: (input: AddMemberInput) => Effect.Effect<OrgMember, unknown>;
  readonly createInvitation: (input: CreateInvitationInput) => Effect.Effect<OrgInvitation, unknown>;
  readonly createOrganization: (input: CreateOrganizationStorageInput) => Effect.Effect<Organization, unknown>;
  readonly findInvitation: (invitationId: string) => Effect.Effect<OrgInvitation | null, unknown>;
  readonly findMember: (input: { readonly organizationId: string; readonly userId: string }) => Effect.Effect<OrgMember | null, unknown>;
  readonly findOrganization: (organizationId: string) => Effect.Effect<Organization | null, unknown>;
  readonly findOrganizationBySlug: (slug: string) => Effect.Effect<Organization | null, unknown>;
  readonly getActiveOrganizationId: (input: { readonly sessionId: string; readonly userId: string }) => Effect.Effect<string | null, unknown>;
  readonly listInvitationsForEmail: (email: string) => Effect.Effect<ReadonlyArray<OrgInvitation>, unknown>;
  readonly listInvitationsForOrganization: (organizationId: string) => Effect.Effect<ReadonlyArray<OrgInvitation>, unknown>;
  readonly listMembers: (organizationId: string) => Effect.Effect<ReadonlyArray<OrgMember>, unknown>;
  readonly listOrganizationsForUser: (userId: string) => Effect.Effect<ReadonlyArray<Organization>, unknown>;
  readonly setActiveOrganization: (input: {
    readonly organizationId: string;
    readonly sessionId: string;
    readonly userId: string;
  }) => Effect.Effect<void, unknown>;
  readonly updateInvitationStatus: (input: {
    readonly invitationId: string;
    readonly status: InvitationStatus;
  }) => Effect.Effect<OrgInvitation, unknown>;
};

export type OrganizationHooks = {
  readonly afterCreateOrganization?: (input: {
    readonly organization: Organization;
    readonly userId: string;
  }) => Effect.Effect<void, unknown>;
};

export type OrganizationDefineOptions = {
  readonly hooks?: OrganizationHooks;
  readonly invitationMaxAgeSeconds?: number;
};

export type OrganizationShape = {
  readonly acceptInvitation: (input: {
    readonly email: string | null;
    readonly invitationId: string;
    readonly userId: string;
  }) => Effect.Effect<OrgInvitation, unknown>;
  readonly cancelInvitation: (input: {
    readonly invitationId: string;
    readonly userId: string;
  }) => Effect.Effect<OrgInvitation, unknown>;
  readonly create: (input: {
    readonly logo?: string | null;
    readonly name: string;
    readonly slug?: string;
    readonly userId: string;
  }) => Effect.Effect<Organization, unknown>;
  readonly getActiveOrganization: (input: {
    readonly sessionId: string;
    readonly userId: string;
  }) => Effect.Effect<{ readonly organization: Organization; readonly role: OrgRole } | null, unknown>;
  readonly getFullOrganization: (input: {
    readonly organizationId: string;
    readonly userId: string;
  }) => Effect.Effect<FullOrganizationResponse, unknown>;
  readonly inviteMember: (input: {
    readonly email: string;
    readonly inviterId: string;
    readonly organizationId: string;
    readonly role: OrgRole;
  }) => Effect.Effect<OrgInvitation, unknown>;
  readonly list: (userId: string) => Effect.Effect<ReadonlyArray<Organization>, unknown>;
  readonly listInvitations: (input: {
    readonly organizationId: string;
    readonly userId: string;
  }) => Effect.Effect<ReadonlyArray<OrgInvitation>, unknown>;
  readonly listUserInvitations: (email: string | null) => Effect.Effect<ReadonlyArray<OrgInvitation>, unknown>;
  readonly membershipRole: (input: {
    readonly organizationId: string;
    readonly userId: string;
  }) => Effect.Effect<OrgRole | null, unknown>;
  readonly rejectInvitation: (input: {
    readonly email: string | null;
    readonly invitationId: string;
  }) => Effect.Effect<OrgInvitation, unknown>;
  readonly setActive: (input: {
    readonly organizationId: string;
    readonly sessionId: string;
    readonly userId: string;
  }) => Effect.Effect<void, unknown>;
};
