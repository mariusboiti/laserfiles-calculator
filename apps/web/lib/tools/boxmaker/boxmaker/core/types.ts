export enum BoxType {
  simple = 'simple-box',
  hinged = 'hinged-box',
  slidingDrawer = 'sliding-drawer',
  hingedLidPin = 'hinged-lid-pin',
  hingedSidePin = 'hinged-side-pin',
}

export type SharedBoxInputs = {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  thicknessMm: number;
  kerfMm: number;
};

export type HingedInputs = SharedBoxInputs & {
  hingeFingerWidthMm: number;
  hingeClearanceMm: number;
  hingeHoleDiameterMm: number;
  hingeHoleInsetMm: number;
  jointFingerWidthMm: number;
  autoJointFingerCount: boolean;
  manualJointFingerCount?: number;
  autoFingerCount: boolean;
  manualHingeFingerCount?: number;
};

export type Point2D = { x: number; y: number };

export type CircleHole2D = { cx: number; cy: number; r: number };

export type HingedPanel2D = {
  outline: Point2D[];
  holes?: CircleHole2D[];
};

export type HingedBoxPanels = {
  front: HingedPanel2D;
  back: HingedPanel2D;
  left: HingedPanel2D;
  right: HingedPanel2D;
  bottom: HingedPanel2D;
  lid: HingedPanel2D;
};

export type HingedBoxSvgs = {
  front: string;
  back: string;
  left: string;
  right: string;
  bottom: string;
  lid: string;
};

export type SlidingDrawerFrontFaceStyle = 'flush' | 'lip';

export type SlidingDrawerInputs = SharedBoxInputs & {
  drawerClearanceMm: number;
  drawerBottomOffsetMm: number;
  frontFaceStyle: SlidingDrawerFrontFaceStyle;
  fingerWidthMm: number;
  autoFitFingers: boolean;
  dividersEnabled: boolean;
  dividerCountX: number;
  dividerCountZ: number;
  dividerClearanceMm: number;
};

export type SlidingDrawerPanel2D = {
  outline: Point2D[];
  cutouts?: Point2D[][];
};

export type SlidingDrawerOuterPanels = {
  back: SlidingDrawerPanel2D;
  left: SlidingDrawerPanel2D;
  right: SlidingDrawerPanel2D;
  bottom: SlidingDrawerPanel2D;
  top?: SlidingDrawerPanel2D;
};

export type SlidingDrawerDrawerPanels = {
  front: SlidingDrawerPanel2D;
  back: SlidingDrawerPanel2D;
  left: SlidingDrawerPanel2D;
  right: SlidingDrawerPanel2D;
  bottom: SlidingDrawerPanel2D;
};

export type SlidingDrawerSvgs = {
  outer: {
    back: string;
    left: string;
    right: string;
    bottom: string;
    top?: string;
  };
  drawer: {
    front: string;
    back: string;
    left: string;
    right: string;
    bottom: string;
  };
  frontFace?: string;
};
