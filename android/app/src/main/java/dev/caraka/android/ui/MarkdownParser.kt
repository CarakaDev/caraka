package dev.caraka.android.ui

sealed interface MdBlock {
    data class Heading(val level: Int, val text: String) : MdBlock
    data class Paragraph(val text: String) : MdBlock
    data class Code(val lang: String, val text: String) : MdBlock
    data class Items(val ordered: Boolean, val items: List<String>) : MdBlock
    data class Quote(val text: String) : MdBlock
    data object Rule : MdBlock
}

/** A small block parser. It covers what coding agents write: headings, fences, lists, quotes. */
fun parseMarkdown(source: String): List<MdBlock> {
    val lines = source.replace("\r\n", "\n").split('\n')
    val blocks = mutableListOf<MdBlock>()
    var i = 0
    val para = StringBuilder()
    fun flush() {
        if (para.isNotEmpty()) {
            blocks += MdBlock.Paragraph(para.toString().trim())
            para.clear()
        }
    }
    val bullet = Regex("^\\s*[-*+]\\s+(.*)$")
    val numbered = Regex("^\\s*\\d+[.)]\\s+(.*)$")
    while (i < lines.size) {
        val line = lines[i]
        val trimmed = line.trim()
        when {
            trimmed.startsWith("```") -> {
                flush()
                val lang = trimmed.removePrefix("```").trim()
                val body = StringBuilder()
                i++
                while (i < lines.size && !lines[i].trim().startsWith("```")) {
                    if (body.isNotEmpty()) body.append('\n')
                    body.append(lines[i])
                    i++
                }
                blocks += MdBlock.Code(lang, body.toString())
            }
            trimmed.isEmpty() -> flush()
            trimmed.matches(Regex("^(-{3,}|\\*{3,}|_{3,})$")) -> {
                flush()
                blocks += MdBlock.Rule
            }
            trimmed.startsWith("#") && Regex("^#{1,6}\\s+.*").matches(trimmed) -> {
                flush()
                val level = trimmed.takeWhile { it == '#' }.length
                blocks += MdBlock.Heading(level, trimmed.drop(level).trim())
            }
            trimmed.startsWith(">") -> {
                flush()
                val quote = StringBuilder()
                while (i < lines.size && lines[i].trim().startsWith(">")) {
                    if (quote.isNotEmpty()) quote.append('\n')
                    quote.append(lines[i].trim().removePrefix(">").trim())
                    i++
                }
                i--
                blocks += MdBlock.Quote(quote.toString())
            }
            bullet.matches(line) || numbered.matches(line) -> {
                flush()
                val ordered = numbered.matches(line)
                val items = mutableListOf<String>()
                val rx = if (ordered) numbered else bullet
                while (i < lines.size) {
                    val m = rx.matchEntire(lines[i]) ?: break
                    items += m.groupValues[1].trim()
                    i++
                }
                i--
                blocks += MdBlock.Items(ordered, items)
            }
            else -> {
                if (para.isNotEmpty()) para.append('\n')
                para.append(trimmed)
            }
        }
        i++
    }
    flush()
    return blocks
}

/** One styled piece of inline text. */
data class MdSpan(val text: String, val bold: Boolean = false, val italic: Boolean = false, val code: Boolean = false, val link: Boolean = false)

fun parseInline(text: String): List<MdSpan> {
    val out = mutableListOf<MdSpan>()
    val rx = Regex("`([^`]+)`|\\*\\*([^*]+)\\*\\*|(?<![\\w*])\\*([^*\\s][^*]*)\\*(?![\\w*])|\\[([^\\]]+)]\\(([^)]+)\\)")
    var last = 0
    for (m in rx.findAll(text)) {
        if (m.range.first > last) out += MdSpan(text.substring(last, m.range.first))
        val g = m.groups
        when {
            g[1] != null -> out += MdSpan(g[1]!!.value, code = true)
            g[2] != null -> out += MdSpan(g[2]!!.value, bold = true)
            g[3] != null -> out += MdSpan(g[3]!!.value, italic = true)
            g[4] != null -> out += MdSpan(g[4]!!.value, link = true)
        }
        last = m.range.last + 1
    }
    if (last < text.length) out += MdSpan(text.substring(last))
    return out
}
