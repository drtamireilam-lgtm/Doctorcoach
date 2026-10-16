# VBT implementation checkpoint

This branch contains a small, testable Python reference engine and fail-closed tracking gates. It is NOT a validated barbell detector and has NOT been wired into the DoctorCoach production app.

The consolidated historical prototypes remain in the private ChatGPT Library backup. They are not automatically production-ready. The October squat, bench, and deadlift tracks were visually rejected for following background equipment.

## Next steps
1. Add manually annotated plate/bar bounding boxes to a small consented private test set.
2. Validate tracked object identity with overlay video and quantitative ground truth.
3. Calibrate pixels to metres; report uncertainty and camera assumptions.
4. Integrate a real detector and temporal tracker behind the quality gates.
5. Only then add repetition segmentation, RPE/RIR personal calibration, and separately validated IPF cues.

Run locally: `PYTHONPATH=src pytest -q tests/vbt`.
Do not commit training videos or personal health data.
