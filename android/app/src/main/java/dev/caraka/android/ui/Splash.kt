package dev.caraka.android.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.caraka.android.R
import dev.caraka.android.ui.theme.Brand
import dev.caraka.android.ui.theme.JetBrainsMono
import dev.caraka.android.ui.theme.LocalReduceMotion

/** Seconds the gate animation needs. The first state load keeps the screen up at least this long. */
const val SPLASH_SECONDS = 2.2f

private const val SCALE = 0.7f
private val Overshoot = CubicBezierEasing(0.2f, 1.25f, 0.4f, 1f)
private val Parting = CubicBezierEasing(0.6f, 0f, 0.15f, 1f)
private val Seam = CubicBezierEasing(0.6f, 0f, 0.3f, 1f)
private val Rise = CubicBezierEasing(0.2f, 0.9f, 0.3f, 1f)

private fun seg(t: Float, start: Float, dur: Float, ease: Easing = FastOutSlowInEasing): Float =
    ease.transform(((t - start * SCALE) / (dur * SCALE)).coerceIn(0f, 1f))

@Composable
fun SplashScreen(modifier: Modifier = Modifier) {
    val reduce = LocalReduceMotion.current
    val clock = remember { Animatable(if (reduce) SPLASH_SECONDS else 0f) }
    LaunchedEffect(reduce) {
        if (reduce) clock.snapTo(SPLASH_SECONDS)
        else clock.animateTo(SPLASH_SECONDS, tween((SPLASH_SECONDS * 1000).toInt(), easing = LinearEasing))
    }
    val infinite = rememberInfiniteTransition(label = "splash")
    @Composable
    fun spin(ms: Int, reverse: Boolean = false) = infinite.animateFloat(
        initialValue = 0f,
        targetValue = if (reverse) -360f else 360f,
        animationSpec = infiniteRepeatable(tween(ms, easing = LinearEasing), RepeatMode.Restart),
        label = "spin",
    )
    val ticks by spin(42_000)
    val ringA by spin(1_600)
    val ringB by spin(2_600, reverse = true)
    val dashed by spin(26_000)
    val drift by infinite.animateFloat(0f, 34f, infiniteRepeatable(tween(16_000, easing = LinearEasing)), label = "drift")
    val bloom by infinite.animateFloat(0.28f, 0.78f, infiniteRepeatable(tween(3_500), RepeatMode.Reverse), label = "bloom")
    val description = t(R.string.splash_label)

    BoxWithConstraints(modifier.fillMaxSize().background(Brand.Bg)) {
        val width = maxWidth
        val density = LocalDensity.current
        val centerY = maxHeight * 0.4f

        // Drifting grid under a soft mask.
        Canvas(Modifier.fillMaxSize()) {
            val step = 34.dp.toPx()
            val shift = if (reduce) 0f else drift.dp.toPx()
            val line = Color(0x0DE2452C)
            var x = -step + shift % step
            while (x < size.width) {
                drawLine(line, Offset(x, 0f), Offset(x, size.height), 1f)
                x += step
            }
            var y = -step + shift % step
            while (y < size.height) {
                drawLine(line, Offset(0f, y), Offset(size.width, y), 1f)
                y += step
            }
            drawRect(
                Brush.radialGradient(
                    listOf(Color.Transparent, Brand.Bg),
                    center = Offset(size.width / 2, size.height * 0.4f),
                    radius = size.width * 0.95f,
                ),
            )
        }
        // Bloom.
        Box(
            Modifier
                .align(Alignment.TopCenter)
                .offset(y = centerY - 280.dp)
                .size(560.dp)
                .graphicsLayer { alpha = if (reduce) 0.5f else bloom }
                .background(Brush.radialGradient(listOf(Color(0x2BE2452C), Color.Transparent)), CircleShape),
        )

        // Gate: seed, two rings that part, and the seam.
        Box(
            Modifier
                .align(Alignment.TopCenter)
                .offset(y = centerY - 130.dp)
                .size(260.dp)
                .graphicsLayer { alpha = 1f - seg(clock.value, 2.3f, 0.3f, LinearEasing) },
        ) {
            val t = clock.value
            Box(
                Modifier
                    .align(Alignment.Center)
                    .size(12.dp)
                    .graphicsLayer {
                        val grow = seg(t, 0f, 0.5f, Overshoot)
                        scaleX = grow
                        scaleY = grow
                        alpha = 1f - seg(t, 0.7f, 0.3f, LinearEasing)
                    }
                    .background(Brand.Red, CircleShape),
            )
            for (side in listOf(-1, 1)) {
                Box(
                    Modifier
                        .align(Alignment.Center)
                        .offset(x = (54 * side).dp)
                        .size(108.dp)
                        .graphicsLayer {
                            val into = seg(t, 0.28f, 0.65f, Overshoot)
                            val part = seg(t, 1.55f, 1f, Parting)
                            val s = (0.15f + 0.85f * into) * (1f + 0.4f * part)
                            scaleX = s
                            scaleY = s
                            translationX = side * part * width.toPx() * 0.62f
                            alpha = into * (1f - part)
                        }
                        .border(1.5.dp, Brand.Red, CircleShape),
                )
            }
            Box(
                Modifier
                    .align(Alignment.Center)
                    .width(3.dp)
                    .height(250.dp)
                    .graphicsLayer {
                        val p = seg(t, 0.95f, 1.25f, Seam)
                        scaleY = (p / 0.35f).coerceAtMost(1f)
                        alpha = if (p < 0.35f) p / 0.35f else 1f - (p - 0.35f) / 0.65f
                    }
                    .background(Color(0xFFFFF3F0)),
            )
        }

        // Loader: ticks, two spinning rings, dashed ring, glyph.
        Box(
            Modifier
                .align(Alignment.TopCenter)
                .offset(y = centerY - 120.dp)
                .size(240.dp)
                .graphicsLayer {
                    val p = seg(clock.value, 1.6f, 1.1f, Rise)
                    alpha = p
                    val s = 0.88f + 0.12f * p
                    scaleX = s
                    scaleY = s
                }
                .semantics { contentDescription = description }
                .drawBehind {
                    val r = size.minDimension / 2
                    rotate(if (reduce) 0f else ticks) {
                        for (i in 0 until 30) {
                            rotate(i * 12f) {
                                drawLine(Color(0x4DE2452C), Offset(center.x, 0f), Offset(center.x, 9.dp.toPx()), 1.5f)
                            }
                        }
                    }
                    drawCircle(Brand.Bg, radius = r - 9.dp.toPx())
                    arcRing(20.dp.toPx(), if (reduce) 0f else ringA, Brand.Red, 90f)
                    arcRing(42.dp.toPx(), if (reduce) 0f else ringB, Color(0x73E2452C), 90f)
                    rotate(if (reduce) 0f else dashed) {
                        drawCircle(
                            Color(0x29E2452C),
                            radius = r - 62.dp.toPx(),
                            style = Stroke(1f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 6f))),
                        )
                    }
                },
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painterResource(R.drawable.ic_glyph),
                contentDescription = null,
                modifier = Modifier
                    .size(104.dp, 66.dp)
                    .graphicsLayer {
                        val p = seg(clock.value, 0.72f, 0.6f, Rise)
                        alpha = p
                        val s = 0.65f + 0.35f * p
                        scaleX = s
                        scaleY = s
                    },
            )
        }

        // Name and tagline.
        Column(
            Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .offset(y = maxHeight * 0.63f)
                .graphicsLayer {
                    val p = seg(clock.value, 2.1f, 0.9f, Rise)
                    alpha = p
                    translationY = (1f - p) * with(density) { 16.dp.toPx() }
                },
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("caraka", color = Brand.Text, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-1).sp)
            Text(
                androidx.compose.ui.text.buildAnnotatedString {
                    append(t(R.string.splash_tag_a) + " ")
                    pushStyle(androidx.compose.ui.text.SpanStyle(color = Brand.Coral))
                    append(t(R.string.splash_tag_b))
                    pop()
                },
                color = Brand.Muted,
                fontSize = 15.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp),
            )
        }

        // Boot bar and label.
        Column(
            Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 72.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(Modifier.width(132.dp).height(1.dp).background(Color(0xFF171C22))) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            scaleX = seg(clock.value, 0f, 1.9f, CubicBezierEasing(0.3f, 0.7f, 0.3f, 1f))
                            transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0f, 0.5f)
                        }
                        .background(Brand.Red),
                )
            }
            Text(
                t(R.string.splash_boot),
                color = Brand.Dim,
                fontSize = 10.sp,
                fontFamily = JetBrainsMono,
                letterSpacing = 3.sp,
                modifier = Modifier.graphicsLayer { alpha = seg(clock.value, 0.35f, 0.6f, LinearEasing) },
            )
        }
    }
}

private fun DrawScope.arcRing(inset: Float, angle: Float, color: Color, sweep: Float) {
    rotate(angle) {
        drawArc(
            color = color,
            startAngle = -90f,
            sweepAngle = sweep,
            useCenter = false,
            topLeft = Offset(inset, inset),
            size = Size(size.width - inset * 2, size.height - inset * 2),
            style = Stroke(1.5.dp.toPx(), cap = StrokeCap.Round),
        )
    }
}
