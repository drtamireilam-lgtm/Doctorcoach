# Excel program import

Entry: team client file → program builder → Import a program from Excel. Assigned
coaches and the configured physician-owner can use it for their linked clients.
The existing assignment, draft permissions, revision guard and review/publish flow
remain authoritative. Import fills local editor state only; it does not publish or
write a client program. Replacing nonempty local editor content requires a checkbox.

The XLSX workbook is read on the coach's device with fflate and fast-xml-parser.
No workbook upload, AI service, external relationships, macros or formula execution
is used. Only recognized OOXML workbook, relationship, shared string and worksheet
parts are extracted, within compressed/decompressed size, row and cell limits.
Hidden sheets are excluded. Source formulas require manual value review.

Supported first release: choose one visible worksheet and its header row; confirm
or map exercise, sets, repetitions, load, RPE/RIR, tempo, notes, day, section and unit
columns. Standalone workout labels define blocks. A–G map to slots 1–7 when free;
other labels receive distinct available slots. Coaches can change the mapping.
Exact unique library names/IDs in Hebrew or English are preselected. Token-overlap
suggestions are selectable by the coach and never automatically assigned.
Unknown exercises, malformed values and duplicate exercises in a day block acceptance.
Rows can be explicitly skipped. At most 30 exercises are accepted per program.

`reps` remains the lower/single target; optional `repsMax` preserves the upper bound.
Workout set entries initialize to the lower bound and record actual repetitions.
Load calculations continue to use actual set performance, not the imported range.
A blank source load uses `weightUnspecified`; it is distinct from an explicit zero
and must never be interpreted as a bodyweight prescription. Session snapshots
retain both fields. Timed units reject repetition ranges and exercise tempo.

The enhanced importer ignores format-only rows beyond the data area. Actual data
still must be within rows 1–500 and columns A–AF. An unnamed exercise column directly
before Sets is suggested only when at least three recognizable prescription rows
support it. The coach confirms mapping, the header row and table end; default end
stops after three empty rows so later comparison tables remain outside the import.

Weekly columns can be selected as source information. Strict parsing supports
weight×reps, repeated grouped sets and comma-separated combinations; incomplete
sets, substitutions, bodyweight shorthand or narrative comments remain raw text
for manual review. Selecting a source weight, or choosing the highest parsed load
for all rows, is an explicit coach action that changes only draft starting weights.
Historical repetitions never replace planned repetitions and no completed workout
or progress record is created. Copying a log into exercise notes is optional.
The coach may explicitly choose one uniform RPE, including a suggestion from a
`(*7.5)` style week heading; otherwise each prescription retains its original target.

Custom `d-m`/`dd-mm` date formats are read back as displayed day-month text with a
mandatory source-review flag. The importer does not silently interpret these as
repetition ranges. Formula text remains unevaluated; cached values require review.
Calculated load tables can be imported through explicit column mapping and a
coach-selected target, with formula review; the Excel RPE chart is not executed.

Limits: XLSX only, 5 MB compressed, 8 MB extracted relevant XML, 12 visible worksheets,
60 candidate exercise rows and 7 days, up to 30 accepted exercises. Free-form prose,
charts, arbitrary merged multi-table layouts, multiple weeks simultaneously,
PDF/images and legacy XLS/CSV require manual mapping or separate files. This is
program-and-source-week import, not migration of workout history. No new library
exercises are created. Tests use synthetic workbooks; personal source files are not
committed to the repository.
