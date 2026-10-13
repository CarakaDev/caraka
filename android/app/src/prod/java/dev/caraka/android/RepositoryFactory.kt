package dev.caraka.android

import android.content.Context
import android.os.Build
import dev.caraka.android.data.CarakaRepository
import dev.caraka.android.data.KeystoreSessionStore
import dev.caraka.android.data.RealRepository
import java.io.File

/** The prod flavor talks to the real Caraka Web API. */
fun createRepository(context: Context): CarakaRepository =
    RealRepository(
        store = KeystoreSessionStore(context),
        filesDir = File(context.cacheDir, "files"),
        deviceName = Build.MODEL.take(60).ifBlank { "Android" },
        allowCleartextDev = BuildConfig.DEBUG,
    )
