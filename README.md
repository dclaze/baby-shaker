# Baby Shaker

Baby Shaker is an Openbox app in the Bambina line of baby-focused sensory games, built with Expo and React Native for iOS and Android.

## Research references

Research notes and evidence-based design guidance live in [`research/bambina_openbox_research.md`](./research/bambina_openbox_research.md). Codex-specific usage guidance lives in [`AGENTS.md`](./AGENTS.md).

## What it does

- Runs in an immersive full-screen baby mode
- Keeps the device awake during play
- Uses a hidden corner gesture plus a 4-digit parent passcode to access controls
- Reminds parents to enable iPhone Guided Access or Android screen pinning for true device lock-in
- Includes a branded loading screen and a reserved folder for the opening sound asset

## Local development

```bash
npm install
npm run ios
npm run android
```

## Parent lock behavior

The app can protect its own controls, but mobile apps cannot fully block system gestures or OS exit flows on their own.

- On iPhone, use Guided Access before handing the device to a baby
- On Android, use screen pinning or app pinning
- The parent controls now include a dedicated single-app play setup flow that:
  - shows exit instructions before the parent resumes baby mode
  - deep-links into Android settings where possible
  - makes the parent acknowledge that iOS Guided Access and Android pinning cannot be verified from inside the app

Inside the app, the parent gate is opened by tapping the four corners clockwise:

1. Top left
2. Top right
3. Bottom right
4. Bottom left

## Build and release

The project includes EAS build scripts:

```bash
npm run build:ios
npm run build:android
npm run submit:ios
npm run submit:android
```

Before the first store release, make sure you:

1. Sign in to Expo: `npx eas-cli login`
2. Configure the project once: `npx eas-cli build:configure`
3. Replace the placeholder icons and splash assets in `/assets`
4. Drop the opening chime into `/assets/audio`
5. Confirm the bundle IDs in `/app.json`
6. Create the App Store Connect and Google Play listings

## Git Pipeline

This repo is set up for GitHub-triggered EAS builds.

### Preview builds

- Workflow: `.github/workflows/preview-builds.yml`
- Trigger: push to `main`
- Output: Android preview APK and iOS internal/ad hoc preview build
- Notification: posts build links to Discord when `DISCORD_WEBHOOK_URL` is configured
- iPhone install path: use the preview build link from Discord on a registered device; tapping a raw `.ipa` file in Files will not install the app

### Release builds

- Workflow: `.github/workflows/release-builds.yml`
- Trigger: manual GitHub Actions run
- Output: production Android and iOS builds
- Optional: auto-submit to Google Play and TestFlight

### Merge notifications

- Workflow: `.github/workflows/merge-notifications.yml`
- Trigger: merged pull requests into `main`
- Output: concise Discord message with PR link and merge commit, followed by the normal preview-build post from the `main` push

### Push notifications

- Workflow: `.github/workflows/push-notifications.yml`
- Trigger: every push to `main`
- Output: concise Discord message with commit details and compare URL, followed by the normal preview-build post when that build finishes

### Required GitHub secrets

- `EXPO_TOKEN`
- `DISCORD_WEBHOOK_URL`

Create the Expo token from:

- [Expo access tokens](https://expo.dev/settings/access-tokens)

### One-time account setup

Before the GitHub workflows can build successfully for both platforms:

1. Run one successful Android build locally with EAS credentials configured
2. Run one successful iOS build locally with Apple credentials configured
3. Ensure store credentials are saved in EAS if you want auto-submit

### Local commands

```bash
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

## Store readiness checklist

- Final icon, splash, screenshots, and store description
- Apple Developer and Google Play Console access
- Privacy policy URL
- Final age rating and content questionnaire answers
