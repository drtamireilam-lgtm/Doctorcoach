# Anatomical animation architecture

The exercise detail supplies a canonical catalog ID. The animation registry resolves exact IDs and returns separate technical, review and visibility states. Workout persistence, imports, catalog search and execution video resolution stay on their existing paths. An unlinked import never enters animation lookup as a catalog identity.

## Runtime path

- `lib/exercise-animation-registry.ts` records the three pilot variants, known limitations, and compatibility of the available motion.
- `lib/anatomy-exercise-motion.ts` holds the source-space joint calibration and periodic curve. The curve starts and ends at neutral with zero velocity and reaches peak flexion halfway through the repeat.
- `lib/anatomy-motion-rig.ts` binds source-mesh descendants to independent local pivots. It admits only the expected source model, digest and inventory. Geometry retains the original scale and vertex data. Anatomical labels and muscle IDs come from the atlas.
- `components/exercise-anatomical-demo.tsx` mounts the interactive player on demand. The existing press preview remains available in the existing exercise flow.
- `lib/anatomy-canvas.ts` owns renderer, scene, camera and resource cleanup. The shared asset pipeline validates bytes before parsing. Each player owns its scene transforms and materials.

## Teaching modes and release

The curl study illustrates elbow movement with rigid bones. The neutral muscle reference preserves source attachments and distinguishes selected anatomy from contribution colors. The legend describes provisional qualitative roles. Phase boundaries describe playback; phase-specific muscle annotations require expert approval and explicit renderer support before display.

A public interactive animation requires technical readiness, approved content and a public visibility entry. The current study is LAB-only. The blocked bench and squat entries are retained as authoring targets. Existing clips and training videos have their own release path. A new movement family may need a new adapter, but compatible content can reuse the player and atlas path.

See [asset audit](ANIMATION_CAPABILITY_AUDIT.md), [pilot scope](PILOT_EXERCISE_SPECIFICATIONS.md), and [authoring template](EXERCISE_ANIMATION_CONTENT_TEMPLATE.md).
