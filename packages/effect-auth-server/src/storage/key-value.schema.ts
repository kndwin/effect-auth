import { Schema } from "effect";

export class KeyValueStorageOptions extends Schema.Class<KeyValueStorageOptions>("KeyValueStorageOptions")({
  prefix: Schema.optionalKey(Schema.String),
}) {}

export const KeyValueStorageOptionsSchema = KeyValueStorageOptions;
