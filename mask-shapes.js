"use strict";

// Flat outlines only. korok.js gives these shapes thickness and a material.
// THREE is passed in so loading this file does not require WebGL.
window.createMaskShapes = function createMaskShapes(THREE) {
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0.58);
  leaf.bezierCurveTo(0.13, 0.38, 0.39, 0.46, 0.49, 0.24);
  leaf.bezierCurveTo(0.59, 0.05, 0.4, -0.13, 0.25, -0.2);
  leaf.bezierCurveTo(0.13, -0.27, 0.05, -0.17, 0, -0.1);
  leaf.bezierCurveTo(-0.1, -0.2, -0.23, -0.28, -0.36, -0.16);
  leaf.bezierCurveTo(-0.54, -0.02, -0.56, 0.19, -0.42, 0.32);
  leaf.bezierCurveTo(-0.31, 0.43, -0.12, 0.36, 0, 0.58);

  const clover = new THREE.Shape();
  clover.moveTo(0, 0.32);
  clover.bezierCurveTo(-0.32, 0.78, -0.78, 0.37, -0.23, 0.08);
  clover.bezierCurveTo(-0.64, -0.27, -0.19, -0.5, 0, -0.14);
  clover.bezierCurveTo(0.19, -0.5, 0.64, -0.27, 0.23, 0.08);
  clover.bezierCurveTo(0.78, 0.37, 0.32, 0.78, 0, 0.32);

  const maple = new THREE.Shape();
  maple.moveTo(0, 0.59);
  for (const [maskX, maskY] of [
    [0.19, 0.27],
    [0.17, 0.12],
    [0.56, 0.24],
    [0.43, -0.02],
    [0.23, -0.06],
    [0.4, -0.3],
    [0.13, -0.24],
    [0, -0.12],
    [-0.13, -0.24],
    [-0.4, -0.3],
    [-0.23, -0.06],
    [-0.43, -0.02],
    [-0.56, 0.24],
    [-0.17, 0.12],
    [-0.19, 0.27],
  ]) {
    maple.lineTo(maskX, maskY);
  }
  maple.closePath();

  const autumn = new THREE.Shape();
  autumn.moveTo(-0.59, 0.15);
  autumn.bezierCurveTo(-0.29, 0.19, -0.22, 0.57, 0.13, 0.44);
  autumn.bezierCurveTo(0.38, 0.37, 0.37, 0.04, 0.59, -0.02);
  autumn.bezierCurveTo(0.24, -0.05, 0.24, -0.31, -0.13, -0.22);
  autumn.bezierCurveTo(-0.41, -0.16, -0.4, 0.05, -0.59, 0.15);

  const ginkgo = new THREE.Shape();
  ginkgo.moveTo(0, -0.27);
  ginkgo.bezierCurveTo(-0.13, -0.08, -0.41, -0.03, -0.58, 0.17);
  ginkgo.bezierCurveTo(-0.63, 0.24, -0.58, 0.37, -0.51, 0.4);
  ginkgo.bezierCurveTo(-0.48, 0.52, -0.39, 0.48, -0.34, 0.54);
  ginkgo.bezierCurveTo(-0.29, 0.6, -0.23, 0.53, -0.17, 0.56);
  ginkgo.bezierCurveTo(-0.09, 0.6, -0.05, 0.49, 0, 0.43);
  ginkgo.bezierCurveTo(0.05, 0.49, 0.09, 0.6, 0.17, 0.56);
  ginkgo.bezierCurveTo(0.23, 0.53, 0.29, 0.6, 0.34, 0.54);
  ginkgo.bezierCurveTo(0.39, 0.48, 0.48, 0.52, 0.51, 0.4);
  ginkgo.bezierCurveTo(0.58, 0.37, 0.63, 0.24, 0.58, 0.17);
  ginkgo.bezierCurveTo(0.41, -0.03, 0.13, -0.08, 0, -0.27);

  return { leaf, clover, maple, autumn, ginkgo };
};
