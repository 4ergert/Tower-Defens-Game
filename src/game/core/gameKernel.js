import {
  DEV_MODE,
  MAX_CATCH_UP_TICKS,
  TICK_MS,
  UI_EMIT_MS
} from './constants.js';
import { createInitialGameState } from './createInitialState.js';
import { createStateSnapshot } from './stateView.js';
import { getOrderedSystems } from './systemRegistry.js';

function performanceNow() {
  return (globalThis.performance && typeof globalThis.performance.now === 'function')
    ? globalThis.performance.now()
    : Date.now();
}

function scheduleCommand(state, command) {
  const executeOnTick = Math.max(state.tick + 1, command.executeOnTick ?? (state.tick + 1));
  if (!state.pendingCommandsByTick[executeOnTick]) {
    state.pendingCommandsByTick[executeOnTick] = [];
  }
  state.pendingCommandsByTick[executeOnTick].push({ ...command, executeOnTick });
  state.stats.commandsReceived += 1;
}

function pullCommandsForTick(state, tick) {
  const bucket = state.pendingCommandsByTick[tick] || [];
  delete state.pendingCommandsByTick[tick];
  return bucket;
}

export function createGameKernel(options = {}) {
  const systems = getOrderedSystems();
  const state = options.initialState || createInitialGameState();
  const config = {
    devMode: options.devMode ?? DEV_MODE
  };

  let running = false;
  let rafId = null;
  let accumulatorMs = 0;
  let lastFrameTimeMs = 0;
  let lastUiEmitMs = 0;
  const subscribers = new Set();

  function notifySubscribers(force = false) {
    const now = performanceNow();
    if (!force && now - lastUiEmitMs < UI_EMIT_MS) return;
    lastUiEmitMs = now;
    const snapshot = createStateSnapshot(state);
    for (const subscriber of subscribers) {
      subscriber(snapshot);
    }
  }

  function runOneTick() {
    const tickStart = performanceNow();
    state.tick += 1;
    state.commandQueue = pullCommandsForTick(state, state.tick);

    for (const system of systems) {
      const systemStart = performanceNow();
      try {
        system.run(state, { devMode: config.devMode });
      } catch (error) {
        const message = `${system.name}: ${error instanceof Error ? error.message : String(error)}`;
        state.runtime.warnings.push(message);
        if (state.runtime.warnings.length > 20) {
          state.runtime.warnings.splice(0, state.runtime.warnings.length - 20);
        }

        if (config.devMode) {
          running = false;
          state.runtime.paused = true;
          console.error('Tick paused due to system error:', error);
          break;
        }

        console.error('System error (release continue):', error);
      }
      state.runtime.systemMetricsMs[system.name] = Number((performanceNow() - systemStart).toFixed(3));
    }

    state.runtime.lastTickDurationMs = Number((performanceNow() - tickStart).toFixed(3));
  }

  function frame(nowMs) {
    if (!running) return;
    if (!lastFrameTimeMs) {
      lastFrameTimeMs = nowMs;
    }

    const delta = nowMs - lastFrameTimeMs;
    lastFrameTimeMs = nowMs;
    accumulatorMs += delta;

    let catchUpCount = 0;
    while (accumulatorMs >= TICK_MS && catchUpCount < MAX_CATCH_UP_TICKS) {
      runOneTick();
      accumulatorMs -= TICK_MS;
      catchUpCount += 1;
    }

    if (accumulatorMs >= TICK_MS) {
      const skipped = Math.floor(accumulatorMs / TICK_MS);
      state.runtime.droppedTicks += skipped;
      accumulatorMs = accumulatorMs % TICK_MS;
    }

    notifySubscribers(false);
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      state.runtime.paused = false;
      lastFrameTimeMs = 0;
      accumulatorMs = 0;
      notifySubscribers(true);
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      state.runtime.paused = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    pause() {
      running = false;
      state.runtime.paused = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      notifySubscribers(true);
    },
    resume() {
      if (running) return;
      running = true;
      state.runtime.paused = false;
      lastFrameTimeMs = 0;
      rafId = requestAnimationFrame(frame);
    },
    step() {
      if (running) return;
      runOneTick();
      notifySubscribers(true);
    },
    enqueueCommand(command) {
      scheduleCommand(state, command);
    },
    getState() {
      return createStateSnapshot(state);
    },
    subscribe(listener) {
      subscribers.add(listener);
      listener(createStateSnapshot(state));
      return () => subscribers.delete(listener);
    }
  };
}
