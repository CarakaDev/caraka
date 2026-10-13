package dev.caraka.android.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class MarkdownParserTest {
    @Test fun parsesHeadingParagraphCodeAndList() {
        val blocks = parseMarkdown("# Title\n\nSome **bold** text\nmore\n\n```kotlin\nval a = 1\n```\n\n- one\n- two\n\n1. first\n2. second\n\n> quoted\n\n---")
        assertEquals(
            listOf(
                MdBlock.Heading(1, "Title"),
                MdBlock.Paragraph("Some **bold** text\nmore"),
                MdBlock.Code("kotlin", "val a = 1"),
                MdBlock.Items(false, listOf("one", "two")),
                MdBlock.Items(true, listOf("first", "second")),
                MdBlock.Quote("quoted"),
                MdBlock.Rule,
            ),
            blocks,
        )
    }

    @Test fun unclosedFenceTakesTheRest() {
        assertEquals(listOf(MdBlock.Code("", "a\nb")), parseMarkdown("```\na\nb"))
    }

    @Test fun inlineSpans() {
        val spans = parseInline("a `x` **b** *c* [d](http://e)")
        assertEquals(
            listOf(
                MdSpan("a "), MdSpan("x", code = true), MdSpan(" "), MdSpan("b", bold = true), MdSpan(" "),
                MdSpan("c", italic = true), MdSpan(" "), MdSpan("d", link = true),
            ),
            spans,
        )
    }
}
