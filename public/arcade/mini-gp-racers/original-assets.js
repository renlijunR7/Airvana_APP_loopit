(function (root) {
  'use strict';

  var THREE = root.THREE;
  var MODEL_URL = 'assets/original/f1car-2026.glb';
  var TEXTURE_URLS = {
    asphalt: 'assets/original/asphalt.png',
    grass: 'assets/original/grass.png',
    gravel: 'assets/original/gravel.png',
    crowd: 'assets/original/crowd.png',
    facadeDay: 'assets/original/facade-day.png',
    facadeNight: 'assets/original/facade-night.png',
    treeBroadleaf: 'assets/original/tree-broadleaf.png',
    treePine: 'assets/original/tree-pine.png',
    treePalm: 'assets/original/tree-palm.png',
    scrub: 'assets/original/scrub.png'
  };

  var template = null;
  var rivalTemplate = null;
  var textures = {};
  var loading = null;
  var carbonWeaveTexture = null;
  var tyreBumpTexture = null;

  function paintLuminance(color) {
    return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  }

  function clampedPaintColor(color) {
    if (Math.min(color.r, color.g, color.b) <= 0.55) return color.clone();
    var luminance = paintLuminance(color);
    return luminance <= 0.62 ? color.clone() : color.clone().multiplyScalar(0.62 / luminance);
  }

  function paintEmissiveFactor(color) {
    return 0.018 * (1 - THREE.MathUtils.clamp((paintLuminance(color) - 0.55) / 0.35, 0, 1));
  }

  function carbonWeave() {
    if (carbonWeaveTexture) return carbonWeaveTexture;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    var context = canvas.getContext('2d');
    context.fillStyle = '#565b65';
    context.fillRect(0, 0, 64, 64);
    for (var n = -64; n < 128; n += 8) {
      for (var a = -64; a < 128; a += 16) {
        context.fillStyle = 'rgba(18,20,25,0.46)';
        context.fillRect(a + n, n, 9, 3);
        context.fillStyle = 'rgba(214,220,232,0.12)';
        context.fillRect(a - n, n + 4, 9, 2);
      }
    }
    carbonWeaveTexture = new THREE.CanvasTexture(canvas);
    carbonWeaveTexture.name = 'carbonWeave';
    carbonWeaveTexture.colorSpace = THREE.SRGBColorSpace;
    carbonWeaveTexture.anisotropy = 4;
    carbonWeaveTexture.wrapS = carbonWeaveTexture.wrapT = THREE.RepeatWrapping;
    carbonWeaveTexture.repeat.set(9, 9);
    carbonWeaveTexture.userData.originalAssetShared = true;
    return carbonWeaveTexture;
  }

  function tyreBump() {
    if (tyreBumpTexture) return tyreBumpTexture;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    var context = canvas.getContext('2d');
    context.fillStyle = '#808080';
    context.fillRect(0, 0, 128, 128);
    var seed = 1234567;
    function random() {
      seed = (seed * 1103515245 + 12345) & 2147483647;
      return seed / 2147483647;
    }
    for (var i = 0; i < 2600; i += 1) {
      var shade = Math.floor(104 + random() * 48);
      context.fillStyle = 'rgb(' + shade + ',' + shade + ',' + shade + ')';
      context.fillRect(Math.floor(random() * 128), Math.floor(random() * 128), Math.floor(1 + random() * 2), 1);
    }
    tyreBumpTexture = new THREE.CanvasTexture(canvas);
    tyreBumpTexture.name = 'tyreBump';
    tyreBumpTexture.wrapS = tyreBumpTexture.wrapT = THREE.RepeatWrapping;
    tyreBumpTexture.repeat.set(6, 2);
    tyreBumpTexture.userData.originalAssetShared = true;
    return tyreBumpTexture;
  }

  function componentArray(componentType, buffer, offset, count) {
    if (componentType === 5126) return new Float32Array(buffer, offset, count);
    if (componentType === 5125) return new Uint32Array(buffer, offset, count);
    if (componentType === 5123) return new Uint16Array(buffer, offset, count);
    if (componentType === 5121) return new Uint8Array(buffer, offset, count);
    throw new Error('Unsupported glTF component type: ' + componentType);
  }

  function itemSize(type) {
    return { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type] || 1;
  }

  function parseGlb(arrayBuffer) {
    var view = new DataView(arrayBuffer);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
      throw new Error('The original car model is not a valid glTF 2.0 binary.');
    }

    var offset = 12;
    var json = null;
    var binaryOffset = 0;
    while (offset < arrayBuffer.byteLength) {
      var length = view.getUint32(offset, true);
      var type = view.getUint32(offset + 4, true);
      offset += 8;
      if (type === 0x4e4f534a) {
        json = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, offset, length)));
      } else if (type === 0x004e4942) {
        binaryOffset = offset;
      }
      offset += length;
    }
    if (!json || !binaryOffset) throw new Error('Original car GLB is incomplete.');

    function attribute(accessorIndex) {
      var accessor = json.accessors[accessorIndex];
      var bufferView = json.bufferViews[accessor.bufferView];
      var size = itemSize(accessor.type);
      var start = binaryOffset + (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
      var values = componentArray(accessor.componentType, arrayBuffer, start, accessor.count * size);
      return new THREE.BufferAttribute(values, size, !!accessor.normalized);
    }

    var materials = (json.materials || []).map(function (source) {
      var pbr = source.pbrMetallicRoughness || {};
      var base = pbr.baseColorFactor || [1, 1, 1, 1];
      var emissive = source.emissiveFactor || [0, 0, 0];
      var strength = source.extensions && source.extensions.KHR_materials_emissive_strength
        ? source.extensions.KHR_materials_emissive_strength.emissiveStrength || 1
        : 1;
      var material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(base[0], base[1], base[2]),
        opacity: base[3],
        transparent: base[3] < 1,
        metalness: pbr.metallicFactor == null ? 1 : pbr.metallicFactor,
        roughness: pbr.roughnessFactor == null ? 1 : pbr.roughnessFactor,
        emissive: new THREE.Color(emissive[0], emissive[1], emissive[2]),
        emissiveIntensity: strength,
        side: source.doubleSided ? THREE.DoubleSide : THREE.FrontSide
      });
      material.name = source.name || 'material';
      return material;
    });

    var meshTemplates = (json.meshes || []).map(function (source) {
      var holder = new THREE.Group();
      holder.name = source.name || 'mesh';
      source.primitives.forEach(function (primitive, index) {
        var geometry = new THREE.BufferGeometry();
        if (primitive.attributes.POSITION != null) geometry.setAttribute('position', attribute(primitive.attributes.POSITION));
        if (primitive.attributes.NORMAL != null) geometry.setAttribute('normal', attribute(primitive.attributes.NORMAL));
        if (primitive.attributes.TEXCOORD_0 != null) geometry.setAttribute('uv', attribute(primitive.attributes.TEXCOORD_0));
        if (primitive.indices != null) geometry.setIndex(attribute(primitive.indices));
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.userData.originalAssetShared = true;
        var carMesh = new THREE.Mesh(geometry, materials[primitive.material] || materials[0]);
        carMesh.name = source.name || ('mesh-' + index);
        carMesh.castShadow = true;
        carMesh.receiveShadow = true;
        holder.add(carMesh);
      });
      return holder;
    });

    var nodes = (json.nodes || []).map(function (source) {
      var node = source.mesh == null ? new THREE.Group() : meshTemplates[source.mesh].clone(true);
      node.name = source.name || node.name || 'node';
      if (source.matrix) {
        node.matrix.fromArray(source.matrix);
        node.matrix.decompose(node.position, node.quaternion, node.scale);
      } else {
        if (source.translation) node.position.fromArray(source.translation);
        if (source.rotation) node.quaternion.fromArray(source.rotation);
        if (source.scale) node.scale.fromArray(source.scale);
      }
      return node;
    });
    (json.nodes || []).forEach(function (source, index) {
      (source.children || []).forEach(function (childIndex) { nodes[index].add(nodes[childIndex]); });
    });

    var scene = new THREE.Group();
    scene.name = 'Original Mini GP Car';
    var sceneSource = json.scenes[json.scene || 0];
    (sceneSource.nodes || []).forEach(function (nodeIndex) { scene.add(nodes[nodeIndex]); });
    return scene;
  }

  function buildMergedRivalTemplate(source) {
    source.updateMatrixWorld(true);
    var groups = new Map();
    var point = new THREE.Vector3();
    var normal = new THREE.Vector3();
    var normalMatrix = new THREE.Matrix3();

    function isWheelPart(node) {
      var current = node;
      while (current && current !== source) {
        if (/^wheel_(fl|fr|rl|rr)$/.test(current.name)) return true;
        current = current.parent;
      }
      return false;
    }

    source.traverse(function (node) {
      if (!node.isMesh || !node.geometry || !node.geometry.attributes.position) return;
      if (isWheelPart(node)) return;
      var key = node.material && node.material.name ? node.material.name : 'material';
      if (!groups.has(key)) {
        groups.set(key, { material: node.material, positions: [], normals: [], indices: [], vertexCount: 0 });
      }
      var group = groups.get(key);
      var geometry = node.geometry;
      var position = geometry.attributes.position;
      var sourceNormal = geometry.attributes.normal;
      normalMatrix.getNormalMatrix(node.matrixWorld);
      for (var i = 0; i < position.count; i += 1) {
        point.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld);
        group.positions.push(point.x, point.y, point.z);
        if (sourceNormal) {
          normal.fromBufferAttribute(sourceNormal, i).applyMatrix3(normalMatrix).normalize();
          group.normals.push(normal.x, normal.y, normal.z);
        }
      }
      var index = geometry.index;
      if (index) {
        for (var j = 0; j < index.count; j += 1) group.indices.push(group.vertexCount + index.getX(j));
      } else {
        for (var k = 0; k < position.count; k += 1) group.indices.push(group.vertexCount + k);
      }
      group.vertexCount += position.count;
    });

    var merged = new THREE.Group();
    merged.name = 'Original Mini GP Car - Rival LOD';
    groups.forEach(function (group, name) {
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(group.positions, 3));
      if (group.normals.length) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(group.normals, 3));
      geometry.setIndex(group.indices);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometry.userData.originalAssetShared = true;
      var mesh = new THREE.Mesh(geometry, group.material);
      mesh.name = 'rival-' + name;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      merged.add(mesh);
    });
    ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].forEach(function (name) {
      var wheel = source.getObjectByName(name);
      if (wheel) merged.add(wheel.clone(true));
    });
    return merged;
  }

  function loadTexture(loader, key, url) {
    return new Promise(function (resolve, reject) {
      loader.load(url, function (texture) {
        texture.name = 'original-' + key;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 4;
        texture.userData.originalAssetShared = true;
        textures[key] = texture;
        resolve(texture);
      }, undefined, reject);
    });
  }

  function preload() {
    if (loading) return loading;
    if (!THREE) return Promise.reject(new Error('Three.js is unavailable.'));
    var textureLoader = new THREE.TextureLoader();
    var textureJobs = Object.keys(TEXTURE_URLS).map(function (key) {
      return loadTexture(textureLoader, key, TEXTURE_URLS[key]);
    });
    var textureJob = Promise.allSettled(textureJobs).then(function (results) {
      var missing = results.filter(function (result) { return result.status === 'rejected'; }).length;
      if (missing) console.warn('Mini GP original texture fallback active for ' + missing + ' asset(s).');
      return results;
    });
    var modelJob = fetch(MODEL_URL)
      .then(function (response) {
        if (!response.ok) throw new Error('Original car model returned HTTP ' + response.status);
        return response.arrayBuffer();
      })
      .then(function (buffer) {
        var parsed = parseGlb(buffer);
        var merged = buildMergedRivalTemplate(parsed);
        template = parsed;
        rivalTemplate = merged;
      });
    loading = Promise.all([modelJob, textureJob])
      .then(function () { return api; })
      .catch(function (error) {
        template = null;
        rivalTemplate = null;
        loading = null;
        throw error;
      });
    return loading;
  }

  function cloneMaterial(source, colors) {
    var material;
    var paint;
    if (source.name === 'body' || source.name === 'accent') {
      paint = new THREE.Color(source.name === 'body' ? (colors.body || '#68e7ef') : (colors.wing || '#ffd82f'));
      material = new THREE.MeshPhysicalMaterial({
        color: clampedPaintColor(paint),
        opacity: source.opacity,
        transparent: source.transparent,
        side: source.side,
        depthWrite: source.depthWrite,
        depthTest: source.depthTest,
        metalness: source.name === 'body' ? 0.06 : 0.05,
        roughness: source.name === 'body' ? 0.34 : 0.37,
        clearcoat: source.name === 'body' ? 1 : 0.92,
        clearcoatRoughness: source.name === 'body' ? 0.17 : 0.2,
        emissive: paint.clone().multiplyScalar(paintEmissiveFactor(paint))
      });
      material.name = source.name;
    } else {
      material = source.clone();
    }
    material.userData.originalAssetInstance = true;
    if (material.name === 'carbon') {
      material.color.set('#343842');
      material.map = carbonWeave();
      material.metalness = 0.12;
      material.roughness = 0.46;
      material.emissive.set('#000000');
    } else if (material.name === 'tyre') {
      material.color.set('#111114');
      material.bumpMap = tyreBump();
      material.bumpScale = 0.006;
      material.metalness = 0.03;
      material.roughness = 0.9;
      material.emissive.set('#000000');
    } else if (material.name === 'helmet') {
      material.color.set(colors.body || '#68e7ef').lerp(new THREE.Color('#ffffff'), 0.08);
    } else if (material.name === 'helmet_trim') {
      material.color.set(colors.wing || '#ffd82f');
      material.emissive.copy(material.color).multiplyScalar(0.08);
    } else if (material.name === 'band') {
      material.color.set('#ffd24a');
      material.emissive.copy(material.color).multiplyScalar(0.12);
    } else if (material.name === 'rim') {
      material.color.set(colors.rim || '#262b31');
    }
    return material;
  }

  function identityTexture(name, number, body, accent) {
    var canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 160;
    var context = canvas.getContext('2d');
    context.fillStyle = '#07090d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = body;
    context.fillRect(0, 0, 28, canvas.height);
    context.fillStyle = accent;
    context.fillRect(28, 0, 12, canvas.height);
    context.fillRect(40, 0, canvas.width - 40, 10);
    context.fillStyle = '#fff';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.font = 'italic 900 56px Arial Black, Arial, sans-serif';
    context.fillText(String(name || 'COMET').toUpperCase(), 62, 68, 480);
    context.fillStyle = 'rgba(255,255,255,.68)';
    context.font = '800 24px Arial, sans-serif';
    context.fillText('APEX FORMULA', 64, 121);
    context.textAlign = 'right';
    context.strokeStyle = accent;
    context.lineWidth = 20;
    context.lineJoin = 'round';
    context.font = 'italic 900 116px Arial Black, Arial, sans-serif';
    context.strokeText(String(number || '26'), 742, 88);
    context.fillStyle = '#fff';
    context.fillText(String(number || '26'), 742, 88);
    var map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }

  function addIdentity(car, options) {
    var bodyRoot = car.getObjectByName('body_root') || car;
    var map = identityTexture(options.name, options.raceNumber || options.number || '26', options.bodyColor, options.wingColor);
    var material = new THREE.MeshBasicMaterial({ map: map, side: THREE.DoubleSide, transparent: true });
    material.userData.originalAssetInstance = true;
    var rear = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.118), material);
    rear.name = 'rearIdentity';
    rear.position.set(0, 0.91, -2.37);
    rear.rotation.y = Math.PI;
    rear.renderOrder = 2;
    bodyRoot.add(rear);
    var topMaterial = material.clone();
    topMaterial.userData.originalAssetInstance = true;
    var top = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.205), topMaterial);
    top.name = 'rearIdentityTop';
    top.position.set(0, 0.972, -2.275);
    top.rotation.x = -Math.PI / 2;
    top.renderOrder = 2;
    bodyRoot.add(top);
  }

  function addFactoryKit(car, style, materials) {
    var kit = style && (style.kit || style.aero);
    if (!kit) return;
    var bodyRoot = car.getObjectByName('body_root') || car;
    var paint = materials.body;
    var accent = materials.accent || paint;
    var carbon = materials.carbon || accent;
    function addBox(name, material, position, scale, rotation) {
      var part = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
      part.name = name;
      part.position.fromArray(position);
      part.scale.fromArray(scale);
      if (rotation) part.rotation.fromArray(rotation);
      part.castShadow = true;
      part.receiveShadow = true;
      bodyRoot.add(part);
    }
    function addPanel(name, material, points, depth, position, rotation) {
      var shape = new THREE.Shape();
      points.forEach(function (point, index) {
        if (index === 0) shape.moveTo(point[0], point[1]);
        else shape.lineTo(point[0], point[1]);
      });
      shape.closePath();
      var geometry = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
      geometry.rotateY(Math.PI / 2);
      var part = new THREE.Mesh(geometry, material);
      part.name = name;
      part.position.fromArray(position);
      if (rotation) part.rotation.fromArray(rotation);
      part.castShadow = true;
      part.receiveShadow = true;
      bodyRoot.add(part);
    }
    function addBeam(name, material, from, to, radius) {
      var start = new THREE.Vector3().fromArray(from);
      var end = new THREE.Vector3().fromArray(to);
      var direction = end.clone().sub(start);
      var part = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 6), material);
      part.name = name;
      part.position.copy(start).add(end).multiplyScalar(0.5);
      part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      part.castShadow = true;
      part.receiveShadow = true;
      bodyRoot.add(part);
    }
    var side;
    if (kit === 'comet-classic') {
      addBox('cometWingBridge', accent, [0, .19, 2.03], [1.42, .045, .15]);
      for (side = -1; side <= 1; side += 2) {
        addBox('cometNoseRail' + side, accent, [side * .18, .4, 1.25], [.075, .055, 1.28], [-.025, 0, 0]);
        addBox('cometAirShoulder' + side, paint, [side * .54, .53, -.3], [.18, .2, .54], [0, 0, side * .08]);
      }
    } else if (kit === 'bolt-arrow') {
      addBox('boltArrowSpine', accent, [0, .44, 1.18], [.11, .075, 1.72], [-.035, 0, 0]);
      addBox('boltLowTail', accent, [0, .93, -2.04], [1.94, .055, .25], [.08, 0, 0]);
      for (side = -1; side <= 1; side += 2) {
        addBox('boltFrontArrow' + side, paint, [side * .52, .22, 1.98], [.78, .035, .16], [0, side * .1, -side * .22]);
        addBox('boltSideBlade' + side, carbon, [side * .64, .31, -.18], [.08, .12, 1.42], [0, 0, side * .04]);
      }
    } else if (kit === 'lynx-claw') {
      for (side = -1; side <= 1; side += 2) {
        addBox('lynxClawOuter' + side, accent, [side * .67, .27, 1.91], [.58, .04, .16], [-.12, side * .08, -side * .22]);
        addBox('lynxClawInner' + side, paint, [side * .48, .34, 1.67], [.42, .035, .14], [-.15, side * .06, -side * .16]);
        addBox('lynxEar' + side, accent, [side * .24, .78, -.29], [.075, .3, .48], [0, 0, -side * .18]);
      }
      addBox('lynxWideTail', accent, [0, 1.08, -2.02], [2.24, .07, .25], [.1, 0, 0]);
    } else if (kit === 'rhino-armor') {
      addBox('rhinoNoseBar', accent, [0, .3, 1.76], [1.22, .11, .24], [-.04, 0, 0]);
      addBox('rhinoHeavyTail', paint, [0, 1.08, -2], [2.38, .13, .32], [.05, 0, 0]);
      for (side = -1; side <= 1; side += 2) {
        addBox('rhinoShoulder' + side, paint, [side * .62, .52, -.18], [.28, .24, .92], [0, 0, side * .06]);
        addBox('rhinoTailBlock' + side, accent, [side * 1.02, .83, -1.98], [.13, .4, .32]);
      }
    } else if (kit === 'falcon-sweep') {
      addBox('falconDorsalBlade', accent, [0, .82, -.62], [.065, .48, .92], [0, 0, -.03]);
      for (side = -1; side <= 1; side += 2) {
        addBox('falconFrontFeather' + side, accent, [side * .66, .25, 1.9], [.78, .035, .18], [-.16, side * .08, -side * .28]);
        addBox('falconRearFeather' + side, paint, [side * .63, 1.05, -2.03], [1.02, .055, .23], [.14, 0, side * .13]);
        addBox('falconTailFork' + side, carbon, [side * .58, .82, -1.84], [.055, .44, .09], [0, 0, -side * .16]);
      }
    } else if (kit === 'vortex-tunnel') {
      for (side = -1; side <= 1; side += 2) {
        addBox('vortexNoseSplit' + side, accent, [side * .16, .43, 1.3], [.085, .1, 1.5], [-.04, 0, -side * .035]);
        addBox('vortexTunnel' + side, carbon, [side * .62, .32, -.12], [.19, .16, 1.72], [0, 0, side * .04]);
        addBox('vortexTunnelEdge' + side, accent, [side * .77, .43, -.05], [.055, .07, 1.52], [0, 0, side * .06]);
        addBox('vortexTailV' + side, paint, [side * .56, 1.08, -2.05], [1.12, .06, .27], [.17, 0, side * .17]);
      }
    } else if (kit === 'nova-boomerang' || kit === 'shadow-split') {
      var aeroPaint = new THREE.MeshPhysicalMaterial({
        name: 'aero-paint', color: accent.color, metalness: .34, roughness: .22,
        clearcoat: .92, clearcoatRoughness: .13
      });
      var aeroCarbon = new THREE.MeshPhysicalMaterial({
        name: 'aero-carbon', color: '#090d13', metalness: .58, roughness: .3,
        clearcoat: .48, clearcoatRoughness: .22
      });
      var edgeColor = paint.color.clone();
      var aeroEdge = new THREE.MeshPhysicalMaterial({
        name: 'aero-edge', color: edgeColor, emissive: edgeColor.clone().multiplyScalar(.12),
        metalness: .24, roughness: .2, clearcoat: 1, clearcoatRoughness: .1
      });
      if (kit === 'nova-boomerang') {
        for (side = -1; side <= 1; side += 2) {
          var novaSuffix = side < 0 ? 'L' : 'R';
          addBox('novaUpperBlade' + novaSuffix, aeroPaint, [side * .57, 1.16, -2.18], [1.16, .075, .34], [.16, 0, -side * .105]);
          addBox('novaSlotFlap' + novaSuffix, aeroCarbon, [side * .53, 1.035, -2.33], [1.06, .045, .19], [.3, 0, -side * .075]);
          addPanel('novaWingTip' + novaSuffix, aeroEdge, [[-.24, -.25], [.23, -.22], [.17, .22], [-.1, .29]], .055, [side * 1.13, 1.08, -2.22], [.04, 0, -side * .08]);
          addBeam('novaWingSupport' + novaSuffix, aeroCarbon, [side * .48, .64, -1.78], [side * .72, 1.105, -2.13], .042);
          addBox('novaFrontCanard' + novaSuffix, aeroPaint, [side * .72, .31, 2.13], [.38, .032, .22], [-.12, side * .06, -side * .18]);
          addBox('novaFrontCanardEdge' + novaSuffix, aeroEdge, [side * .81, .332, 2.1], [.19, .025, .235], [-.12, side * .06, -side * .18]);
        }
        addBox('novaWingCrown', aeroEdge, [0, 1.205, -2.205], [.32, .036, .37], [.16, 0, 0]);
      } else {
        for (side = -1; side <= 1; side += 2) {
          var shadowSuffix = side < 0 ? 'L' : 'R';
          addBox('shadowSplitBlade' + shadowSuffix, aeroPaint, [side * .61, 1.18, -2.16], [1.08, .068, .38], [.18, side * .035, side * .13]);
          addBox('shadowLowerBlade' + shadowSuffix, aeroCarbon, [side * .55, 1.005, -2.31], [1.02, .05, .22], [.34, 0, side * .07]);
          addPanel('shadowBladeTip' + shadowSuffix, aeroPaint, [[-.22, -.27], [.24, -.19], [.12, .28], [-.16, .22]], .052, [side * 1.14, 1.075, -2.2], [.02, side * .08, side * .1]);
          addBeam('shadowCrossSupport' + shadowSuffix, aeroEdge, [side * .66, .62, -1.78], [-side * .48, 1.115, -2.11], .038);
          addBox('shadowFrontCanard' + shadowSuffix + 'A', aeroCarbon, [side * .75, .3, 2.18], [.42, .027, .25], [-.18, side * .08, -side * .22]);
          addBox('shadowFrontCanard' + shadowSuffix + 'B', aeroPaint, [side * .78, .36, 2.1], [.34, .025, .19], [-.23, side * .08, -side * .17]);
        }
        addBox('shadowSplitCore', aeroEdge, [0, 1.145, -2.185], [.16, .095, .34], [.18, 0, 0]);
        addPanel('shadowDorsalBlade', aeroPaint, [[-.38, -.23], [.36, -.23], [-.1, .24], [-.31, .2]], .035, [0, .83, -.72], [0, 0, -.03]);
      }
    }
  }

  function createCar(options) {
    if (!template) return null;
    options = options || {};
    if (options.detail === 'rival' && !rivalTemplate) return null;
    var source = options.detail === 'rival' && rivalTemplate ? rivalTemplate : template;
    var car = source.clone(true);
    var colors = { body: options.bodyColor || '#68e7ef', wing: options.wingColor || '#ffd82f', rim: options.rimColor || '#262b31' };
    car.name = options.name || 'Original Mini GP Formula Car';
    car.userData.originalAssetInstance = true;
    car.userData.wheels = [];
    car.userData.frontWheels = [];
    var shadowMeshes = {
      chassis: true, sidepods: true, airbox: true, shark_fin: true, floor: true,
      helmet: true, halo: true, front_wing_main: true, front_wing_endplates: true,
      rear_wing_main: true, rear_wing_flap: true, rear_wing_endplates: true,
      tyre_fl: true, tyre_fr: true, tyre_rl: true, tyre_rr: true
    };
    var clonedMaterials = new Map();
    var materialsByName = {};
    car.traverse(function (node) {
      if (!node.isMesh) return;
      var source = node.material;
      if (!clonedMaterials.has(source)) clonedMaterials.set(source, cloneMaterial(source, colors));
      node.material = clonedMaterials.get(source);
      materialsByName[node.material.name] = node.material;
      if (node.geometry) node.geometry.userData.originalAssetShared = true;
      node.castShadow = options.detail === 'rival' ? false : !!shadowMeshes[node.name];
      node.receiveShadow = options.detail === 'rival' ? false : true;
    });
    ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].forEach(function (name) {
      var wheel = car.getObjectByName(name);
      if (!wheel) return;
      wheel.rotation.order = 'YXZ';
      car.userData.wheels.push(wheel);
      if (name === 'wheel_fl' || name === 'wheel_fr') car.userData.frontWheels.push(wheel);
    });
    if (options.identity !== false) {
      addIdentity(car, {
        name: options.name || 'Comet',
        number: options.number,
        raceNumber: options.raceNumber,
        bodyColor: colors.body,
        wingColor: colors.wing
      });
    }
    addFactoryKit(car, options.modelStyle, materialsByName);
    var style = options.modelStyle || {};
    ['front_wing_main', 'rear_wing_main', 'rear_wing_flap'].forEach(function (name) {
      var wing = car.getObjectByName(name);
      if (wing) wing.scale.x *= style.wing || 1;
    });
    var width = style.width || 1;
    var height = style.height || 1;
    var length = style.length || 1;
    var bodyRoot = car.getObjectByName('body_root');
    if (bodyRoot) bodyRoot.scale.set(width, height, length);
    car.userData.wheels.forEach(function (wheel) {
      wheel.position.x *= width;
      wheel.position.z *= length;
      wheel.scale.y *= height > 1 ? 1.04 : (height < 1 ? 0.96 : 1);
    });
    var scale = options.scale == null ? 1 : options.scale;
    car.scale.setScalar(scale);
    return car;
  }

  var api = {
    preload: preload,
    ready: function () { return !!template; },
    getTexture: function (key) { return textures[key] || null; },
    createCar: createCar,
    urls: { model: MODEL_URL, textures: TEXTURE_URLS }
  };
  root.OriginalMiniGPAssets = api;
})(window);
