"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "timer.js"), "utf8"),
  context,
);

function makeTestTimer() {
  let now = 0;
  const durations = { focus: 1, short: 2, long: 3 };
  const timer = context.window.createTimer(durations, () => now);
  return {
    timer,
    durations,
    advance(milliseconds) {
      now += milliseconds;
    },
  };
}

test("pause and resume preserve remaining time, even after delayed callbacks", () => {
  const { timer, advance } = makeTestTimer();
  assert.equal(timer.getState().remaining, 60);
  timer.toggle();
  advance(12500);
  timer.tick();
  assert.equal(timer.getState().remaining, 48);
  timer.toggle();
  advance(50000);
  assert.equal(timer.tick(), null);
  assert.equal(timer.getState().remaining, 48);
  timer.toggle();
  advance(48000);
  assert.equal(timer.tick(), "focus");
  assert.equal(timer.getState().mode, "short");
  assert.equal(timer.getState().running, false);
  assert.equal(timer.getState().completed, 1);
  assert.equal(timer.tick(), null);
});

test("four completed focus sessions select a long break", () => {
  const { timer, advance } = makeTestTimer();
  for (let session = 1; session <= 4; session += 1) {
    timer.toggle();
    advance(60000);
    assert.equal(timer.tick(), "focus");
    if (session < 4) timer.skip();
  }
  assert.equal(timer.getState().mode, "long");
  assert.equal(timer.getState().remaining, 180);
  timer.toggle();
  advance(180000);
  assert.equal(timer.tick(), "long");
  assert.equal(timer.getState().mode, "focus");
});

test("reset uses edited durations and preserves completed sessions", () => {
  const { timer, advance, durations } = makeTestTimer();
  timer.toggle();
  advance(60000);
  timer.tick();
  timer.skip();
  durations.focus = 5;
  timer.reset();
  assert.equal(timer.getState().remaining, 300);
  assert.equal(timer.getState().running, false);
  assert.equal(timer.getState().completed, 1);
});

test("pausing an expired session reports completion exactly once", () => {
  const { timer, advance } = makeTestTimer();
  timer.toggle();
  advance(70000);
  assert.equal(timer.toggle(), "focus");
  assert.equal(timer.getState().running, false);
  assert.equal(timer.tick(), null);
  assert.equal(timer.getState().completed, 1);
});

test("mode selection and skipping stop the clock without completing a session", () => {
  const { timer } = makeTestTimer();
  timer.toggle();
  timer.selectMode("long");
  assert.equal(timer.getState().remaining, 180);
  assert.equal(timer.getState().running, false);
  timer.skip();
  assert.equal(timer.getState().mode, "focus");
  assert.equal(timer.getState().completed, 0);
});
