# 3D asset provenance

The MVP renderer uses project-owned procedural geometry assembled from Three.js primitives. No third-party models, textures, fonts, or binary assets are redistributed by this package.

`src/assets/modelManifest.ts` is the authoritative renderer manifest. Each entry identifies its procedural geometry and fallback behavior. Future GLB entries must record their source, author, license, and modification history here before they are committed.
