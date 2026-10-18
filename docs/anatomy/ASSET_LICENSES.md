# Asset and license register

- New geometry: original procedural ellipsoid primitives authored in `src/anatomy/main.tsx` for DoctorCoach in this task. No downloaded mesh, commercial atlas, photograph, texture, rig or motion capture asset. No external attribution obligation attached by this implementation; this is provenance documentation, not a legal opinion or exclusivity guarantee.
- New anatomical records: original concise factual draft in `src/anatomy/muscles.json`. No copied source images or passages. Sources consulted for fact-checking are listed in ANATOMICAL_VALIDATION.md; their content licenses are not treated as asset licenses.
- Three.js: MIT, https://github.com/mrdoob/three.js/blob/dev/LICENSE ; exact installed version in package-lock.json, upstream notice in node_modules/three/LICENSE. Commercial use/modification permitted subject to retaining MIT notice.
- React Three Fiber: MIT, https://github.com/pmndrs/react-three-fiber/blob/master/LICENSE ; exact version in package-lock.json, npm package metadata declares MIT; this installed package does not include a LICENSE file, so obtain the upstream notice before distributing a bundled release. Retain notice.
- Other runtime dependencies: existing React/React DOM (MIT), Three.js transitive dependencies as locked; no claim of a complete legal audit of the existing repository.
- `inventory/` snapshots preserve existing project source data including image metadata and URLs. No third-party image bytes are copied or displayed in the prototype. Gray plates' existing public-domain declarations have NOT been newly verified. Verify each source/derivative, attribution and jurisdiction before importing any such image into this viewer.

Release condition: retain bundled dependency license notices and audit any future glTF, texture, animation, font or atlas asset individually for explicit commercial modification/distribution rights. Do not import commercial anatomy-app models or restricted educational figures.
