(function () {
  'use strict';

  var THREE = window.THREE;
  if (!THREE) {
    throw new Error('RaceEngine requires Three.js r158 (window.THREE).');
  }

  var TAU = Math.PI * 2;
  var FIXED_STEP = 1 / 60;
  var CHALLENGE_TIME = 55;
  var TOTAL_LAPS = 3;
  var ROAD_HALF_WIDTH = 6.5;
  var BARRIER_OFFSET = 16;
  var BARRIER_LIMIT = 15.2;
  var SPA_TRACK_SCALE = 0.25;
  var SPA_SOURCE_POINTS = Object.freeze([
    [642.1, -1142.7], [946, -1119.2], [959.8, -1116], [970.9, -1107.1],
    [976.8, -1094.3], [976.6, -1080.1], [970.2, -1067.4], [855.1, -841.7],
    [740, -616], [726.7, -594.1], [720.6, -569.3], [712.1, -537.5],
    [693.3, -510.6], [666.4, -491.8], [629.1, -466.9], [601.1, -432],
    [514.2, -149.7], [427.3, 132.5], [340.5, 414.7], [253.6, 697],
    [166.7, 979.2], [142.5, 1004.5], [109.4, 1015.7], [85.8, 1022.6],
    [66.6, 1038], [44.9, 1057], [18.6, 1068.6], [-181.4, 1161],
    [-254.1, 1164.2], [-434.5, 1145.5], [-452.8, 1138.1], [-466.4, 1124],
    [-473.1, 1105.5], [-471.8, 1085.9], [-462.5, 1068.5], [-248.7, 898.7],
    [-222.2, 844.9], [-223.5, 785], [-254.7, 728], [-308.8, 691.9],
    [-478.7, 634.3], [-648.6, 576.7], [-683.2, 554.7], [-705.2, 520.2],
    [-724.3, 488.6], [-754.1, 466.8], [-938.4, 380.2], [-963.8, 359.8],
    [-976.8, 330.1], [-974.7, 297.7], [-957.9, 269.9], [-742.2, 124.7],
    [-526.5, -20.6], [-488, -64.9], [-318.5, -213.2], [-148.9, -361.6],
    [-112, -420.6], [-85.2, -490.4], [70.7, -784], [226.7, -1077.7],
    [233.9, -1087.5], [245.8, -1089.9], [313.8, -1139.9], [335.8, -1157.8],
    [363.5, -1164.2]
  ]);

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function damp(a, b, lambda, dt) {
    return lerp(a, b, 1 - Math.exp(-lambda * dt));
  }

  function modulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function angleDelta(target, current) {
    return modulo(target - current + Math.PI, TAU) - Math.PI;
  }

  function numberOr(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function colorOr(value, fallback) {
    try {
      return new THREE.Color(value == null ? fallback : value);
    } catch (error) {
      return new THREE.Color(fallback);
    }
  }

  function makeCanvasTexture(text, foreground, background, width, height) {
    var canvas = document.createElement('canvas');
    canvas.width = width || 512;
    canvas.height = height || 160;
    var context = canvas.getContext('2d');
    context.fillStyle = background || '#07131d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = foreground || '#ffd400';
    context.lineWidth = Math.max(6, canvas.height * 0.045);
    context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    context.fillStyle = foreground || '#ffd400';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 ' + Math.floor(canvas.height * 0.47) + 'px Arial Black, Arial, sans-serif';
    context.fillText(String(text), canvas.width / 2, canvas.height * 0.53);
    var texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    return texture;
  }

  function originalTexture(name, repeatX, repeatY) {
    var library = window.OriginalMiniGPAssets;
    var source = library && library.getTexture ? library.getTexture(name) : null;
    if (!source) return null;
    var texture = source.clone();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX || 1, repeatY || 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    delete texture.userData.originalAssetShared;
    texture.userData.originalAssetInstance = true;
    return texture;
  }

  function makeSponsorTexture(label, foreground, background, accent) {
    var canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    var context = canvas.getContext('2d');
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = accent || foreground;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(54, 0);
    context.lineTo(22, canvas.height);
    context.lineTo(0, canvas.height);
    context.closePath();
    context.fill();
    context.fillStyle = foreground;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'italic 900 47px Arial Black, Arial, sans-serif';
    context.fillText(label, canvas.width * 0.54, canvas.height * 0.53, canvas.width * 0.82);
    var texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  function mesh(geometry, material, x, y, z) {
    var result = new THREE.Mesh(geometry, material);
    result.position.set(x || 0, y || 0, z || 0);
    result.castShadow = true;
    result.receiveShadow = true;
    return result;
  }

  /**
   * Original, fully procedural open-wheel car. The model faces local +Z.
   * The wheel groups are exposed in userData for inexpensive race animation.
   */
  function createProceduralCarModel(options) {
    options = options || {};
    var bodyColor = colorOr(options.bodyColor, '#10cdef');
    var wingColor = colorOr(options.wingColor, '#ffe147');
    var rimColor = colorOr(options.rimColor, '#f4f7f6');
    var carScale = clamp(numberOr(options.scale, 1), 0.05, 20);
    var carNumber = String(options.number == null ? '07' : options.number).slice(0, 3);

    var root = new THREE.Group();
    root.name = options.name || 'Procedural Formula Car';
    root.userData.wheels = [];
    root.userData.frontWheels = [];

    var bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.3,
      metalness: 0.35
    });
    var bodyLightMat = new THREE.MeshStandardMaterial({
      color: bodyColor.clone().lerp(new THREE.Color('#ffffff'), 0.24),
      roughness: 0.34,
      metalness: 0.25
    });
    var wingMat = new THREE.MeshStandardMaterial({
      color: wingColor,
      roughness: 0.32,
      metalness: 0.22
    });
    var carbonMat = new THREE.MeshStandardMaterial({
      color: '#10161a',
      roughness: 0.52,
      metalness: 0.34
    });
    var rubberMat = new THREE.MeshStandardMaterial({
      color: '#080a0b',
      roughness: 0.88,
      metalness: 0.03
    });
    var rimMat = new THREE.MeshStandardMaterial({
      color: rimColor,
      roughness: 0.3,
      metalness: 0.82
    });
    var glassMat = new THREE.MeshStandardMaterial({
      color: '#09141c',
      roughness: 0.14,
      metalness: 0.52
    });

    var floor = mesh(new THREE.BoxGeometry(1.7, 0.12, 3.75), carbonMat, 0, 0.34, 0);
    root.add(floor);

    var chassis = mesh(new THREE.BoxGeometry(1.2, 0.48, 2.7), bodyMat, 0, 0.58, -0.05);
    chassis.geometry.translate(0, 0, 0.05);
    root.add(chassis);

    var nose = mesh(new THREE.CylinderGeometry(0.16, 0.43, 2.35, 5, 1, false), bodyLightMat, 0, 0.58, 1.72);
    nose.rotation.x = Math.PI / 2;
    root.add(nose);

    var noseTip = mesh(new THREE.BoxGeometry(0.34, 0.2, 0.42), wingMat, 0, 0.48, 2.82);
    root.add(noseTip);

    [-1, 1].forEach(function (side) {
      var sidePod = mesh(new THREE.BoxGeometry(0.45, 0.46, 1.55), bodyMat, side * 0.72, 0.61, -0.24);
      sidePod.rotation.z = side * -0.035;
      root.add(sidePod);

      var fin = mesh(new THREE.BoxGeometry(0.08, 0.2, 1.3), wingMat, side * 0.99, 0.34, -0.08);
      root.add(fin);
    });

    var engineCover = mesh(new THREE.CapsuleGeometry(0.43, 1.15, 5, 10), bodyLightMat, 0, 0.86, -0.83);
    engineCover.rotation.x = Math.PI / 2;
    engineCover.scale.set(1, 1, 0.95);
    root.add(engineCover);

    var spine = mesh(new THREE.BoxGeometry(0.12, 0.7, 1.2), wingMat, 0, 1.07, -0.72);
    spine.rotation.x = -0.14;
    root.add(spine);

    var cockpit = mesh(new THREE.SphereGeometry(0.47, 16, 10), glassMat, 0, 0.95, 0.15);
    cockpit.scale.set(0.82, 0.62, 1.18);
    root.add(cockpit);

    var driver = mesh(new THREE.SphereGeometry(0.25, 14, 9), new THREE.MeshStandardMaterial({ color: '#f6e7c7', roughness: 0.68 }), 0, 1.17, 0.08);
    driver.scale.set(0.86, 1, 0.9);
    root.add(driver);

    var helmet = mesh(new THREE.SphereGeometry(0.27, 14, 9), wingMat, 0, 1.24, 0.07);
    helmet.scale.set(0.95, 0.78, 0.98);
    root.add(helmet);

    var halo = new THREE.Group();
    var haloBar = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 7), carbonMat, 0, 1.25, 0.44);
    haloBar.rotation.z = Math.PI / 2;
    halo.add(haloBar);
    var haloStem = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 7), carbonMat, 0, 1.17, 0.66);
    haloStem.rotation.x = Math.PI / 2;
    halo.add(haloStem);
    root.add(halo);

    var frontWing = mesh(new THREE.BoxGeometry(2.25, 0.1, 0.38), wingMat, 0, 0.32, 2.66);
    root.add(frontWing);
    [-1, 1].forEach(function (side) {
      var endPlate = mesh(new THREE.BoxGeometry(0.08, 0.35, 0.52), bodyMat, side * 1.11, 0.42, 2.64);
      root.add(endPlate);
    });

    var rearWing = mesh(new THREE.BoxGeometry(1.92, 0.14, 0.45), wingMat, 0, 1.16, -1.91);
    rearWing.rotation.x = -0.08;
    root.add(rearWing);
    [-1, 1].forEach(function (side) {
      var support = mesh(new THREE.BoxGeometry(0.08, 0.78, 0.12), carbonMat, side * 0.54, 0.82, -1.83);
      root.add(support);
      var plate = mesh(new THREE.BoxGeometry(0.08, 0.58, 0.62), bodyMat, side * 0.98, 1.03, -1.9);
      root.add(plate);
    });

    function addWheel(x, z, front) {
      var pivot = new THREE.Group();
      pivot.position.set(x, 0.5, z);
      var tire = mesh(new THREE.CylinderGeometry(front ? 0.43 : 0.47, front ? 0.43 : 0.47, front ? 0.29 : 0.35, 18), rubberMat, 0, 0, 0);
      tire.rotation.z = Math.PI / 2;
      pivot.add(tire);
      var rim = mesh(new THREE.CylinderGeometry(front ? 0.23 : 0.25, front ? 0.23 : 0.25, front ? 0.305 : 0.365, 12), rimMat, 0, 0, 0);
      rim.rotation.z = Math.PI / 2;
      pivot.add(rim);
      var hub = mesh(new THREE.CylinderGeometry(0.08, 0.08, front ? 0.32 : 0.38, 10), carbonMat, 0, 0, 0);
      hub.rotation.z = Math.PI / 2;
      pivot.add(hub);
      root.add(pivot);
      root.userData.wheels.push(pivot);
      if (front) root.userData.frontWheels.push(pivot);
      return pivot;
    }

    [-1, 1].forEach(function (side) {
      addWheel(side * 1.03, 1.45, true);
      addWheel(side * 1.05, -1.3, false);
      var frontArm = mesh(new THREE.BoxGeometry(0.82, 0.045, 0.06), carbonMat, side * 0.63, 0.52, 1.39);
      frontArm.rotation.y = side * 0.13;
      root.add(frontArm);
      var rearArm = mesh(new THREE.BoxGeometry(0.82, 0.05, 0.065), carbonMat, side * 0.64, 0.55, -1.26);
      rearArm.rotation.y = side * -0.11;
      root.add(rearArm);
    });

    var numberTexture = makeCanvasTexture(carNumber, '#08131a', '#' + bodyColor.getHexString(), 192, 128);
    var numberMat = new THREE.MeshBasicMaterial({ map: numberTexture, transparent: false, side: THREE.DoubleSide });
    var numberPlate = mesh(new THREE.PlaneGeometry(0.48, 0.32), numberMat, 0, 0.87, 1.11);
    numberPlate.rotation.x = -Math.PI / 2;
    root.add(numberPlate);

    var rearLightMat = new THREE.MeshStandardMaterial({ color: '#ff1f3d', emissive: '#ff092d', emissiveIntensity: 2 });
    var rearLight = mesh(new THREE.BoxGeometry(0.26, 0.12, 0.08), rearLightMat, 0, 0.53, -2.0);
    root.add(rearLight);

    root.scale.setScalar(carScale);
    root.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return root;
  }

  function createCarModel(options) {
    var library = window.OriginalMiniGPAssets;
    var original = library && library.createCar ? library.createCar(options || {}) : null;
    return original || createProceduralCarModel(options);
  }

  function disposeObject(root) {
    if (!root) return;
    var geometries = new Set();
    var materials = new Set();
    var textures = new Set();
    root.traverse(function (child) {
      if (child.geometry && !child.geometry.userData.originalAssetShared) geometries.add(child.geometry);
      if (child.material) {
        (Array.isArray(child.material) ? child.material : [child.material]).forEach(function (material) {
          if (!material) return;
          materials.add(material);
          Object.keys(material).forEach(function (key) {
            if (material[key] && material[key].isTexture && !material[key].userData.originalAssetShared) textures.add(material[key]);
          });
        });
      }
    });
    textures.forEach(function (texture) { texture.dispose(); });
    materials.forEach(function (material) { material.dispose(); });
    geometries.forEach(function (geometry) { geometry.dispose(); });
  }

  function RaceEngine(options) {
    options = options || {};
    if (!options.canvas) throw new Error('RaceEngine requires a canvas.');

    this.canvas = options.canvas;
    this.onHud = typeof options.onHud === 'function' ? options.onHud : function () {};
    this.onFinish = typeof options.onFinish === 'function' ? options.onFinish : function () {};
    this.onMessage = typeof options.onMessage === 'function' ? options.onMessage : function () {};
    this.controls = { left: false, right: false, throttle: false, brake: false, boost: false, drift: false };
    this.running = false;
    this.paused = false;
    this.finished = false;
    this.raf = 0;
    this.accumulator = 0;
    this.previousTime = 0;
    this.frameSamples = [];
    this.frameCounter = 0;
    this.hudAccumulator = 0;
    this.cameraMode = 0;
    this.ersMode = 1;
    this.effects = [];
    this.ai = [];
    this.coinsOnTrack = [];
    this._tempV = new THREE.Vector3();
    this._tempV2 = new THREE.Vector3();
    this._tempMatrix = new THREE.Matrix4();
    this._tempQuaternion = new THREE.Quaternion();

    var isCompact = Math.min(window.innerWidth || 1024, window.innerHeight || 768) < 720;
    this.maxPixelRatio = isCompact ? 1.35 : 1.8;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.pixelRatio <= 1.5,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#88d8ee');
    this.scene.fog = new THREE.FogExp2('#91d6df', 0.0042);
    this.camera = new THREE.PerspectiveCamera(64, 1, 0.1, 650);
    this.camera.position.set(0, 5, -9);
    this.cameraTarget = new THREE.Vector3();

    this.environmentRoot = new THREE.Group();
    this.environmentRoot.name = 'Procedural Circuit';
    this.scene.add(this.environmentRoot);
    this.actorRoot = new THREE.Group();
    this.actorRoot.name = 'Race Actors';
    this.scene.add(this.actorRoot);

    this.trackVariant = 'spa';
    this.trackName = 'Bosque veloz';

    this._buildLights();
    this._buildCircuit();
    this._buildScenery();
    this._buildStartingGantry();

    this._boundResize = this.resize.bind(this);
    window.addEventListener('resize', this._boundResize, { passive: true });
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(this._boundResize);
      this.resizeObserver.observe(this.canvas);
    }
    this.resize();
  }

  RaceEngine.createCarModel = createCarModel;
  RaceEngine.createProceduralCarModel = createProceduralCarModel;
  RaceEngine.releaseObject = disposeObject;
  RaceEngine.preloadOriginalAssets = function () {
    var library = window.OriginalMiniGPAssets;
    return library && library.preload ? library.preload() : Promise.resolve(null);
  };

  RaceEngine.prototype._buildLights = function () {
    var hemi = new THREE.HemisphereLight('#e9fbff', '#4f7145', 2.2);
    this.environmentRoot.add(hemi);

    var sun = new THREE.DirectionalLight('#fff5d3', 3.15);
    sun.position.set(-35, 62, -24);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -110;
    sun.shadow.camera.right = 110;
    sun.shadow.camera.top = 110;
    sun.shadow.camera.bottom = -110;
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 180;
    sun.shadow.bias = -0.0002;
    sun.target.position.set(0, 0, 0);
    this.environmentRoot.add(sun, sun.target);
    this.sunLight = sun;

    var fill = new THREE.DirectionalLight('#62b7ff', 0.75);
    fill.position.set(35, 18, 45);
    this.environmentRoot.add(fill);
  };

  RaceEngine.prototype._buildCircuit = function () {
    var sourceOrigin = SPA_SOURCE_POINTS[0];
    var points = SPA_SOURCE_POINTS.map(function (point) {
      return new THREE.Vector3(
        (point[0] - sourceOrigin[0]) * SPA_TRACK_SCALE,
        0,
        (point[1] - sourceOrigin[1]) * SPA_TRACK_SCALE
      );
    });
    this.trackCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    this.trackCurve.arcLengthDivisions = 20000;
    this.trackCurve.updateArcLengths();
    this.trackLength = this.trackCurve.getLength();
    this.trackSamples = [];
    var sampleCount = clamp(Math.round(this.trackLength / 1.25), 700, 1800);
    this.trackSampleSpacing = this.trackLength / sampleCount;
    for (var i = 0; i < sampleCount; i += 1) {
      var t = i / sampleCount;
      var position = this.trackCurve.getPointAt(t);
      var tangent = this.trackCurve.getTangentAt(t).normalize();
      var right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      this.trackSamples.push({ t: t, position: position, tangent: tangent, right: right });
    }

    var minX = Infinity;
    var maxX = -Infinity;
    var minZ = Infinity;
    var maxZ = -Infinity;
    points.forEach(function (point) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    });
    this.trackBounds = {
      minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ,
      centerX: (minX + maxX) * 0.5,
      centerZ: (minZ + maxZ) * 0.5
    };
    var groundWidth = Math.max(440, maxX - minX + 380);
    var groundDepth = Math.max(440, maxZ - minZ + 380);

    var grassMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: originalTexture('grass', groundWidth / 15, groundDepth / 15),
      roughness: 0.98,
      metalness: 0
    });
    var ground = mesh(
      new THREE.PlaneGeometry(groundWidth, groundDepth, 1, 1),
      grassMat,
      this.trackBounds.centerX,
      -0.08,
      this.trackBounds.centerZ
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.castShadow = false;
    this.environmentRoot.add(ground);

    var runoff = new THREE.Mesh(
      this._makeRibbonGeometry(BARRIER_OFFSET - 0.25, 0.03),
      new THREE.MeshStandardMaterial({
        color: '#d7d0bb',
        map: originalTexture('gravel', 2.2, 1),
        roughness: 0.96,
        metalness: 0
      })
    );
    runoff.receiveShadow = true;
    this.environmentRoot.add(runoff);

    var roadMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: originalTexture('asphalt', 2.4, 1),
      roughness: 0.9,
      metalness: 0.01
    });
    var road = new THREE.Mesh(this._makeRibbonGeometry(ROAD_HALF_WIDTH, 0.11), roadMat);
    road.receiveShadow = true;
    this.environmentRoot.add(road);

    this._buildRoadDetails();
  };

  RaceEngine.prototype._makeRibbonGeometry = function (halfWidth, yOffset) {
    var positions = [];
    var normals = [];
    var uvs = [];
    var indices = [];
    var count = this.trackSamples.length;
    for (var i = 0; i <= count; i += 1) {
      var sample = this.trackSamples[i % count];
      var left = sample.position.clone().addScaledVector(sample.right, -halfWidth);
      var right = sample.position.clone().addScaledVector(sample.right, halfWidth);
      left.y += yOffset;
      right.y += yOffset;
      positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
      normals.push(0, 1, 0, 0, 1, 0);
      var distanceV = i * this.trackSampleSpacing / 8;
      uvs.push(0, distanceV, 1, distanceV);
      if (i < count) {
        var base = i * 2;
        indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  };

  RaceEngine.prototype._buildRoadDetails = function () {
    var segmentCount = clamp(Math.ceil(this.trackLength / 4.8), 96, 520);
    var curbGeometry = new THREE.BoxGeometry(0.72, 0.12, this.trackLength / segmentCount * 1.12);
    var redMat = new THREE.MeshStandardMaterial({ color: '#ef3340', roughness: 0.7 });
    var whiteMat = new THREE.MeshStandardMaterial({ color: '#f6f1df', roughness: 0.72 });
    var curbCapacity = Math.ceil(segmentCount / 2) * 2;
    var redCurbs = new THREE.InstancedMesh(curbGeometry, redMat, curbCapacity);
    var whiteCurbs = new THREE.InstancedMesh(curbGeometry, whiteMat, curbCapacity);
    redCurbs.castShadow = redCurbs.receiveShadow = true;
    whiteCurbs.castShadow = whiteCurbs.receiveShadow = true;
    var redIndex = 0;
    var whiteIndex = 0;
    var dummy = new THREE.Object3D();
    for (var i = 0; i < segmentCount; i += 1) {
      var t = i / segmentCount;
      var center = this.trackCurve.getPointAt(t);
      var tangent = this.trackCurve.getTangentAt(t).normalize();
      var right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      var materialTarget = i % 2 === 0 ? redCurbs : whiteCurbs;
      [ -1, 1 ].forEach(function (side) {
        dummy.position.copy(center).addScaledVector(right, side * (ROAD_HALF_WIDTH - 0.26));
        dummy.position.y += 0.2;
        dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
        dummy.updateMatrix();
        if (materialTarget === redCurbs) redCurbs.setMatrixAt(redIndex++, dummy.matrix);
        else whiteCurbs.setMatrixAt(whiteIndex++, dummy.matrix);
      });
    }
    redCurbs.count = redIndex;
    whiteCurbs.count = whiteIndex;
    redCurbs.instanceMatrix.needsUpdate = true;
    whiteCurbs.instanceMatrix.needsUpdate = true;
    this.environmentRoot.add(redCurbs, whiteCurbs);

    var barrierSegmentCount = clamp(Math.ceil(this.trackLength / 7.5), 64, 360);
    var barrierSegmentLength = this.trackLength / barrierSegmentCount * 1.12;
    var barrierGeometry = new THREE.BoxGeometry(0.32, 0.72, barrierSegmentLength);
    var barrierMat = new THREE.MeshStandardMaterial({ color: '#e4ecee', roughness: 0.57, metalness: 0.32 });
    var barriers = new THREE.InstancedMesh(barrierGeometry, barrierMat, barrierSegmentCount * 2);
    barriers.castShadow = barriers.receiveShadow = true;
    var barrierIndex = 0;
    for (var b = 0; b < barrierSegmentCount; b += 1) {
      var bt = b / barrierSegmentCount;
      var bp = this.trackCurve.getPointAt(bt);
      var tangentB = this.trackCurve.getTangentAt(bt).normalize();
      var rightB = new THREE.Vector3(tangentB.z, 0, -tangentB.x).normalize();
      [-1, 1].forEach(function (side) {
        dummy.position.copy(bp).addScaledVector(rightB, side * BARRIER_OFFSET);
        dummy.position.y += 0.52;
        dummy.rotation.set(0, Math.atan2(tangentB.x, tangentB.z), 0);
        dummy.updateMatrix();
        barriers.setMatrixAt(barrierIndex++, dummy.matrix);
      });
    }
    barriers.count = barrierIndex;
    barriers.instanceMatrix.needsUpdate = true;
    this.environmentRoot.add(barriers);

    var sponsorData = [
      ['APEX', '#ffffff', '#0d0f17', '#e10600'],
      ['VELOCE', '#ffffff', '#d40a06', '#ffe14d'],
      ['ION TYRES', '#12141b', '#eceef1', '#00b2e3'],
      ['QUANTUM AERO', '#ffffff', '#0b3a6d', '#4fd2ff'],
      ['KRONOS WATCHES', '#f0e6c4', '#14261c', '#c9a24a'],
      ['MERIDIAN BANK', '#f4fbf7', '#1f7a5a', '#8ce0c0'],
      ['HALO TELECOM', '#ffffff', '#2b1a4d', '#b07cff'],
      ['STRATA ENERGY', '#141018', '#e8721c', '#ffd23a']
    ];
    var sponsorMaterials = sponsorData.map(function (entry) {
      return new THREE.MeshBasicMaterial({
        map: makeSponsorTexture(entry[0], entry[1], entry[2], entry[3]),
        side: THREE.DoubleSide
      });
    });
    var sponsorGeometry = new THREE.PlaneGeometry(barrierSegmentLength * 0.94, 0.64);
    var sponsorCapacity = Math.ceil(barrierSegmentCount * 2 / sponsorMaterials.length) + 2;
    var sponsorPanels = sponsorMaterials.map(function (material, index) {
      var panels = new THREE.InstancedMesh(sponsorGeometry, material, sponsorCapacity);
      panels.name = 'Original Sponsor Barrier ' + sponsorData[index][0];
      panels.castShadow = false;
      panels.receiveShadow = false;
      panels.count = 0;
      return panels;
    });
    var sponsorCounts = sponsorMaterials.map(function () { return 0; });
    for (var ad = 0; ad < barrierSegmentCount; ad += 1) {
      var adT = ad / barrierSegmentCount;
      var adPoint = this.trackCurve.getPointAt(adT);
      var adTangent = this.trackCurve.getTangentAt(adT).normalize();
      var adRight = new THREE.Vector3(adTangent.z, 0, -adTangent.x).normalize();
      [-1, 1].forEach(function (side) {
        var materialIndex = (ad + (side > 0 ? 3 : 0)) % sponsorMaterials.length;
        dummy.position.copy(adPoint).addScaledVector(adRight, side * (BARRIER_OFFSET - 0.18));
        dummy.position.y += 0.96;
        dummy.rotation.set(0, Math.atan2(-side * adRight.x, -side * adRight.z), 0);
        dummy.updateMatrix();
        sponsorPanels[materialIndex].setMatrixAt(sponsorCounts[materialIndex]++, dummy.matrix);
      });
    }
    sponsorPanels.forEach(function (panels, index) {
      panels.count = sponsorCounts[index];
      panels.instanceMatrix.needsUpdate = true;
      this.environmentRoot.add(panels);
    }, this);

    var dashGeometry = new THREE.BoxGeometry(0.1, 0.025, 1.85);
    var dashMaterial = new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.72 });
    var dashRows = 3;
    var dashCount = clamp(Math.round(this.trackLength / 4.4), 96, 520);
    var dashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, dashRows * dashCount);
    dashes.receiveShadow = true;
    var dashIndex = 0;
    for (var dash = 0; dash < dashCount; dash += 1) {
      var dashT = dash / dashCount;
      var dashPoint = this.trackCurve.getPointAt(dashT);
      var dashTangent = this.trackCurve.getTangentAt(dashT).normalize();
      var dashRight = new THREE.Vector3(dashTangent.z, 0, -dashTangent.x).normalize();
      [-2.55, 0, 2.55].forEach(function (lane) {
        dummy.position.copy(dashPoint).addScaledVector(dashRight, lane);
        dummy.position.y += 0.235;
        dummy.rotation.set(0, Math.atan2(dashTangent.x, dashTangent.z), 0);
        dummy.updateMatrix();
        dashes.setMatrixAt(dashIndex++, dummy.matrix);
      });
    }
    dashes.count = dashIndex;
    dashes.instanceMatrix.needsUpdate = true;
    this.environmentRoot.add(dashes);

    var lineMatA = new THREE.MeshStandardMaterial({ color: '#f6f6ef', roughness: 0.7 });
    var lineMatB = new THREE.MeshStandardMaterial({ color: '#151719', roughness: 0.7 });
    var start = this.trackCurve.getPointAt(0);
    var tangentStart = this.trackCurve.getTangentAt(0).normalize();
    var rightStart = new THREE.Vector3(tangentStart.z, 0, -tangentStart.x).normalize();
    var heading = Math.atan2(tangentStart.x, tangentStart.z);
    for (var row = 0; row < 2; row += 1) {
      for (var col = 0; col < 12; col += 1) {
        var tile = mesh(new THREE.BoxGeometry(1.05, 0.035, 0.72), (row + col) % 2 ? lineMatA : lineMatB, 0, 0, 0);
        tile.position.copy(start).addScaledVector(rightStart, (col - 5.5) * 1.05).addScaledVector(tangentStart, (row - 0.5) * 0.72);
        tile.position.y += 0.195;
        tile.rotation.y = heading;
        tile.castShadow = false;
        this.environmentRoot.add(tile);
      }
    }
  };

  RaceEngine.prototype._buildScenery = function () {
    var mountainMaterial = new THREE.MeshStandardMaterial({
      color: '#78a863',
      map: originalTexture('grass', 1, 1),
      roughness: 0.99,
      metalness: 0,
      flatShading: true,
      side: THREE.DoubleSide
    });
    var mountainSegments = clamp(Math.round(this.trackLength / 18), 84, 128);
    var mountainPositions = [];
    var mountainUvs = [];
    var mountainIndices = [];
    var mountainHalfX = (this.trackBounds.maxX - this.trackBounds.minX) * 0.5;
    var mountainHalfZ = (this.trackBounds.maxZ - this.trackBounds.minZ) * 0.5;
    for (var mountainIndex = 0; mountainIndex <= mountainSegments; mountainIndex += 1) {
      var mountainAngle = mountainIndex / mountainSegments * TAU;
      var mountainCos = Math.cos(mountainAngle);
      var mountainSin = Math.sin(mountainAngle);
      var ridgeWave = Math.sin(mountainIndex * 0.73) * 4.2 + Math.sin(mountainIndex * 0.21) * 5.1;
      var ridgeHeight = 28 + ridgeWave + ((mountainIndex * 7) % 5) * 0.9;
      var nearX = this.trackBounds.centerX + mountainCos * (mountainHalfX + 72);
      var nearZ = this.trackBounds.centerZ + mountainSin * (mountainHalfZ + 72);
      var ridgeX = this.trackBounds.centerX + mountainCos * (mountainHalfX + 126);
      var ridgeZ = this.trackBounds.centerZ + mountainSin * (mountainHalfZ + 126);
      var farX = this.trackBounds.centerX + mountainCos * (mountainHalfX + 184);
      var farZ = this.trackBounds.centerZ + mountainSin * (mountainHalfZ + 184);
      mountainPositions.push(nearX, -0.04, nearZ, ridgeX, ridgeHeight, ridgeZ, farX, 2.2, farZ);
      var mountainU = mountainIndex / 7;
      mountainUvs.push(mountainU, 0, mountainU, 0.56, mountainU, 1);
      if (mountainIndex < mountainSegments) {
        var mountainBase = mountainIndex * 3;
        mountainIndices.push(
          mountainBase, mountainBase + 3, mountainBase + 1,
          mountainBase + 1, mountainBase + 3, mountainBase + 4,
          mountainBase + 1, mountainBase + 4, mountainBase + 2,
          mountainBase + 2, mountainBase + 4, mountainBase + 5
        );
      }
    }
    var mountainGeometry = new THREE.BufferGeometry();
    mountainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(mountainPositions, 3));
    mountainGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(mountainUvs, 2));
    mountainGeometry.setIndex(mountainIndices);
    mountainGeometry.computeVertexNormals();
    var mountains = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountains.name = 'Distant SPA Ridge';
    mountains.receiveShadow = true;
    mountains.castShadow = false;
    this.environmentRoot.add(mountains);

    var broadleafMap = originalTexture('treeBroadleaf', 1, 1);
    var pineMap = originalTexture('treePine', 1, 1);
    [broadleafMap, pineMap].forEach(function (texture) {
      if (!texture) return;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1, 1);
    });
    var treeMaterials = [broadleafMap, pineMap].filter(Boolean).map(function (texture) {
      return new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: texture,
        transparent: true,
        alphaTest: 0.16,
        depthWrite: true,
        roughness: 1,
        side: THREE.DoubleSide
      });
    });
    var treeGeometry = new THREE.PlaneGeometry(6.8, 7.6);
    var treeCount = treeMaterials.length ? clamp(Math.round(this.trackLength / 45), 34, 64) : 0;
    var treeCapacity = treeMaterials.length ? Math.ceil(treeCount / treeMaterials.length) * 2 : 0;
    var treeBatches = treeMaterials.map(function (material, index) {
      var batch = new THREE.InstancedMesh(treeGeometry, material, treeCapacity);
      batch.name = 'Original Track Trees ' + index;
      batch.castShadow = false;
      batch.receiveShadow = false;
      batch.count = 0;
      return batch;
    });
    var treeBatchCounts = treeMaterials.map(function () { return 0; });
    var treeDummy = new THREE.Object3D();
    for (var treeIndex = 0; treeIndex < treeCount; treeIndex += 1) {
      var treeT = modulo((treeIndex + 0.37) / treeCount, 1);
      var treePose = this._trackPose(treeT);
      var treeSide = treeIndex % 2 ? 1 : -1;
      var treeOffset = BARRIER_OFFSET + 18 + (treeIndex % 5) * 6.5;
      var treeScale = 0.78 + (treeIndex % 5) * 0.07;
      var treeHeading = Math.atan2(treePose.tangent.x, treePose.tangent.z);
      var treeMaterialIndex = treeIndex % treeMaterials.length;
      treeDummy.position.copy(treePose.position).addScaledVector(treePose.right, treeSide * treeOffset);
      treeDummy.position.y += 3.8 * treeScale;
      treeDummy.scale.setScalar(treeScale);
      for (var treeFace = 0; treeFace < 2; treeFace += 1) {
        treeDummy.rotation.set(0, treeHeading + treeFace * Math.PI / 2, 0);
        treeDummy.updateMatrix();
        treeBatches[treeMaterialIndex].setMatrixAt(treeBatchCounts[treeMaterialIndex]++, treeDummy.matrix);
      }
    }
    treeBatches.forEach(function (batch, index) {
      batch.count = treeBatchCounts[index];
      batch.instanceMatrix.needsUpdate = true;
      this.environmentRoot.add(batch);
    }, this);
    if (!treeBatches.length) treeGeometry.dispose();

    this._addGrandstand(0.035, 1, 22, '#12ccef');
    this._addGrandstand(0.47, -1, 17, '#ffd400');
    this._addGrandstand(0.72, 1, 15, '#fb4564');

    var bannerData = [
      [0.08, -1, 'FULL SEND', '#ffd400', '#101820'],
      [0.24, 1, 'TURBO CLUB', '#0bd3ee', '#101820'],
      [0.51, -1, 'MINI GP', '#ffffff', '#ec3449'],
      [0.78, 1, 'RACE ON', '#ffd400', '#172531']
    ];
    for (var i = 0; i < bannerData.length; i += 1) {
      this._addBanner.apply(this, bannerData[i]);
    }
  };

  RaceEngine.prototype._addGrandstand = function (t, side, width, accent) {
    var point = this.trackCurve.getPointAt(t);
    var tangent = this.trackCurve.getTangentAt(t).normalize();
    var right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    var stand = new THREE.Group();
    stand.position.copy(point).addScaledVector(right, side * (BARRIER_OFFSET + 8));
    stand.rotation.y = Math.atan2(-side * right.x, -side * right.z);
    var concrete = new THREE.MeshStandardMaterial({ color: '#59656b', roughness: 0.82 });
    var accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.62 });
    for (var row = 0; row < 5; row += 1) {
      var tier = mesh(new THREE.BoxGeometry(width, 0.65, 1.4), concrete, 0, row * 0.65 + 0.35, row * 0.72);
      stand.add(tier);
      for (var seat = 0; seat < Math.floor(width / 1.25); seat += 1) {
        if ((seat + row) % 3 === 0) {
          var chair = mesh(new THREE.BoxGeometry(0.62, 0.55, 0.48), accentMat, -width / 2 + 0.8 + seat * 1.25, row * 0.67 + 0.88, row * 0.72 - 0.18);
          stand.add(chair);
        }
      }
    }
    var crowdMap = originalTexture('crowd', 1, 1);
    if (crowdMap) {
      crowdMap.wrapS = crowdMap.wrapT = THREE.ClampToEdgeWrapping;
      crowdMap.repeat.set(1, 1);
      var crowdMaterial = new THREE.MeshBasicMaterial({ map: crowdMap, side: THREE.DoubleSide });
      var crowd = mesh(new THREE.PlaneGeometry(width * 0.94, 4.25), crowdMaterial, 0, 2.72, 3.5);
      crowd.name = 'Original Grandstand Crowd';
      crowd.castShadow = false;
      stand.add(crowd);
    }
    var roof = mesh(new THREE.BoxGeometry(width + 1.4, 0.22, 3.6), accentMat, 0, 6.35, 2.5);
    roof.rotation.x = -0.1;
    stand.add(roof);
    var postMat = new THREE.MeshStandardMaterial({ color: '#d7e1e4', roughness: 0.45, metalness: 0.5 });
    [-width / 2, width / 2].forEach(function (x) {
      var post = mesh(new THREE.BoxGeometry(0.18, 6.1, 0.18), postMat, x, 3.1, 2.25);
      stand.add(post);
    });
    this.environmentRoot.add(stand);
  };

  RaceEngine.prototype._addBanner = function (t, side, text, color, background) {
    var point = this.trackCurve.getPointAt(t);
    var tangent = this.trackCurve.getTangentAt(t).normalize();
    var right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    var texture = makeCanvasTexture(text, color, background, 512, 128);
    var material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    var banner = mesh(new THREE.PlaneGeometry(7.4, 1.85), material, 0, 0, 0);
    banner.position.copy(point).addScaledVector(right, side * (BARRIER_OFFSET - 1.2));
    banner.position.y += 2.3;
    banner.rotation.y = Math.atan2(-side * right.x, -side * right.z);
    banner.castShadow = false;
    this.environmentRoot.add(banner);
  };

  RaceEngine.prototype._buildStartingGantry = function () {
    var gantryDistance = 34;
    var gantryT = clamp(gantryDistance / Math.max(this.trackLength, 1), 0, 0.2);
    var point = this.trackCurve.getPointAt(gantryT);
    var tangent = this.trackCurve.getTangentAt(gantryT).normalize();
    var right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    var gantry = new THREE.Group();
    gantry.name = 'Start Gantry 34m Ahead';
    gantry.userData.trackDistance = gantryDistance;
    gantry.position.copy(point);
    gantry.rotation.y = Math.atan2(tangent.x, tangent.z);
    var frameMat = new THREE.MeshStandardMaterial({ color: '#19252d', roughness: 0.36, metalness: 0.72 });
    var gantryWidth = ROAD_HALF_WIDTH * 2 + 2;
    [-gantryWidth / 2, gantryWidth / 2].forEach(function (x) {
      gantry.add(mesh(new THREE.BoxGeometry(0.7, 7, 0.7), frameMat, x, 3.5, 0));
    });
    gantry.add(mesh(new THREE.BoxGeometry(gantryWidth, 1.6, 1.2), frameMat, 0, 6.4, 0));
    var signTexture = makeSponsorTexture('APEX FORMULA', '#e10600', '#070707', '#e10600');
    var sign = mesh(new THREE.PlaneGeometry(gantryWidth * 0.7, 1.2), new THREE.MeshBasicMaterial({ map: signTexture, side: THREE.DoubleSide }), 0, 6.42, 0.62);
    sign.rotation.y = Math.PI;
    sign.castShadow = false;
    gantry.add(sign);
    var lightBoard = mesh(new THREE.BoxGeometry(8.6, 1.9, 0.32), new THREE.MeshStandardMaterial({ color: '#030303', roughness: 0.78 }), 0, 5.15, 0.34);
    lightBoard.castShadow = false;
    gantry.add(lightBoard);
    this.startBulbs = [];
    for (var lightRow = 0; lightRow < 2; lightRow += 1) {
      for (var lightColumn = 0; lightColumn < 5; lightColumn += 1) {
        var bulbMat = new THREE.MeshStandardMaterial({ color: '#1e1e1e', emissive: '#080000', emissiveIntensity: 0.2, roughness: 0.25 });
        var bulb = mesh(new THREE.SphereGeometry(0.31, 14, 10), bulbMat, -2.05 + lightColumn * 1.02, 5.5 - lightRow * 0.72, 0.54);
        bulb.castShadow = false;
        bulb.userData.lightColumn = lightColumn;
        gantry.add(bulb);
        this.startBulbs.push(bulb);
      }
    }
    this.environmentRoot.add(gantry);
  };

  RaceEngine.prototype._clearActors = function () {
    while (this.actorRoot.children.length) {
      var child = this.actorRoot.children.pop();
      disposeObject(child);
    }
    this.ai = [];
    this.coinsOnTrack = [];
    this.effects = [];
  };

  RaceEngine.prototype._deriveStats = function (car, upgrades) {
    car = car || {};
    upgrades = upgrades || {};
    var source = car.stats || car;
    var speedStat = clamp(numberOr(source.speed, numberOr(source.topSpeed, 50)), 20, 100);
    var brakeStat = clamp(numberOr(source.brake, numberOr(source.braking, 50)), 20, 100);
    var steerStat = clamp(numberOr(source.steer, numberOr(source.steering, numberOr(source.handling, 50))), 20, 100);
    var engine = clamp(numberOr(upgrades.engine, numberOr(upgrades.speed, 0)), 0, 10);
    var brakes = clamp(numberOr(upgrades.brakes, numberOr(upgrades.brake, numberOr(upgrades.aero, 0))), 0, 10);
    var handling = clamp(numberOr(upgrades.handling, numberOr(upgrades.steer, numberOr(upgrades.tires, 0))), 0, 10);
    var boost = clamp(numberOr(upgrades.boost, 0), 0, 10);
    return {
      maxSpeed: 9 + speedStat * 0.047 + engine * 0.25,
      displayTopSpeed: clamp(numberOr(source.topKph, 184 + speedStat * 1.18), 190, 340),
      acceleration: 4.15 + speedStat * 0.026 + engine * 0.2,
      brakePower: 7.2 + brakeStat * 0.055 + brakes * 0.34,
      steerRate: 0.52 + steerStat * 0.008 + handling * 0.035,
      boostPower: 1.8 + boost * 0.16,
      boostCapacity: 100 + boost * 5
    };
  };

  RaceEngine.prototype.start = function (configuration) {
    configuration = configuration || {};
    this.stop();
    this._clearActors();
    this.finished = false;
    this.paused = false;
    this.cameraMode = 0;
    this.ersMode = 1;
    this.configuration = configuration;
    this.carConfig = configuration.car || {};
    this.stats = this._deriveStats(configuration.car, configuration.upgrades);
    this.challengeTarget = clamp(Math.round(numberOr(configuration.target, 3)), 1, 11);
    this.totalLaps = clamp(Math.round(numberOr(configuration.totalLaps, TOTAL_LAPS)), 1, 9);
    this.duration = clamp(numberOr(configuration.duration, CHALLENGE_TIME), 55, 75);

    var colors = configuration.colors || {};
    var bodyColor = colors.body || colors.bodyColor || this.carConfig.bodyColor || '#11cce8';
    var wingColor = colors.wing || colors.wingColor || this.carConfig.wingColor || '#ffd400';
    var rimColor = colors.rim || colors.rimColor || this.carConfig.rimColor || '#e7f2f3';
    this.playerCar = createCarModel({
      bodyColor: bodyColor,
      wingColor: wingColor,
      rimColor: rimColor,
      number: this.carConfig.number || '07',
      raceNumber: this.carConfig.raceNumber || '26',
      modelStyle: this.carConfig.modelStyle,
      name: this.carConfig.name || 'Comet',
      scale: 0.92
    });
    this.actorRoot.add(this.playerCar);

    var startSample = this._trackPose(0);
    this.playerPosition = startSample.position.clone();
    this.playerPosition.y += 0.13;
    this.playerHeading = Math.atan2(startSample.tangent.x, startSample.tangent.z);
    this.playerSpeed = 0;
    this.driveState = { speed: 0, heading: this.playerHeading, motionHeading: this.playerHeading, reverseHold: 0, driftAmount: 0, drifting: false };
    this.driftSmokeClock = 0;
    this.playerProgress = 0;
    this.playerRawT = 0;
    this.playerLateral = 0;
    this.lap = 1;
    this.nextCheckpointDistance = this.trackLength * 0.25;
    this.nextCheckpointIndex = 1;
    this.overtakes = 0;
    this.coins = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboTimer = 0;
    this.boost = this.stats.boostCapacity;
    this.raceTime = 0;
    this.countdownClock = 0;
    this.raceActive = false;
    this.collisionCooldown = 0;
    this.distanceTravelled = 0;
    this.lastPosition = 12;
    this._greenSent = false;
    this._lastCountdown = null;
    Object.keys(this.controls).forEach(function (key) { this.controls[key] = false; }, this);

    this._createOpponents();
    this._createCoins();
    this._positionPlayerVisual();
    this._snapCamera();
    this._updateStartLights();
    this._emitHud(true);

    this.accumulator = 0;
    this.previousTime = performance.now();
    this.running = true;
    this._emitMessage('countdown', 'Get ready!', { countdown: 3 });
    this._loop(this.previousTime);
    return this;
  };

  RaceEngine.prototype._createOpponents = function () {
    var palette = [
      ['#ff5b45', '#ffe45b'], ['#7949db', '#25d1df'], ['#58a43e', '#f6f2de'],
      ['#e34a75', '#151a21'], ['#285faa', '#e8f2ee'], ['#f5923b', '#1b2125'],
      ['#ec3848', '#f4f5f2'], ['#00a981', '#ffe13f'], ['#6884ff', '#151927'],
      ['#e6c338', '#11181e'], ['#b14ec7', '#52ddce']
    ];
    for (var i = 0; i < 11; i += 1) {
      var colors = palette[i % palette.length];
      var car = createCarModel({
        bodyColor: colors[0],
        wingColor: colors[1],
        rimColor: '#dce6e8',
        number: String(i + 1).padStart(2, '0'),
        name: 'Rival ' + (i + 1),
        detail: 'rival',
        identity: false,
        scale: 0.88
      });
      var distanceAhead = 7.5 + i * 6.3;
      var rival = {
        mesh: car,
        progress: distanceAhead,
        speed: 7.0 + (i % 5) * 0.38 + i * 0.07,
        baseSpeed: 7.0 + (i % 5) * 0.38 + i * 0.07,
        lateral: ((i % 3) - 1) * 2.05 + (i % 2 ? 0.42 : -0.42),
        phase: i * 0.83,
        overtaken: false,
        hitCooldown: 0
      };
      this.ai.push(rival);
      this.actorRoot.add(car);
      this._positionOpponent(rival, 0);
    }
  };

  RaceEngine.prototype._createCoins = function () {
    var pickupFactory = window.MiniGPCryptoPickups && window.MiniGPCryptoPickups.create;
    var fallbackGeometry = pickupFactory ? null : new THREE.CylinderGeometry(0.46, 0.46, 0.12, 24);
    var fallbackMaterial = pickupFactory ? null : new THREE.MeshStandardMaterial({
      color: '#ffd20a', emissive: '#ff9f00', emissiveIntensity: 0.42, roughness: 0.3, metalness: 0.72
    });
    for (var i = 0; i < 28; i += 1) {
      var t = modulo(0.025 + i / 28, 1);
      var lane = ((i % 3) - 1) * 2.25;
      var pose = this._trackPose(t);
      var coin = pickupFactory ? pickupFactory(i) : new THREE.Mesh(fallbackGeometry, fallbackMaterial);
      if (!pickupFactory) {
        coin.rotation.x = Math.PI / 2;
        coin.userData.tokenSymbol = 'COIN';
        coin.userData.tokenColor = '#ffd20a';
      }
      coin.position.copy(pose.position).addScaledVector(pose.right, lane);
      coin.position.y += 1.0;
      coin.rotation.y = Math.atan2(pose.tangent.x, pose.tangent.z);
      coin.userData.baseY = coin.position.y;
      coin.userData.trackT = t;
      coin.userData.lane = lane;
      coin.userData.respawn = 0;
      coin.userData.phase = i * 0.63;
      this.coinsOnTrack.push(coin);
      this.actorRoot.add(coin);
    }
  };

  RaceEngine.prototype._trackPose = function (t) {
    t = modulo(t, 1);
    var position = this.trackCurve.getPointAt(t);
    var tangent = this.trackCurve.getTangentAt(t).normalize();
    var right = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
    return { position: position, tangent: tangent, right: right, t: t };
  };

  RaceEngine.prototype._nearestTrack = function (worldPosition) {
    var bestIndex = 0;
    var bestDistance = Infinity;
    for (var i = 0; i < this.trackSamples.length; i += 1) {
      var p = this.trackSamples[i].position;
      var dx = worldPosition.x - p.x;
      var dz = worldPosition.z - p.z;
      var distance = dx * dx + dz * dz;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    var sample = this.trackSamples[bestIndex];
    var offsetX = worldPosition.x - sample.position.x;
    var offsetZ = worldPosition.z - sample.position.z;
    return {
      index: bestIndex,
      t: bestIndex / this.trackSamples.length,
      position: sample.position,
      tangent: sample.tangent,
      right: sample.right,
      lateral: offsetX * sample.right.x + offsetZ * sample.right.z,
      distanceSquared: bestDistance
    };
  };

  RaceEngine.prototype.setControl = function (name, pressed) {
    if (Object.prototype.hasOwnProperty.call(this.controls, name)) {
      this.controls[name] = Boolean(pressed);
    }
  };

  RaceEngine.prototype.setPaused = function (paused) {
    this.paused = Boolean(paused);
    this.accumulator = 0;
    this.previousTime = performance.now();
    if (this.stats) this._emitHud(true);
    return this;
  };

  RaceEngine.prototype.cycleCamera = function () {
    var labels = ['追逐视角', 'T-CAM', '座舱视角'];
    this.cameraMode = (this.cameraMode + 1) % labels.length;
    if (this.playerCar) this._emitMessage('camera', labels[this.cameraMode], { cameraMode: this.cameraMode });
    return labels[this.cameraMode];
  };

  RaceEngine.prototype.cycleErsMode = function () {
    var labels = ['回收', '均衡', '进攻'];
    this.ersMode = (this.ersMode + 1) % labels.length;
    if (this.playerCar) this._emitMessage('ers', 'ERS · ' + labels[this.ersMode], { ersMode: this.ersMode });
    return labels[this.ersMode];
  };

  RaceEngine.prototype._loop = function (time) {
    if (!this.running) return;
    var self = this;
    this.raf = requestAnimationFrame(function (nextTime) { self._loop(nextTime); });
    var frameDt = clamp((time - this.previousTime) / 1000, 0, 0.1);
    this.previousTime = time;
    if (this.paused) {
      this.accumulator = 0;
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.accumulator += frameDt;
    var steps = 0;
    while (this.accumulator >= FIXED_STEP && steps < 6) {
      this._fixedUpdate(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (steps === 6) this.accumulator = 0;
    this._renderUpdate(frameDt);
    this.renderer.render(this.scene, this.camera);
    this._samplePerformance(frameDt);
  };

  RaceEngine.prototype._fixedUpdate = function (dt) {
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
    if (!this.raceActive) {
      this.countdownClock += dt;
      this._updateStartLights();
      var countdown = this._countdownValue();
      if (countdown !== this._lastCountdown) {
        this._lastCountdown = countdown;
        if (countdown && countdown !== 'GO!') this._emitMessage('countdown', String(countdown), { countdown: countdown });
      }
      if (this.countdownClock >= 3.25) {
        this.raceActive = true;
        if (!this._greenSent) {
          this._greenSent = true;
          this._emitMessage('start', 'GO!', { countdown: 'GO!' });
        }
      }
      this._emitHud(false, dt);
      return;
    }

    if (this.countdownClock < 5) this.countdownClock += dt;
    var oldProgress = this.playerProgress;
    this.raceTime += dt;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0 && this.combo > 0) {
      this.combo = 0;
      this.comboTimer = 0;
      this._emitMessage('combo', 'Combo reset', { combo: this.combo });
    }

    var nearestBefore = this._nearestTrack(this.playerPosition);
    var offRoad = Math.abs(nearestBefore.lateral) > ROAD_HALF_WIDTH - 0.45;
    var desiredTrackHeading = Math.atan2(nearestBefore.tangent.x, nearestBefore.tangent.z);
    this.driveState.speed = this.playerSpeed;
    this.driveState.heading = this.playerHeading;
    this.driveState.boost = this.boost;
    this.driveState.ersMode = this.ersMode;
    window.MiniGPDriverPhysics.step(this.driveState, this.controls, this.stats, {
      offRoad: offRoad, onGrass: Math.abs(nearestBefore.lateral) > ROAD_HALF_WIDTH + .5, trackHeading: desiredTrackHeading
    }, dt);
    this.playerSpeed = this.driveState.speed;
    this.playerHeading = this.driveState.heading;
    this.boost = this.driveState.boost;
    this.playerPosition.x += this.driveState.dx;
    this.playerPosition.z += this.driveState.dz;
    this.distanceTravelled += Math.abs(this.playerSpeed) * dt;
    this._updateDriftEffects(dt);

    var nearest = this._nearestTrack(this.playerPosition);
    this.playerLateral = nearest.lateral;
    this.playerPosition.y = damp(this.playerPosition.y, nearest.position.y + 0.14, 14, dt);
    var rawT = nearest.t;
    var rawDelta = rawT - this.playerRawT;
    if (rawDelta > 0.5) rawDelta -= 1;
    if (rawDelta < -0.5) rawDelta += 1;
    this.playerProgress += rawDelta * this.trackLength;
    this.playerRawT = rawT;

    if (Math.abs(nearest.lateral) > BARRIER_LIMIT) {
      var side = Math.sign(nearest.lateral) || 1;
      this.playerPosition.copy(nearest.position).addScaledVector(nearest.right, side * (BARRIER_LIMIT - 0.75));
      this.playerPosition.y += 0.14;
      this.playerSpeed *= 0.45;
      this.playerHeading += angleDelta(desiredTrackHeading, this.playerHeading) * 0.72;
      this.driveState.motionHeading = this.playerHeading;
      if (this.collisionCooldown <= 0) {
        this.collisionCooldown = 0.8;
        this._emitMessage('collision', 'Barrier hit — keep it tidy!', { speed: this.playerSpeed });
        this._burst(this.playerPosition, '#f6db8b', 8);
      }
    }

    this._processCheckpoints(oldProgress, this.playerProgress);
    this._updateOpponents(dt);
    this._updateCoins(dt);
    this._checkCarCollisions();
    this._checkOvertakes();
    this._emitHud(false, dt);

    if (this.raceTime >= this.duration) {
      this._finish('time');
    }
  };

  RaceEngine.prototype._processCheckpoints = function (oldProgress, newProgress) {
    if (newProgress <= oldProgress || newProgress < this.nextCheckpointDistance) return;
    while (newProgress >= this.nextCheckpointDistance && !this.finished) {
      if (this.nextCheckpointIndex < 4) {
        this._emitMessage('checkpoint', 'Checkpoint ' + this.nextCheckpointIndex + '/3', { checkpoint: this.nextCheckpointIndex });
        this.nextCheckpointIndex += 1;
        this.nextCheckpointDistance += this.trackLength * 0.25;
      } else {
        var completedLap = this.lap;
        this.lap += 1;
        this._emitMessage('lap', 'Lap ' + completedLap + ' complete!', { lap: completedLap });
        this._burst(this.playerPosition, '#ffd400', 20);
        if (completedLap >= this.totalLaps) {
          this.lap = this.totalLaps;
          this._finish('laps');
          return;
        }
        this.nextCheckpointIndex = 1;
        this.nextCheckpointDistance += this.trackLength * 0.25;
      }
    }
  };

  RaceEngine.prototype._updateOpponents = function (dt) {
    for (var i = 0; i < this.ai.length; i += 1) {
      var rival = this.ai[i];
      rival.hitCooldown = Math.max(0, rival.hitCooldown - dt);
      var catchup = clamp((this.playerProgress - rival.progress) / 110, -0.65, 0.8);
      var desired = rival.baseSpeed + catchup * 0.72 + Math.sin(this.raceTime * 0.35 + rival.phase) * 0.18;
      rival.speed = damp(rival.speed, desired, 1.6, dt);
      rival.progress += rival.speed * dt;
      this._positionOpponent(rival, dt);
    }
  };

  RaceEngine.prototype._positionOpponent = function (rival, dt) {
    var t = modulo(rival.progress / this.trackLength, 1);
    var pose = this._trackPose(t);
    var laneMotion = Math.sin(rival.progress * 0.012 + rival.phase) * 0.32;
    rival.mesh.position.copy(pose.position).addScaledVector(pose.right, rival.lateral + laneMotion);
    rival.mesh.position.y += 0.14;
    rival.mesh.rotation.y = Math.atan2(pose.tangent.x, pose.tangent.z);
    if (dt > 0 && rival.mesh.userData.wheels) {
      for (var w = 0; w < rival.mesh.userData.wheels.length; w += 1) {
        rival.mesh.userData.wheels[w].rotation.x -= rival.speed * dt / 0.44;
      }
    }
  };

  RaceEngine.prototype._checkCarCollisions = function () {
    if (this.collisionCooldown > 0) return;
    for (var i = 0; i < this.ai.length; i += 1) {
      var rival = this.ai[i];
      var dx = this.playerPosition.x - rival.mesh.position.x;
      var dz = this.playerPosition.z - rival.mesh.position.z;
      if (dx * dx + dz * dz < 4.3 && Math.abs(this.playerPosition.y - rival.mesh.position.y) < 1.2) {
        this.playerSpeed *= 0.62;
        var nearest = this._nearestTrack(this.playerPosition);
        var push = Math.sign(nearest.lateral - rival.lateral) || (i % 2 ? 1 : -1);
        this.playerPosition.addScaledVector(nearest.right, push * 0.6);
        this.collisionCooldown = 0.7;
        rival.hitCooldown = 0.7;
        this._emitMessage('collision', 'Wheel-to-wheel contact!', { rival: i + 1 });
        this._burst(this.playerPosition, '#ff7e47', 10);
        break;
      }
    }
  };

  RaceEngine.prototype._checkOvertakes = function () {
    for (var i = 0; i < this.ai.length; i += 1) {
      var rival = this.ai[i];
      if (!rival.overtaken && this.playerProgress > rival.progress + 1.8) {
        rival.overtaken = true;
        this.overtakes += 1;
        this.combo = clamp(this.combo + 1, 1, 8);
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        this.comboTimer = 5.5;
        var reward = 16 * this.combo;
        this.coins += reward;
        this.boost = Math.min(this.stats.boostCapacity, this.boost + 12);
        this._emitMessage('overtake', 'OVERTAKE!  +' + reward + ' coins', {
          overtakes: this.overtakes, coins: reward, combo: this.combo
        });
        this._burst(this.playerPosition, '#28e5ff', 18);
      }
    }
  };

  RaceEngine.prototype._updateCoins = function (dt) {
    for (var i = 0; i < this.coinsOnTrack.length; i += 1) {
      var coin = this.coinsOnTrack[i];
      if (coin.userData.respawn > 0) {
        coin.userData.respawn -= dt;
        if (coin.userData.respawn <= 0) {
          coin.visible = true;
          coin.scale.setScalar(1);
        }
        continue;
      }
      coin.rotation.y += dt * 1.7;
      coin.position.y = coin.userData.baseY + Math.sin(this.raceTime * 3 + coin.userData.phase) * .14;
      var dx = this.playerPosition.x - coin.position.x;
      var dz = this.playerPosition.z - coin.position.z;
      if (dx * dx + dz * dz < 2.1) {
        coin.visible = false;
        coin.userData.respawn = 9;
        this.combo = clamp(this.combo + 1, 1, 8);
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        this.comboTimer = 4.5;
        var reward = 3 * this.combo;
        this.coins += reward;
        this.boost = Math.min(this.stats.boostCapacity, this.boost + 7);
        this._emitMessage('coin', coin.userData.tokenSymbol + '  +' + reward + ' 赛车币', {
          coins: reward, combo: this.combo, tokenSymbol: coin.userData.tokenSymbol
        });
        this._burst(coin.position, coin.userData.tokenColor, 12);
      }
    }
  };

  RaceEngine.prototype._burst = function (position, color, count) {
    var positions = new Float32Array(count * 3);
    var velocities = [];
    for (var i = 0; i < count; i += 1) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y + 0.8;
      positions[i * 3 + 2] = position.z;
      var angle = i * 2.39996;
      velocities.push(new THREE.Vector3(Math.cos(angle) * (1.5 + (i % 4)), 2 + (i % 5) * 0.42, Math.sin(angle) * (1.5 + (i % 4))));
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var material = new THREE.PointsMaterial({ color: color, size: 0.32, transparent: true, opacity: 1, depthWrite: false });
    var points = new THREE.Points(geometry, material);
    this.actorRoot.add(points);
    this.effects.push({ points: points, velocities: velocities, life: 0.85, maxLife: 0.85 });
  };

  RaceEngine.prototype._updateDriftEffects = function (dt) {
    if (!this.driveState.drifting || Math.abs(this.driveState.slipAngle) < .09) {
      this.driftSmokeClock = 0;
      return;
    }
    this.driftSmokeClock -= dt;
    if (this.driftSmokeClock > 0) return;
    this.driftSmokeClock = .1;
    if (!this.smokeTexture) {
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      var context = canvas.getContext('2d');
      var fade = context.createRadialGradient(32, 32, 3, 32, 32, 31);
      fade.addColorStop(0, 'rgba(255,255,255,.7)');
      fade.addColorStop(.45, 'rgba(255,255,255,.35)');
      fade.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = fade;
      context.fillRect(0, 0, 64, 64);
      this.smokeTexture = new THREE.CanvasTexture(canvas);
      this.smokeTexture.userData.originalAssetShared = true;
    }
    var forwardX = Math.sin(this.playerHeading);
    var forwardZ = Math.cos(this.playerHeading);
    var positions = [];
    var velocities = [];
    [-1, 1].forEach(function (side) {
      positions.push(this.playerPosition.x - forwardX * 1.5 + forwardZ * side * .8,
        this.playerPosition.y + .2, this.playerPosition.z - forwardZ * 1.5 - forwardX * side * .8);
      velocities.push(new THREE.Vector3(-forwardX * .5 + forwardZ * side * .2, .55, -forwardZ * .5 - forwardX * side * .2));
    }, this);
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    var points = new THREE.Points(geometry, new THREE.PointsMaterial({
      map: this.smokeTexture, color: '#cbd3d7', size: .8, transparent: true,
      opacity: .6, depthWrite: false, sizeAttenuation: true
    }));
    this.actorRoot.add(points);
    this.effects.push({ points: points, velocities: velocities, life: .8, maxLife: .8, smoke: true });
  };

  RaceEngine.prototype._renderUpdate = function (dt) {
    if (!this.playerCar) return;
    this._positionPlayerVisual(dt);
    this._updateCamera(dt);
    for (var i = this.effects.length - 1; i >= 0; i -= 1) {
      var effect = this.effects[i];
      effect.life -= dt;
      var array = effect.points.geometry.attributes.position.array;
      for (var p = 0; p < effect.velocities.length; p += 1) {
        var velocity = effect.velocities[p];
        if (!effect.smoke) velocity.y -= 7 * dt;
        array[p * 3] += velocity.x * dt;
        array[p * 3 + 1] += velocity.y * dt;
        array[p * 3 + 2] += velocity.z * dt;
      }
      effect.points.geometry.attributes.position.needsUpdate = true;
      effect.points.material.opacity = clamp(effect.life / effect.maxLife, 0, 1) * (effect.smoke ? .6 : 1);
      if (effect.smoke) effect.points.material.size += dt * 1.6;
      if (effect.life <= 0) {
        this.actorRoot.remove(effect.points);
        disposeObject(effect.points);
        this.effects.splice(i, 1);
      }
    }
  };

  RaceEngine.prototype._positionPlayerVisual = function (dt) {
    if (!this.playerCar) return;
    this.playerCar.position.copy(this.playerPosition);
    this.playerCar.rotation.y = this.playerHeading;
    var steer = (this.controls.right ? 1 : 0) - (this.controls.left ? 1 : 0);
    this.playerCar.rotation.z = -steer * clamp(this.playerSpeed / 30, 0, 1) * 0.035;
    if (dt && this.playerCar.userData.wheels) {
      for (var i = 0; i < this.playerCar.userData.wheels.length; i += 1) {
        this.playerCar.userData.wheels[i].rotation.x -= this.playerSpeed * dt / 0.43;
      }
      for (var f = 0; f < this.playerCar.userData.frontWheels.length; f += 1) {
        this.playerCar.userData.frontWheels[f].rotation.y = steer * 0.26;
      }
    }
  };

  RaceEngine.prototype._snapCamera = function () {
    var forward = new THREE.Vector3(Math.sin(this.playerHeading), 0, Math.cos(this.playerHeading));
    var cameraSpeed = clamp(this.playerSpeed, 0, 90);
    var cameraBack = 7.05 + cameraSpeed * 0.003;
    var cameraHeight = 1.82 + cameraSpeed * 0.0015;
    var cameraLook = 9.5;
    var lookPose = this._trackPose(this.playerRawT + cameraLook / Math.max(this.trackLength, 1));
    this.camera.position.copy(this.playerPosition).addScaledVector(forward, -cameraBack);
    this.camera.position.y = this.playerPosition.y - 0.14 + cameraHeight;
    this.cameraTarget.copy(this.playerPosition)
      .addScaledVector(forward, cameraLook * 0.72)
      .addScaledVector(lookPose.tangent, cameraLook * 0.28);
    this.cameraTarget.y = lookPose.position.y + 0.75;
    this.camera.lookAt(this.cameraTarget);
    this.camera.fov = 64 + cameraSpeed * 0.014;
    this.camera.updateProjectionMatrix();
  };

  RaceEngine.prototype._updateCamera = function (dt) {
    var forward = this._tempV.set(Math.sin(this.playerHeading), 0, Math.cos(this.playerHeading));
    var side = this._tempV2.set(forward.z, 0, -forward.x);
    var speedRatio = clamp(this.playerSpeed / Math.max(this.stats.maxSpeed, 1), 0, 1);
    var steer = (this.controls.right ? 1 : 0) - (this.controls.left ? 1 : 0);
    var desired;
    var target;
    var desiredFov;
    if (this.cameraMode === 1) {
      desired = this.playerPosition.clone().addScaledVector(forward, -1.65).addScaledVector(side, -steer * 0.18);
      desired.y += 2.35;
      target = this.playerPosition.clone().addScaledVector(forward, 9.2 + speedRatio * 2.5);
      target.y += 0.85;
      desiredFov = 66 + speedRatio * 6;
    } else if (this.cameraMode === 2) {
      desired = this.playerPosition.clone().addScaledVector(forward, 0.12);
      desired.y += 1.52;
      target = this.playerPosition.clone().addScaledVector(forward, 13 + speedRatio * 3);
      target.y += 1.02;
      desiredFov = 70 + speedRatio * 7;
    } else {
      var cameraSpeed = clamp(this.playerSpeed, 0, 90);
      var cameraBack = 7.05 + cameraSpeed * 0.003;
      var cameraHeight = 1.82 + cameraSpeed * 0.0015;
      var cameraLook = 9.5;
      var lookPose = this._trackPose(this.playerRawT + cameraLook / Math.max(this.trackLength, 1));
      desired = this.playerPosition.clone().addScaledVector(forward, -cameraBack);
      desired.y = this.playerPosition.y - 0.14 + cameraHeight;
      target = this.playerPosition.clone()
        .addScaledVector(forward, cameraLook * 0.72)
        .addScaledVector(lookPose.tangent, cameraLook * 0.28);
      target.y = lookPose.position.y + 0.75;
      desiredFov = 64 + cameraSpeed * 0.014;
    }
    var chaseCamera = this.cameraMode === 0;
    this.camera.position.lerp(desired, chaseCamera ? Math.min(1, 5.5 * dt) : 1 - Math.exp(-5.5 * dt));
    this.cameraTarget.lerp(target, chaseCamera ? Math.min(1, 9.5 * dt) : 1 - Math.exp(-7.5 * dt));
    this.camera.lookAt(this.cameraTarget);
    this.camera.fov = chaseCamera
      ? this.camera.fov + (desiredFov - this.camera.fov) * Math.min(1, 4 * dt)
      : damp(this.camera.fov, desiredFov, 3.2, dt);
    this.camera.updateProjectionMatrix();
    if (this.sunLight) {
      this.sunLight.position.set(this.playerPosition.x - 35, this.playerPosition.y + 62, this.playerPosition.z - 24);
      this.sunLight.target.position.set(this.playerPosition.x, this.playerPosition.y, this.playerPosition.z);
    }
  };

  RaceEngine.prototype._position = function () {
    var position = 1;
    for (var i = 0; i < this.ai.length; i += 1) {
      if (this.ai[i].progress > this.playerProgress) position += 1;
    }
    return clamp(position, 1, 12);
  };

  RaceEngine.prototype._gear = function () {
    if (this.playerSpeed < -.1) return 'R';
    if (this.playerSpeed < 0.6) return 'N';
    return clamp(Math.floor(this.playerSpeed / Math.max(this.stats.maxSpeed / 6, 1)) + 1, 1, 6);
  };

  RaceEngine.prototype._countdownValue = function () {
    if (this.raceActive) return this.countdownClock < 4.15 ? 0 : null;
    if (this.countdownClock < 1) return 3;
    if (this.countdownClock < 2) return 2;
    if (this.countdownClock < 3.25) return 1;
    return 0;
  };

  RaceEngine.prototype._emitHud = function (force, dt) {
    this.hudAccumulator += dt || 0;
    if (!force && this.hudAccumulator < 0.075) return;
    this.hudAccumulator = 0;
    var hud = {
      position: this._position(),
      lap: this.lap,
      totalLaps: this.totalLaps,
      speed: Math.round(Math.abs(this.playerSpeed) / Math.max(this.stats.maxSpeed, 0.1) * this.stats.displayTopSpeed),
      reversing: this.playerSpeed < -.1,
      drifting: !!(this.driveState && this.driveState.drifting),
      gear: this._gear(),
      time: Math.max(0, this.duration - this.raceTime),
      overtakes: this.overtakes,
      target: this.challengeTarget,
      coins: this.coins,
      combo: this.combo,
      boost: clamp(this.boost / this.stats.boostCapacity, 0, 1),
      ersMode: ['回收', '均衡', '进攻'][this.ersMode],
      cameraMode: this.cameraMode,
      duration: this.duration,
      throttle: this.controls.throttle ? 1 : 0,
      brake: this.controls.brake ? 1 : 0,
      countdown: this._countdownValue(),
      startLightColumns: Math.min(5, Math.floor(this.countdownClock / 0.68) + 1),
      startLightsOut: this.raceActive || this.countdownClock >= 3.25,
      startLightsVisible: this.countdownClock < 4.35,
      paused: this.paused,
      offRoad: Math.abs(this.playerLateral) > ROAD_HALF_WIDTH - 0.45,
      trackName: this.trackName
    };
    try { this.onHud(hud); } catch (error) { console.error('RaceEngine onHud callback failed', error); }
  };

  RaceEngine.prototype._emitMessage = function (type, text, data) {
    var payload = Object.assign({ type: type, text: text, at: this.raceTime || 0 }, data || {});
    try { this.onMessage(text, payload); } catch (error) { console.error('RaceEngine onMessage callback failed', error); }
    try {
      this.canvas.dispatchEvent(new CustomEvent('raceengine:event', { detail: payload }));
    } catch (error) {}
  };

  RaceEngine.prototype._updateStartLights = function () {
    if (!this.startBulbs) return;
    for (var i = 0; i < this.startBulbs.length; i += 1) {
      var column = this.startBulbs[i].userData.lightColumn || 0;
      var active = this.countdownClock >= column * 0.68 && this.countdownClock < 3.25;
      var material = this.startBulbs[i].material;
      if (active && column < 5) {
        material.color.set('#ff243b');
        material.emissive.set('#ff092b');
        material.emissiveIntensity = 3;
      } else {
        material.color.set('#350a10');
        material.emissive.set('#140003');
        material.emissiveIntensity = 0.3;
      }
    }
  };

  RaceEngine.prototype._finish = function (reason) {
    if (this.finished) return;
    this.finished = true;
    var summary = {
      reason: reason,
      success: this.overtakes >= this.challengeTarget,
      position: this._position(),
      lap: this.lap,
      totalLaps: this.totalLaps,
      elapsed: Math.min(this.raceTime, this.duration),
      timeRemaining: Math.max(0, this.duration - this.raceTime),
      overtakes: this.overtakes,
      target: this.challengeTarget,
      coins: this.coins,
      duration: this.duration,
      combo: this.bestCombo,
      bestCombo: this.bestCombo,
      distance: Math.round(this.distanceTravelled),
      car: this.carConfig.name || 'Comet',
      trackName: this.trackName
    };
    this._emitMessage(summary.success ? 'reward' : 'finish', summary.success ? 'CHALLENGE COMPLETE!' : 'TIME UP!', summary);
    this._emitHud(true);
    this.stop();
    try { this.onFinish(summary); } catch (error) { console.error('RaceEngine onFinish callback failed', error); }
  };

  RaceEngine.prototype._samplePerformance = function (dt) {
    if (dt <= 0) return;
    this.frameCounter += 1;
    this.frameSamples.push(Math.min(dt, 0.25));
    if (this.frameSamples.length > 90) this.frameSamples.shift();
    if (this.frameCounter % 30 !== 0 || this.frameSamples.length < 15) return;
    var average = this.frameSamples.reduce(function (sum, value) { return sum + value; }, 0) / this.frameSamples.length;
    if (average > 0.027 && this.pixelRatio > 0.78) {
      this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.18);
      this.renderer.setPixelRatio(this.pixelRatio);
      if (average > 0.034) this.renderer.shadowMap.enabled = false;
      this.resize();
    } else if (average < 0.0175 && this.pixelRatio < this.maxPixelRatio) {
      this.pixelRatio = Math.min(this.maxPixelRatio, this.pixelRatio + 0.08);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.resize();
    }
  };

  RaceEngine.prototype.resize = function () {
    if (!this.renderer || !this.camera) return;
    var rect = this.canvas.getBoundingClientRect();
    var width = Math.max(1, Math.round(rect.width || this.canvas.clientWidth || window.innerWidth || 800));
    var height = Math.max(1, Math.round(rect.height || this.canvas.clientHeight || window.innerHeight || 600));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  RaceEngine.prototype.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    return this;
  };

  RaceEngine.prototype.dispose = function () {
    this.stop();
    window.removeEventListener('resize', this._boundResize);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    disposeObject(this.scene);
    if (this.smokeTexture) this.smokeTexture.dispose();
    this.renderer.dispose();
    this.playerCar = null;
    this.ai = [];
    this.coinsOnTrack = [];
    this.effects = [];
  };

  window.RaceEngine = RaceEngine;
})();
