import { AuthClient, User } from "@effect-auth/client";
import { Effect, Schema as S } from "effect";
import { Command, Runtime, type Update } from "foldkit";
import { Document, Html, HtmlBuilder } from "foldkit/html";
import { defineMessageUnion } from "foldkit/message";
import { evo } from "foldkit/struct";

const failureReason = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
const authLayer = AuthClient.fetchLayer(apiUrl === undefined ? {} : { baseUrl: apiUrl });

const Status = S.Union([
  S.TaggedStruct("Checking", {}),
  S.TaggedStruct("SignedOut", {}),
  S.TaggedStruct("SigningIn", {}),
  S.TaggedStruct("SigningUp", {}),
  S.TaggedStruct("SigningOut", {}),
  S.TaggedStruct("Authenticated", { user: User }),
  S.TaggedStruct("Failure", { reason: S.String }),
]);

export const Model = S.Struct({
  email: S.String,
  name: S.String,
  password: S.String,
  status: Status,
});
export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  UpdatedEmail: { value: S.String },
  UpdatedPassword: { value: S.String },
  UpdatedName: { value: S.String },
  ClickedSignIn: {},
  ClickedSignUp: {},
  ClickedSignOut: {},
  ClickedCheckSession: {},
  ClickedRetry: {},
  SessionFound: { user: User },
  SessionMissing: {},
  SignedIn: { user: User },
  SignedUp: { user: User },
  SignedOut: {},
  Failed: { reason: S.String },
});
export type Message = typeof Message.Type;

const requireUser = (session: { readonly session: { readonly user: User } | null }) => {
  const user = session.session?.user;
  return user === undefined
    ? Effect.fail("sign-in returned no user")
    : Effect.succeed(user);
};



const withAuth = <A>(effect: Effect.Effect<A, unknown, AuthClient>) =>
  effect.pipe(
    Effect.catch((error) => Effect.fail(failureReason(error))),
    Effect.provide(authLayer),
  );

const setStatus = (model: Model, status: Model["status"]): Model => ({
  ...model,
  status,
});

export const CheckSession = Command.define("CheckSession", {
  messages: [Message.SessionFound, Message.SessionMissing, Message.Failed],
  execute: withAuth(
    Effect.gen(function* () {
      const client = yield* AuthClient;
      const result = yield* client.getSession();
      const user = result.session?.user;
      return user === undefined ? Message.SessionMissing() : Message.SessionFound({ user });
    }),
  ).pipe(
    Effect.catch((reason) => Effect.succeed(Message.Failed({ reason: String(reason) }))),
  ),
});

export const SignIn = Command.define("SignIn", {
  args: { email: S.String, password: S.String },
  messages: [Message.SignedIn, Message.Failed],
  execute: ({ email, password }) =>
    withAuth(
      Effect.gen(function* () {
        const client = yield* AuthClient;
        const result = yield* client.email.signIn({ email, password });
        const user = yield* requireUser(result);
        return Message.SignedIn({ user });
      }),
    ).pipe(
      Effect.catch((reason) => Effect.succeed(Message.Failed({ reason: String(reason) }))),
    ),
});

export const SignUp = Command.define("SignUp", {
  args: { email: S.String, name: S.String, password: S.String },
  messages: [Message.SignedUp, Message.Failed],
  execute: ({ email, name, password }) =>
    withAuth(
      Effect.gen(function* () {
        const client = yield* AuthClient;
        yield* client.email.signUp({ email, password, name });
        const result = yield* client.email.signIn({ email, password });
        const user = yield* requireUser(result);
        return Message.SignedUp({ user });
      }),
    ).pipe(
      Effect.catch((reason) => Effect.succeed(Message.Failed({ reason: String(reason) }))),
    ),
});

export const SignOut = Command.define("SignOut", {
  messages: [Message.SignedOut, Message.Failed],
  execute: withAuth(
    Effect.gen(function* () {
      const client = yield* AuthClient;
      yield* client.signOut();
      return Message.SignedOut();
    }),
  ).pipe(
    Effect.catch((reason) => Effect.succeed(Message.Failed({ reason: String(reason) }))),
  ),
});

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    email: "alice@example.com",
    name: "Alice",
    password: "correct-horse-battery-staple",
    status: { _tag: "Checking" },
  },
  commands: [CheckSession()],
});

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match(message, {
    UpdatedEmail: ({ value }) => ({ model: evo(model, { email: () => value }) }),
    UpdatedPassword: ({ value }) => ({ model: evo(model, { password: () => value }) }),
    UpdatedName: ({ value }) => ({ model: evo(model, { name: () => value }) }),
    ClickedSignIn: () => ({
      model: setStatus(model, { _tag: "SigningIn" }),
      commands: [SignIn({ email: model.email, password: model.password })],
    }),
    ClickedSignUp: () => ({
      model: setStatus(model, { _tag: "SigningUp" }),
      commands: [SignUp({ email: model.email, name: model.name, password: model.password })],
    }),
    ClickedSignOut: () => ({
      model: setStatus(model, { _tag: "SigningOut" }),
      commands: [SignOut()],
    }),
    ClickedCheckSession: () => ({
      model: setStatus(model, { _tag: "Checking" }),
      commands: [CheckSession()],
    }),
    ClickedRetry: () => ({
      model: setStatus(model, { _tag: "SignedOut" }),
    }),
    SessionFound: ({ user }) => ({
      model: setStatus(model, { _tag: "Authenticated", user }),
    }),
    SessionMissing: () => ({
      model: setStatus(model, { _tag: "SignedOut" }),
    }),
    SignedIn: ({ user }) => ({
      model: setStatus(model, { _tag: "Authenticated", user }),
    }),
    SignedUp: ({ user }) => ({
      model: setStatus(model, { _tag: "Authenticated", user }),
    }),
    SignedOut: () => ({
      model: setStatus(model, { _tag: "SignedOut" }),
    }),
    Failed: ({ reason }) => ({
      model: setStatus(
        model,
        model.status._tag === "Checking" ? { _tag: "SignedOut" } : { _tag: "Failure", reason },
      ),
    }),
  });

const busy = (status: Model["status"]["_tag"]) =>
  status === "Checking" || status === "SigningIn" || status === "SigningUp" || status === "SigningOut";

const inputStyle = {
  padding: "8px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "14px",
};
const btnPrimary = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
  fontSize: "14px",
};
const btnSecondary = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: "14px",
};
const preStyle = {
  margin: "0",
  padding: "12px",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  overflow: "auto",
  fontSize: "12px",
};

const field = (
  label: string,
  value: string,
  onInput: (value: string) => Message,
  h: HtmlBuilder<Message>,
  type = "text",
): Html =>
  h.label(
    [h.Style({ display: "grid", gap: "4px" })],
    [
      h.span([h.Style({ fontSize: "13px", opacity: "0.7" })], [label]),
      h.input([
        h.Type(type),
        h.Value(value),
        h.Style(inputStyle),
        h.OnInput(onInput),
      ]),
    ],
  );

const signedOutView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.form(
    [
      h.Style({ display: "grid", gap: "12px" }),
      h.OnSubmit(Message.ClickedSignIn()),
    ],
    [
      h.h2([h.Style({ margin: "0" })], ["Sign in"]),
      field("Email", model.email, (value) => Message.UpdatedEmail({ value }), h, "email"),
      field("Password", model.password, (value) => Message.UpdatedPassword({ value }), h, "password"),
      field("Name (for sign-up)", model.name, (value) => Message.UpdatedName({ value }), h),
      h.div(
        [h.Style({ display: "flex", gap: "8px" })],
        [
          h.button(
            [h.Type("submit"), h.Disabled(busy(model.status._tag)), h.Style(btnPrimary)],
            [busy(model.status._tag) ? "…" : "Sign in"],
          ),
          h.button(
            [
              h.Type("button"),
              h.Disabled(busy(model.status._tag)),
              h.OnClick(Message.ClickedSignUp()),
              h.Style(btnSecondary),
            ],
            ["Sign up"],
          ),
          h.button(
            [h.Type("button"), h.OnClick(Message.ClickedCheckSession()), h.Style(btnSecondary)],
            ["Re-check session"],
          ),
        ],
      ),
    ],
  );

const statusView = (model: Model, h: HtmlBuilder<Message>): Html => {
  switch (model.status._tag) {
    case "Checking":
      return h.p([], ["Checking session…"]);
    case "SigningOut":
      return h.p([], ["Signing out…"]);
    case "SigningIn":
      return h.p([], [`SigningIn as ${model.email}…`]);
    case "SigningUp":
      return h.p([], [`SigningUp as ${model.email}…`]);
    case "SignedOut":
      return signedOutView(model, h);
    case "Authenticated":
      return h.div(
        [h.Style({ display: "grid", gap: "12px" })],
        [
          h.h2([h.Style({ margin: "0" })], ["Authenticated"]),
          h.pre([h.Style(preStyle)], [JSON.stringify(model.status.user, null, 2)]),
          h.div(
            [h.Style({ display: "flex", gap: "8px" })],
            [
              h.button(
                [
                  h.OnClick(Message.ClickedSignOut()),
                  h.Disabled(busy(model.status._tag)),
                  h.Style(btnPrimary),
                ],
                ["Sign out"],
              ),
              h.button(
                [h.OnClick(Message.ClickedCheckSession()), h.Style(btnSecondary)],
                ["Refresh session"],
              ),
            ],
          ),
        ],
      );
    case "Failure":
      return h.div(
        [h.Style({ display: "grid", gap: "12px" })],
        [
          h.h2([h.Style({ margin: "0", color: "#dc2626" })], ["Failure"]),
          h.pre(
            [h.Style({ ...preStyle, borderColor: "#fecaca", background: "#fef2f2" })],
            [model.status.reason],
          ),
          h.div(
            [h.Style({ display: "flex", gap: "8px" })],
            [
              h.button([h.OnClick(Message.ClickedRetry()), h.Style(btnPrimary)], ["Retry → SignedOut"]),
              h.button(
                [h.OnClick(Message.ClickedCheckSession()), h.Style(btnSecondary)],
                ["Check session"],
              ),
            ],
          ),
        ],
      );
  }
};

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: "effect-auth — postgres + foldkit",
  body: h.div(
    [h.Style({ fontFamily: "system-ui, sans-serif", maxWidth: "720px", margin: "2rem auto", padding: "0 1rem" })],
    [
      h.header(
        [h.Style({ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" })],
        [
          h.h1([h.Style({ margin: "0", fontSize: "22px" })], ["example-postgres-foldkit"]),
          h.span(
            [h.Style({ fontSize: "12px", opacity: "0.6" })],
            [`server: ${apiUrl ?? "vite /auth → :3001"} · status: ${model.status._tag}`],
          ),
        ],
      ),
      h.div(
        [h.Style({ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px", background: "#fff" })],
        [statusView(model, h)],
      ),
      h.details(
        [h.Style({ marginTop: "16px" })],
        [
          h.summary([h.Style({ cursor: "pointer", fontSize: "13px" })], ["Model snapshot"]),
          h.pre([h.Style(preStyle)], [JSON.stringify(model, null, 2)]),
        ],
      ),
    ],
  ),
});
