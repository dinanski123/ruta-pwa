import { access, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const manifestPath = fileURLToPath(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url));
const gradlePath = fileURLToPath(new URL('../android/app/build.gradle', import.meta.url));
const javaActivityPath = fileURLToPath(new URL('../android/app/src/main/java/app/ruta/tracker/MainActivity.java', import.meta.url));
const kotlinActivityPath = fileURLToPath(new URL('../android/app/src/main/java/app/ruta/tracker/MainActivity.kt', import.meta.url));

let manifest = await readFile(manifestPath, 'utf8');
manifest = manifest.replace(/\s*<uses-permission android:name="android\.permission\.ACCESS_(?:COARSE|FINE)_LOCATION" \/>\s*/g, '\n');
manifest = manifest.replace(/\s+android:screenOrientation="[^"]*"/g, '');
manifest = manifest.replace(/<activity\b([^>]*android:name="\.MainActivity"[^>]*)>/, (match, attrs) => {
  let next = attrs;
  if (!next.includes('android:resizeableActivity=')) next += ' android:resizeableActivity="true"';
  return `<activity${next}>`;
});
await writeFile(manifestPath, manifest);

let gradle = await readFile(gradlePath, 'utf8');
const requestedCode = Number.parseInt(process.env.RUTA_VERSION_CODE || '140', 10);
const versionCode = Number.isFinite(requestedCode) && requestedCode > 0 ? requestedCode : 140;
const versionName = process.env.RUTA_VERSION_NAME || '1.4.0';
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
await writeFile(gradlePath, gradle);

const javaActivity = `package app.ruta.tracker;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Draw edge-to-edge so Android system bars are handled by the web
        // safe-area insets rather than overlapping RUTA's UI.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
`;

const kotlinActivity = `package app.ruta.tracker

import android.os.Bundle
import androidx.core.view.WindowCompat
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Draw edge-to-edge so Android system bars are handled by the web
        // safe-area insets rather than overlapping RUTA's UI.
        WindowCompat.setDecorFitsSystemWindows(window, false)
    }
}
`;

try {
  await access(javaActivityPath);
  await writeFile(javaActivityPath, javaActivity);
} catch {
  try {
    await access(kotlinActivityPath);
    await writeFile(kotlinActivityPath, kotlinActivity);
  } catch {
    throw new Error('Could not find generated Capacitor MainActivity.java or MainActivity.kt');
  }
}

console.log(`Configured Android without location permissions, adaptive orientation/multi-window support, edge-to-edge safe areas, versionCode ${versionCode}, versionName ${versionName}.`);
