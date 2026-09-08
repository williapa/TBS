# 3D asset provenance

The MVP renderer uses project-owned procedural geometry assembled from Three.js primitives. No third-party models, textures, fonts, or binary assets are redistributed by this package.

`src/assets/modelManifest.ts` is the authoritative renderer manifest. Each entry identifies its procedural geometry and fallback behavior. Future GLB entries must record their source, author, license, and modification history here before they are committed.

The leader uses `src/assets/LeaderModel.tsx`: a low-poly crowned commander with a team-colored cape and staff jewel, dark armor, and gold shoulder plates. Its orientation follows the board entity, and its health bar sits above the crown. The model shares the ordinary entity selection, movement, team markers, and reduced-motion behavior. Other people and unknown assets retain the generic person fallback. All geometry is project-authored, with no external assets or downloads.
