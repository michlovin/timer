// Countdown rules only: no buttons, HTML, sounds, or 3D objects belong here.
// The page calls these methods and reads a snapshot with getState().
"use strict";

window.createTimer = function createTimer(
  durations,
  getCurrentTime = () => Date.now(),
) {
  let mode = "focus";
  let remaining = durations.focus * 60;
  let running = false;
  let deadline = 0;
  let completed = 0;

  function getState() {
    return { mode, remaining, running, completed };
  }

  function selectMode(nextMode) {
    mode = nextMode;
    running = false;
    remaining = durations[mode] * 60;
  }

  function getNextMode() {
    if (mode !== "focus") {
      return "focus";
    }
    if (completed > 0 && completed % 4 === 0) {
      return "long";
    }
    return "short";
  }

  function tick() {
    if (!running) {
      return null;
    }

    // A real finish time stays accurate even when browser callbacks are delayed.
    remaining = Math.max(0, Math.ceil((deadline - getCurrentTime()) / 1000));
    if (remaining > 0) {
      return null;
    }

    const finishedMode = mode;
    if (mode === "focus") {
      completed += 1;
    }
    selectMode(getNextMode());

    // Tell the page which session finished so it can play a sound or celebrate.
    // The next session is selected, but never starts automatically.
    return finishedMode;
  }

  function toggle() {
    if (running) {
      const finishedMode = tick();
      running = false;
      return finishedMode;
    }
    deadline = getCurrentTime() + remaining * 1000;
    running = true;
    return null;
  }

  function reset() {
    selectMode(mode);
  }

  function skip() {
    selectMode(getNextMode());
  }

  return { getState, selectMode, tick, toggle, reset, skip };
};
