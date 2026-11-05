"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Replace browser elements and audio with small test doubles, while running the real app.
function makeApp({ sound = true, protocol = "https:" } = {}) {
  let now = 0;
  let gesture = false;
  let interval;
  let plays = 0;
  let celebrations = 0;
  let downloads = 0;
  let rejectPlayback = false;
  const resumes = [];
  const elements = new Map();
  const documentEvents = new Map();

  function element(selector) {
    if (!elements.has(selector)) {
      const events = new Map();
      const attributes = new Map();
      elements.set(selector, {
        dataset: {},
        style: {},
        textContent: "",
        hidden: true,
        firstElementChild: {},
        classList: { toggle() {} },
        setAttribute(name, value) {
          attributes.set(name, value);
        },
        getAttribute(name) {
          return attributes.get(name) ?? null;
        },
        focus() {},
        close() {},
        showModal() {},
        addEventListener(name, callback) {
          events.set(name, callback);
        },
        click() {
          gesture = true;
          try {
            events.get("click")?.({ target: this });
          } finally {
            gesture = false;
          }
        },
      });
    }
    return elements.get(selector);
  }
  const buttons = ["focus", "short", "long"].map((mode) => {
    const button = element(mode);
    button.dataset.mode = mode;
    button.textContent = mode;
    return button;
  });
  const root = {
    dataset: {},
    querySelector: element,
    querySelectorAll: (selector) => (selector === "[data-mode]" ? buttons : []),
  };
  const document = {
    hidden: false,
    baseURI: "https://example.test/timer/",
    body: {},
    querySelector: () => root,
    addEventListener(name, callback) {
      documentEvents.set(name, callback);
    },
  };
  class Audio {
    play() {
      return rejectPlayback
        ? Promise.reject(new Error("Blocked"))
        : Promise.resolve();
    }
    pause() {}
  }
  class AudioContext {
    constructor() {
      this.state = "suspended";
      this.destination = {};
    }
    resume() {
      resumes.push(gesture);
      this.state = "running";
      return Promise.resolve();
    }
    decodeAudioData() {
      return Promise.resolve({});
    }
    createBufferSource() {
      return {
        connect() {},
        start() {
          plays += 1;
        },
      };
    }
  }
  const window = {
    AudioContext,
    addEventListener() {},
    createKorok: () => ({
      draw() {},
      resize() {},
      updateMask() {},
      cancelCelebration() {},
      celebrate() {
        celebrations += 1;
      },
    }),
  };
  const context = vm.createContext({
    window,
    document,
    Audio,
    URL,
    location: { protocol },
    Date: { now: () => now },
    localStorage: {
      getItem: () => JSON.stringify({ focus: 1, short: 1, long: 1, sound }),
      setItem() {},
    },
    fetch(url) {
      assert.equal(url.href, "https://example.test/timer/sound.mp3");
      downloads += 1;
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
      });
    },
    setInterval(callback) {
      interval = callback;
    },
  });
  for (const filename of ["timer.js", "app.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, filename), "utf8"),
      context,
    );
  }
  return {
    element,
    select(mode) {
      element(mode).click();
    },
    start() {
      element("#start").click();
    },
    complete() {
      now += 60000;
      interval();
    },
    hide() {
      document.hidden = true;
    },
    show() {
      document.hidden = false;
      documentEvents.get("visibilitychange")();
    },
    rejectPlayback() {
      rejectPlayback = true;
    },
    feedback: () => ({ plays, celebrations, downloads, resumes }),
  };
}

const flushAudio = () => new Promise((resolve) => setImmediate(resolve));

for (const mode of ["focus", "short", "long"]) {
  test(`${mode} prepares audio during Start and celebrates on completion`, async () => {
    const app = makeApp();
    app.select(mode);
    app.start();
    await flushAudio();
    assert.equal(app.feedback().resumes[0], true);
    assert.equal(app.feedback().downloads, 1);
    assert.equal(app.feedback().plays, 0, "preparation must be silent");
    app.complete();
    await flushAudio();
    assert.equal(app.feedback().plays, 1);
    assert.equal(app.feedback().celebrations, 1);
    assert.match(
      app.element("#start span").textContent,
      /^Start/,
      "next session remains paused",
    );
  });
}

test("hidden completion replays sound and dance once when the page returns", async () => {
  const app = makeApp();
  app.start();
  await flushAudio();
  app.hide();
  app.complete();
  await flushAudio();
  assert.equal(app.feedback().plays, 0);
  assert.equal(app.feedback().celebrations, 0);
  app.show();
  await flushAudio();
  app.show();
  await flushAudio();
  assert.equal(app.feedback().plays, 1);
  assert.equal(app.feedback().celebrations, 1);
});

test("reset cancels a pending completion", async () => {
  const app = makeApp();
  app.start();
  await flushAudio();
  app.hide();
  app.complete();
  app.element("#reset").click();
  app.show();
  await flushAudio();
  assert.equal(app.feedback().plays, 0);
  assert.equal(app.feedback().celebrations, 0);
});

test("muted completion still celebrates without downloading or playing audio", async () => {
  const app = makeApp({ sound: false });
  app.start();
  app.complete();
  await flushAudio();
  assert.equal(app.feedback().downloads, 0);
  assert.equal(app.feedback().plays, 0);
  assert.equal(app.feedback().celebrations, 1);
});

test("direct-file playback failure is reported rather than silently ignored", async () => {
  const app = makeApp({ protocol: "file:" });
  app.start();
  await flushAudio();
  app.rejectPlayback();
  app.complete();
  await flushAudio();
  assert.match(app.element("#notice").textContent, /could not play the sound/);
});
