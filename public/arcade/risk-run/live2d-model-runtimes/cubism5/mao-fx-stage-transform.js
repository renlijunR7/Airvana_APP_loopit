(function installMaoFxStageTransform(global) {
  'use strict';

  const POLICY_ID = 'mao-peripheral-fx-safe-zone-v1';
  const FX_PART_IDS = Object.freeze([
    'Part', 'Part2', 'PartInk', 'PartSmoke', 'PartExplosionLight',
    'Partaura', 'PartLight', 'PartHeart'
  ]);
  const REQUIRED_MAO_PARTS = Object.freeze([
    'PartCore', 'PartFace', 'PartRobe', 'PartWandA', 'PartWandB'
  ]);
  const SAFE_ZONE = Object.freeze({ left: -0.55, right: 0.40, bottom: -0.60, top: 0.60 });
  const OUTER_TARGET = Object.freeze({ left: -0.67, right: 0.49, bottom: -0.758, top: 0.723 });
  const OUTER_SPAN = Object.freeze({
    left: SAFE_ZONE.left - OUTER_TARGET.left,
    right: OUTER_TARGET.right - SAFE_ZONE.right,
    bottom: SAFE_ZONE.bottom - OUTER_TARGET.bottom,
    top: OUTER_TARGET.top - SAFE_ZONE.top
  });
  const modelStates = new WeakMap();

  const emptyBounds = () => ({ left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity });
  const includePoint = (bounds, x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    bounds.left = Math.min(bounds.left, x);
    bounds.right = Math.max(bounds.right, x);
    bounds.bottom = Math.min(bounds.bottom, y);
    bounds.top = Math.max(bounds.top, y);
  };
  const serializeBounds = bounds => Number.isFinite(bounds.left)
    ? [bounds.left, bounds.bottom, bounds.right, bounds.top].map(value => value.toFixed(4)).join(',')
    : 'none';

  // Rational saturation has a derivative of 1 at the safe-zone boundary, so
  // an animated vertex crosses the boundary without a visual position jump.
  const compressAxis = (value, minimum, maximum, minimumSpan, maximumSpan) => {
    if (value < minimum) {
      const distance = minimum - value;
      return minimum - minimumSpan * Math.tanh(distance / minimumSpan);
    }
    if (value > maximum) {
      const distance = value - maximum;
      return maximum + maximumSpan * Math.tanh(distance / maximumSpan);
    }
    return value;
  };

  const resolveCoreModel = model => {
    if (model && model.drawables && model.parts) return model;
    if (model && model._model && model._model.drawables && model._model.parts) return model._model;
    return null;
  };

  const makeModelState = core => {
    const partIds = Array.from(core.parts.ids || []);
    if (!REQUIRED_MAO_PARTS.every(id => partIds.includes(id))) return null;
    if (!FX_PART_IDS.every(id => partIds.includes(id))) return null;

    const fxPartIndices = new Set(FX_PART_IDS.map(id => partIds.indexOf(id)));
    const drawableParents = Array.from(core.drawables.parentPartIndices || []);
    const fxDrawableIndices = [];
    const partCounts = new Map(FX_PART_IDS.map(id => [id, 0]));
    for (let index = 0; index < drawableParents.length; index += 1) {
      const partIndex = drawableParents[index];
      if (!fxPartIndices.has(partIndex)) continue;
      fxDrawableIndices.push(index);
      const partId = partIds[partIndex];
      partCounts.set(partId, (partCounts.get(partId) || 0) + 1);
    }

    const fxDrawableSet = new Set(fxDrawableIndices);
    let crossMaskCount = 0;
    const maskCounts = core.drawables.maskCounts || [];
    const masks = core.drawables.masks || [];
    for (let index = 0; index < drawableParents.length; index += 1) {
      const drawableIsFx = fxDrawableSet.has(index);
      const count = maskCounts[index] || 0;
      for (let maskIndex = 0; maskIndex < count; maskIndex += 1) {
        const sourceIndex = masks[index] && masks[index][maskIndex];
        if (Number.isFinite(sourceIndex) && fxDrawableSet.has(sourceIndex) !== drawableIsFx) crossMaskCount += 1;
      }
    }
    // Fail closed when a replacement moc3 couples an FX mask to a body mesh.
    if (crossMaskCount > 0) return null;

    return {
      core,
      active: false,
      backups: new Map(),
      fxDrawableIndices,
      bodyDrawableCount: drawableParents.length - fxDrawableIndices.length,
      crossMaskCount,
      partSummary: FX_PART_IDS.map(id => `${id}:${partCounts.get(id) || 0}`).join('|'),
      observedInput: emptyBounds(),
      observedOutput: emptyBounds()
    };
  };

  const publishDiagnostics = state => {
    const diagnostics = {
      policyId: POLICY_ID,
      fxDrawableCount: state.fxDrawableIndices.length,
      bodyDrawableCount: state.bodyDrawableCount,
      bodyTransformCount: 0,
      crossMaskCount: state.crossMaskCount,
      partSummary: state.partSummary,
      safeZone: { ...SAFE_ZONE },
      outerTarget: { ...OUTER_TARGET },
      observedInput: { ...state.observedInput },
      observedOutput: { ...state.observedOutput }
    };
    global.__MAO_FX_STAGE_CHECK__ = diagnostics;
    if (!global.document || !global.document.documentElement) return;
    const dataset = global.document.documentElement.dataset;
    dataset.maoFxPolicy = POLICY_ID;
    dataset.maoFxDrawableCount = String(diagnostics.fxDrawableCount);
    dataset.maoBodyDrawableCount = String(diagnostics.bodyDrawableCount);
    dataset.maoBodyTransformCount = '0';
    dataset.maoFxCrossMasks = String(diagnostics.crossMaskCount);
    dataset.maoFxParts = diagnostics.partSummary;
    dataset.maoFxInputBounds = serializeBounds(state.observedInput);
    dataset.maoFxOutputBounds = serializeBounds(state.observedOutput);
  };

  const getState = model => {
    const core = resolveCoreModel(model);
    if (!core) return null;
    if (modelStates.has(core)) return modelStates.get(core);
    const state = makeModelState(core);
    modelStates.set(core, state);
    if (state) publishDiagnostics(state);
    return state;
  };

  const restoreEntries = entries => {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      entries[index].vertices.set(entries[index].backup);
    }
  };

  const begin = model => {
    const state = getState(model);
    if (!state || state.active) return null;
    const entries = [];
    state.active = true;
    try {
      for (const drawableIndex of state.fxDrawableIndices) {
        const vertices = state.core.drawables.vertexPositions[drawableIndex];
        if (!vertices || vertices.length === 0) continue;
        let backup = state.backups.get(drawableIndex);
        if (!backup || backup.length !== vertices.length) {
          backup = new Float32Array(vertices.length);
          state.backups.set(drawableIndex, backup);
        }
        backup.set(vertices);
        entries.push({ vertices, backup });
        const isVisible = !state.core.drawables.opacities || state.core.drawables.opacities[drawableIndex] > 0.001;
        for (let vertexIndex = 0; vertexIndex < vertices.length; vertexIndex += 2) {
          const inputX = vertices[vertexIndex];
          const inputY = vertices[vertexIndex + 1];
          if (isVisible) includePoint(state.observedInput, inputX, inputY);
          const outputX = compressAxis(
            inputX, SAFE_ZONE.left, SAFE_ZONE.right, OUTER_SPAN.left, OUTER_SPAN.right
          );
          const outputY = compressAxis(
            inputY, SAFE_ZONE.bottom, SAFE_ZONE.top, OUTER_SPAN.bottom, OUTER_SPAN.top
          );
          vertices[vertexIndex] = outputX;
          vertices[vertexIndex + 1] = outputY;
          if (isVisible) includePoint(state.observedOutput, outputX, outputY);
        }
      }
      publishDiagnostics(state);
      return { state, entries };
    } catch (error) {
      restoreEntries(entries);
      state.active = false;
      if (global.document && global.document.documentElement) {
        global.document.documentElement.dataset.maoFxError = String(error && error.message || error);
      }
      return null;
    }
  };

  const end = token => {
    if (!token || !token.state || !token.entries) return;
    try {
      restoreEntries(token.entries);
    } finally {
      token.state.active = false;
    }
  };

  global.__AIRVANA_MAO_FX_STAGE__ = Object.freeze({
    policyId: POLICY_ID,
    begin,
    end,
    compressAxis,
    safeZone: SAFE_ZONE,
    outerTarget: OUTER_TARGET,
    fxPartIds: FX_PART_IDS
  });
})(typeof window !== 'undefined' ? window : globalThis);
