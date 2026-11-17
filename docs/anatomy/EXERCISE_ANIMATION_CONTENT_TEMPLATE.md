# Exercise animation content template

Duplicate this template for each specific variant and submit it with supporting references.

| Field | Supply |
| --- | --- |
| Catalog ID and variant | Exact canonical ID and the equipment, position and grip variant |
| Names | Hebrew and English, including a concise variant label |
| Starting position | Orientation, joint position, supports and contacts |
| Equipment | Item, placement and contact points |
| Joint movement | Joints, planes, coordinated movements and intended limits |
| Phases | Ordered labels in both languages, transition criteria and return to start |
| Teaching cues | Concise Hebrew and English instructions pertinent to this variant |
| Muscle roles | Atlas IDs, qualitative roles, rationale and relevant phase when reviewed |
| Demonstration errors | Visible failure cases such as lost contact or inconsistent support |
| Simplifications | Fixed joints, missing contacts, source pose and deformation limits |
| References | Primary sources, relationship to the chosen variant and asset credits |
| Anatomical review | Pending or approved, with reviewer, date and approval scope |
| Technical status | Blocked, prototype or ready, with revision and QA evidence |

The machine-readable example below uses the implemented registry record for a blocked variant. Keep a separate engineering file for source digest, coordinate axes, pivots, mesh descendants, calibration and equipment constraints. A working record additionally supplies the movement driver, start pose, camera, controls, repetition duration, model and role map as shown in the curl entry.

```json
{
  "exerciseId": "back-squat",
  "animationId": "barbell-back-squat-v1",
  "title": {"en": "Squat", "he": "סקוואט"},
  "variantLabel": {"en": "High-bar back squat", "he": "סקוואט עם מוט גבוה על הגב"},
  "notes": {
    "en": "Interactive motion awaits linked hip, knee and ankle calibration, stable foot contact and bar support.",
    "he": "תנועה אינטראקטיבית ממתינה לכיול משולב של הירך, הברך והקרסול, למגע יציב עם הקרקע ולתמיכה במוט."
  },
  "technicalStatus": "blocked",
  "movement": null,
  "equipment": ["barbell"],
  "phases": [],
  "review": "pending",
  "visibility": "hidden",
  "provenance": "DoctorCoach pilot specification"
}
```
