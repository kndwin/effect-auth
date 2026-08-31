import { Context } from "effect";
import type { AuthStorageShape } from "./storage.schema";

export type {
  AuthStorageShape,
  CreateSessionInput,
  CreateUserInput,
  SetEmailTokenInput,
  OAuthState,
  UpdateEmailPasswordInput,
  UpsertEmailIdentityInput,
  UpsertProviderAccountInput,
} from "./storage.schema";

export class AuthStorage extends Context.Service<AuthStorage, AuthStorageShape>()("effect-auth/AuthStorage") {}
