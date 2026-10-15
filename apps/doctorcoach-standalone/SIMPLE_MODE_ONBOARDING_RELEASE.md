# Simple Mode onboarding follow-up

Restored the canonical source at published v82, commit `02344de4dfb048746a46ab1c238f2d7806b5cb06`, after local workspace cleanup. No payment branch changes are included.

The welcome overview now follows the seven existing trainee navigation destinations in the same order. It explains the assigned-coach program, active workout within My Program, settings/subscription within My File, consolidated progress, published videos and contact tools. Lior is correctly described as a male dietitian; nutrition is conditional on availability and account assignment. Removed obsolete rendering-time string substitutions in favor of the updated prepared text.

Questionnaire fields, step navigation, consent versions, saved answers, clinical restrictions, authentication, database and storage remain unchanged. Welcome-card IDs are presentation-only and not persisted in intake records.

Validation: TypeScript passed; production build passed; all 618 automated tests passed, including a navigation consistency check for the seven onboarding areas. `git diff --check` passed. This follow-up does not establish authenticated browser, physical mobile or filmed-video playback verification; a test trainee with an assigned test program remains necessary for that pass.
