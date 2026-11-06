(() => {
  "use strict";

  // This function keeps the timer's variables separate from other page scripts.
  // 1. Find page elements and load the user's saved settings.
  const root = document.querySelector("#timer-app");
  // find("#time"), for example, finds an element inside the timer app.
  const find = (selector) => root.querySelector(selector);
  const maskNames = {
    leaf: "Leaf",
    clover: "Clover",
    maple: "Maple",
    autumn: "Autumn",
    ginkgo: "Ginkgo",
  };
  const defaults = {
    focus: 25,
    short: 5,
    long: 15,
    sound: true,
    motion: true,
    mask: "leaf",
  };
  // Copy the defaults so changing preferences does not change the defaults.
  let preferences = { ...defaults };
  try {
    // localStorage stores text. JSON.parse turns that text back into an object.
    const saved = JSON.parse(localStorage.getItem("pomodoro-preferences"));
    if (saved) {
      if (
        Number.isInteger(saved.focus) &&
        saved.focus >= 1 &&
        saved.focus <= 180
      ) {
        preferences.focus = saved.focus;
      }
      if (
        Number.isInteger(saved.short) &&
        saved.short >= 1 &&
        saved.short <= 60
      ) {
        preferences.short = saved.short;
      }
      if (
        Number.isInteger(saved.long) &&
        saved.long >= 1 &&
        saved.long <= 120
      ) {
        preferences.long = saved.long;
      }
      if (typeof saved.sound === "boolean") {
        preferences.sound = saved.sound;
      }
      if (typeof saved.motion === "boolean") {
        preferences.motion = saved.motion;
      }
      if (Object.hasOwn(maskNames, saved.mask)) {
        preferences.mask = saved.mask;
      }
    }
  } catch {
    // If storage is blocked or saved data is invalid, keep the default settings.
  }

  // 2. Track the current session. Durations use minutes; remaining uses seconds.
  const timer = window.createTimer(preferences);
  // The page reads snapshots; timer.js is the only file that changes countdown state.
  let { mode, remaining, running, completed } = timer.getState();
  let pipWindow = null;
  const completionSound = new Audio("./sound.mp3");
  completionSound.preload = "auto";
  let audioContext = null;
  let completionBuffer = null;
  let soundLoading = null;
  let completionPending = false;
  const homeBody = document.body;
  const labels = {
    focus: "TIME TO FOCUS",
    short: "TAKE A BREATHER",
    long: "A WELL-EARNED REST",
  };

  // 3. Update the page. These helpers display state; they do not run the clock.
  function icons() {
    // ?. lets the timer work even if the icon library could not load.
    window.lucide?.createIcons({ root });
    root.querySelectorAll("svg").forEach((icon) => {
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("focusable", "false");
    });
  }
  function save() {
    try {
      localStorage.setItem("pomodoro-preferences", JSON.stringify(preferences));
    } catch {
      // The timer can still run when the browser does not allow saving.
    }
  }
  function notice(message) {
    find("#notice").textContent = message;
  }
  function announce(message) {
    // This hidden live region lets screen readers announce important changes.
    find("#announcement").textContent = message;
  }
  function getStartButtonLabel() {
    if (running) {
      return "Pause";
    }

    const sessionLength = preferences[mode] * 60;
    if (remaining > 0 && remaining < sessionLength) {
      return "Resume";
    }
    if (mode === "focus") {
      return "Start focus";
    }
    return "Start break";
  }

  function updateClock() {
    const minutes = Math.floor(remaining / 60);
    // % gives the leftover seconds after whole minutes have been counted.
    const seconds = remaining % 60;
    // padStart makes single-digit values display as 01, 02, and so on.
    const time = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    find("#time").textContent = time;
    find("#time").setAttribute(
      "aria-label",
      `${minutes} minutes ${seconds} seconds remaining`,
    );
    document.title = `${time} · ${mode === "focus" ? "Focus" : "Break"}`;
    if (pipWindow) {
      pipWindow.document.title = document.title;
    }
  }

  function updateSessionStatus() {
    find("#session-label").textContent = labels[mode];
    find("#start span").textContent = getStartButtonLabel();
  }

  function updateProgress() {
    const progress = 100 * (1 - remaining / (preferences[mode] * 60));
    find("#progress").style.width = `${progress}%`;
    find(".progress-track").setAttribute(
      "aria-valuenow",
      String(Math.round(progress)),
    );
  }

  function updateSessionCount() {
    let dots = completed % 4;
    if (completed > 0 && dots === 0) {
      dots = 4;
    }
    find("#session-count").textContent =
      `SESSION ${String((completed % 4) + 1).padStart(2, "0")} / 04`;
    find(".session-dots").setAttribute(
      "aria-label",
      `${dots} of 4 focus sessions complete`,
    );
    root
      .querySelectorAll(".session-dots span")
      .forEach((dot, index) => dot.classList.toggle("done", index < dots));
  }

  function updateModeButtons() {
    root.querySelectorAll("[data-mode]").forEach((button) => {
      const isCurrentMode = button.dataset.mode === mode;
      button.setAttribute("aria-pressed", String(isCurrentMode));
    });
  }

  function render() {
    ({ mode, remaining, running, completed } = timer.getState());
    updateClock();
    updateSessionStatus();
    updateProgress();
    updateSessionCount();
    updateModeButtons();
  }

  // 4. Control the timer: start, pause, complete, reset, and change sessions.
  function setPlayIcon() {
    find("#start").firstElementChild.outerHTML =
      `<i data-lucide="${running ? "pause" : "play"}"></i>`;
    icons();
  }
  function prepareCompletionSound() {
    if (!preferences.sound) {
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    // Direct file opening cannot fetch audio, so prime the original audio element.
    if (!AudioContext || location.protocol === "file:") {
      completionSound.muted = true;
      completionSound
        .play()
        .then(() => {
          completionSound.pause();
          completionSound.currentTime = 0;
          completionSound.muted = false;
        })
        .catch(() => {
          completionSound.muted = false;
        });
      return;
    }
    try {
      // Mobile browsers require the context to be resumed inside a user gesture.
      if (!audioContext) audioContext = new AudioContext();
      audioContext.resume().catch(() => {});
      if (!soundLoading) {
        soundLoading = fetch(new URL("./sound.mp3", document.baseURI))
          .then((response) => {
            if (!response.ok)
              throw new Error("Completion audio could not load");
            return response.arrayBuffer();
          })
          .then((bytes) => audioContext.decodeAudioData(bytes))
          .then((buffer) => {
            completionBuffer = buffer;
          })
          .catch(() => {
            soundLoading = null;
          });
      }
    } catch {
      audioContext = null;
    }
  }

  async function playCompletionSound() {
    if (!preferences.sound) return;
    try {
      if (audioContext) {
        await audioContext.resume();
        if (soundLoading) await soundLoading;
        if (!preferences.sound) return;
        if (completionBuffer && audioContext.state === "running") {
          const source = audioContext.createBufferSource();
          source.buffer = completionBuffer;
          source.connect(audioContext.destination);
          source.start();
          return;
        }
      }
      completionSound.currentTime = 0;
      await completionSound.play();
    } catch {
      notice("Session complete. Your browser could not play the sound.");
    }
  }

  function showCompletionFeedback() {
    playCompletionSound();
    korokScene.celebrate();
  }
  function switchMode(nextMode) {
    completionPending = false;
    korokScene.cancelCelebration();
    timer.selectMode(nextMode);
    render();
    setPlayIcon();
    drawScene();
  }
  function finishSession(finishedMode) {
    // A hidden page may not render frames or play audio. Replay once on return.
    completionPending = document.hidden && !pipWindow;
    if (!completionPending) showCompletionFeedback();
    const message =
      finishedMode === "focus"
        ? "Focus complete. Time for a break."
        : "Break complete. Ready for your next focus?";
    render();
    setPlayIcon();
    drawScene();
    notice(message);
  }

  function tick() {
    if (!timer.getState().running) {
      return;
    }
    const finishedMode = timer.tick();
    if (finishedMode) finishSession(finishedMode);
    else render();
  }

  function toggleTimer() {
    if (!timer.getState().running) {
      completionPending = false;
      prepareCompletionSound();
    }
    const finishedMode = timer.toggle();
    if (finishedMode) {
      finishSession(finishedMode);
    } else if (timer.getState().running) {
      if (!preferences.motion) {
        notice("Automatic animation is off in timer settings.");
      } else if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        notice(
          "Automatic animation is off because your device requests reduced motion.",
        );
      } else {
        notice("");
      }
    }
    render();
    setPlayIcon();
    drawScene();
    announce(
      `${running ? "Started" : "Paused"}. ${find("#time").getAttribute("aria-label")}.`,
    );
  }

  function resetTimer() {
    switchMode(mode);
    notice("");
    announce(`Session reset. ${find("#time").getAttribute("aria-label")}.`);
  }

  function skipSession() {
    completionPending = false;
    timer.skip();
    korokScene.cancelCelebration();
    render();
    setPlayIcon();
    drawScene();
    notice("");
    announce(
      `${mode === "focus" ? "Focus" : mode === "short" ? "Short break" : "Long break"} selected. ${find("#time").getAttribute("aria-label")}.`,
    );
  }

  function selectMode(button) {
    switchMode(button.dataset.mode);
    notice("");
    announce(
      `${button.textContent} selected. ${find("#time").getAttribute("aria-label")}.`,
    );
  }

  // 5. Connect buttons and settings to their functions.
  // addEventListener runs a function when the user clicks or changes a control.
  find("#start").addEventListener("click", toggleTimer);
  find("#reset").addEventListener("click", resetTimer);
  find("#skip").addEventListener("click", skipSession);
  root.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => selectMode(button));
  });
  function soundUI() {
    const button = find("#sound");
    const label = "Completion sound";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(preferences.sound));
    button.innerHTML = `<i data-lucide="${preferences.sound ? "volume-2" : "volume-x"}"></i>`;
    icons();
  }
  find("#sound").addEventListener("click", () => {
    preferences.sound = !preferences.sound;
    if (preferences.sound) prepareCompletionSound();
    save();
    soundUI();
  });
  function settings(open) {
    const dialog = find("#settings");
    if (open) {
      dialog.hidden = false;
      dialog.showModal();
    } else {
      dialog.close();
      dialog.hidden = true;
    }
    find("#settings-toggle").setAttribute("aria-expanded", String(open));
    if (open) {
      find('input[name="focus"]').focus();
    } else {
      find("#settings-toggle").focus();
    }
  }
  find("#settings-toggle").addEventListener("click", () =>
    settings(find("#settings").hidden),
  );
  find("#settings-close").addEventListener("click", () => settings(false));
  find("#settings").addEventListener("cancel", (event) => {
    event.preventDefault();
    settings(false);
  });
  for (const key of ["focus", "short", "long"]) {
    find(`input[name="${key}"]`).value = preferences[key];
  }
  find("#motion").checked = preferences.motion;
  root.dataset.mask = preferences.mask;
  find("#mask-choice").value = preferences.mask;
  find("#mask-choice").addEventListener("change", (event) => {
    preferences.mask = event.target.value;
    root.dataset.mask = preferences.mask;
    save();
    korokScene.updateMask();
    drawScene();
    announce(`${maskNames[preferences.mask]} mask selected.`);
  });
  find("#motion").addEventListener("change", (event) => {
    preferences.motion = event.target.checked;
    save();
    drawScene();
  });
  find("#settings-form").addEventListener("submit", (event) => {
    event.preventDefault();
    for (const key of ["focus", "short", "long"]) {
      preferences[key] = Number(find(`input[name="${key}"]`).value);
    }
    save();
    switchMode(mode);
    settings(false);
    notice("Durations saved. Current session reset.");
  });

  // 6. Floating mode moves this same app into a browser-managed window.
  find("#float").addEventListener("click", async () => {
    if (pipWindow) {
      pipWindow.close();
      return;
    }
    if (!("documentPictureInPicture" in window)) {
      notice(
        "Floating mode needs a recent desktop Chrome or Edge. You can still use the timer in this window.",
      );
      return;
    }
    try {
      pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 360,
        height: 590,
      });
      pipWindow.document.documentElement.lang = "en";
      const stylesheet = pipWindow.document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = new URL("styles.css", document.baseURI).href;
      pipWindow.document.head.append(stylesheet);
      pipWindow.document.body.className = "pip";
      pipWindow.document.body.append(root);
      const closeWindow = pipWindow;
      closeWindow.addEventListener(
        "pagehide",
        () => {
          homeBody.append(root);
          pipWindow = null;
          render();
          resizeScene();
        },
        { once: true },
      );
      render();
      resizeScene();
      notice("");
    } catch {
      pipWindow = null;
      notice(
        "The floating window could not open. Try again in Chrome or Edge.",
      );
    }
  });
  window.addEventListener("pagehide", () => pipWindow?.close());
  document.addEventListener("visibilitychange", () => {
    tick();
    if (!document.hidden && completionPending) {
      completionPending = false;
      showCompletionFeedback();
    }
    drawScene();
  });
  // Check four times per second; tick() calculates the actual time remaining.
  setInterval(tick, 250);

  // 7. Connect the page to the independent character renderer.
  const korokScene = window.createKorok({
    root,
    preferences,
    getTimerState: timer.getState,
    isFloating: () => Boolean(pipWindow),
  });

  function drawScene() {
    korokScene.draw();
  }

  function resizeScene() {
    korokScene.resize();
  }
  soundUI();
  render();
})();
