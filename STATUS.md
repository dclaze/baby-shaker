# Baby Shaker Status

Updated: 2026-03-28 13:51 PDT

## Project

- Repo: `/Users/mv_server/Development/baby-shaker`
- Branch: `codex/mobile-migration`
- HEAD: `934b4a89521c0ace855a79c8c7e639058edda422` (`934b4a8`)
- App: `@dclaze/bambina-baby-shaker`
- Display name: `Baby Shaker`
- Expo project id: `dbafae7b-cd85-4922-bd73-72702c47f027`
- Openbox Discord operating preference updated at `2026-03-28 13:51 PDT`:
  - validated local Baby Shaker changes should now be committed and pushed automatically by default
  - still stop for confirmation when an action has meaningful release risk or data risk

## Current State

- Pipeline config updated locally to align Discord and install flow with current requests.
- TypeScript validation passed at `2026-03-28 13:11 PDT` via `npm run typecheck`.
- Accelerometer behavior updated locally at `2026-03-28 14:08 PDT` in `App.tsx` to behave more like a physical baby shaker:
  - motion response is no longer gated behind a recent screen tap
  - tilt now continuously drives toy rotation/pulse
  - shake detection now uses smoothed linear acceleration with a much shorter trigger cadence
  - haptics now scale between light and medium based on shake strength
- Tap-to-spawn coordinate handling updated locally at `2026-03-28 14:30 PDT` in `App.tsx`:
  - particle bursts now use `pageX/pageY` instead of `locationX/locationY`
  - tap coordinates are normalized against the root screen view before spawning visual effects
  - intended fix: taps in the upper half of the screen should no longer collapse toward the top edge when child views become the event target
- Main-screen branding updated locally at `2026-03-28 13:41 PDT` in `App.tsx`:
  - top title now reads `baby shaker` instead of `bambina`
  - bottom footer now reads `bambina by openbox`
  - change is scoped to the in-app main screen and does not alter Expo/app-store identifiers
- App display-name update prepared locally at `2026-03-28 13:43 PDT`:
  - `app.json` Expo app name now reads `Baby Shaker`
  - Android screen-pinning guidance now refers to `Baby Shaker`
  - `artifacts/expo-go-redirect.html` title and heading now read `Baby Shaker`
  - README title/intro now use `Baby Shaker`
  - change is scoped to user-facing naming and does not alter the Expo slug, scheme, bundle identifier, Android package, or EAS project id
- Parent single-app play flow expanded locally at `2026-03-28 13:47 PDT` in `App.tsx`:
  - parent controls now route into a dedicated single-app play setup modal instead of only showing static tips
  - the setup flow shows exit instructions before resuming baby mode so parents see how to leave Guided Access or pinned mode before handoff
  - Android now attempts to launch native settings via `Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS')` with a general Settings fallback
  - iPhone now explicitly discloses that Guided Access cannot be opened or verified programmatically from this app; only app settings can be opened
  - the modal requires parent acknowledgement of exit steps, native setup responsibility, and the app's inability to verify native lock state automatically
- GitHub preview workflow run `23690467422` completed successfully at `2026-03-28 10:46 PDT` for commit `934b4a89521c0ace855a79c8c7e639058edda422`.
- Existing known build links:
  - Android preview APK: `https://expo.dev/artifacts/eas/waZpjf9qWFp9Hc6dZcCZSn.apk`
  - iOS store/internal IPA: `https://expo.dev/artifacts/eas/gh5VVVyr5Qc1m9SyPj697n.ipa`
  - iOS ad hoc build details page: `https://expo.dev/accounts/dclaze/projects/bambina-baby-shaker/builds/f7156452-74f5-4736-860a-a3855216e846`
- Pending local workflow changes prepared at `2026-03-28 13:34 PDT`:
  - `.github/workflows/preview-builds.yml` now targets the `preview` iOS profile instead of `production`, so future `main` preview runs should produce a direct-install internal/ad hoc iPhone build instead of only a store-style IPA.
  - `.github/workflows/merge-notifications.yml` was added to post concise Discord notifications when a pull request is merged into `main`.
- Validation in this run at `2026-03-28 13:34 PDT`:
  - `node --check scripts/post-build-to-discord.mjs`
  - `node --check scripts/post-merge-to-discord.mjs`
  - `npm run typecheck`
- Validation in this run at `2026-03-28 14:09 PDT`:
  - `npm run typecheck`
- Validation in this run at `2026-03-28 14:30 PDT`:
  - `npm run typecheck`
- Validation in this run at `2026-03-28 13:41 PDT`:
  - `npm run typecheck`
- Validation in this run at `2026-03-28 13:43 PDT`:
  - `npm run typecheck`
- Validation in this run at `2026-03-28 13:47 PDT`:
  - `npm run typecheck`

## Blockers

- The iOS ad hoc build `f7156452-74f5-4736-860a-a3855216e846` could not be re-verified from this shell because Expo CLI is not authenticated here and the public Expo build page does not expose final status server-side.
- The new workflow behavior is not live until the updated repo files are committed and pushed.
- The tap-position fix is only local until a new preview or release build is produced from the updated code.
- The main-screen branding update is only local until a new preview or release build is produced from the updated code.
- The display-name update to `Baby Shaker` is only local until a new preview or release build is produced from the updated code.
- The new single-app play flow is only local until a new preview or release build is produced from the updated code.
- Native OS lock state remains unverifiable from this Expo app:
  - iOS does not expose Guided Access state or a public deep link into the Guided Access menu
  - Android settings can be opened, but final app pinning still requires a manual OS-level action outside the app

## Notes

- Repo-local handoff file was missing and was created in this run to satisfy the AGENTS.md status-file rule.
- The retained Discord channel state only preserved one actionable earlier request: verify write access. That check is already complete and succeeded.
- Preview artifacts are inconsistent:
  - `artifacts/index.html` points to `exp://192.168.4.41:8083`
  - `artifacts/expo-go-redirect.html` points to `exp://192.168.4.41:8082`
  - No generator script was found in this repo for those files, so the correct current port needs confirmation before normalizing them.

## Immediate Next Steps

- Commit and push the current app and workflow changes on `codex/mobile-migration`.
- Dispatch a fresh preview build from this branch so a new tester link exists for the tap-position fix, naming updates, and single-app play flow.
- Test the updated shake thresholds on a physical iPhone and Android device; adjust the linear-acceleration thresholds if the toy feels too chatty or too hard to trigger.
- Verify on physical devices that upper-screen taps now spawn particles at the touched position across the full screen, especially over the header and center toy area.
- Verify on device that the main screen now shows `baby shaker` at the top and `bambina by openbox` only at the bottom.
- Verify on device that the installed app label and Android pinning flow now use `Baby Shaker`.
- Validate the new single-app play modal on physical iPhone and Android devices:
  - confirm the exit instructions are clear before entering Guided Access or screen pinning
  - confirm Android settings launch correctly on the target device family
  - confirm the iPhone copy is sufficient given the lack of a public Guided Access deep link
- Re-verify iOS ad hoc build `f7156452-74f5-4736-860a-a3855216e846` from an authenticated Expo session and confirm the exact install page/link Discord should share for iPhone testing.
- Decide whether the static preview artifacts should be regenerated or removed; do not keep both `8082` and `8083` links live.
