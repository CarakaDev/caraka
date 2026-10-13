package dev.caraka.android

import android.content.Context
import dev.caraka.android.data.CarakaRepository
import dev.caraka.android.data.DemoRepository

/** The demo flavor shows sample data. It never opens a network connection. */
fun createRepository(context: Context): CarakaRepository = DemoRepository(context.applicationContext)
