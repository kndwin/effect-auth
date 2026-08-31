import { AuthClient } from "@effect-auth/client";

export const authClient = AuthClient.make({
  baseUrl: import.meta.env.VITE_API_URL,
});

export const AuthClientLive = AuthClient.toLayer(authClient);
