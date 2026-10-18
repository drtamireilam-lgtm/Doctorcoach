# Visual trim selection

The source preview now seeks immediately when either boundary moves. A shared left-to-right timeline has native start/end slider handles, touch targets and keyboard controls, plus numeric inputs for precise adjustment. Handles cannot cross; the minimum interval is 0.25 seconds. Preview playback uses the selected interval; preparing a file remains a separate explicit action and changing the interval invalidates the prepared file. Upload authorization and storage are unchanged. No migration required.

Verification: selection-boundary regression tests and the full automated suite, TypeScript and standalone build are run for this change. These do not establish iPhone touch/decoder behavior. Verify on the deployed staging build: move each handle and check its displayed frame, preview only the selected interval, prepare the cut, then adjust again and ensure the old prepared file cannot be uploaded.
