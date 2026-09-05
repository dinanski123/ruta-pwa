import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const manifestPath = fileURLToPath(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url));
const gradlePath = fileURLToPath(new URL('../android/app/build.gradle', import.meta.url));

let manifest = await readFile(manifestPath, 'utf8');
const permissions = [
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />'
];

for (const permission of permissions) {
  if (!manifest.includes(permission)) {
    manifest = manifest.replace(/<manifest\b[^>]*>/, match => `${match}\n    ${permission}`);
  }
}

manifest = manifest.replace(
  /<activity\b([^>]*android:name="\.MainActivity"[^>]*)>/,
  (match, attrs) => attrs.includes('android:screenOrientation=')
    ? match
    : `<activity${attrs} android:screenOrientation="portrait">`
);

await writeFile(manifestPath, manifest);

let gradle = await readFile(gradlePath, 'utf8');
const requestedCode = Number.parseInt(process.env.RUTA_VERSION_CODE || '1', 10);
const versionCode = Number.isFinite(requestedCode) && requestedCode > 0 ? requestedCode : 1;
const versionName = process.env.RUTA_VERSION_NAME || `1.0.${versionCode}`;

gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
await writeFile(gradlePath, gradle);

console.log(`Configured Android permissions, portrait mode, versionCode ${versionCode}, versionName ${versionName}.`);
