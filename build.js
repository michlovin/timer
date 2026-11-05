"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Copy only public app files. Do not copy the repository as a whole.
const publicFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "timer.js",
  "korok.js",
  "mask-shapes.js",
  "textures.js",
  "background.png",
  "sound.mp3",
];
const outputDirectory = path.join(__dirname, "dist");

// Check the source files before replacing the previous generated output.
for (const filename of publicFiles) {
  fs.accessSync(path.join(__dirname, filename), fs.constants.R_OK);
}

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory);
for (const filename of publicFiles) {
  fs.copyFileSync(
    path.join(__dirname, filename),
    path.join(outputDirectory, filename),
  );
}

console.log(`Built dist/ with ${publicFiles.length} public app files.`);
