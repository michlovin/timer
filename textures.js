"use strict";

// Textures are images painted onto surfaces; materials control how they catch light.
// This factory creates them without knowing anything about the countdown or buttons.
window.createKorokTextures = function createKorokTextures(THREE) {
  // Wood: flowing bands, short fibers, and small knots painted onto a canvas.
  const barkCanvas = document.createElement("canvas");
  barkCanvas.width = 256;
  barkCanvas.height = 512;
  const barkContext = barkCanvas.getContext("2d");
  const barkBase = barkContext.createLinearGradient(0, 0, 0, 512);
  barkBase.addColorStop(0, "#9bbd83");
  barkBase.addColorStop(0.45, "#7f9f68");
  barkBase.addColorStop(1, "#5e7d51");
  barkContext.fillStyle = barkBase;
  barkContext.fillRect(0, 0, barkCanvas.width, barkCanvas.height);
  let grainY = -24;
  const woodKnots = [
    [68, 174],
    [184, 365],
  ];
  for (let grainIndex = 0; grainIndex < 34; grainIndex += 1) {
    grainY += 12 + (1 + Math.sin(grainIndex * 2.1)) * 5;
    const phase = grainIndex * 2.3;
    const grainEdges = [];
    for (let sampleIndex = 0; sampleIndex <= 32; sampleIndex += 1) {
      const angle = (sampleIndex / 32) * Math.PI * 2;
      const grainX = sampleIndex * 8;
      let centerY =
        grainY +
        Math.sin(angle + phase) * (5 + (grainIndex % 4) * 3) +
        Math.sin(angle * 2 - phase) * 3;
      for (const [knotX, knotY] of woodKnots) {
        const influence = Math.exp(
          -(((grainX - knotX) / 30) ** 2 + ((grainY - knotY) / 36) ** 2),
        );
        centerY += Math.sign(grainY - knotY) * influence * 17;
      }
      const halfWidth =
        0.5 +
        (1 + Math.sin(angle - phase)) * 0.8 +
        (1 + Math.cos(angle * 2 + phase)) * 0.3;
      grainEdges.push({ grainX, centerY, halfWidth });
    }
    barkContext.beginPath();
    grainEdges.forEach(({ grainX, centerY, halfWidth }, edgeIndex) => {
      if (edgeIndex === 0) {
        barkContext.moveTo(grainX, centerY - halfWidth);
      } else {
        barkContext.lineTo(grainX, centerY - halfWidth);
      }
    });
    grainEdges
      .slice()
      .reverse()
      .forEach(({ grainX, centerY, halfWidth }) => {
        barkContext.lineTo(grainX, centerY + halfWidth);
      });
    barkContext.closePath();
    barkContext.fillStyle =
      grainIndex % 4 === 0
        ? "rgba(216, 240, 178, 0.09)"
        : "rgba(52, 83, 43, 0.19)";
    barkContext.filter = "blur(0.8px)";
    barkContext.fill();
  }
  barkContext.filter = "none";
  for (let fiberIndex = 0; fiberIndex < 90; fiberIndex += 1) {
    const fiberX = (fiberIndex * 73) % 256;
    const fiberY = (fiberIndex * 137) % 512;
    const fiberLength = 18 + (fiberIndex % 7) * 7;
    barkContext.beginPath();
    barkContext.moveTo(fiberX, fiberY);
    barkContext.bezierCurveTo(
      fiberX + fiberLength * 0.3,
      fiberY - 2,
      fiberX + fiberLength * 0.7,
      fiberY + 3,
      fiberX + fiberLength,
      fiberY + Math.sin(fiberIndex) * 3,
    );
    barkContext.strokeStyle = "rgba(40, 67, 33, 0.1)";
    barkContext.lineWidth = 0.6;
    barkContext.stroke();
  }
  for (const [knotX, knotY] of woodKnots) {
    for (let ringIndex = 0; ringIndex < 4; ringIndex += 1) {
      barkContext.beginPath();
      barkContext.ellipse(
        knotX,
        knotY,
        3 + ringIndex * 3,
        1.5 + ringIndex * 1.6,
        -0.15,
        0,
        Math.PI * 2,
      );
      barkContext.strokeStyle = `rgba(49, 73, 36, ${0.19 - ringIndex * 0.035})`;
      barkContext.lineWidth = 0.8;
      barkContext.stroke();
    }
  }
  const barkTexture = new THREE.CanvasTexture(barkCanvas);
  barkTexture.colorSpace = THREE.SRGBColorSpace;
  barkTexture.wrapS = THREE.RepeatWrapping;
  const bark = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: barkTexture,
    bumpMap: barkTexture,
    bumpScale: 0.009,
    roughness: 0.92,
  });

  // Eyes: a dark, faded circle with a small bright glint.
  const eyeCanvas = document.createElement("canvas");
  eyeCanvas.width = 128;
  eyeCanvas.height = 128;
  const eyeContext = eyeCanvas.getContext("2d");
  const eyeFade = eyeContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  eyeFade.addColorStop(0, "rgba(37, 51, 27, 0.9)");
  eyeFade.addColorStop(0.65, "rgba(37, 51, 27, 0.85)");
  eyeFade.addColorStop(0.85, "rgba(37, 51, 27, 0.45)");
  eyeFade.addColorStop(1, "rgba(37, 51, 27, 0)");
  eyeContext.fillStyle = eyeFade;
  eyeContext.fillRect(0, 0, 128, 128);
  const eyeGlint = eyeContext.createRadialGradient(44, 40, 4, 44, 40, 19);
  eyeGlint.addColorStop(0, "rgba(255, 253, 222, 0.95)");
  eyeGlint.addColorStop(0.45, "rgba(245, 249, 201, 0.7)");
  eyeGlint.addColorStop(1, "rgba(245, 249, 201, 0)");
  eyeContext.fillStyle = eyeGlint;
  eyeContext.fillRect(0, 0, 128, 128);
  const eyeTexture = new THREE.CanvasTexture(eyeCanvas);
  eyeTexture.colorSpace = THREE.SRGBColorSpace;
  const eyeMark = new THREE.MeshStandardMaterial({
    map: eyeTexture,
    transparent: true,
    depthWrite: false,
    roughness: 0.38,
  });

  // Clover: soft shaded creases, rather than drawn line meshes.
  const cloverCanvas = document.createElement("canvas");
  cloverCanvas.width = 512;
  cloverCanvas.height = 512;
  const cloverContext = cloverCanvas.getContext("2d");
  cloverContext.fillStyle = "#f3f5eb";
  cloverContext.fillRect(0, 0, 512, 512);
  const cloverCreases = [
    [
      [0, 0.08],
      [-0.12, 0.15],
      [-0.26, 0.32],
      [-0.39, 0.36],
    ],
    [
      [0, 0.08],
      [0.12, 0.15],
      [0.26, 0.32],
      [0.39, 0.36],
    ],
    [
      [0, 0.08],
      [-0.08, -0.02],
      [-0.17, -0.16],
      [-0.23, -0.23],
    ],
    [
      [0, 0.08],
      [0.08, -0.02],
      [0.17, -0.16],
      [0.23, -0.23],
    ],
  ];
  const cloverPixel = ([maskX, maskY]) => [
    ((maskX + 0.65) / 1.3) * 512,
    ((0.65 - maskY) / 1.1) * 512,
  ];
  cloverContext.lineCap = "round";
  for (const crease of cloverCreases) {
    const [start, controlStart, controlEnd, end] = crease.map(cloverPixel);
    cloverContext.beginPath();
    cloverContext.moveTo(...start);
    cloverContext.bezierCurveTo(...controlStart, ...controlEnd, ...end);
    cloverContext.filter = "blur(9px)";
    cloverContext.strokeStyle = "rgba(51, 72, 32, 0.42)";
    cloverContext.lineWidth = 16;
    cloverContext.stroke();
    cloverContext.save();
    cloverContext.translate(-7, -5);
    cloverContext.beginPath();
    cloverContext.moveTo(...start);
    cloverContext.bezierCurveTo(...controlStart, ...controlEnd, ...end);
    cloverContext.strokeStyle = "rgba(255, 255, 242, 0.65)";
    cloverContext.lineWidth = 10;
    cloverContext.stroke();
    cloverContext.restore();
  }
  const cloverTexture = new THREE.CanvasTexture(cloverCanvas);
  cloverTexture.colorSpace = THREE.SRGBColorSpace;
  cloverTexture.repeat.set(1 / 1.3, 1 / 1.1);
  cloverTexture.offset.set(0.65 / 1.3, 0.45 / 1.1);
  const cloverBump = cloverTexture.clone();
  cloverBump.colorSpace = THREE.NoColorSpace;

  // Ginkgo: a warm wash and many softly shaded veins radiating from the base.
  const ginkgoCanvas = document.createElement("canvas");
  ginkgoCanvas.width = 512;
  ginkgoCanvas.height = 512;
  const ginkgoContext = ginkgoCanvas.getContext("2d");
  const ginkgoWash = ginkgoContext.createLinearGradient(0, 0, 0, 512);
  ginkgoWash.addColorStop(0, "#fff8d5");
  ginkgoWash.addColorStop(1, "#e4cb85");
  ginkgoContext.fillStyle = ginkgoWash;
  ginkgoContext.fillRect(0, 0, 512, 512);
  ginkgoContext.lineCap = "round";
  for (let veinIndex = 0; veinIndex < 17; veinIndex += 1) {
    const spread = (veinIndex - 8) / 8;
    const tipX = 256 + spread * 225;
    const tipY = 44 + Math.abs(spread) * 145;
    for (const highlight of [false, true]) {
      const offset = highlight ? -4 : 0;
      ginkgoContext.beginPath();
      ginkgoContext.moveTo(256 + offset, 428);
      ginkgoContext.bezierCurveTo(
        256 + spread * 38 + offset,
        310,
        tipX * 0.7 + 256 * 0.3 + offset,
        tipY + 100,
        tipX + offset,
        tipY,
      );
      ginkgoContext.filter = "blur(4px)";
      ginkgoContext.strokeStyle = highlight
        ? "rgba(255, 255, 226, 0.5)"
        : "rgba(133, 100, 25, 0.24)";
      ginkgoContext.lineWidth = highlight ? 4 : 7;
      ginkgoContext.stroke();
    }
  }
  const ginkgoTexture = new THREE.CanvasTexture(ginkgoCanvas);
  ginkgoTexture.colorSpace = THREE.SRGBColorSpace;
  ginkgoTexture.repeat.copy(cloverTexture.repeat);
  ginkgoTexture.offset.copy(cloverTexture.offset);
  const ginkgoBump = ginkgoTexture.clone();
  ginkgoBump.colorSpace = THREE.NoColorSpace;

  // Shared materials for the mask rim, leaf face, sleeping eyes, veins, and mouth.
  const maskRim = new THREE.MeshStandardMaterial({
    color: 0x31551f,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const sleepingEyeMark = new THREE.LineBasicMaterial({
    color: 0x25331b,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const leaf = new THREE.MeshStandardMaterial({
    color: 0x6da823,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const veinGroove = new THREE.LineBasicMaterial({
    color: 0x4e762d,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  const veinEdge = new THREE.LineBasicMaterial({
    color: 0xa9cb61,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x25331b,
    roughness: 0.85,
  });

  return {
    bark,
    maskRim,
    eyeMark,
    sleepingEyeMark,
    leaf,
    cloverTexture,
    cloverBump,
    ginkgoTexture,
    ginkgoBump,
    veinGroove,
    veinEdge,
    dark,
  };
};
