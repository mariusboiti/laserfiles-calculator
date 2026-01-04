declare module 'pathkit-wasm' {
  interface PathKitInitOptions {
    locateFile?: (file: string) => string;
  }

  interface PathKit {
    fromSVG: (d: string) => any;
    toSVG: (path: any) => string;
    union: (a: any, b: any) => any;
    difference: (a: any, b: any) => any;
    intersect: (a: any, b: any) => any;
    xor: (a: any, b: any) => any;
    stroke: (path: any, opts: any) => any;
    simplify: (path: any, options?: any) => any;
    getFillType: (path: any) => any;
    setFillType: (path: any, type: any) => any;
    op: (a: any, b: any, op: any) => any;
    MakePath: (d: string) => any;
  }

  function PathKitInit(options?: PathKitInitOptions): Promise<PathKit>;

  export default PathKitInit;
}
