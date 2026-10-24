# Clinical learning for LAB

Approved direction: extend the existing LearningArea with Anatomy, Physiology and Supplements inside the existing main navigation entry. Preserve AnatomyWorkspace, its region/muscle deep links, exercise callbacks, legacy guides and DoctorCoach guide. Use the current React components, semantic links, native details, language context and appearance tokens.

Use a typed bilingual educational content catalog with stable IDs, related IDs, source metadata and an actual literature-review date. Four physiology topics explain mechanisms and training implications. Three supplement entries explain mechanism, evidence and limits, risks, interactions and when professional consultation is needed. No individualized advice or physician approval claims.

Clinical styling reduces decoration and improves hierarchy and spacing while preserving chosen colors, light/dark mode and persistence. Nutrition copy assigns personal nutrition care to a licensed clinical dietitian; the physician provides medical assessment, blood-test interpretation and coordination. Future disease-specific pathways are explicitly planned and unavailable.

Considered: adding an extra landing page vs direct section links. Direct links were recommended and accepted by the user ('תמשיך'); they preserve the current entry flow and avoid an extra navigation step.

LAB only; no main merge, production deployment, schema migration or user-data changes. Verify route/history behavior, bilingual mobile/desktop UI, keyboard operation, themes, atlas regression, typecheck, unit suite and standalone LAB build. Deploy only if existing credentials permit; report exact blockers.
