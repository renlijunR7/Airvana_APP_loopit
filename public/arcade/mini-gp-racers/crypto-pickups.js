(function () {
  'use strict';

  // These are equal-value arcade pickups. Their colors and symbols do not
  // represent balances, market prices, or real cryptocurrency transfers.
  var TYPES = [
    { symbol: 'BTC', label: 'Bitcoin', color: '#f7931a', score: 10 },
    { symbol: 'ETH', label: 'Ethereum', color: '#627eea', score: 10 },
    { symbol: 'USDT', label: 'Tether', color: '#26a17b', score: 10 },
    { symbol: 'SOL', label: 'Solana', color: '#9945ff', score: 10 },
    { symbol: 'BNB', label: 'BNB', color: '#f3ba2f', score: 10 },
    { symbol: 'DOGE', label: 'Dogecoin', color: '#c2a633', score: 10 },
    { symbol: 'USDC', label: 'USD Coin', color: '#2775ca', score: 10 }
  ];
  var textureCache = Object.create(null);
  var geometryCache = null;

  function diamond(ctx, x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y);
    ctx.lineTo(x, y + radius);
    ctx.lineTo(x - radius, y);
    ctx.closePath();
    ctx.fill();
  }

  function polygon(ctx, points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(function (point, i) {
      if (i === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    ctx.fill();
  }

  function drawSymbol(ctx, symbol) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineCap = 'round';
    if (symbol === 'BTC') {
      ctx.save();
      ctx.translate(128, 112);
      ctx.rotate(0.13);
      ctx.font = 'bold 135px Arial, sans-serif';
      ctx.fillText('B', 3, 4);
      ctx.lineWidth = 7;
      [-20, -1].forEach(function (x) {
        ctx.beginPath();
        ctx.moveTo(x, -69);
        ctx.lineTo(x, 72);
        ctx.stroke();
      });
      ctx.restore();
    } else if (symbol === 'ETH') {
      polygon(ctx, [[128, 35], [78, 115], [128, 142]], '#ffffff');
      polygon(ctx, [[128, 35], [178, 115], [128, 142]], '#ccd6ff');
      polygon(ctx, [[78, 125], [128, 191], [128, 150]], '#ffffff');
      polygon(ctx, [[178, 125], [128, 191], [128, 150]], '#ccd6ff');
      polygon(ctx, [[78, 115], [128, 94], [128, 142]], '#e3e9ff');
      polygon(ctx, [[178, 115], [128, 94], [128, 142]], '#b5c3f7');
    } else if (symbol === 'USDT') {
      ctx.fillRect(72, 56, 112, 27);
      ctx.fillRect(114, 70, 28, 111);
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(128, 108, 66, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#26a17b';
      ctx.fillRect(119, 86, 18, 13);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(114, 72, 28, 33);
    } else if (symbol === 'SOL') {
      var solGradient = ctx.createLinearGradient(65, 48, 192, 184);
      solGradient.addColorStop(0, '#00ffa3');
      solGradient.addColorStop(0.5, '#64c7e6');
      solGradient.addColorStop(1, '#dc1fff');
      polygon(ctx, [[82, 57], [192, 57], [173, 84], [63, 84]], solGradient);
      polygon(ctx, [[63, 101], [173, 101], [192, 128], [82, 128]], solGradient);
      polygon(ctx, [[82, 145], [192, 145], [173, 172], [63, 172]], solGradient);
    } else if (symbol === 'BNB') {
      var ink = '#1b2027';
      diamond(ctx, 128, 61, 24, ink);
      diamond(ctx, 76, 113, 24, ink);
      diamond(ctx, 180, 113, 24, ink);
      diamond(ctx, 128, 165, 24, ink);
      diamond(ctx, 128, 113, 23, ink);
    } else if (symbol === 'DOGE') {
      ctx.font = 'bold 143px Georgia, serif';
      ctx.fillText('D', 129, 118);
      ctx.fillRect(80, 105, 62, 10);
    } else if (symbol === 'USDC') {
      ctx.font = 'bold 128px Arial, sans-serif';
      ctx.fillText('$', 128, 117);
      ctx.lineWidth = 9;
      [Math.PI * 0.61, Math.PI * 1.61].forEach(function (start) {
        ctx.beginPath();
        ctx.arc(128, 114, 74, start, start + Math.PI * 0.78);
        ctx.stroke();
      });
    }
  }

  function getTexture(type) {
    if (textureCache[type.symbol]) return textureCache[type.symbol];
    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    var ctx = canvas.getContext('2d');
    var background = type.symbol === 'SOL' ? '#121421' : type.color;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 256, 256);
    var sheen = ctx.createLinearGradient(0, 0, 256, 256);
    sheen.addColorStop(0, 'rgba(255,255,255,0.24)');
    sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(255,255,255,0.60)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(128, 128, 118, 0, Math.PI * 2);
    ctx.stroke();
    drawSymbol(ctx, type.symbol);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 27px Arial, sans-serif';
    ctx.fillStyle = type.symbol === 'BNB' ? '#1b2027' : '#ffffff';
    ctx.fillText(type.symbol, 128, 218);
    var texture = new window.THREE.CanvasTexture(canvas);
    texture.colorSpace = window.THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.userData.originalAssetShared = true;
    texture.userData.cryptoPickup = type.symbol;
    textureCache[type.symbol] = texture;
    return texture;
  }

  function getGeometries() {
    if (geometryCache) return geometryCache;
    var THREE = window.THREE;
    geometryCache = {
      edge: new THREE.CylinderGeometry(0.5, 0.5, 0.12, 40),
      face: new THREE.CircleGeometry(0.48, 40),
      rim: new THREE.TorusGeometry(0.482, 0.016, 6, 40)
    };
    Object.keys(geometryCache).forEach(function (key) {
      geometryCache[key].userData.originalAssetShared = true;
    });
    return geometryCache;
  }

  function create(index) {
    var THREE = window.THREE;
    if (!THREE) throw new Error('MiniGPCryptoPickups requires THREE.');
    var requestedIndex = Number(index);
    var normalized = Number.isFinite(requestedIndex) ? Math.floor(requestedIndex) : 0;
    var type = TYPES[((normalized % TYPES.length) + TYPES.length) % TYPES.length];
    var geometry = getGeometries();
    var group = new THREE.Group();
    group.name = 'pickup-' + type.symbol;
    group.userData.tokenSymbol = type.symbol;
    group.userData.tokenLabel = type.label;
    group.userData.tokenColor = type.color;
    group.userData.tokenScore = type.score;

    // Textures/geometries are shared for the lifetime of the page. Materials
    // are instance-owned because RaceEngine.releaseObject disposes materials.
    var edgeMaterial = new THREE.MeshStandardMaterial({
      color: type.color,
      metalness: 0.55,
      roughness: 0.29,
      emissive: type.color,
      emissiveIntensity: 0.15
    });
    var faceMaterial = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: getTexture(type),
      emissiveMap: getTexture(type),
      emissive: '#ffffff',
      emissiveIntensity: 0.4,
      metalness: 0.1,
      roughness: 0.65
    });
    var edge = new THREE.Mesh(geometry.edge, edgeMaterial);
    edge.rotation.x = Math.PI / 2;
    group.add(edge);
    [1, -1].forEach(function (side) {
      var face = new THREE.Mesh(geometry.face, faceMaterial);
      face.position.z = side * 0.061;
      // Each outward face has its own UV orientation: labels remain correctly
      // oriented on both sides as the standing coin spins around the Y axis.
      if (side < 0) face.rotation.y = Math.PI;
      group.add(face);
      var rim = new THREE.Mesh(geometry.rim, edgeMaterial);
      rim.position.z = side * 0.06;
      group.add(rim);
    });
    return group;
  }

  window.MiniGPCryptoPickups = {
    types: TYPES,
    create: create
  };
}());
