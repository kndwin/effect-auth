import { Context } from "effect";
import { HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware, HttpApiSchema } from "effect/unstable/httpapi";
import { AuthErrorSchema, CurrentUser, OkSchema, RequireSession, Unauthorized, sessionCookieSecurity } from "@kndwin/server";
import {
  ActiveOrganizationResponse,
  CreateOrganizationInput,
  CurrentOrganizationValue,
  FullOrganizationResponse,
  InvitationIdInput,
  InvitationsResponse,
  InviteMemberInput,
  OrganizationIdInput,
  OrganizationSchema,
  OrgInvitationSchema,
  OrganizationsResponse,
} from "./organization.schema";

const AuthErrorResponseSchema = AuthErrorSchema.pipe(HttpApiSchema.status(400));

// Provided by RequireOrganization: the caller's active organization and role.
export class CurrentOrganization extends Context.Service<CurrentOrganization, CurrentOrganizationValue>()(
  "effect-auth/organization/CurrentOrganization",
) {}

// Session + active-organization guard for consumer business groups. Composes
// the same cookie security as RequireSession but additionally resolves the
// active organization and membership role. Provides both the session's
// CurrentUser and the CurrentOrganization.
export class RequireOrganization extends HttpApiMiddleware.Service<RequireOrganization, {
  provides: CurrentOrganization | CurrentUser;
}>()(
  "effect-auth/organization/RequireOrganization",
  {
    error: Unauthorized.pipe(HttpApiSchema.status(401)),
    security: {
      session: sessionCookieSecurity,
    },
  },
) {}

export const organizationGroup = HttpApiGroup.make("authOrganization").add(
  HttpApiEndpoint.post("create", "/auth/organization/create", {
    error: AuthErrorResponseSchema,
    payload: CreateOrganizationInput,
    success: OrganizationSchema,
  }),
  HttpApiEndpoint.get("list", "/auth/organization/list", {
    error: AuthErrorResponseSchema,
    success: OrganizationsResponse,
  }),
  HttpApiEndpoint.get("active", "/auth/organization/active", {
    error: AuthErrorResponseSchema,
    success: ActiveOrganizationResponse,
  }),
  HttpApiEndpoint.post("setActive", "/auth/organization/set-active", {
    error: AuthErrorResponseSchema,
    payload: OrganizationIdInput,
    success: OkSchema,
  }),
  HttpApiEndpoint.post("getFull", "/auth/organization/get", {
    error: AuthErrorResponseSchema,
    payload: OrganizationIdInput,
    success: FullOrganizationResponse,
  }),
  HttpApiEndpoint.post("inviteMember", "/auth/organization/invite", {
    error: AuthErrorResponseSchema,
    payload: InviteMemberInput,
    success: OrgInvitationSchema,
  }),
  HttpApiEndpoint.post("listInvitations", "/auth/organization/invitations", {
    error: AuthErrorResponseSchema,
    payload: OrganizationIdInput,
    success: InvitationsResponse,
  }),
  HttpApiEndpoint.get("listUserInvitations", "/auth/organization/invitations/mine", {
    error: AuthErrorResponseSchema,
    success: InvitationsResponse,
  }),
  HttpApiEndpoint.post("acceptInvitation", "/auth/organization/invitations/accept", {
    error: AuthErrorResponseSchema,
    payload: InvitationIdInput,
    success: OrgInvitationSchema,
  }),
  HttpApiEndpoint.post("rejectInvitation", "/auth/organization/invitations/reject", {
    error: AuthErrorResponseSchema,
    payload: InvitationIdInput,
    success: OrgInvitationSchema,
  }),
  HttpApiEndpoint.post("cancelInvitation", "/auth/organization/invitations/cancel", {
    error: AuthErrorResponseSchema,
    payload: InvitationIdInput,
    success: OrgInvitationSchema,
  }),
).middleware(RequireSession);
