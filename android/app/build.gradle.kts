plugins {
    id("com.android.application")
}

val portalVersion: String = run {
    val manifest = rootProject.file("../desktop/electron/package.json").readText()
    Regex("\"version\"\\s*:\\s*\"([^\"]+)\"").find(manifest)?.groupValues?.get(1)
        ?: throw GradleException("Versi tidak ditemukan pada desktop/electron/package.json")
}

val portalVersionCode: Int = run {
    val parts = portalVersion.split(".").map { it.toIntOrNull() ?: 0 }
    val major = parts.getOrElse(0) { 0 }
    val minor = parts.getOrElse(1) { 0 }
    val patch = parts.getOrElse(2) { 0 }
    major * 10000 + minor * 100 + patch
}

val keystoreFile: String? = System.getenv("ANDROID_KEYSTORE_PATH")

android {
    namespace = "com.polytaglobalmandiri.portal"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
        targetSdk = 35
        versionCode = portalVersionCode
        versionName = portalVersion
    }

    if (!keystoreFile.isNullOrBlank()) {
        signingConfigs {
            create("release") {
                storeFile = file(keystoreFile)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (keystoreFile.isNullOrBlank()) {
                signingConfigs.getByName("debug")
            } else {
                signingConfigs.getByName("release")
            }
        }
    }

    flavorDimensions += "target"

    productFlavors {
        create("portal") {
            dimension = "target"
            applicationId = "com.polytaglobalmandiri.portal"
        }
        create("admin") {
            dimension = "target"
            applicationId = "com.polytaglobalmandiri.admin"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
