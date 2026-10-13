package dev.caraka.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.unit.sp
import dev.caraka.android.R

object Brand {
    val Bg = Color(0xFF05080C)
    val Surface = Color(0xFF0E1217)
    val Surface2 = Color(0xFF151A21)
    val Line = Color(0xFF222A33)
    val Text = Color(0xFFF6F9FC)
    val Cream = Color(0xFFFFEDE7)
    val Muted = Color(0xFF95A0AB)
    val Dim = Color(0xFF7A848F)
    val Red = Color(0xFFE2452C)
    val Coral = Color(0xFFFF7A5E)
    val Green = Color(0xFF8EEE98)
    val Gold = Color(0xFFFFD67E)
}

/** The font files are variable. Each weight needs its own axis value, or text stays thin. */
@OptIn(ExperimentalTextApi::class)
private fun variable(res: Int, weight: FontWeight) =
    Font(res, weight, variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)))

val PublicSans = FontFamily(
    variable(R.font.public_sans, FontWeight.Normal),
    variable(R.font.public_sans, FontWeight.Medium),
    variable(R.font.public_sans, FontWeight.SemiBold),
    variable(R.font.public_sans, FontWeight.Bold),
    variable(R.font.public_sans, FontWeight.ExtraBold),
)

val JetBrainsMono = FontFamily(
    variable(R.font.jetbrains_mono, FontWeight.Normal),
    variable(R.font.jetbrains_mono, FontWeight.Medium),
    variable(R.font.jetbrains_mono, FontWeight.SemiBold),
)

/** True when the system asks for no animation. Every animation shows its end state then. */
val LocalReduceMotion = staticCompositionLocalOf { false }

@Composable
fun CarakaTheme(content: @Composable () -> Unit) {
    val scheme = darkColorScheme(
        primary = Brand.Red,
        onPrimary = Brand.Cream,
        secondary = Brand.Coral,
        background = Brand.Bg,
        onBackground = Brand.Text,
        surface = Brand.Surface,
        onSurface = Brand.Text,
        surfaceVariant = Brand.Surface2,
        onSurfaceVariant = Brand.Muted,
        outline = Brand.Line,
        error = Color(0xFFFF93B2),
    )
    val base = TextStyle(fontFamily = PublicSans, color = Brand.Text)
    val typography = Typography(
        bodyLarge = base.copy(fontSize = 16.sp, lineHeight = 24.sp),
        bodyMedium = base.copy(fontSize = 14.sp, lineHeight = 21.sp),
        bodySmall = base.copy(fontSize = 12.sp, lineHeight = 18.sp),
        titleLarge = base.copy(fontSize = 22.sp, fontWeight = FontWeight.Bold),
        titleMedium = base.copy(fontSize = 16.sp, fontWeight = FontWeight.SemiBold),
        labelLarge = base.copy(fontSize = 14.sp, fontWeight = FontWeight.SemiBold),
        labelSmall = base.copy(fontSize = 11.sp, fontFamily = JetBrainsMono),
    )
    MaterialTheme(colorScheme = scheme, typography = typography, content = content)
}
