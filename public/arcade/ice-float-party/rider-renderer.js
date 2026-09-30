import { createRider } from './rider-models.js?v=9';
import { addStudioLighting } from './studio-lighting.js?v=5';

// +Z is the rider's front. Tilting the model maps +Z towards screen-bottom.
export const RIDER_TILT = 0.68;

export class RiderRenderer {
  constructor() {
    this.available = false;
    this.riders = new Map();
    this.width = 0;
    this.height = 0;
    this.error = null;
    try {
      const T = window.THREE;
      if (!T) throw new Error('Three.js is unavailable');
      this.T = T;
      this.canvas = document.createElement('canvas');
      this.renderer = new T.WebGLRenderer({canvas: this.canvas, alpha: true, antialias: true, powerPreference: 'high-performance'});
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = .9;
      this.scene = new T.Scene();
      this.camera = new T.OrthographicCamera(-195, 195, 422, -422, 1, 4000);
      this.camera.position.z = 2000;
      this.lighting = addStudioLighting(T, this.scene, this.renderer, true);
      this.canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        this.available = false;
        this.error = 'WebGL context lost';
      });
      this.canvas.addEventListener('webglcontextrestored', () => {
        this.available = true;
        this.error = null;
      });
      this.available = true;
    } catch (error) {
      this.error = String(error.message || error);
    }
  }

  resize(width, height, dpr) {
    if (!this.renderer) return;
    const ratio = Math.min(dpr, 1.5);
    if (this.width === width && this.height === height && this.ratio === ratio) return;
    this.width = width;
    this.height = height;
    this.ratio = ratio;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
  }

  getRider(actor) {
    if (!this.riders.has(actor.id)) {
      const model = createRider(this.T, actor);
      const anchor = new this.T.Group();
      const tilt = new this.T.Group();
      tilt.rotation.x = RIDER_TILT;
      tilt.add(model.root);
      anchor.add(tilt);
      this.scene.add(anchor);
      this.riders.set(actor.id, { ...model, anchor });
    }
    return this.riders.get(actor.id);
  }

  draw(ctx, actors, project, width, height, dpr) {
    if (!this.available) return false;
    this.resize(width, height, dpr);
    const sorted = actors.slice().sort((a,b) => a.y - b.y);
    sorted.forEach((actor, order) => {
      const model = this.getRider(actor);
      const point = project(actor.x, actor.y);
      const sink = actor.alive ? 0 : Math.min(1, actor.sink / .75);
      const depthScale = .68 + (actor.y + 1) / 2 * .46;
      const scale = 63 * depthScale * (1 - sink * .8);
      model.anchor.visible = sink < 1;
      // Separate depth bands preserve the ice game's front-to-back overlap.
      model.anchor.position.set(point.x - width / 2, height / 2 - point.y - sink * 24, order * 160);
      model.anchor.scale.setScalar(scale);
      model.root.rotation.y = actor.facingYaw;
      const speed = Math.hypot(actor.vx, actor.vy);
      model.body.rotation.x = Math.min(.15, speed * .08);
      model.body.position.y = Math.sin(actor.wobble) * Math.min(.016, speed * .025);
    });
    this.renderer.render(this.scene, this.camera);
    ctx.drawImage(this.canvas, 0, 0, width, height);
    return true;
  }

  info() {
    return {
      mode: this.available ? 'webgl-3d' : 'sprite-fallback',
      error: this.error,
      models: this.riders.size,
      details: Array.from(this.riders, ([id, model]) => ({ id, level: model.root.userData.detailLevel })),
      calls: this.renderer?.info.render.calls || 0,
      triangles: this.renderer?.info.render.triangles || 0,
      geometries: this.renderer?.info.memory.geometries || 0
    };
  }
}
