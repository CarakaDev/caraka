package dev.caraka.android.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.caraka.android.ui.theme.Brand
import dev.caraka.android.ui.theme.JetBrainsMono
import dev.caraka.android.ui.theme.LocalReduceMotion

private fun inline(text: String, caretAlpha: Float?): AnnotatedString = buildAnnotatedString {
    for (span in parseInline(text)) {
        val style = SpanStyle(
            fontWeight = if (span.bold) FontWeight.Bold else null,
            fontStyle = if (span.italic) FontStyle.Italic else null,
            fontFamily = if (span.code) JetBrainsMono else null,
            background = if (span.code) Brand.Surface2 else Color.Unspecified,
            color = if (span.link) Brand.Coral else Color.Unspecified,
            textDecoration = if (span.link) TextDecoration.Underline else null,
        )
        pushStyle(style)
        append(span.text)
        pop()
    }
    if (caretAlpha != null) {
        pushStyle(SpanStyle(color = Brand.Coral.copy(alpha = caretAlpha)))
        append("▌")
        pop()
    }
}

/** The caret that follows a growing message. It stays solid when the system asks for less motion. */
@Composable
fun rememberCaretAlpha(active: Boolean): Float? {
    if (!active) return null
    if (LocalReduceMotion.current) return 1f
    val transition = rememberInfiniteTransition(label = "caret")
    val alpha by transition.animateFloat(
        initialValue = 1f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            keyframes {
                durationMillis = 1000
                1f at 0
                1f at 499
                0f at 500
                0f at 999
            },
            RepeatMode.Restart,
        ),
        label = "caret",
    )
    return alpha
}

@Composable
fun MarkdownText(source: String, modifier: Modifier = Modifier, caret: Boolean = false, color: Color = Brand.Text) {
    val blocks = remember(source) { parseMarkdown(source) }
    val caretAlpha = rememberCaretAlpha(caret)
    Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        blocks.forEachIndexed { index, block ->
            val tail = if (index == blocks.lastIndex) caretAlpha else null
            when (block) {
                is MdBlock.Heading -> Text(
                    inline(block.text, tail),
                    color = color,
                    fontSize = when (block.level) { 1 -> 22.sp; 2 -> 19.sp; else -> 16.sp },
                    fontWeight = FontWeight.Bold,
                    lineHeight = 26.sp,
                )
                is MdBlock.Paragraph -> Text(inline(block.text, tail), color = color, fontSize = 15.sp, lineHeight = 23.sp)
                is MdBlock.Code -> Box(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Brand.Surface)
                        .border(1.dp, Brand.Line, RoundedCornerShape(12.dp))
                        .horizontalScroll(rememberScrollState())
                        .padding(12.dp),
                ) {
                    Text(
                        inline("", tail).let { buildAnnotatedString { append(block.text); if (tail != null) { pushStyle(SpanStyle(color = Brand.Coral.copy(alpha = tail))); append("▌"); pop() } } },
                        color = Brand.Text,
                        fontFamily = JetBrainsMono,
                        fontSize = 13.sp,
                        lineHeight = 19.sp,
                        softWrap = false,
                    )
                }
                is MdBlock.Items -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    block.items.forEachIndexed { i, item ->
                        Row {
                            Text(if (block.ordered) "${i + 1}." else "•", color = Brand.Coral, fontSize = 15.sp, modifier = Modifier.width(24.dp))
                            Text(
                                inline(item, if (i == block.items.lastIndex) tail else null),
                                color = color,
                                fontSize = 15.sp,
                                lineHeight = 23.sp,
                            )
                        }
                    }
                }
                is MdBlock.Quote -> Row(Modifier.fillMaxWidth()) {
                    Box(Modifier.width(3.dp).height(20.dp).background(Brand.Line))
                    Text(inline(block.text, tail), color = Brand.Muted, fontSize = 15.sp, lineHeight = 23.sp, modifier = Modifier.padding(start = 12.dp))
                }
                MdBlock.Rule -> Box(Modifier.fillMaxWidth().height(1.dp).background(Brand.Line))
            }
        }
        if (blocks.isEmpty() && caretAlpha != null) {
            Text(inline("", caretAlpha), fontSize = 15.sp)
        }
    }
}
