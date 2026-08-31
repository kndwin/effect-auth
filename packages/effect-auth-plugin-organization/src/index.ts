import type { AuthPluginShape } from "@kndwin/effect-auth-server";
import { OrganizationService } from "./organization";
import { OrganizationHttp, RequireOrganizationLive } from "./organization.http.live";
import type { OrganizationDefineOptions } from "./organization.schema";
import { OrganizationStorage } from "./organization.storage";

export * from "./organization";
export { CurrentOrganization, organizationGroup, RequireOrganization } from "./organization.http";
export { OrganizationHttp, RequireOrganizationLive } from "./organization.http.live";
export { OrganizationStorageSql, type OrganizationSqlOptions } from "./sql";

export const Organization = {
  // The plugin value for `Auth.define({ plugins: [Organization.define({...})] })`.
  // Provides OrganizationService (and its HTTP handlers via AuthHttp.layer's
  // plugins option); the consumer provides OrganizationStorage — e.g.
  // OrganizationStorageSql.layer() — alongside AuthStorage.
  define: (options: OrganizationDefineOptions = {}): AuthPluginShape<OrganizationService, OrganizationStorage> => ({
    id: "organization",
    layer: () => OrganizationService.make(options),
    httpLayer: (api) => OrganizationHttp.layer(api),
  }),
};
