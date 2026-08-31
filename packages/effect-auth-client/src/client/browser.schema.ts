import { Schema, type Effect } from "effect";
import type { AuthClientShape } from "../client.schema";

export class BrowserAuthClientOptionsModel extends Schema.Class<BrowserAuthClientOptionsModel>(
  "BrowserAuthClientOptions",
)({
  baseUrl: Schema.optionalKey(Schema.Union([Schema.String, Schema.URL])),
}) {}

export const BrowserAuthClientOptionsSchema = BrowserAuthClientOptionsModel;

export type BrowserAuthClientOptionsInput = typeof BrowserAuthClientOptionsSchema.Type;

export type BrowserAuthClientOptions = BrowserAuthClientOptionsInput & {
  readonly redirect?: (url: string) => void;
};

export class BrowserAuthClientSocialSignInOptions extends Schema.Class<BrowserAuthClientSocialSignInOptions>(
  "BrowserAuthClientSocialSignInOptions",
)({
  provider: Schema.String,
}) {}

export const BrowserAuthClientSocialSignInOptionsSchema = BrowserAuthClientSocialSignInOptions;

export type BrowserAuthClientShape = Omit<AuthClientShape, "signInUrl"> & {
  readonly signIn: {
    readonly social: (options: BrowserAuthClientSocialSignInOptions) => Effect.Effect<void>;
  };
};
