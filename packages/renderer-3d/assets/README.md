# 3D asset provenance

The MVP renderer uses project-owned procedural geometry assembled from Three.js primitives. No third-party models, textures, fonts, or binary assets are redistributed by this package.

`src/assets/modelManifest.ts` is the authoritative renderer manifest. Each entry identifies its procedural geometry and fallback behavior. Future GLB entries must record their source, author, license, and modification history here before they are committed.

The capital uses `src/assets/CapitalModel.tsx`: a low-poly ivory civic hall with entrance steps, four columns, side wings, and a raised gold dome. Team color appears on the wing roofs, entrance roof, and dome drum. It follows entity orientation and shares ordinary selection and team markers, with its health bar above the dome finial. Other buildings retain the generic peaked-roof fallback. The manifest owns model-specific health-bar heights. All capital geometry is project-authored without external assets or dependencies.

The leader uses `src/assets/LeaderModel.tsx`: a low-poly crowned commander with a team-colored cape and staff jewel, dark armor, and gold shoulder plates. Its orientation follows the board entity, and its health bar sits above the crown. The model shares the ordinary entity selection, movement, team markers, and reduced-motion behavior. Other people and unknown assets retain the generic person fallback. All geometry is project-authored, with no external assets or downloads.

The construction worker uses `src/assets/ConstructionWorkerModel.tsx`: a low-poly builder with a yellow hard hat, reflective safety vest, work boots, and a raised hammer. The uniform retains the owning team's color, its orientation follows the board entity, and its health bar clears the hard hat and tool. Other workers, people, and unknown assets retain the generic person fallback. All geometry is project-authored, with no external assets or downloads.
