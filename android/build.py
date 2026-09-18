#!/usr/bin/env python3
"""Build two signed APKs using the official Android SDK and JDK (no Gradle dependencies)."""
import argparse
import os
import shutil
from pathlib import Path
import subprocess
import zipfile
import hashlib

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--build-tools', type=Path, required=True)
parser.add_argument('--android-jar', type=Path, required=True)
parser.add_argument('--keystore', type=Path, required=True)
parser.add_argument('--alias', default='polyta-android')
parser.add_argument('--version', default='1.2.0')
parser.add_argument('--version-code', type=int, default=3)
args = parser.parse_args()
if not os.environ.get('POLYTA_KEYSTORE_PASSWORD'):
    parser.error('Set POLYTA_KEYSTORE_PASSWORD; the release key must never be stored in this repository.')
if not args.keystore.is_file():
    parser.error('Release keystore does not exist. Restore the original key for updates.')

def run(*command):
    subprocess.run([str(part) for part in command], check=True)

build = ROOT / '.build'
release = ROOT / 'release'
build.mkdir(exist_ok=True)
release.mkdir(exist_ok=True)
classes = build / 'classes'
if classes.exists():
    shutil.rmtree(classes)
classes.mkdir()
run('javac', '--release', '8', '-classpath', args.android_jar,
    '-d', classes, *sorted((ROOT / 'src/com/polyta/mobile').glob('*.java')))
run('jar', 'cf', build / 'classes.jar', '-C', classes, '.')
run(args.build_tools / 'd8', '--min-api', '23', '--lib', args.android_jar,
    '--output', build, build / 'classes.jar')
run(args.build_tools / 'aapt2', 'compile', '--dir', ROOT / 'res', '-o', build / 'resources.zip')
checksums = []
for flavor, label, suffix in [('portal', 'Polyta Portal', 'Portal'), ('admin', 'Polyta Administrator', 'Administrator')]:
    manifest = build / (flavor + '-AndroidManifest.xml')
    manifest.write_text(f'''<manifest xmlns:android="http://schemas.android.com/apk/res/android"
        package="com.polyta.mobile.{flavor}" android:versionCode="{args.version_code}" android:versionName="{args.version}">
      <uses-sdk android:minSdkVersion="23" android:targetSdkVersion="35" />
      <uses-permission android:name="android.permission.INTERNET" />
      <uses-permission android:name="android.permission.CAMERA" />
      <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
      <uses-feature android:name="android.hardware.camera" android:required="false" />
      <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
      <application android:label="{label}" android:icon="@mipmap/ic_launcher"
          android:allowBackup="false" android:usesCleartextTraffic="false"
          android:theme="@style/PolytaTheme" android:enableOnBackInvokedCallback="true">
        <activity android:name="com.polyta.mobile.MainActivity" android:exported="true" android:configChanges="orientation|screenSize|keyboardHidden" android:windowSoftInputMode="adjustResize">
          <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
          </intent-filter>
        </activity>
      </application>
    </manifest>''')
    unsigned = build / (flavor + '-unsigned.apk')
    aligned = build / (flavor + '-aligned.apk')
    output = release / f'Polyta-{suffix}-{args.version}-android.apk'
    run(args.build_tools / 'aapt2', 'link', '-o', unsigned, '-I', args.android_jar,
        '--manifest', manifest, '-A', ROOT / 'assets', build / 'resources.zip')
    with zipfile.ZipFile(unsigned, 'a', zipfile.ZIP_DEFLATED) as apk:
        apk.write(build / 'classes.dex', 'classes.dex')
    run(args.build_tools / 'zipalign', '-f', '4', unsigned, aligned)
    run(args.build_tools / 'apksigner', 'sign', '--ks', args.keystore,
        '--ks-key-alias', args.alias, '--ks-pass', 'env:POLYTA_KEYSTORE_PASSWORD',
        '--key-pass', 'env:POLYTA_KEYSTORE_PASSWORD', '--out', output, aligned)
    run(args.build_tools / 'apksigner', 'verify', '--verbose', '--print-certs', output)
    run(args.build_tools / 'zipalign', '-c', '4', output)
    checksums.append(f'{hashlib.sha256(output.read_bytes()).hexdigest()}  {output.name}')
(release / 'SHA256SUMS.txt').write_text('\n'.join(checksums) + '\n')
