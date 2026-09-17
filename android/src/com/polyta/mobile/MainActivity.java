package com.polyta.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/** Opens the live portal in a browser-owned Custom Tab, including its login session. */
public final class MainActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        // The destination is compiled into each package; incoming intents cannot replace it.
        String path = getPackageName().endsWith(".admin") ? "/pages/admin/" : "/";
        Intent intent = new Intent(Intent.ACTION_VIEW,
                Uri.parse("https://polytaglobalmandiri.github.io" + path));
        Bundle extras = new Bundle();
        // Public Custom Tabs intent protocol. Browsers without support use a normal tab.
        extras.putBinder("android.support.customtabs.extra.SESSION", null);
        extras.putInt("android.support.customtabs.extra.TOOLBAR_COLOR", 0xff163d35);
        extras.putInt("android.support.customtabs.extra.TITLE_VISIBILITY", 1);
        intent.putExtras(extras);
        try {
            startActivity(intent);
            finish();
        } catch (ActivityNotFoundException exception) {
            new AlertDialog.Builder(this)
                    .setTitle("Browser diperlukan")
                    .setMessage("Aktifkan atau pasang browser seperti Chrome, lalu buka kembali aplikasi Polyta.")
                    .setPositiveButton("Tutup", (dialog, which) -> finish())
                    .setOnCancelListener(dialog -> finish())
                    .show();
        }
    }
}
