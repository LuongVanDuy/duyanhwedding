/// <reference types="astro/client" />

// Camera originals retain their uppercase extension for later replacement.
declare module '*.JPG' {
  const image: import('astro').ImageMetadata;
  export default image;
}
