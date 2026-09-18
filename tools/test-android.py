#!/usr/bin/env python3
"""Check the actual deliverable APKs and download links (requires Android Build Tools)."""
import argparse
import hashlib
import re
from pathlib import Path
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--build-tools', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
release = root / 'android/release'
checksums = dict(line.split()[::-1] for line in (release / 'SHA256SUMS.txt').read_text().splitlines())
html = (root / 'unduh/index.html').read_text()
certificates = []
for product, package in [('Portal', 'portal'), ('Administrator', 'admin')]:
    apk = release / f'Polyta-{product}-1.2.0-android.apk'
    assert hashlib.sha256(apk.read_bytes()).hexdigest() == checksums[apk.name]
    assert f'href="../android/release/{apk.name}" download' in html
    with zipfile.ZipFile(apk) as archive:
        assert archive.testzip() is None
        assert {'classes.dex', 'AndroidManifest.xml', 'resources.arsc'} <= set(archive.namelist())
        dex = archive.read('classes.dex')
        assert b'https://polytaglobalmandiri.github.io' in dex
        assert b'/pages/admin/' in dex
        assert b'android.support.customtabs.extra.SESSION' not in dex
        assert b'Landroid/webkit/WebView;' in dex
        assert b'addJavascriptInterface' not in dex
        assert b'PolytaAndroid/1.2.0' in dex
        assert 'assets/mobile.css' in archive.namelist()
        assert not any(name.startswith('lib/') for name in archive.namelist())
    metadata = subprocess.check_output([str(args.build_tools / 'aapt2'), 'dump', 'badging', str(apk)], text=True)
    assert f"name='com.polyta.mobile.{package}'" in metadata
    assert "versionCode='3'" in metadata and "minSdkVersion:'23'" in metadata
    assert "targetSdkVersion:'35'" in metadata
    assert "launchable-activity: name='com.polyta.mobile.MainActivity'" in metadata
    assert "android.permission.INTERNET" in metadata
    assert "android.permission.CAMERA" in metadata
    assert "android.permission.RECORD_AUDIO" not in metadata
    manifest = subprocess.check_output([str(args.build_tools / 'aapt2'), 'dump', 'xmltree', '--file', 'AndroidManifest.xml', str(apk)], text=True)
    assert re.search(r'maxSdkVersion\([^)]*\)=28', manifest)
    assert re.search(r'usesCleartextTraffic\([^)]*\)=false', manifest)
    signature = subprocess.check_output([str(args.build_tools / 'apksigner'), 'verify', '--verbose', '--print-certs', str(apk)], text=True)
    assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in signature
    cert = next(line for line in signature.splitlines() if 'certificate SHA-256 digest:' in line)
    certificates.append(cert)
    old = release / f'Polyta-{product}-1.0.0-android.apk'
    old_signature = subprocess.check_output([str(args.build_tools / 'apksigner'), 'verify', '--print-certs', str(old)], text=True)
    assert cert in old_signature, 'Updates must keep the original signing identity'
    subprocess.run([str(args.build_tools / 'zipalign'), '-c', '4', str(apk)], check=True)
assert len(set(certificates)) == 1
assert 'releases/latest' not in html
classes = root / 'android/.build/policy-tests'
classes.mkdir(parents=True, exist_ok=True)
subprocess.run(['javac', '-d', str(classes), str(root / 'android/src/com/polyta/mobile/RoutePolicy.java'), str(root / 'android/tests/RoutePolicyTest.java')], check=True)
subprocess.run(['java', '-cp', str(classes), 'RoutePolicyTest'], check=True)
print('PASS: both release APKs, checksums, signatures, launcher manifests, destinations, permissions, and direct download links')
