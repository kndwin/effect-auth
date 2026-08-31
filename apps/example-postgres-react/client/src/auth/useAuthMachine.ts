import { Machine } from "@typeonce/effect-machine";
import { Effect, Fiber, Stream } from "effect";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { AuthClientLive } from "../runtime";
import { AuthEvents, AuthMachine, type AuthSnapshot } from "./authMachine";

const startAuth = () => Machine.start(AuthMachine);

type AuthRef = Effect.Success<ReturnType<typeof startAuth>>;
type AuthRuntimeSnapshot = Stream.Success<AuthRef["changes"]>;

const initialSnapshot = {
  status: "active",
  state: { path: "Checking", value: undefined },
} as const satisfies AuthRuntimeSnapshot;

export function useAuthMachine() {
  const listeners = useRef(new Set<() => void>());
  const runtimeSnapshot = useRef<AuthRuntimeSnapshot>(initialSnapshot);
  const refBox = useRef<AuthRef | undefined>(undefined);

  const store = useMemo(
    () => ({
      subscribe: (onStoreChange: () => void) => {
        listeners.current.add(onStoreChange);
        return () => {
          listeners.current.delete(onStoreChange);
        };
      },
      getSnapshot: () => runtimeSnapshot.current,
    }),
    [],
  );

  useEffect(() => {
    const notify = (next: AuthRuntimeSnapshot) => {
      runtimeSnapshot.current = next;
      for (const listener of listeners.current) listener();
    };

    const fiber = Effect.runFork(
      Effect.gen(function* () {
        const ref = yield* startAuth();
        refBox.current = ref;
        yield* Stream.runForEach(ref.changes, (snapshot) => Effect.sync(() => notify(snapshot)));
      }).pipe(Effect.provide(AuthClientLive)),
    );

    return () => {
      refBox.current = undefined;
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, []);

  const runtime = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const state = runtime.state;

  const send = (event: Parameters<AuthRef["send"]>[0]) => {
    const ref = refBox.current;
    if (ref === undefined) return;
    Effect.runFork(ref.send(event));
  };

  return {
    state,
    runtime,
    send,
    sendCheckSession: () => send(AuthEvents.CheckSession()),
    sendSignIn: (email: string, password: string) => send(AuthEvents.SignIn({ email, password })),
    sendSignUp: (email: string, password: string, name: string) =>
      send(AuthEvents.SignUp({ email, password, name })),
    sendSignOut: () => send(AuthEvents.SignOut()),
    sendRetry: () => send(AuthEvents.Retry()),
    matches: (path: AuthSnapshot["path"]): boolean => state.path === path,
    busy:
      state.path === "Checking" ||
      state.path === "SigningIn" ||
      state.path === "SigningUp" ||
      state.path === "SigningOut",
  };
}
