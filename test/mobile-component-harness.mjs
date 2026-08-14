import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');

function readComponentSource() {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const match = html.match(/<script type="text\/x-dc"[^>]*>\s*([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Missing inline text/x-dc Component script');
  return match[1];
}

class TestDCLogic {
  constructor(props = {}) {
    this.props = props;
  }

  setState(update, callback) {
    const patch = typeof update === 'function' ? update(this.state, this.props) : update;
    this.state = {...this.state, ...(patch || {})};
    if (typeof callback === 'function') callback();
  }
}

export function createMobileComponent({props = {skipOnboarding:true}, stored = {}} = {}) {
  const values = new Map(Object.entries(stored).map(([key, value]) => [key, String(value)]));
  const clipboardWrites = [];
  const openedUrls = [];
  const pendingTimers = new Map();
  let timerId = 0;
  const listeners = new Map();
  const setTestTimeout = (fn, delay = 0) => {
    const id = ++timerId;
    pendingTimers.set(id, {fn, delay});
    return id;
  };
  const clearTestTimeout = id => pendingTimers.delete(id);
  class TestFileReader {
    readAsDataURL(file) {
      this.result = `data:${file?.type || 'image/png'};base64,dGVzdC1hdmF0YXI=`;
      if (typeof this.onload === 'function') this.onload();
    }
  }
  const context = {
    DCLogic: TestDCLogic,
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: key => values.delete(key),
      clear: () => values.clear()
    },
    navigator: {clipboard:{writeText:async value => { clipboardWrites.push(String(value)); }}},
    location: {href:'http://127.0.0.1:8082/', pathname:'/', search:'', hash:'', reload() {}},
    document: {
      documentElement:{lang:'zh-CN'},
      body:{style:{}},
      addEventListener(type, fn) { listeners.set(type, fn); },
      removeEventListener(type) { listeners.delete(type); },
      querySelector() { return null; }
    },
    window: {
      open(url, target, features) { openedUrls.push({url:String(url), target, features}); return {closed:false}; },
      addEventListener(type, fn) { listeners.set(`window:${type}`, fn); },
      removeEventListener(type) { listeners.delete(`window:${type}`); }
    },
    fetch: async () => ({ok:true, json:async () => ({})}),
    setTimeout: setTestTimeout,
    clearTimeout: clearTestTimeout,
    setInterval: setTestTimeout,
    clearInterval: clearTestTimeout,
    requestAnimationFrame: () => ++timerId,
    cancelAnimationFrame() {},
    console,
    Math,
    Date,
    Intl,
    URLSearchParams
  };
  context.FileReader = TestFileReader;
  vm.createContext(context);
  vm.runInContext(`${readComponentSource()}\n;globalThis.Component = Component;`, context, {filename:'public/index.html'});
  const component = new context.Component(props);
  return {
    component,
    storage: values,
    location: context.location,
    setLocationHash(value) {
      context.__testLocationHash = String(value);
      vm.runInContext('location.hash = __testLocationHash', context);
      delete context.__testLocationHash;
    },
    clipboardWrites,
    openedUrls,
    listeners,
    runTimers(maxDelay = Infinity) {
      const ready = [...pendingTimers.entries()].filter(([, timer]) => timer.delay <= maxDelay);
      for (const [id, timer] of ready) {
        pendingTimers.delete(id);
        timer.fn();
      }
    },
    mount() { component.componentDidMount?.(); },
    unmount() { component.componentWillUnmount?.(); }
  };
}
