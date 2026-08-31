import { AuthClient, User } from "@kndwin/client";
import { Machine } from "@typeonce/effect-machine";
import { Effect, Schema } from "effect";

const failureReason = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const AuthState = Schema.TaggedUnion({
  SigningIn: {
    email: Schema.String,
    password: Schema.String,
  },
  SigningUp: {
    email: Schema.String,
    name: Schema.String,
    password: Schema.String,
  },
  Authenticated: {
    user: User,
  },
  Failure: {
    reason: Schema.String,
  },
});

export const AuthStates = Machine.states({
  SignedOut: {},
  Checking: {},
  SigningIn: AuthState.cases.SigningIn,
  SigningUp: AuthState.cases.SigningUp,
  SigningOut: {},
  Authenticated: AuthState.cases.Authenticated,
  Failure: AuthState.cases.Failure,
});

export const AuthEvents = Machine.events(
  Schema.TaggedUnion({
    CheckSession: {},
    SignIn: {
      email: Schema.String,
      password: Schema.String,
    },
    SignUp: {
      email: Schema.String,
      name: Schema.String,
      password: Schema.String,
    },
    SignOut: {},
    Retry: {},
  }),
);

const InternalEvents = Machine.internalEvents(
  Schema.TaggedUnion({
    SessionFound: { user: User },
    SessionMissing: {},
  }),
);

const requireUser = (session: { readonly session: { readonly user: User } | null }) => {
  const user = session.session?.user;
  return user === undefined
    ? Effect.fail("sign-in returned no user")
    : Effect.succeed(user);
};

export const AuthMachine = Machine.make({
  id: "Auth",
  states: AuthStates.states,
  events: AuthEvents,
  internalEvents: InternalEvents,
  initial: (to) => to.Checking(),
}).handle({
  Checking: {
    invoke: (from) =>
      from
        .effect("check-session", () =>
          Effect.gen(function* () {
            const client = yield* AuthClient;
            return yield* client.getSession();
          }).pipe(Effect.mapError(failureReason)),
        )
        .onDone((to) =>
          to.none.resolve(({ output }, enqueue) => {
            const user = output.session?.user;
            if (user) enqueue.raise(InternalEvents.SessionFound({ user }));
            else enqueue.raise(InternalEvents.SessionMissing());
          }),
        )
        .onFailure((to) => to.full.SignedOut()),
    on: {
      SessionFound: (to) =>
        to.full.Authenticated().resolve(({ event, target }) => target.from({ user: event.user })),
      SessionMissing: (to) => to.full.SignedOut(),
    },
  },

  SignedOut: {
    on: {
      CheckSession: (to) => to.full.Checking(),
      SignIn: (to) =>
        to.full.SigningIn().resolve(({ event, target }) =>
          target.from({ email: event.email, password: event.password }),
        ),
      SignUp: (to) =>
        to.full.SigningUp().resolve(({ event, target }) =>
          target.from({ email: event.email, name: event.name, password: event.password }),
        ),
    },
  },

  SigningIn: {
    invoke: (from) =>
      from
        .effect("sign-in", ({ state }) =>
          Effect.gen(function* () {
            const client = yield* AuthClient;
            const result = yield* client.email.signIn({
              email: state.email,
              password: state.password,
            });
            return yield* requireUser(result);
          }).pipe(Effect.mapError(failureReason)),
        )
        .onDone((to) =>
          to.full.Authenticated().resolve(({ output, target }) => target.from({ user: output })),
        )
        .onFailure((to) =>
          to.full.Failure().resolve(({ error, target }) => target.from({ reason: error })),
        ),
  },

  SigningUp: {
    invoke: (from) =>
      from
        .effect("sign-up", ({ state }) =>
          Effect.gen(function* () {
            const client = yield* AuthClient;
            yield* client.email.signUp({
              email: state.email,
              password: state.password,
              name: state.name,
            });
            const result = yield* client.email.signIn({
              email: state.email,
              password: state.password,
            });
            return yield* requireUser(result);
          }).pipe(Effect.mapError(failureReason)),
        )
        .onDone((to) =>
          to.full.Authenticated().resolve(({ output, target }) => target.from({ user: output })),
        )
        .onFailure((to) =>
          to.full.Failure().resolve(({ error, target }) => target.from({ reason: error })),
        ),
  },

  Authenticated: {
    on: {
      SignOut: (to) => to.full.SigningOut(),
      CheckSession: (to) => to.full.Checking(),
    },
  },

  SigningOut: {
    invoke: (from) =>
      from
        .effect("sign-out", () =>
          Effect.gen(function* () {
            const client = yield* AuthClient;
            yield* client.signOut();
          }).pipe(Effect.mapError(failureReason)),
        )
        .onDone((to) => to.full.SignedOut())
        .onFailure((to) => to.full.SignedOut()),
  },

  Failure: {
    on: {
      Retry: (to) => to.full.SignedOut(),
      CheckSession: (to) => to.full.Checking(),
      SignIn: (to) =>
        to.full.SigningIn().resolve(({ event, target }) =>
          target.from({ email: event.email, password: event.password }),
        ),
      SignUp: (to) =>
        to.full.SigningUp().resolve(({ event, target }) =>
          target.from({ email: event.email, name: event.name, password: event.password }),
        ),
    },
  },
});

export type AuthSnapshot = Machine.Snapshot<typeof AuthStates>;
