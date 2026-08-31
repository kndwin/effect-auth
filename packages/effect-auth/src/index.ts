/**
 * @kndwin/effect-auth — umbrella barrel
 *
 * Single-install entry that re-exports the 4 granular packages.
 * Granular imports remain available for tree-shaking:
 *   @kndwin/effect-auth-server
 *   @kndwin/effect-auth-client
 *   @kndwin/effect-auth-oauth
 *   @kndwin/effect-auth-plugin-organization
 *
 * Umbrella via:
 *   import { Auth } from "@kndwin/effect-auth"
 *   import { Auth } from "@kndwin/effect-auth/server"
 *   import { BrowserAuthClient } from "@kndwin/effect-auth/client"
 */

// Core — server is the source of truth, re-exported at top-level for DX
export * from "@kndwin/effect-auth-server";

// Client — namespaced (collides with server on User/PublicSession)
export * as Client from "@kndwin/effect-auth-client";

// Optional plugins — namespaced to avoid collisions
export * as OAuth from "@kndwin/effect-auth-oauth";
export * as Organization from "@kndwin/effect-auth-plugin-organization";
