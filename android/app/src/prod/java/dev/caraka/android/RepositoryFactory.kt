package dev.caraka.android

import android.content.Context
import android.os.Build
import dev.caraka.android.data.CarakaRepository
import dev.caraka.android.data.KeystoreSessionStore
import dev.caraka.android.data.ModeRepository
import dev.caraka.android.data.DemoRepository
import dev.caraka.android.data.RealRepository
import java.io.File

/** The prod flavor talks to the real Caraka Web API. */
fun createRepository(context: Context): CarakaRepository {
    val app = context.applicationContext
    val real = RealRepository(
        store = KeystoreSessionStore(app),
        filesDir = File(app.cacheDir, "files"),
        deviceName = Build.MODEL.take(60).ifBlank { "Android" },
        allowCleartextDev = BuildConfig.DEBUG,
    )
    // Demo mode is a second repository. The user can open it from the connect screen.
    return ModeRepository(real, newDemo = { DemoRepository({ app.assets.open(it) }, app.cacheDir) })
}
