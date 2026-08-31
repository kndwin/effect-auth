import { Context, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApi, HttpApiClient } from "effect/unstable/httpapi";
import type { Ok } from "@kndwin/effect-auth-server";
import { organizationGroup } from "./organization.http";
import type {
  ActiveOrganizationResponse,
  CreateOrganizationInput,
  FullOrganizationResponse,
  InvitationIdInput,
  InvitationsResponse,
  InviteMemberInput,
  OrgInvitation,
  Organization,
  OrganizationIdInput,
  OrganizationsResponse,
} from "./organization.schema";

export const organizationApi = HttpApi.make("effect-auth-organization").add(organizationGroup);

export type OrganizationClientOptions = {
  readonly baseUrl?: string | URL;
};

export type OrganizationClientShape = {
  readonly acceptInvitation: (input: InvitationIdInput) => Effect.Effect<OrgInvitation, unknown>;
  readonly active: () => Effect.Effect<ActiveOrganizationResponse, unknown>;
  readonly cancelInvitation: (input: InvitationIdInput) => Effect.Effect<OrgInvitation, unknown>;
  readonly create: (input: CreateOrganizationInput) => Effect.Effect<Organization, unknown>;
  readonly getFull: (input: OrganizationIdInput) => Effect.Effect<FullOrganizationResponse, unknown>;
  readonly inviteMember: (input: InviteMemberInput) => Effect.Effect<OrgInvitation, unknown>;
  readonly list: () => Effect.Effect<OrganizationsResponse, unknown>;
  readonly listInvitations: (input: OrganizationIdInput) => Effect.Effect<InvitationsResponse, unknown>;
  readonly listUserInvitations: () => Effect.Effect<InvitationsResponse, unknown>;
  readonly rejectInvitation: (input: InvitationIdInput) => Effect.Effect<OrgInvitation, unknown>;
  readonly setActive: (input: OrganizationIdInput) => Effect.Effect<Ok, unknown>;
};

const layerFetch = Layer.provide(
  FetchHttpClient.layer,
  Layer.succeed(FetchHttpClient.RequestInit, { credentials: "include" }),
);

export class OrganizationClient extends Context.Service<OrganizationClient, OrganizationClientShape>()(
  "effect-auth/organization/OrganizationClient",
) {
  static readonly layer = (options: OrganizationClientOptions = {}) => Layer.effect(
    OrganizationClient,
    Effect.gen(function* () {
      const client = yield* HttpApiClient.make(organizationApi, { baseUrl: options.baseUrl });
      return {
        acceptInvitation: Effect.fn("OrganizationClient.acceptInvitation")((input) =>
          client.authOrganization.acceptInvitation({ payload: input })),
        active: Effect.fn("OrganizationClient.active")(() => client.authOrganization.active({})),
        cancelInvitation: Effect.fn("OrganizationClient.cancelInvitation")((input) =>
          client.authOrganization.cancelInvitation({ payload: input })),
        create: Effect.fn("OrganizationClient.create")((input) =>
          client.authOrganization.create({ payload: input })),
        getFull: Effect.fn("OrganizationClient.getFull")((input) =>
          client.authOrganization.getFull({ payload: input })),
        inviteMember: Effect.fn("OrganizationClient.inviteMember")((input) =>
          client.authOrganization.inviteMember({ payload: input })),
        list: Effect.fn("OrganizationClient.list")(() => client.authOrganization.list({})),
        listInvitations: Effect.fn("OrganizationClient.listInvitations")((input) =>
          client.authOrganization.listInvitations({ payload: input })),
        listUserInvitations: Effect.fn("OrganizationClient.listUserInvitations")(() =>
          client.authOrganization.listUserInvitations({})),
        rejectInvitation: Effect.fn("OrganizationClient.rejectInvitation")((input) =>
          client.authOrganization.rejectInvitation({ payload: input })),
        setActive: Effect.fn("OrganizationClient.setActive")((input) =>
          client.authOrganization.setActive({ payload: input })),
      };
    }),
  );

  static readonly fetchLayer = (options: OrganizationClientOptions = {}) => OrganizationClient.layer(options).pipe(
    Layer.provide(layerFetch),
  );
}
