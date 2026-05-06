# Chrome Web Store Reviewer Test Instructions

CanvasBuddy is intended for trusted testers during the first Chrome Web Store submission.

## Test Account Requirements

The main in-page panel requires a Canvas account on a supported host. Supported beta hosts are:

- `https://canvas.tamu.edu/*`
- `https://*.instructure.com/*`

If the reviewer does not have a Canvas login, the popup should still open and show the extension health surface. Review without a Canvas login should report that Canvas is waiting or not yet detected, and the extension should not request any additional account credentials.

## Suggested Review Path With Canvas Access

1. Install the unpacked or store-provided extension in Chrome.
2. Open a supported Canvas page while logged in.
3. Confirm the CanvasBuddy panel mounts once on the right side of the page.
4. Open the extension popup and confirm it shows extension health, Canvas detection, buddy status, and local-only beta status.
5. Choose a starter buddy if prompted.
6. Confirm the daily quest area shows the top Canvas to-dos, projected XP, streak status, and Recheck action.
7. Complete or remove a Canvas to-do, then recheck from CanvasBuddy.
8. Confirm XP is awarded only after the previously tracked Canvas to-do no longer appears in the live Canvas to-do list.

## Suggested Review Path Without Canvas Access

1. Install the extension in Chrome.
2. Open the popup from a non-Canvas page.
3. Confirm the popup loads, the extension toggle works, and the health card explains that Canvas is waiting.
4. Confirm developer diagnostics and XP controls are not visible in the production build.

## Notes

CanvasBuddy does not use remote code, external analytics, or a CanvasBuddy backend during the trusted beta. CanvasBuddy is not affiliated with Instructure, Canvas, Texas A&M University, or any school.
