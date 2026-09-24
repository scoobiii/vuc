# VUC Android APK

Version: 1.0.0
Responsibility: VUC Mobile Client
Signed: GoS3

## Build boundary

VUC remains a web/Node governed runtime. The Android target is a Capacitor Web Native client shell; it does not embed the Node/Bend runtime or production secrets in the APK.

## CI export

The Android workflow installs the Capacitor v8 toolchain, builds the Vite client, generates the Android project, runs Gradle, verifies the APK exists, and publishes the debug APK as a GitHub Actions artifact.

Artifact:

`vuc-android-debug-apk/app-debug.apk`

## Local toolchain

Requires Node.js, npm, JDK 17+, Android SDK Platform 35 and Build Tools 35.x.

The Android project is intentionally generated during the build rather than committed, keeping the repository's runtime tree unchanged.

## Security boundary

OAuth, tenant authorization, governed execution and ExecutionProof remain server/runtime responsibilities. The mobile client must not package production credentials, private signing keys or server secrets.
