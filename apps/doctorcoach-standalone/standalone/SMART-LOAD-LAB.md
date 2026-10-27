# Smart Load Engine LAB candidate

Source: 94ed8e2a3efa93ebf9aa6b054638bd5c14a2b307.

This release includes automatic equipment-bounded next-set loads, persisted manual overrides, read-only opening suggestions and the existing LAB premium palette changes.

Validation: 1,334 standalone tests passed; TypeScript, isolated staging build, configuration check and built Worker runtime smoke passed. Live LAB acceptance remains pending.

Deploy only to doctorcoach-isolated-staging using the checked dist/server/wrangler.json. No main merge or Production deployment is authorized.

The anatomy branch now includes this full Smart Load candidate through 49969c3 plus the interactive BodyParts3D shoulder. Combined validation: 1,358 unit tests, TypeScript, builds, isolated configuration check and 16 browser checks passed. This documentation update requests a fresh LAB Git build after dashboard branch configuration; live deployment remains unverified.
