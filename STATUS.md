# Baby Shaker Status

Updated: 2026-03-30 09:34 PDT

## Project

- Repo: `/Users/mv_server/Development/baby-shaker`
- Branch: `main`
- Current HEAD: `7f5b48d048db3c7d8833a2b4c6f41fca3971e441` (`7f5b48d`)
- App: `@dclaze/bambina-baby-shaker`
- Display name: `Baby Shaker`
- Expo project id: `dbafae7b-cd85-4922-bd73-72702c47f027`
- Openbox Discord operating preference updated at `2026-03-28 13:51 PDT`:
  - validated local Baby Shaker changes should now be committed and pushed automatically by default
  - still stop for confirmation when an action has meaningful release risk or data risk

## Current State

- Commit `6bc714736b7bd7c2b3004abcf23360a6dcd082db` (`6bc7147`) with the app and workflow changes was pushed to `origin/codex/mobile-migration` at `2026-03-28 13:52 PDT`.
- Status refresh commit `23987efb1f9c68fd6d42371cd3e9f6f19f15a230` (`23987ef`) was pushed to `origin/codex/mobile-migration` at `2026-03-28 13:53 PDT`.
- Push-notification commit `bd469859c2394766da2f29d8039b496dae35cdca` (`bd46985`) was pushed to `origin/codex/mobile-migration` at `2026-03-28 14:01 PDT`.
- Status refresh commit `c3cbfa76c7fbd70a6b7a2b02999a9f7d732c2a9e` (`c3cbfa7`) is the current local HEAD on `codex/mobile-migration` as re-verified at `2026-03-29 09:00 PDT`.
- Merge-readiness status refresh commit `742939c3a5122e3686ef7de68f5421fa80e76485` (`742939c`) was pushed to `origin/codex/mobile-migration` and then fast-forwarded onto `origin/main` at `2026-03-29 09:09 PDT`.
- `main` now contains the Baby Shaker app, preview workflow, release workflow, and Discord notification workflows.
- GitHub Actions state re-verified from the public repo at `2026-03-29 09:14 PDT`:
  - Push Notifications run `23711426918` for commit `742939c` succeeded
  - Preview Builds run `23711426916` for commit `742939c` is in progress
- Single-app lock journey commit `7f5b48d048db3c7d8833a2b4c6f41fca3971e441` (`7f5b48d`) was pushed to `origin/main` on `2026-03-29`:
  - Android setup CTA now targets Security settings instead of Accessibility settings
  - the setup flow distinguishes first-time setup from repeat quick-start
  - iPhone and Android journeys are now more explicit and platform-specific
- Repo-local handoff file was refreshed again immediately after that push so future runs do not need to rediscover the push-notification state.
- Pipeline config updated and pushed to align Discord and install flow with current requests.
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
- Single-app lock journey refined locally at `2026-03-29 09:28 PDT` in `App.tsx`:
  - Android setup CTA now targets `android.settings.SECURITY_SETTINGS` instead of Accessibility settings so parents land closer to App pinning / Screen pinning
  - the modal now splits into a first-time device setup journey and a repeat-use quick-start journey
  - iPhone guidance now clearly distinguishes one-time Guided Access setup from the per-handoff triple-click start flow
  - Android guidance now clearly distinguishes one-time App pinning enablement from the per-handoff overview-pin flow
  - repeat visits now show a shorter lock-now flow instead of the full first-time disclosure checklist
- Launch and re-entry lock UX refined locally at `2026-03-30 09:10 PDT` in `App.tsx`:
  - if a parent PIN exists but single-app play has not been reviewed yet, the app now shows a first-launch parent setup prompt instead of silently dropping into baby mode
  - after dismissal or completion, baby mode now shows a persistent settings gear button in the lower-right corner so parents can reopen the gate without remembering the corner-tap gesture
  - the first-launch prompt routes directly into the single-app play setup flow or can be deferred with `Later`
- Sound pack system expanded locally at `2026-03-30 09:34 PDT`:
  - sound playback is now pack-based and persisted with SecureStore instead of using one fixed note list
  - parent controls now include a custom rounded dropdown for choosing sound packs
  - added `Bell Chimes`, `Twinkle Drops`, and `Classic Rattle` sound packs
  - added generated audio assets: `assets/audio/rattle-soft.wav`, `assets/audio/rattle-bright.wav`, `assets/audio/rattle-clack.wav`
- GitHub preview workflow run `23690467422` completed successfully at `2026-03-28 10:46 PDT` for commit `934b4a89521c0ace855a79c8c7e639058edda422`.
- No newer completed preview build metadata was found locally during the `2026-03-29 09:00 PDT` status check; the latest verified installable artifacts still appear to be the Android APK and iOS IPA/build page listed below, all from before the branch-head changes now merged onto `main`.
- Existing known build links:
  - Android preview APK: `https://expo.dev/artifacts/eas/waZpjf9qWFp9Hc6dZcCZSn.apk`
  - iOS store/internal IPA: `https://expo.dev/artifacts/eas/gh5VVVyr5Qc1m9SyPj697n.ipa`
  - iOS ad hoc build details page: `https://expo.dev/accounts/dclaze/projects/bambina-baby-shaker/builds/f7156452-74f5-4736-860a-a3855216e846`
- Workflow changes included in pushed commit `6bc7147`:
  - `.github/workflows/preview-builds.yml` now targets the `preview` iOS profile instead of `production`, so future `main` preview runs should produce a direct-install internal/ad hoc iPhone build instead of only a store-style IPA.
  - `.github/workflows/merge-notifications.yml` was added to post concise Discord notifications when a pull request is merged into `main`.
- Remote push notification support pushed at `2026-03-28 14:01 PDT` in commit `bd46985`:
  - new workflow file: `.github/workflows/push-notifications.yml`
  - notification script: `scripts/post-push-to-discord.mjs`
  - trigger: every push to `main`
  - output: concise Discord push notice with commit details and compare URL, followed by the separate preview-build post when CI finishes
- GitHub workflow trigger blocker re-verified at `2026-03-29 09:02 PDT`:
  - `gh` is not installed in this shell (`zsh:1: command not found: gh`)
  - prior handoff also noted invalid GitHub CLI auth for account `dclaze` when `gh` was available in an earlier shell
  - `.github/workflows/preview-builds.yml` auto-runs only on pushes to `main`
  - this blocker no longer prevents the standard preview run now that commit `742939c` has been pushed to `main`; it only prevents manual re-runs from this shell
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
- Validation in this run at `2026-03-28 14:00 PDT`:
  - `node --check scripts/post-push-to-discord.mjs`
  - `node --check scripts/post-merge-to-discord.mjs`
  - `npm run typecheck`

## Blockers

- The iOS ad hoc build `f7156452-74f5-4736-860a-a3855216e846` could not be re-verified from this shell because Expo CLI is not authenticated here and the public Expo build page does not expose final status server-side.
- The current launch-prompt, floating-settings-button, and sound-pack dropdown work are only locally edited right now and have not been pushed or device-tested yet.
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

- Push the launch-prompt and floating-settings-button UX changes, then watch the next preview run for the new `main` head.
- Push the new sound-pack dropdown and rattle assets, then verify on device that each pack plays correctly and the parent selector remains easy to use.
- Confirm on physical devices that:
  - the first-launch prompt appears only until single-app play has been reviewed once
  - the lower-right settings button remains reachable without interfering with baby play
  - the Android parent journey still leads cleanly into Security settings and the final overview-pin step
- Test the updated shake thresholds on a physical iPhone and Android device; adjust the linear-acceleration thresholds if the toy feels too chatty or too hard to trigger.
- Verify on physical devices that upper-screen taps now spawn particles at the touched position across the full screen, especially over the header and center toy area.
- Verify on device that the main screen now shows `baby shaker` at the top and `bambina by openbox` only at the bottom.
- Verify on device that the installed app label and Android pinning flow now use `Baby Shaker`.
- Validate the new single-app play modal on physical iPhone and Android devices:
  - confirm the exit instructions are clear before entering Guided Access or screen pinning
  - confirm Android settings launch correctly on the target device family
  - confirm the iPhone copy is sufficient given the lack of a public Guided Access deep link
- Re-verify the fresh iOS preview/ad hoc output for commit `742939c` from an authenticated Expo session and confirm the exact install page/link Discord should share for iPhone testing.
- Decide whether the static preview artifacts should be regenerated or removed; do not keep both `8082` and `8083` links live.
