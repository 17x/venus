import type {
  EngineEventsApi,
  EngineEventListener,
  EngineHooksApi,
  EngineHookListener,
} from "./public-types";

/**
 * Builds event and hook namespace facades for the engine handle.
 * @param deps Listener lifecycle dependencies and shared registries used by event/hook namespaces.
 */
export function createEngineEventsAndHooksFacade(deps: {
  registerEventListener: (
    type: string,
    listener: EngineEventListener,
    scope?: "global" | "session" | "trace",
    options?: { sampleRate?: number; throttleMs?: number },
  ) => void;
  unregisterEventListener: (type: string, listener: EngineEventListener) => void;
  unregisterAllEventListeners: (scope?: "global" | "session" | "trace") => void;
  assertValidEventType: (type: string) => void;
  assertValidEventListener: (listener: EngineEventListener) => void;
  pausedEventTypes: Set<string>;
  resolveEventListenerStats: () => {
    totalListeners: number;
    pausedTypes: readonly string[];
    perType: Readonly<Record<string, number>>;
  };
  registerHookListener: (
    stage: "beforeCompile" | "afterCompile" | "beforeRenderPlan" | "afterRenderPlan" | "beforeSubmit" | "afterSubmit",
    listener: EngineHookListener,
    scope?: "global" | "session" | "trace",
  ) => { dispose: () => void };
  unregisterAllHookListeners: (scope?: "global" | "session" | "trace") => void;
  resolveHookListenerStats: () => {
    totalListeners: number;
    perStage: Readonly<Record<string, number>>;
  };
}): {
  events: EngineEventsApi;
  hooks: EngineHooksApi;
} {
  return {
    events: {
      /**
       * Registers one scoped listener in deterministic insertion order.
       * @param type Event type token used as listener registry key.
       * @param listener Event listener callback registered for the event type.
       * @param options Optional listener registration options.
       */
      on: (type, listener, options) => {
        deps.registerEventListener(type, listener, options?.scope, options);
      },
      /**
       * Unregisters one listener for one event type.
       * @param type Event type token used as listener registry key.
       * @param listener Event listener callback to remove.
       */
      off: (type, listener) => {
        deps.unregisterEventListener(type, listener);
      },
      /**
       * Registers one one-shot listener for one event type.
       * @param type Event type token used as listener registry key.
       * @param listener Event listener callback invoked once.
       * @param options Optional listener registration options.
       */
      once: (type, listener, options) => {
        deps.assertValidEventType(type);
        deps.assertValidEventListener(listener);
        const onceListener = (payload: unknown) => {
          listener(payload);
          deps.unregisterEventListener(type, onceListener);
        };
        deps.registerEventListener(type, onceListener, options?.scope, options);
      },
      /**
       * Registers one listener across multiple event types.
       * @param types Event type token collection to register against.
       * @param listener Event listener callback registered for each event type.
       * @param options Optional listener registration options.
       */
      onMany: (types, listener, options) => {
        if (!Array.isArray(types)) {
          throw new Error("ENGINE_EVENTS_INVALID_TYPE");
        }
        for (const type of types) {
          deps.registerEventListener(type, listener, options?.scope, options);
        }
      },
      /**
       * Removes listeners globally or by scope token.
       * @param scope Optional listener scope token used to limit removal.
       */
      offAll: (scope) => {
        deps.unregisterAllEventListeners(scope);
      },
      /**
       * Pauses delivery for one event type.
       * @param type Event type token to pause.
       */
      pause: (type) => {
        deps.assertValidEventType(type);
        deps.pausedEventTypes.add(type);
      },
      /**
       * Resumes delivery for one event type.
       * @param type Event type token to resume.
       */
      resume: (type) => {
        deps.assertValidEventType(type);
        deps.pausedEventTypes.delete(type);
      },
      /**
       * Returns deterministic listener stats snapshot.
       */
      getListenerStats: () => deps.resolveEventListenerStats(),
    },
    hooks: {
      /**
       * Registers one hook listener before compile stage.
       * @param listener Hook listener callback.
       * @param options Optional hook registration options.
       */
      beforeCompile: (listener, options) => deps.registerHookListener("beforeCompile", listener, options?.scope),
      /**
       * Registers one hook listener after compile stage.
       * @param listener Hook listener callback.
       * @param options Optional hook registration options.
       */
      afterCompile: (listener, options) => deps.registerHookListener("afterCompile", listener, options?.scope),
      /**
       * Registers one hook listener before render-plan stage.
       * @param listener Hook listener callback.
       * @param options Optional hook registration options.
       */
      beforeRenderPlan: (listener, options) => deps.registerHookListener("beforeRenderPlan", listener, options?.scope),
      /**
       * Registers one hook listener after render-plan stage.
       * @param listener Hook listener callback.
       * @param options Optional hook registration options.
       */
      afterRenderPlan: (listener, options) => deps.registerHookListener("afterRenderPlan", listener, options?.scope),
      /**
       * Registers one hook listener before submit stage.
       * @param listener Hook listener callback.
       * @param options Optional hook registration options.
       */
      beforeSubmit: (listener, options) => deps.registerHookListener("beforeSubmit", listener, options?.scope),
      /**
       * Registers one hook listener after submit stage.
       * @param listener Hook listener callback.
       * @param options Optional hook registration options.
       */
      afterSubmit: (listener, options) => deps.registerHookListener("afterSubmit", listener, options?.scope),
      /**
       * Removes hook listeners globally or by scope token.
       * @param scope Optional listener scope token used to limit removal.
       */
      offAll: (scope) => {
        deps.unregisterAllHookListeners(scope);
      },
      /**
       * Returns deterministic hook listener stats snapshot.
       */
      getStats: () => deps.resolveHookListenerStats(),
    },
  };
}
