package dev.caraka.android

import android.app.Application
import dev.caraka.android.data.CarakaRepository

class CarakaApp : Application() {
    val repository: CarakaRepository by lazy { createRepository(this) }
}
