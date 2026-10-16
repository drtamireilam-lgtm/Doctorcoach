# Automatic next-set load — phone test correction

The owner reproduced 20 kg x 8 at actual RPE 6 / target 8. The next set initially had 10 reps and target 8, producing 20 kg. Editing next reps to 8 did not update its weight field. Equipment rounding at 2.5 kg also concealed the fractional calculated increase in the old automatic application path.

Changes:
- Automatic mode is enabled by default in the set editor and applies the calculated (one-decimal) next-set load on source-set save, independently of the optional bounded equipment button.
- Editing reps or effort target of an unperformed next set recalculates its weight field from the saved preceding set immediately. No extra calculate/apply click is needed. The user can override the field manually.
- Preserve completed or partially recorded execution, later completed sets, pain gates, explicit automatic opt-out, other unsaved drafts, optimistic versions, ownership and saved program isolation.
- Equipment application remains an explicitly labeled optional action. Legacy API clients without calculated mode retain the existing equipment behavior.

Synthetic regression examples: 20 x 8 @6 -> next 8 @8 = 21.0; next 8 @9 = 21.5; previous 20 x 8 @9 -> next 8 @8 = 19.5. Persisted fractional example: 100 x 5 @6 -> next 5 @8 = 105.4; later sets and the original plan remain unchanged.

Verification: 1,127 automated tests passed, zero failed. TypeScript and production build are checked separately. This is an implementation heuristic, not evidence validating an individual's physical load or 1RM. Live phone confirmation requires a separate Staging deployment; the screenshot preceded this correction. No user data or pilot deployment is modified by this commit.
