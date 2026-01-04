/// <reference types="vite/client" />

declare module 'paper' {
  export class PaperScope {
    setup(canvas: HTMLCanvasElement): void;
    project: Project;
  }

  export class Project {
    clear(): void;
    importSVG(svg: string, options?: object): Item;
    exportSVG(options?: object): string | SVGElement;
    activeLayer: Layer;
  }

  export class Layer extends Item {
    children: Item[];
  }

  export class Item {
    bounds: Rectangle;
    children: Item[];
    remove(): void;
    clone(): Item;
    translate(delta: Point): void;
    replaceWith(item: Item): void;
    fillColor: Color | null;
    strokeColor: Color | null;
    strokeWidth: number;
    strokeCap: string;
    strokeJoin: string;
    dashArray: number[];
    dashOffset: number;
    opacity: number;
    clipMask: boolean;
  }

  export class Group extends Item {
    constructor(items?: Item[]);
  }

  export class Path extends PathItem {
    segments: Segment[];
    closed: boolean;
    simplify(tolerance?: number): void;
    static Rectangle(rect: Rectangle): Path;
    static Line(from: Point, to: Point): Path;
  }

  export namespace Path {
    export class Rectangle extends Path {
      constructor(rect: paper.Rectangle): void;
    }
    export class Line extends Path {
      constructor(from: Point, to: Point): void;
    }
  }

  export class PathItem extends Item {
    intersect(path: PathItem, options?: object): PathItem;
    unite(path: PathItem, options?: object): PathItem;
  }

  export class CompoundPath extends PathItem {
    constructor(options?: object);
  }

  export class Rectangle {
    constructor(x: number, y: number, width: number, height: number);
    x: number;
    y: number;
    width: number;
    height: number;
    intersects(rect: Rectangle): boolean;
  }

  export class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  export class Segment {
    point: Point;
  }

  export class Color {
    constructor(color: string);
  }

  const paper: {
    setup(canvas: HTMLCanvasElement): void;
    project: Project;
    Path: typeof Path;
    CompoundPath: typeof CompoundPath;
    Group: typeof Group;
    Layer: typeof Layer;
    Rectangle: typeof Rectangle;
    Point: typeof Point;
    Color: typeof Color;
  };

  export default paper;
}
