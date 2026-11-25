# ScrapLoop material-loop sculpture

An original Blender-authored miniature material exchange: a central sawtooth-roof factory, recovered-copper stack, radial roller conveyor, scanner gate, and six moving pallets carrying copper coils, polymer offcuts and cardboard bales. It is a conceptual illustration, not a live view of facilities, materials or classifier results.

The animation is an 8-second closed loop at 30 fps. Carrier transforms repeat exactly at the start/end; a scanner indicator gently changes width. The single scene animation is exported in the GLB. Browser camera movement is separate from the authored animation.

Files:

- `material_loop.py`: reproducible Blender Python geometry/material/animation/studio generator.
- `material-loop.blend`: editable scene, lights, camera and animation.
- `../../dist/assets/3d/material-loop.glb`: optimized web geometry with embedded animation.
- `../../dist/assets/3d/material-loop-poster.webp`: rendered fallback poster.

Rebuild using Blender 4.5 LTS:

```bash
blender --background --python design/blender/material_loop.py
```

The script writes the GLB, the editable .blend and a transparent PNG poster. Convert the PNG to WebP for the shipped browser poster, then remove or leave the PNG untracked. No Blender installation is needed to run the website. Blender was downloaded from its official release/mirror and the archive checksum was verified before use.

The locally hosted `@google/model-viewer` component renders the GLB. All required geometry/materials are embedded, with no external textures, HDR images, decoder downloads or CDN scripts. The CSP permits WebAssembly compilation (`wasm-unsafe-eval`) for the viewer's bundled decoder initialization; JavaScript eval and remote scripts stay blocked. The vendor bundle is copied from the pinned npm dependency; its license is in `dist/vendor/model-viewer.LICENSE`. Refresh it with `npm run assets:vendor` after dependency upgrades.

The component supports drag-to-rotate and sits directly on the page with a transparent background, without an exhibit frame or playback control. It starts paused for reduced-motion preferences, pauses when off-screen or the tab is hidden, and releases listeners on navigation. A rendered static poster remains visible when loading or when WebGL cannot run. On mobile, vertical gestures continue scrolling the page.
