declare module 'imagetracerjs' {
  export function imagedataToSVG(imgd: ImageData, options?: any): string;
  const ImageTracer: {
    imagedataToSVG: typeof imagedataToSVG;
  };
  export default ImageTracer;
}
