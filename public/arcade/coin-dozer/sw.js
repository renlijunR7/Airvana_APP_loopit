/* Replaced by build-mobile.mjs. Only this static game is cached. */
const VERSION = "3686faa56957c026";
const ASSETS = [{"url":"/arcade/coin-dozer/assets/art-v1/carnival-scene.svg","kind":"svg","hash":"c35b194d4ef6cb94e46e213327db433378070447cf63faf30de8f762eebda5e2"},{"url":"/arcade/coin-dozer/assets/art-v1/classic.png","kind":"png","hash":"8af1a6952b864c22a4ce5acab1d87e1b9bcf3f00735754012038ea97353252bb"},{"url":"/arcade/coin-dozer/assets/art-v1/items.png","kind":"png","hash":"2dfa3f9165f57cad2b1baf71381376c916a16f3237cb4fab041b8a4387367165"},{"url":"/arcade/coin-dozer/assets/art-v1/relaxed.png","kind":"png","hash":"f6c5a5a7e542fd289d16837485d58c488adee6363547ccd72e5a0a2d5ccb8638"},{"url":"/arcade/coin-dozer/assets/art-v1/rush.png","kind":"png","hash":"2104d98874d2149608da5bb45973e6bc92160e2d23812cd293441a60f40c565e"},{"url":"/arcade/coin-dozer/assets/art-v1/treasure.png","kind":"png","hash":"d1115e3cae9076fec29080a6bc14d7b4267a02f252757fdeff00791418d88fa1"},{"url":"/arcade/coin-dozer/assets/crypto-v1/btc.svg","kind":"svg","hash":"5a8131ecdf855b12cb56080aeeeefea266976529c45b2d58c284a13b7519f4ca"},{"url":"/arcade/coin-dozer/assets/crypto-v1/doge.svg","kind":"svg","hash":"bad8366eea35df4e3185ba24aeaedf4b5ab702d1bb959de47085fb762916d16f"},{"url":"/arcade/coin-dozer/assets/crypto-v1/eth.svg","kind":"svg","hash":"1f94df8533f61806f7b17eaf9cd28678cdba66e1d82a9ca8f9fb38d35a907e9c"},{"url":"/arcade/coin-dozer/assets/crypto-v1/ht.svg","kind":"svg","hash":"8ce855b4160a8594646d76997721557ed3720b259f4a3c787bf69fe0691f687e"},{"url":"/arcade/coin-dozer/assets/crypto-v1/sol.svg","kind":"svg","hash":"94e47e7c108a338cc4a79b82673d66cfbadfcf4c934ccb9c2ca8f13e8ea7dbb2"},{"url":"/arcade/coin-dozer/assets/crypto-v1/usdt.svg","kind":"svg","hash":"cddba428a029844888b59bae59c6400ee684b0d51dfc490a4374eef6bb63ea16"},{"url":"/arcade/coin-dozer/assets/index-99Hni2nq.js","kind":"js","hash":"d80ea1ff52d51b6cce003676b233fe5d95d73fbbc4d69db5e881428ce1366fc7"},{"url":"/arcade/coin-dozer/assets/index-DoL__iWR.css","kind":"css","hash":"32ff49b6b1556b084d905b42ad7d2107f82faae3e96bff72c59419264fe0e600"},{"url":"/arcade/coin-dozer/icons/apple-touch-icon.png","kind":"png","hash":"016e2c1351e44fc465338991070d5d6af1b380101706abe2296a88b2ee2b42dc"},{"url":"/arcade/coin-dozer/icons/icon-192.png","kind":"png","hash":"fecb56ff91a7b59aa56dcbd1df08e180be3e2715456362e248452cbf3a44542a"},{"url":"/arcade/coin-dozer/icons/icon-512.png","kind":"png","hash":"123691577cb7e07a4b34e350c1844b429d5bf3282d058d05a5cc5f8f4234792c"},{"url":"/arcade/coin-dozer/icons/maskable-512.png","kind":"png","hash":"b9726ffeafc28e6343bbce7e03b421b974414dcdd96a76e60a954d3c525de91a"},{"url":"/arcade/coin-dozer/","kind":"html","hash":"d405e5b6c29ab3bb8e90e6d7c659e1eb261fb7d94be22009d9b586012cdb693a"},{"url":"/arcade/coin-dozer/manifest.webmanifest","kind":"json","hash":"d205fa24166ab8d77e1e688dd839bb75248e61253a1fd645596655558f3282ea"}];
const PREFIX = 'coin-dozer-mobile-';
const CACHE = PREFIX + VERSION;
const TYPES = {
  html: 'text/html',
  js: /javascript/,
  css: 'text/css',
  png: 'image/png',
  svg: 'image/svg+xml',
  json: /json/,
};
const allowed = new Set(ASSETS.map((asset) => asset.url));

async function checkedAsset(asset) {
  const response = await fetch(
    new Request(new URL(asset.url, self.location.origin), {
      cache: 'reload',
      credentials: 'same-origin',
      redirect: 'error',
    }),
  );
  const type = response.headers.get('content-type') || '';
  const expected = TYPES[asset.kind];
  if (
    response.status !== 200 ||
    response.redirected ||
    new URL(response.url).origin !== self.location.origin ||
    !(expected instanceof RegExp
      ? expected.test(type)
      : type.includes(expected))
  ) {
    throw new Error('Offline asset unavailable');
  }
  if (
    asset.kind === 'html' &&
    !(await response.clone().text()).includes(
      'name="coin-dozer-shell" content="mobile-v1"',
    )
  ) {
    throw new Error('Not the game shell');
  }
  return response;
}

async function populateCache(removeIncomplete = false) {
  // Validate everything before writing. A failed install leaves the active cache intact.
  const responses = await Promise.all(ASSETS.map(checkedAsset));
  const cache = await caches.open(CACHE);
  try {
    await Promise.all(
      ASSETS.map((asset, i) => cache.put(asset.url, responses[i])),
    );
  } catch (error) {
    if (removeIncomplete) await caches.delete(CACHE);
    throw error;
  }
}
self.addEventListener('install', (event) => {
  event.waitUntil(populateCache(true));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Retain the previous complete bundle for tabs still displaying that version.
      const old = (await caches.keys()).filter(
        (name) => name.startsWith(PREFIX) && name !== CACHE,
      );
      await Promise.all(old.slice(0, -1).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'REPAIR_CACHE') {
    event.waitUntil(
      populateCache().then(
        () => event.ports[0]?.postMessage({ ready: true }),
        () => event.ports[0]?.postMessage({ ready: false }),
      ),
    );
  }
  if (event.data?.type === 'ACTIVATE_UPDATE')
    event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'OFFLINE_STATUS') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        const complete = (
          await Promise.all(ASSETS.map((asset) => cache.match(asset.url)))
        ).every(Boolean);
        event.ports[0]?.postMessage({ ready: complete, version: VERSION });
      })(),
    );
  }
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.search
  )
    return;
  const path = url.pathname;
  const navigation = request.mode === 'navigate';
  // Never intercept sign-in, APIs, the SSR site, or unlisted resources.
  if (
    navigation
      ? path !== '/arcade/coin-dozer/' && path !== '/arcade/coin-dozer/index.html'
      : !allowed.has(path) && !path.startsWith('/arcade/coin-dozer/assets/')
  )
    return;
  event.respondWith(
    (async () => {
      const key = navigation ? '/arcade/coin-dozer/' : path;
      const cache = await caches.open(CACHE);
      const cached = await cache.match(key);
      if (cached) return cached;
      // An older open tab may still request its content-hashed assets after an update.
      if (!navigation && path.startsWith('/arcade/coin-dozer/assets/')) {
        for (const name of (await caches.keys())
          .filter((name) => name.startsWith(PREFIX))
          .reverse()) {
          const previous = await (await caches.open(name)).match(key);
          if (previous) return previous;
        }
      }
      return fetch(request);
    })(),
  );
});
