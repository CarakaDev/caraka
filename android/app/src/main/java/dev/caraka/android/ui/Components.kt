package dev.caraka.android.ui

import android.content.Context
import androidx.annotation.StringRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.caraka.android.R
import dev.caraka.android.data.SessionStatus
import dev.caraka.android.ui.theme.Brand
import dev.caraka.android.ui.theme.JetBrainsMono
import dev.caraka.android.ui.theme.LocalReduceMotion
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

/** The context whose resources follow the language the server reports. */
val LocalStrings = staticCompositionLocalOf<Context> { error("LocalStrings not provided") }

@Composable
fun t(@StringRes id: Int, vararg args: Any): String {
    val context = LocalStrings.current
    return if (args.isEmpty()) context.getString(id) else context.getString(id, *args)
}

@Composable
fun statusLabel(state: String?): String = when (state) {
    SessionStatus.IDLE -> t(R.string.state_idle)
    SessionStatus.RUNNING -> t(R.string.state_running)
    SessionStatus.AWAITING_APPROVAL -> t(R.string.state_awaiting)
    SessionStatus.DONE -> t(R.string.state_done)
    SessionStatus.FAILED -> t(R.string.state_failed)
    SessionStatus.CANCELLED -> t(R.string.state_cancelled)
    else -> t(R.string.state_unknown)
}

/** Text presentation only. Without it the pause glyph turns into a coloured emoji. */
fun glyphText(state: String?): String = SessionStatus.glyph(state) + "\uFE0E"

fun statusColor(state: String?): Color = Color(SessionStatus.color(state))

fun formatTime(millis: Long, locale: Locale): String =
    DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(locale)
        .format(Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()))

@Composable
fun CkButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    primary: Boolean = true,
    enabled: Boolean = true,
    danger: Boolean = false,
) {
    val shape = RoundedCornerShape(14.dp)
    val bg = when {
        danger -> Color(0x33FF93B2)
        primary -> Brand.Red
        else -> Brand.Surface2
    }
    val fg = if (danger) Color(0xFFFF93B2) else if (primary) Brand.Cream else Brand.Text
    Box(
        modifier
            .heightIn(min = 52.dp)
            .alpha(if (enabled) 1f else 0.4f)
            .clip(shape)
            .background(bg)
            .border(BorderStroke(1.dp, if (primary && !danger) Brand.Red else Brand.Line), shape)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, color = fg, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun CkIconButton(
    icon: ImageVector,
    description: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    tint: Color = Brand.Text,
) {
    Box(
        modifier
            .size(48.dp)
            .alpha(if (enabled) 1f else 0.4f)
            .clip(CircleShape)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(22.dp))
    }
}

@Composable
fun CkField(
    value: String,
    onChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    mono: Boolean = false,
    keyboard: KeyboardOptions = KeyboardOptions.Default,
    actions: KeyboardActions = KeyboardActions.Default,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, color = Brand.Muted, fontSize = 13.sp, fontWeight = FontWeight.Medium)
        val style = TextStyle(
            color = Brand.Text,
            fontSize = 16.sp,
            fontFamily = if (mono) JetBrainsMono else dev.caraka.android.ui.theme.PublicSans,
        )
        BasicTextField(
            value = value,
            onValueChange = onChange,
            singleLine = true,
            textStyle = style,
            keyboardOptions = keyboard,
            keyboardActions = actions,
            cursorBrush = SolidColor(Brand.Coral),
            visualTransformation = VisualTransformation.None,
            modifier = Modifier
                .fillMaxWidth()
                .semantics { contentDescription = label },
            decorationBox = { inner ->
                Box(
                    Modifier
                        .fillMaxWidth()
                        .heightIn(min = 52.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Brand.Surface)
                        .border(1.dp, Brand.Line, RoundedCornerShape(14.dp))
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    if (value.isEmpty() && placeholder.isNotEmpty()) {
                        Text(placeholder, style = style.copy(color = Brand.Dim))
                    }
                    inner()
                }
            },
        )
    }
}

/** The state glyph. A gold ring pulses around it while the session waits for permission. */
@Composable
fun StatusGlyph(state: String?, modifier: Modifier = Modifier) {
    val reduce = LocalReduceMotion.current
    val color = statusColor(state)
    Box(modifier.size(24.dp), contentAlignment = Alignment.Center) {
        if (state == SessionStatus.AWAITING_APPROVAL) {
            val transition = rememberInfiniteTransition(label = "pulse")
            val phase by transition.animateFloat(
                initialValue = 0f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(tween(1600, easing = LinearEasing), RepeatMode.Restart),
                label = "pulse",
            )
            val p = if (reduce) 0.5f else phase
            Box(
                Modifier
                    .size(24.dp)
                    .graphicsLayer {
                        val s = 0.7f + p * 0.9f
                        scaleX = s
                        scaleY = s
                        alpha = 0.7f * (1f - p)
                    }
                    .border(2.dp, Brand.Gold, CircleShape),
            )
            Box(Modifier.size(22.dp).border(1.5.dp, Brand.Gold, CircleShape))
        }
        Text(glyphText(state), color = color, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun InfoLine(text: String, modifier: Modifier = Modifier, color: Color = Brand.Muted) {
    Row(modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(text, color = color, fontSize = 13.sp, lineHeight = 19.sp)
    }
}
