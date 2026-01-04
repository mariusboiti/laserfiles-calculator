/**
 * Personalised Sign Generator V3 PRO - Layer Model
 * Document structure and layer management
 */

import type {
  SignDocument,
  Layer,
  LayerType,
  Element,
  TextElement,
  ShapeElement,
  OrnamentElement,
  Artboard,
  BaseShape,
  OutputConfig,
  HoleConfig,
  ElementTransform,
} from '../../types/signPro';
import type { OrnamentId, OrnamentLayerType } from '../../../../assets/ornaments';
import { buildShapePath } from '../shapesV3';

// ============ Default Configuration ============

export const DEFAULT_OUTPUT: OutputConfig = {
  cutStrokeMm: 0.1,
  engraveStrokeMm: 0.5,
  outlineStrokeMm: 0.1,
  units: 'mm',
};

export const DEFAULT_HOLES: HoleConfig = {
  enabled: true,
  diameterMm: 5,
  mode: 'two',
  marginMm: 12,
  spacingXmm: 100,
  offsetXmm: 0,
  offsetYmm: 0,
  insetXmm: 0,
  insetYmm: 0,
  holes: [],
};

export const DEFAULT_ARTBOARD: Artboard = {
  wMm: 400,
  hMm: 200,
  baseShape: {
    shapeType: 'rounded-rect',
    cornerRadius: 15,
    pathD: '',
    bounds: { x: 0, y: 0, width: 400, height: 200 },
  },
};

// ============ Layer Factory ============

export function createLayer(
  type: LayerType,
  name: string,
  order: number
): Layer {
  return {
    id: generateId(),
    name,
    type,
    visible: true,
    locked: false,
    opacity: 1,
    exportEnabled: type !== 'GUIDE',
    elements: [],
    order,
  };
}

export function createDefaultLayers(): Layer[] {
  return [
    createLayer('BASE', 'Base Shape', 0),
    createLayer('ENGRAVE', 'Engrave', 1),
    createLayer('CUT', 'Cut', 2),
    createLayer('OUTLINE', 'Outline', 3),
    createLayer('GUIDE', 'Guides', 4),
  ];
}

// ============ Text Element Factory ============

export function createTextElement(
  lineIndex: 1 | 2 | 3 | 'custom',
  text: string,
  options?: Partial<TextElement>
): TextElement {
  const defaults: TextElement = {
    id: generateId(),
    kind: 'text',
    lineIndex,
    text,
    fontId: 'Milkshake',
    weight: '400',
    sizeMm: lineIndex === 2 ? 48 : lineIndex === 1 ? 24 : 20,
    autoFit: true,
    mode: 'ENGRAVE_FILLED',
    outline: {
      enabled: false,
      offsetMm: 2,
      targetLayerType: 'OUTLINE',
      join: 'round',
      simplify: true,
    },
    transform: {
      xMm: 0,
      yMm: 0,
      rotateDeg: 0,
      scaleX: 1,
      scaleY: 1,
    },
    align: 'center',
    letterSpacingMm: 0,
    lineHeightRatio: 1.2,
    transformCase: 'none',
    curvedMode: 'straight',
    curvedIntensity: 0,
    curved: {
      enabled: false,
      radiusMm: 120,
      arcDeg: 120,
      placement: 'top',
      direction: 'outside',
    },
  };

  return { ...defaults, ...options };
}

// ============ Shape Element Factory ============

export function createShapeElement(
  svgPathD: string,
  style: 'CUT' | 'ENGRAVE',
  source: 'builtin' | 'ai' = 'builtin'
): ShapeElement {
  return {
    id: generateId(),
    kind: 'shape',
    source,
    svgPathD,
    style,
    transform: {
      xMm: 0,
      yMm: 0,
      rotateDeg: 0,
      scaleX: 1,
      scaleY: 1,
    },
  };
}

export function createOrnamentElement(
  assetId: OrnamentId,
  targetLayer: OrnamentLayerType,
  xMm: number,
  yMm: number,
  scale: number
): OrnamentElement {
  return {
    id: generateId(),
    kind: 'ornament',
    assetId,
    transform: {
      xMm,
      yMm,
      rotateDeg: 0,
      scaleX: scale,
      scaleY: scale,
    },
    style: {
      targetLayer,
      strokeMm: targetLayer === 'CUT' ? 0.1 : 0.5,
    },
  };
}

// ============ Document Factory ============

export function createDefaultDocument(): SignDocument {
  const artboard = { ...DEFAULT_ARTBOARD };
  
  // Build base shape path
  const shapeBounds = buildShapePath(
    artboard.baseShape.shapeType,
    artboard.wMm,
    artboard.hMm,
    artboard.baseShape.cornerRadius
  );
  artboard.baseShape.pathD = shapeBounds.pathD;
  artboard.baseShape.bounds = {
    x: shapeBounds.x,
    y: shapeBounds.y,
    width: shapeBounds.width,
    height: shapeBounds.height,
  };

  const layers = createDefaultLayers();

  // Add default text elements to ENGRAVE layer
  const engraveLayer = layers.find(l => l.type === 'ENGRAVE');
  if (engraveLayer) {
    engraveLayer.elements = [
      createTextElement(1, '', { 
        transform: { xMm: artboard.wMm / 2, yMm: 50, rotateDeg: 0, scaleX: 1, scaleY: 1 }
      }),
      createTextElement(2, 'FAMILY NAME', {
        transform: { xMm: artboard.wMm / 2, yMm: artboard.hMm / 2, rotateDeg: 0, scaleX: 1, scaleY: 1 }
      }),
      createTextElement(3, 'EST. 2025', {
        transform: { xMm: artboard.wMm / 2, yMm: artboard.hMm - 40, rotateDeg: 0, scaleX: 1, scaleY: 1 }
      }),
    ];
  }

  // Initialize holes for preset modes
  const holes = { ...DEFAULT_HOLES };
  if (holes.enabled && holes.mode !== 'custom' && holes.mode !== 'none') {
    const { generateHolePositions } = require('../holesPro');
    holes.holes = generateHolePositions(holes, artboard.wMm, artboard.hMm);
  }

  return {
    id: generateId(),
    name: 'Untitled Sign',
    artboard,
    layers,
    activeLayerId: engraveLayer?.id || layers[0].id,
    selection: [],
    output: { ...DEFAULT_OUTPUT },
    holes,
  };
}

// ============ Document Operations ============

export function updateArtboardSize(
  doc: SignDocument,
  newWmm: number,
  newHmm: number
): SignDocument {
  const oldW = doc.artboard.wMm;
  const oldH = doc.artboard.hMm;
  
  if (oldW === newWmm && oldH === newHmm) return doc;

  const scaleX = newWmm / oldW;
  const scaleY = newHmm / oldH;

  // Rebuild base shape
  const shapeBounds = buildShapePath(
    doc.artboard.baseShape.shapeType,
    newWmm,
    newHmm,
    doc.artboard.baseShape.cornerRadius
  );

  const newArtboard: Artboard = {
    wMm: newWmm,
    hMm: newHmm,
    baseShape: {
      ...doc.artboard.baseShape,
      pathD: shapeBounds.pathD,
      bounds: {
        x: shapeBounds.x,
        y: shapeBounds.y,
        width: shapeBounds.width,
        height: shapeBounds.height,
      },
    },
  };

  // Scale all element positions
  const newLayers = doc.layers.map(layer => ({
    ...layer,
    elements: layer.elements.map(el => ({
      ...el,
      ...(el.kind === 'engraveImage'
        ? {
            widthMm: el.widthMm * scaleX,
            heightMm: el.heightMm * scaleY,
          }
        : {}),
      transform: {
        ...el.transform,
        xMm: el.transform.xMm * scaleX,
        yMm: el.transform.yMm * scaleY,
      },
    })),
  }));

  return {
    ...doc,
    artboard: newArtboard,
    layers: newLayers,
  };
}

export function updateBaseShape(
  doc: SignDocument,
  shapeType: Artboard['baseShape']['shapeType'],
  cornerRadius?: number
): SignDocument {
  const radius = cornerRadius ?? doc.artboard.baseShape.cornerRadius;
  
  const shapeBounds = buildShapePath(
    shapeType,
    doc.artboard.wMm,
    doc.artboard.hMm,
    radius
  );

  return {
    ...doc,
    artboard: {
      ...doc.artboard,
      baseShape: {
        shapeType,
        cornerRadius: radius,
        pathD: shapeBounds.pathD,
        bounds: {
          x: shapeBounds.x,
          y: shapeBounds.y,
          width: shapeBounds.width,
          height: shapeBounds.height,
        },
      },
    },
  };
}

export function updateHoleConfig(
  doc: SignDocument,
  updates: Partial<HoleConfig>
): SignDocument {
  const newConfig = { ...doc.holes, ...updates };
  
  // If mode changed or params changed, regenerate hole positions
  // (except for custom mode where holes are manually managed)
  if (newConfig.mode !== 'custom') {
    const { generateHolePositions } = require('../holesPro');
    newConfig.holes = generateHolePositions(
      newConfig,
      doc.artboard.wMm,
      doc.artboard.hMm
    );
  }
  
  return {
    ...doc,
    holes: newConfig,
  };
}

export function updateHolePosition(
  doc: SignDocument,
  holeId: string,
  xMm: number,
  yMm: number
): SignDocument {
  const { clampHolePosition } = require('../holesPro');
  const clamped = clampHolePosition(
    xMm,
    yMm,
    doc.holes.diameterMm,
    doc.holes.marginMm,
    doc.artboard.wMm,
    doc.artboard.hMm
  );
  
  return {
    ...doc,
    holes: {
      ...doc.holes,
      holes: doc.holes.holes.map(h => 
        h.id === holeId ? { ...h, xMm: clamped.xMm, yMm: clamped.yMm } : h
      ),
    },
  };
}

export function addHole(
  doc: SignDocument,
  xMm?: number,
  yMm?: number
): SignDocument {
  const { clampHolePosition } = require('../holesPro');
  const defaultX = xMm ?? doc.artboard.wMm / 2;
  const defaultY = yMm ?? doc.artboard.hMm / 2;
  
  const clamped = clampHolePosition(
    defaultX,
    defaultY,
    doc.holes.diameterMm,
    doc.holes.marginMm,
    doc.artboard.wMm,
    doc.artboard.hMm
  );
  
  const newHole = {
    id: generateId(),
    xMm: clamped.xMm,
    yMm: clamped.yMm,
  };
  
  return {
    ...doc,
    holes: {
      ...doc.holes,
      mode: 'custom',
      holes: [...doc.holes.holes, newHole],
    },
  };
}

export function deleteHole(
  doc: SignDocument,
  holeId: string
): SignDocument {
  return {
    ...doc,
    holes: {
      ...doc.holes,
      holes: doc.holes.holes.filter(h => h.id !== holeId),
    },
  };
}

// ============ Layer Operations ============

export function findLayer(doc: SignDocument, layerId: string): Layer | undefined {
  return doc.layers.find(l => l.id === layerId);
}

export function findLayerByType(doc: SignDocument, type: LayerType): Layer | undefined {
  return doc.layers.find(l => l.type === type);
}

export function updateLayer(
  doc: SignDocument,
  layerId: string,
  updates: Partial<Layer>
): SignDocument {
  return {
    ...doc,
    layers: doc.layers.map(l =>
      l.id === layerId ? { ...l, ...updates } : l
    ),
  };
}

export function reorderLayers(
  doc: SignDocument,
  fromIndex: number,
  toIndex: number
): SignDocument {
  const layers = [...doc.layers];
  const [removed] = layers.splice(fromIndex, 1);
  layers.splice(toIndex, 0, removed);
  
  // Update order values
  const reorderedLayers = layers.map((l, i) => ({ ...l, order: i }));
  
  return { ...doc, layers: reorderedLayers };
}

export function addLayer(
  doc: SignDocument,
  type: LayerType,
  name: string
): SignDocument {
  const maxOrder = Math.max(...doc.layers.map(l => l.order), -1);
  const newLayer = createLayer(type, name, maxOrder + 1);
  
  return {
    ...doc,
    layers: [...doc.layers, newLayer],
    activeLayerId: newLayer.id,
  };
}

export function deleteLayer(doc: SignDocument, layerId: string): SignDocument {
  const layer = findLayer(doc, layerId);
  if (!layer || layer.type === 'BASE') {
    return doc; // Cannot delete BASE layer
  }

  const newLayers = doc.layers.filter(l => l.id !== layerId);
  const newActiveId = doc.activeLayerId === layerId
    ? newLayers[0]?.id || ''
    : doc.activeLayerId;

  return {
    ...doc,
    layers: newLayers,
    activeLayerId: newActiveId,
    selection: doc.selection.filter(id => 
      !layer.elements.some(el => el.id === id)
    ),
  };
}

// ============ Element Operations ============

export function findElement(doc: SignDocument, elementId: string): { layer: Layer; element: Element } | undefined {
  for (const layer of doc.layers) {
    const element = layer.elements.find(el => el.id === elementId);
    if (element) {
      return { layer, element };
    }
  }
  return undefined;
}

export function addElement(
  doc: SignDocument,
  layerId: string,
  element: Element
): SignDocument {
  return {
    ...doc,
    layers: doc.layers.map(l =>
      l.id === layerId
        ? { ...l, elements: [...l.elements, element] }
        : l
    ),
  };
}

export function updateElement(
  doc: SignDocument,
  elementId: string,
  updates: Partial<Element>
): SignDocument {
  return {
    ...doc,
    layers: doc.layers.map(layer => ({
      ...layer,
      elements: layer.elements.map(el =>
        el.id === elementId ? { ...el, ...updates } as Element : el
      ),
    })),
  };
}

export function deleteElement(doc: SignDocument, elementId: string): SignDocument {
  return {
    ...doc,
    layers: doc.layers.map(layer => ({
      ...layer,
      elements: layer.elements.filter(el => el.id !== elementId),
    })),
    selection: doc.selection.filter(id => id !== elementId),
  };
}

export function moveElementToLayer(
  doc: SignDocument,
  elementId: string,
  targetLayerId: string
): SignDocument {
  const found = findElement(doc, elementId);
  if (!found) return doc;

  const { layer: sourceLayer, element } = found;
  if (sourceLayer.id === targetLayerId) return doc;

  return {
    ...doc,
    layers: doc.layers.map(layer => {
      if (layer.id === sourceLayer.id) {
        return {
          ...layer,
          elements: layer.elements.filter(el => el.id !== elementId),
        };
      }
      if (layer.id === targetLayerId) {
        return {
          ...layer,
          elements: [...layer.elements, element],
        };
      }
      return layer;
    }),
  };
}

// ============ Selection Operations ============

export function setSelection(doc: SignDocument, elementIds: string[]): SignDocument {
  return { ...doc, selection: elementIds };
}

export function addToSelection(doc: SignDocument, elementId: string): SignDocument {
  if (doc.selection.includes(elementId)) return doc;
  return { ...doc, selection: [...doc.selection, elementId] };
}

export function removeFromSelection(doc: SignDocument, elementId: string): SignDocument {
  return { ...doc, selection: doc.selection.filter(id => id !== elementId) };
}

export function clearSelection(doc: SignDocument): SignDocument {
  return { ...doc, selection: [] };
}

export function setActiveLayer(doc: SignDocument, layerId: string): SignDocument {
  return { ...doc, activeLayerId: layerId };
}

// ============ Utility ============

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
