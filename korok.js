"use strict";

// Owns the scene and character. It reads timer snapshots but never changes the timer.
window.createKorok = function createKorok({
  root,
  preferences,
  getTimerState,
  isFloating,
}) {
  const find = (selector) => root.querySelector(selector);
  const sceneElement = find("#scene");
  const asleepIndicator = find("#korok-asleep");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const openEyes = [];
  const closedEyes = [];
  const legs = [];
  let renderer, scene, camera, character, animationFrame;
  let restPose = 0;
  let rotation = 0;
  let pointer = 0;
  let dragPointerId = null;
  let dragX = 0;
  let previousMode = getTimerState().mode;
  let danceStartedAt = 0;
  let danceUntil = 0;
  let updateMask = () => {};

  function resize() {
    if (!renderer) return;
    const { width, height } = sceneElement.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  }

  function draw() {
    if (!renderer || !character) return;
    cancelAnimationFrame(animationFrame);
    const visible = !document.hidden || isFloating();

    function paint() {
      const { mode, running } = getTimerState();
      if (mode !== previousMode) {
        rotation = 0;
        pointer = 0;
      }
      previousMode = mode;
      const now = Date.now();
      const motionEnabled = preferences.motion && !reducedMotion.matches;
      const dancing = motionEnabled && now < danceUntil;
      // Pose values blend between standing (0), sitting (1), and sleeping (2).
      let targetPose = 0;
      if (!dancing && mode === "short") targetPose = 1;
      if (!dancing && mode === "long") targetPose = 2;
      restPose = motionEnabled
        ? restPose + (targetPose - restPose) * 0.12
        : targetPose;
      const seatedPose = Math.min(restPose, 1);
      const sleepingPose = Math.max(0, restPose - 1);
      const transitioning = Math.abs(targetPose - restPose) > 0.008;
      const animate =
        motionEnabled &&
        visible &&
        (running || dancing || mode !== "focus" || transitioning);
      asleepIndicator.hidden = sleepingPose <= 0.5;
      root.classList.toggle("sleep-motion-enabled", motionEnabled);
      const danceTime = now - danceStartedAt;
      if (animate && running && mode === "focus" && !dancing) rotation += 0.004;
      const danceScale = 1 - sleepingPose;
      if (dancing) {
        character.rotation.y = Math.sin(danceTime * 0.012) * 0.35;
      } else if (mode === "focus") {
        character.rotation.y = (rotation + pointer) * danceScale;
      } else {
        // Resting poses face forward, regardless of earlier spin or pointer input.
        character.rotation.y = 0;
      }
      character.rotation.z =
        (sleepingPose * Math.PI) / 2 -
        seatedPose * 0.06 +
        (dancing ? Math.sin(danceTime * 0.009) * 0.26 * danceScale : 0);
      character.rotation.x = -seatedPose * 0.1;
      let bounceHeight = 0;
      if (dancing)
        bounceHeight = 0.12 + Math.abs(Math.sin(danceTime * 0.014)) * 0.22;
      else if (motionEnabled && restPose > 0)
        bounceHeight = Math.sin(now * 0.002) * 0.012;
      else if (motionEnabled && running)
        bounceHeight = Math.sin(rotation * 2) * 0.045;
      character.position.y =
        -0.12 * seatedPose - 0.08 * sleepingPose + bounceHeight;
      legs.forEach((hip, index) => {
        const side = index === 0 ? -1 : 1;
        hip.position.set(side * 0.2, -0.66, 0.05 + seatedPose * 0.24);
        hip.rotation.x = (-seatedPose * Math.PI) / 2;
        hip.rotation.z = 0;
      });
      openEyes.forEach((eye) => {
        eye.visible = sleepingPose <= 0.5;
      });
      closedEyes.forEach((eye) => {
        eye.visible = sleepingPose > 0.5;
      });
      renderer.render(scene, camera);
      if (animate) animationFrame = requestAnimationFrame(paint);
    }
    paint();
  }

  function celebrate() {
    rotation = 0;
    pointer = 0;
    danceStartedAt = Date.now();
    danceUntil =
      preferences.motion && !reducedMotion.matches
        ? danceStartedAt + 2600
        : danceStartedAt;
    draw();
  }

  function cancelCelebration() {
    danceUntil = 0;
  }

  function showFallback() {
    cancelAnimationFrame(animationFrame);
    renderer = null;
    sceneElement.hidden = true;
    find("#scene-fallback").hidden = false;
  }

  try {
    if (!window.THREE) throw new Error("3D library unavailable");
    const THREE = window.THREE;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
    camera.position.set(0, 1.1, 6.7);
    camera.lookAt(0, 0.1, 0);
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    sceneElement.append(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const keyLight = new THREE.DirectionalLight(0xfff3e5, 4.5);
    keyLight.position.set(-3, 5, 4);
    scene.add(keyLight);
    const fill = new THREE.DirectionalLight(0xffffff, 1.5);
    fill.position.set(3, 1, -2);
    scene.add(fill);
    character = new THREE.Group();
    character.scale.setScalar(1.14);
    scene.add(character);
    const {
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
    } = window.createKorokTextures(THREE);

    // Spin a side profile around the vertical axis to make the body.
    const bodyProfile = [
      [0, -0.68],
      [0.24, -0.68],
      [0.39, -0.55],
      [0.47, -0.32],
      [0.48, -0.08],
      [0.44, 0.18],
      [0.36, 0.43],
      [0.29, 0.64],
      [0.22, 0.76],
      [0, 0.79],
    ];
    const body = new THREE.Mesh(
      new THREE.LatheGeometry(
        bodyProfile.map(
          ([radius, height]) => new THREE.Vector2(radius, height),
        ),
        32,
      ),
      bark,
    );
    body.position.y = -0.05;
    character.add(body);
    for (const side of [-1, 1]) {
      const legGeometry = new THREE.CylinderGeometry(0.13, 0.025, 0.3, 24);
      legGeometry.translate(0, -0.15, 0);
      const hip = new THREE.Group();
      hip.position.set(side * 0.2, -0.66, 0.05);
      hip.add(new THREE.Mesh(legGeometry, bark));
      character.add(hip);
      legs.push(hip);
      const shoulder = new THREE.Vector3(side * 0.4, -0.06, 0.02);
      const wrist = new THREE.Vector3(side * 0.62, -0.18, 0.12);
      const armDirection = new THREE.Vector3().subVectors(wrist, shoulder);
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.105, armDirection.length(), 24),
        bark,
      );
      arm.position.copy(shoulder).add(wrist).multiplyScalar(0.5);
      arm.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        armDirection.normalize(),
      );
      character.add(arm);
    }

    // Shapes supply outlines; textures supply the surface colors and details.
    const maskShapes = window.createMaskShapes(THREE);
    function maskGeometry(shape) {
      return new THREE.ExtrudeGeometry(shape, {
        depth: 0.055,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.018,
        bevelThickness: 0.018,
      });
    }
    const maskVeins = new THREE.Group();
    character.add(maskVeins);
    const maskOutline = new THREE.Mesh(maskGeometry(maskShapes.leaf), maskRim);
    maskOutline.scale.set(1.09, 1.07, 1);
    maskOutline.position.set(0, 0.47, 0.42 - 0.035);
    character.add(maskOutline);
    const mask = new THREE.Mesh(maskGeometry(maskShapes.leaf), leaf);
    mask.position.set(0, 0.47, 0.42);
    character.add(mask);

    function veinLine(points) {
      const curve = new THREE.CatmullRomCurve3(
        points.map(([maskX, maskY]) => new THREE.Vector3(maskX, maskY, 0.496)),
      );
      const groovePoints = curve.getPoints(20);
      maskVeins.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(groovePoints),
          veinGroove,
        ),
      );
      const edgePoints = groovePoints.map(
        (point) => new THREE.Vector3(point.x - 0.003, point.y + 0.002, 0.497),
      );
      maskVeins.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(edgePoints),
          veinEdge,
        ),
      );
    }

    function drawLeafVeins() {
      veinLine([
        [0, 0.34],
        [0, 0.55],
        [0, 0.77],
        [0, 0.98],
      ]);
      veinLine([
        [0, 0.55],
        [-0.16, 0.64],
        [-0.34, 0.72],
      ]);
      veinLine([
        [0, 0.55],
        [0.16, 0.65],
        [0.35, 0.73],
      ]);
      veinLine([
        [0, 0.42],
        [-0.16, 0.37],
        [-0.34, 0.34],
      ]);
      veinLine([
        [0, 0.42],
        [0.16, 0.37],
        [0.35, 0.34],
      ]);
      for (const side of [-1, 1]) {
        veinLine([
          [0, 0.72],
          [side * 0.14, 0.78],
          [side * 0.3, 0.8],
        ]);
        veinLine([
          [side * 0.13, 0.67],
          [side * 0.27, 0.63],
          [side * 0.39, 0.56],
        ]);
        veinLine([
          [0, 0.32],
          [side * 0.13, 0.31],
          [side * 0.28, 0.27],
        ]);
      }
    }

    updateMask = () => {
      const selected = preferences.mask;
      const geometry = maskGeometry(maskShapes[selected]);
      // Release old graphics memory; the face and rim may share one geometry.
      new Set([mask.geometry, maskOutline.geometry]).forEach((oldGeometry) =>
        oldGeometry.dispose(),
      );
      mask.geometry = geometry;
      maskOutline.geometry = geometry;
      leaf.map =
        { clover: cloverTexture, ginkgo: ginkgoTexture }[selected] ?? null;
      leaf.bumpMap =
        { clover: cloverBump, ginkgo: ginkgoBump }[selected] ?? null;
      leaf.bumpScale =
        selected === "ginkgo" ? 0.012 : selected === "clover" ? 0.025 : 0;
      leaf.needsUpdate = true;
      leaf.color.setHex(
        {
          leaf: 0x6da823,
          clover: 0x52862c,
          maple: 0x8dbb28,
          autumn: 0xd89026,
          ginkgo: 0xe7bd32,
        }[selected],
      );
      maskRim.color.setHex(
        selected === "ginkgo"
          ? 0x927324
          : selected === "autumn"
            ? 0x79431e
            : 0x31551f,
      );
      veinGroove.color.setHex(selected === "autumn" ? 0x93501b : 0x4e762d);
      veinEdge.color.setHex(selected === "autumn" ? 0xffd06a : 0xa9cb61);
      maskVeins.children.forEach((vein) => vein.geometry.dispose());
      maskVeins.clear();
      if (selected === "leaf") drawLeafVeins();
      else if (selected === "autumn") {
        for (const points of [
          [
            [-0.47, 0.61],
            [-0.16, 0.48],
            [0.16, 0.45],
            [0.47, 0.44],
          ],
          [
            [-0.16, 0.48],
            [-0.26, 0.62],
            [-0.24, 0.73],
          ],
          [
            [0.04, 0.46],
            [0.02, 0.65],
            [-0.02, 0.82],
          ],
          [
            [-0.16, 0.48],
            [-0.19, 0.38],
            [-0.24, 0.33],
          ],
          [
            [0.22, 0.45],
            [0.25, 0.51],
            [0.3, 0.62],
          ],
        ])
          veinLine(points);
      } else if (selected === "maple") {
        for (const [tipX, tipY] of [
          [0, 0.98],
          [-0.45, 0.64],
          [0.45, 0.64],
          [-0.3, 0.24],
          [0.3, 0.24],
        ]) {
          const middleX = tipX * 0.55;
          const middleY = 0.55 + (tipY - 0.55) * 0.55;
          veinLine([
            [0, 0.55],
            [middleX, middleY],
            [tipX, tipY],
          ]);
          veinLine([
            [middleX, middleY],
            [middleX + 0.055, middleY + 0.04],
            [tipX * 0.85 + 0.045, tipY - 0.045],
          ]);
        }
      }
    };
    updateMask();

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.PlaneGeometry(0.115, 0.115),
        eyeMark,
      );
      eye.position.set(side * 0.2, 0.57, 0.496);
      character.add(eye);
      openEyes.push(eye);
      const closedEyeCurve = new THREE.CatmullRomCurve3(
        [
          [side * 0.29, 0.57, 0.496],
          [side * 0.2, 0.535, 0.496],
          [side * 0.11, 0.57, 0.496],
        ].map(([eyeX, eyeY, eyeZ]) => new THREE.Vector3(eyeX, eyeY, eyeZ)),
      );
      const closedEye = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(closedEyeCurve.getPoints(20)),
        sleepingEyeMark,
      );
      closedEye.visible = false;
      character.add(closedEye);
      closedEyes.push(closedEye);
    }
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), dark);
    mouth.scale.set(0.9, 0.55, 0.35);
    mouth.position.set(0, 0.39, 0.52);
    character.add(mouth);

    for (const side of [-1, 1]) {
      const hornHeight = side < 0 ? 0.68 : 0.85;
      const hornGeometry = new THREE.ConeGeometry(0.14, hornHeight, 24, 20);
      const positions = hornGeometry.attributes.position;
      for (
        let vertexIndex = 0;
        vertexIndex < positions.count;
        vertexIndex += 1
      ) {
        const heightRatio =
          (positions.getY(vertexIndex) + hornHeight / 2) / hornHeight;
        const rootBlend = (1 - heightRatio) ** 4;
        const radiusScale = 1 + rootBlend * 0.65;
        positions.setXYZ(
          vertexIndex,
          positions.getX(vertexIndex) * radiusScale +
            side * heightRatio ** 2 * 0.1,
          positions.getY(vertexIndex) - rootBlend * 0.12,
          positions.getZ(vertexIndex) * radiusScale,
        );
      }
      hornGeometry.computeVertexNormals();
      const horn = new THREE.Mesh(hornGeometry, bark);
      horn.position.set(side * 0.26, 0.65 + hornHeight / 2, 0.02);
      horn.rotation.z = -side * 0.35;
      character.add(horn);
      const branchHeights = side > 0 ? [0.52, 0.76] : [0.7];
      branchHeights.forEach((heightRatio, branchIndex) => {
        const branchSide = branchIndex === 0 ? side : -side;
        const branchLength = branchIndex === 0 ? 0.24 : 0.18;
        const branchRoot = new THREE.Vector3(
          side * heightRatio ** 2 * 0.1,
          hornHeight * (heightRatio - 0.5),
          0.025,
        );
        const direction = new THREE.Vector3(
          branchSide * 0.72,
          0.7,
          0.12,
        ).normalize();
        const prong = new THREE.Mesh(
          new THREE.ConeGeometry(0.045, branchLength, 16),
          bark,
        );
        prong.position
          .copy(branchRoot)
          .addScaledVector(direction, branchLength / 2);
        prong.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction,
        );
        horn.add(prong);
        if (branchIndex === 0) {
          const tinyLeaf = new THREE.Mesh(
            new THREE.ShapeGeometry(maskShapes.leaf),
            new THREE.MeshStandardMaterial({
              color: 0x9bc94b,
              roughness: 0.8,
              side: THREE.DoubleSide,
            }),
          );
          tinyLeaf.scale.set(0.14, 0.18, 1);
          tinyLeaf.position
            .copy(branchRoot)
            .addScaledVector(direction, branchLength);
          tinyLeaf.rotation.z = -side * 0.65;
          horn.add(tinyLeaf);
        }
      });
    }

    sceneElement.addEventListener("pointerdown", (event) => {
      if (
        event.pointerType !== "touch" ||
        event.isPrimary === false ||
        dragPointerId !== null ||
        getTimerState().mode !== "focus"
      )
        return;
      dragPointerId = event.pointerId;
      dragX = event.clientX;
      pointer = 0;
      sceneElement.setPointerCapture(event.pointerId);
    });
    sceneElement.addEventListener("pointermove", (event) => {
      if (event.pointerId === dragPointerId) {
        // Explicit touch dragging works even when automatic motion is disabled.
        if (getTimerState().mode !== "focus") return;
        rotation += (event.clientX - dragX) * 0.008;
        dragX = event.clientX;
        draw();
        return;
      }
      if (event.pointerType === "touch") return;
      if (!preferences.motion || reducedMotion.matches) return;
      const bounds = sceneElement.getBoundingClientRect();
      pointer = (event.clientX - bounds.left - bounds.width / 2) * 0.004;
      draw();
    });
    sceneElement.addEventListener("pointerleave", () => {
      if (dragPointerId !== null) return;
      pointer = 0;
      draw();
    });
    function endDrag(event) {
      if (event.pointerId !== dragPointerId) return;
      dragPointerId = null;
      if (sceneElement.hasPointerCapture(event.pointerId)) {
        sceneElement.releasePointerCapture(event.pointerId);
      }
    }
    sceneElement.addEventListener("pointerup", endDrag);
    sceneElement.addEventListener("pointercancel", endDrag);
    sceneElement.addEventListener("lostpointercapture", endDrag);
    sceneElement.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        rotation += event.key === "ArrowLeft" ? -0.2 : 0.2;
        draw();
      }
    });
    renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      showFallback();
    });
    new ResizeObserver(resize).observe(sceneElement);
    reducedMotion.addEventListener("change", draw);
    resize();
  } catch {
    showFallback();
  }

  return {
    draw,
    resize,
    updateMask: () => updateMask(),
    celebrate,
    cancelCelebration,
  };
};
