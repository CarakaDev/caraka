package dev.caraka.android

import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import dev.caraka.android.ui.CarakaRoot
import dev.caraka.android.ui.theme.CarakaTheme
import dev.caraka.android.ui.theme.LocalReduceMotion
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

class MainActivity : ComponentActivity() {
    private var reduceMotion by mutableStateOf(false)

    private val repository get() = (application as CarakaApp).repository

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        // Call before super.onCreate. This API makes the system bars transparent.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        setContent {
            CarakaTheme {
                CompositionLocalProvider(LocalReduceMotion provides reduceMotion) {
                    CarakaRoot()
                }
            }
        }
    }

    override fun onStart() {
        super.onStart()
        reduceMotion = Settings.Global.getFloat(contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
        repository.setForeground(true)
    }

    override fun onStop() {
        repository.setForeground(false)
        super.onStop()
    }
}
