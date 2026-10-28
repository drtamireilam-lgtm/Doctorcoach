# Excel import repair and smart validation

> Implement with superpowers:executing-plans; reader work uses dispatching-parallel-agents.

Goal: Repair semantic mapping, reject invalid prescriptions, preserve kg/lb measurement basis, verify the eight-row leg workbook through saved program reload and workout start.

Architecture: Retain canonical IDs, XLSX parser, existing guarded assignment and kg calculation formulas. Replace positional mapping guesses with header/content evidence. Add bounded CSV. Store optional load-source metadata in self/coached prescriptions; display units independently and block total-load strength calculations for per-side measurements. Preserve all previous UI spacing/theme work.

- [ ] RED cases: misplaced name, ambiguous/duplicate headers, missing Movement/Target RPE aliases, invalid text and Unit=lb.
- [ ] Semantic mapping and structured field/row validation; no inferred sets or RPE.
- [ ] CSV and XLSX merge diagnostics; bounded reader and explicit unsupported XLS handling.
- [ ] Load source value/unit/basis and canonical kg conversion once; storage, templates, reload, session and calculation safety.
- [ ] Expandable mobile preview, correctable fields, explicit units and approval, duplicate warnings.
- [ ] Synthetic XLSX containing exact eight user rows; explicit mapping of Legs1/Legs2/LegCurl; all eight persisted, reload and start; assignment idempotency.
- [ ] Targeted/full regression, typecheck, lint baseline comparison, Linux build and Worker smoke.
- [ ] Publish PR27 update and exact verified CI artifact to isolated LAB, retain users/main/Production; report live acceptance limitations.

Initial evidence: fallback guesses name immediately before sets; first duplicate header wins; several semantic aliases missing; Unit only denotes reps/time; load-unit metadata absent; 740px preview; XLSX/PDF input only. No named leg workbook found in workspace. Continue latest da1f470 branch feature/doctorcoach-2-smart-workout-20261020 (PR27); preferred old branch lacks full application. No destructive changes or real user-record writes.
