import { Effect, Layer } from "effect";
import { HttpServerRequest } from "effect/unstable/http";
import { HttpApiBuilder, type HttpApi } from "effect/unstable/httpapi";
import { Auth, AuthConfig, CurrentUser, Ok, Unauthorized } from "@effect-auth/server";
import { sessionTokenFromRequest, toAuthError } from "@effect-auth/server/http.live";
import {
  ActiveOrganizationResponse,
  CurrentOrganizationValue,
  InvitationsResponse,
  OrganizationsResponse,
} from "./organization.schema";
import { CurrentOrganization, organizationGroup, RequireOrganization } from "./organization.http";
import { OrganizationService } from "./organization";

const layer = (api: HttpApi.HttpApi<string, any>) => HttpApiBuilder.group(
  api as HttpApi.HttpApi<string, typeof organizationGroup>,
  "authOrganization",
  (handlers) =>
    handlers
      .handle("create", ({ payload }) =>
        Effect.fn("OrganizationHttp.create")(function* () {
          const organizations = yield* OrganizationService;
          const current = yield* CurrentUser;
          return yield* organizations.create({
            logo: payload.logo ?? null,
            name: payload.name,
            slug: payload.slug,
            userId: current.user.id,
          }).pipe(Effect.mapError(toAuthError));
        })(),
      )
      .handle("list", () =>
        Effect.fn("OrganizationHttp.list")(function* () {
          const organizations = yield* OrganizationService;
          const current = yield* CurrentUser;
          const list = yield* organizations.list(current.user.id).pipe(Effect.mapError(toAuthError));
          return new OrganizationsResponse({ organizations: list });
        })(),
      )
      .handle("active", () =>
        Effect.fn("OrganizationHttp.active")(function* () {
          const organizations = yield* OrganizationService;
          const current = yield* CurrentUser;
          const active = yield* organizations.getActiveOrganization({
            sessionId: current.session.id,
            userId: current.user.id,
          }).pipe(Effect.mapError(toAuthError));
          return new ActiveOrganizationResponse({
            organization: active?.organization ?? null,
            role: active?.role ?? null,
          });
        })(),
      )
      .handle("setActive", ({ payload }) =>
        Effect.fn("OrganizationHttp.setActive")(function* () {
          const organizations = yield* OrganizationService;
          const current = yield* CurrentUser;
          yield* organizations.setActive({
            organizationId: payload.organizationId,
            sessionId: current.session.id,
            userId: current.user.id,
          }).pipe(Effect.mapError(toAuthError));
          return new Ok({ ok: true });
        })(),
      )
      .handle("getFull", ({ payload }) =>
        Effect.fn("OrganizationHttp.getFull")(function* () {
          const organizations = yield* OrganizationService;
          const current = yield* CurrentUser;
          return yield* organizations.getFullOrganization({
            organizationId: payload.organizationId,
            userId: current.user.id,
          }).pipe(Effect.mapError(toAuthError));
        })(),
      )
      .handle("inviteMember", ({ payload }) =>
        Effect.fn("OrganizationHttp.inviteMember")(function* () {
          const organizations = yield* OrganizationService;
          const current = yield* CurrentUser;
          return yield* organizations.inviteMember({
            email: payload.email,
            inviterId: current.user.id,
            organizationId: payload.organizationId,
            role: payload.role,
          }).pipe(Effect.mapError(toAuthError));
        })(),
      )
      .handle("listInvitations", ({ payload }) =>
        Effect.fn("OrganizationHttp.listInvitations")(function* () {
          const organizations = yield* OrganizationService;
          const current = yield* CurrentUser;
          const invitations = yield* organizations.listInvitations({
            organizationId: payload.organizationId,
            userId: current.user.id,
          }).pipe(Effect.mapError(toAuthError));
          return new InvitationsResponse({ invitations });
        })(),
      )
      .handle("listUserInvitations", () =>
        Effect.fn("OrganizationHttp.listUserInvitations")(function* () {
          const organizations = yield* OrganizationService;
          const current = yield* CurrentUser;
          const invitations = yield* organizations.listUserInvitations(current.user.email).pipe(
            Effect.mapError(toAuthError),
          );
          return new InvitationsResponse({ invitations });
        })(),
      )
      .handle("acceptInvitation", ({ payload }) =>
        Effect.fn("OrganizationHttp.acceptInvitation")(function* () {
          const organizations = yield* OrganizationService;
          const current = yield* CurrentUser;
          return yield* organizations.acceptInvitation({
            email: current.user.email,
            invitationId: payload.invitationId,
            userId: current.user.id,
          }).pipe(Effect.mapError(toAuthError));
        })(),
      )
      .handle("rejectInvitation", ({ payload }) =>
        Effect.fn("OrganizationHttp.rejectInvitation")(function* () {
          const organizations = yield* OrganizationService;
          const current = yield* CurrentUser;
          return yield* organizations.rejectInvitation({
            email: current.user.email,
            invitationId: payload.invitationId,
          }).pipe(Effect.mapError(toAuthError));
        })(),
      )
      .handle("cancelInvitation", ({ payload }) =>
        Effect.fn("OrganizationHttp.cancelInvitation")(function* () {
          const organizations = yield* OrganizationService;
          const current = yield* CurrentUser;
          return yield* organizations.cancelInvitation({
            invitationId: payload.invitationId,
            userId: current.user.id,
          }).pipe(Effect.mapError(toAuthError));
        })(),
      ),
);

export const OrganizationHttp = { layer };

// Session + active-organization middleware implementation for consumer groups.
export const RequireOrganizationLive = Layer.effect(
  RequireOrganization,
  Effect.gen(function* () {
    const auth = yield* Auth;
    const config = yield* AuthConfig;
    const organizations = yield* OrganizationService;
    return {
      session: (httpEffect) =>
        Effect.fn("RequireOrganization.session")(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const token = sessionTokenFromRequest(config, request);
          const session = token ? yield* Effect.orDie(auth.validateSession(token)) : null;
          if (!session) {
            return yield* Effect.fail(new Unauthorized({ message: "A valid session is required" }));
          }
          const active = yield* Effect.orDie(organizations.getActiveOrganization({
            sessionId: session.session.id,
            userId: session.user.id,
          }));
          if (!active) {
            return yield* Effect.fail(new Unauthorized({ message: "An active organization is required" }));
          }
          return yield* Effect.provideService(
            httpEffect,
            CurrentOrganization,
            new CurrentOrganizationValue({ organizationId: active.organization.id, role: active.role }),
          ).pipe(Effect.provideService(CurrentUser, session));
        })(),
    };
  }),
);
