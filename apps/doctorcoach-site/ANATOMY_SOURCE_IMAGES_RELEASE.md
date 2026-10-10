# Selected anatomical source illustrations

2026-10-10. Inspected the existing navigation mockup and prepared muscle metadata.
Prepared policy prefers Commons/public-domain/licensed source images, unchanged;
the catalog's search links and section flags are not selected images or completed
origin/insertion/innervation content. No generated anatomical redraw was used.

Added two unchanged source illustrations to six existing muscle records:

| Source | Records | Source evidence |
| --- | --- | --- |
| Gray — deltoideus.png | deltoid | Commons description identifies a deltoid highlight; Carter/Helgo13 attribution, public-domain mark, 530 × 647 |
| Gray414.png | biceps-brachii, brachioradialis, flexor-carpi-radialis, flexor-carpi-ulnaris, palmaris-longus | Commons original plate/source, recorded original labels, Carter attribution, public-domain mark, 227 × 700 |

Sources inspected 2026-10-10:
- https://commons.wikimedia.org/wiki/File:Gray_%E2%80%94_deltoideus.png
- https://commons.wikimedia.org/wiki/File:Gray414.png

Rejected `Gray — musculus biceps brachii.png`: its page describes a sternothyroid
highlight despite the filename. Do not auto-select illustrations from names/search
results alone. Gray414 is labelled as a complete source plate, not an isolated
highlight of each associated muscle.

The muscle page displays its selected source image, original-size/source links,
credit/license and an accessible error fallback. Lists identify records with a
selected illustration. Other source-search links remain available. Source images
are loaded directly from Wikimedia with no referrer; they depend on third-party
availability, and no runtime/private user data is appended to their URLs.

Verification: catalog binding/provenance regression tests, full suite, TypeScript
and production build. Source pages and original URLs were retrieved; actual image
rendering in the app remains a browser acceptance gap. Selection/licensing checks
are not clinician approval of learning content. Inline coverage is partial; most
records still need a selected illustration, and animations remain unfinished.
