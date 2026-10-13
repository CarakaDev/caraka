package dev.caraka.android.ui

import android.content.Context
import android.content.res.Configuration
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.caraka.android.data.Phase
import dev.caraka.android.ui.theme.Brand
import java.util.Locale

private enum class Root { Splash, Connect, App }

@Composable
fun CarakaRoot(vm: AppViewModel = viewModel()) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val stack by vm.stack.collectAsStateWithLifecycle()
    val splashDone by vm.splashDone.collectAsStateWithLifecycle()
    val base = LocalContext.current
    val lang = ui.language
    val strings = remember(base, lang) { localized(base, lang) }
    val locale = remember(lang) { lang?.let { Locale.forLanguageTag(it) } ?: Locale.getDefault() }

    val root = when {
        ui.phase == Phase.Booting || !splashDone -> Root.Splash
        ui.phase == Phase.Unpaired -> Root.Connect
        else -> Root.App
    }

    CompositionLocalProvider(LocalStrings provides strings) {
        Box(Modifier.fillMaxSize().background(Brand.Bg)) {
            AnimatedContent(
                targetState = root,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "root",
            ) { target ->
                when (target) {
                    Root.Splash -> SplashScreen()
                    Root.Connect -> ConnectScreen(vm)
                    Root.App -> {
                        BackHandler(enabled = stack.size > 1) { vm.back() }
                        when (val screen = stack.last()) {
                            Screen.Rooms -> RoomsScreen(vm, ui, locale)
                            is Screen.Chat -> ChatScreen(vm, ui, screen, locale)
                            is Screen.Viewer -> ViewerScreen(vm, screen.attachment)
                            Screen.Devices -> DevicesScreen(vm, ui)
                        }
                    }
                }
            }
        }
    }
}

/** Resources in the server language. Before pairing the system language stays. */
private fun localized(base: Context, language: String?): Context {
    if (language == null) return base
    val config = Configuration(base.resources.configuration)
    config.setLocale(Locale.forLanguageTag(language))
    return base.createConfigurationContext(config)
}
