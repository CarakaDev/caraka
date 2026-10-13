package dev.caraka.android

import android.content.Context
import dev.caraka.android.data.CarakaRepository
import dev.caraka.android.data.DemoRepository

/** The demo flavor shows sample data. It never opens a network connection. */
fun createRepository(context: Context): CarakaRepository = context.applicationContext.let { app -> DemoRepository({ app.assets.open(it) }, app.cacheDir) }
