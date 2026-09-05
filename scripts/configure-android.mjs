import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const manifestPath = fileURLToPath(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url));
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
console.log('Configured Android location permissions and portrait orientation.');
