/** vite.config.ts의 define: package.json 버전 */
declare const __APP_VERSION__: string;

/** exifr 경량 빌드 (패키지가 타입을 루트에만 둔다) */
declare module 'exifr/dist/lite.esm.mjs' {
  import exifr from 'exifr';
  export default exifr;
}
