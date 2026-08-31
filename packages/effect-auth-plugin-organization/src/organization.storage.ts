import { Context } from "effect";
import type { OrganizationStorageShape } from "./organization.schema";

export type { OrganizationStorageShape } from "./organization.schema";

export class OrganizationStorage extends Context.Service<OrganizationStorage, OrganizationStorageShape>()(
  "effect-auth/organization/OrganizationStorage",
) {}
