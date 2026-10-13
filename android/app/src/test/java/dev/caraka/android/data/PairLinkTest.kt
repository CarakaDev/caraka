package dev.caraka.android.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PairLinkTest {
    private fun parsed(text: String, dev: Boolean = false) =
        (Origins.parseLink(text, dev) as LinkResult.Parsed).link

    @Test fun splitsOriginAndCode() {
        val link = parsed("https://vps-rama.tail-net.ts.net/#pair=AbC_123-xyz")
        assertEquals("https://vps-rama.tail-net.ts.net", link.origin)
        assertEquals("AbC_123-xyz", link.code)
    }

    @Test fun keepsNonDefaultPortAndDropsDefaultPort() {
        assertEquals("https://box.example:8443", parsed("https://box.example:8443#pair=abc").origin)
        assertEquals("https://box.example", parsed("https://box.example:443/#pair=abc").origin)
    }

    @Test fun lowercasesHostAndTrimsWhitespace() {
        assertEquals("https://box.example", parsed("  HTTPS://Box.Example/#pair=abc \n").origin)
    }

    @Test fun textWithoutPairFragmentIsNotALink() {
        assertEquals(LinkResult.NotALink, Origins.parseLink("https://box.example/", false))
        assertEquals(LinkResult.NotALink, Origins.parseLink("https://box.example/#other=1", false))
        assertEquals(LinkResult.NotALink, Origins.parseLink("hello", false))
    }

    @Test fun badCodeIsInvalid() {
        assertEquals(LinkResult.Invalid, Origins.parseLink("https://box.example/#pair=", false))
        assertEquals(LinkResult.Invalid, Origins.parseLink("https://box.example/#pair=a b", false))
        assertEquals(LinkResult.Invalid, Origins.parseLink("https://box.example/#pair=a%20b", false))
    }

    @Test fun plainHttpIsRefusedOnRelease() {
        assertEquals(LinkResult.Insecure, Origins.parseLink("http://box.example/#pair=abc", false))
        assertEquals(LinkResult.Insecure, Origins.parseLink("http://localhost:3000/#pair=abc", false))
    }

    @Test fun plainHttpPassesOnlyForLoopbackInDebug() {
        assertEquals("http://localhost:3000", parsed("http://localhost:3000/#pair=abc", true).origin)
        assertEquals("http://10.0.2.2:3000", parsed("http://10.0.2.2:3000/#pair=abc", true).origin)
        assertEquals("http://127.0.0.1:8080", parsed("http://127.0.0.1:8080/#pair=abc", true).origin)
        assertEquals(LinkResult.Insecure, Origins.parseLink("http://box.example/#pair=abc", true))
        assertEquals(LinkResult.Insecure, Origins.parseLink("http://192.168.1.5/#pair=abc", true))
    }

    @Test fun manualOriginWithoutSchemeGetsHttps() {
        assertEquals(OriginCheck.Ok("https://vps-rama.ts.net"), Origins.check("vps-rama.ts.net", false))
        assertEquals(OriginCheck.Ok("https://vps-rama.ts.net"), Origins.check("vps-rama.ts.net/", false))
    }

    @Test fun rejectsEmptyAndUserInfoAndOtherSchemes() {
        assertEquals(OriginCheck.Invalid, Origins.check("", false))
        assertEquals(OriginCheck.Invalid, Origins.check("https://user:pw@box.example", false))
        assertEquals(OriginCheck.Invalid, Origins.check("ftp://box.example", false))
    }

    @Test fun detectsLocalNetworkHosts() {
        assertTrue(Origins.isLocalNetworkHost("https://192.168.1.20"))
        assertTrue(Origins.isLocalNetworkHost("https://10.1.2.3:8443"))
        assertTrue(Origins.isLocalNetworkHost("https://172.20.0.1"))
        assertTrue(Origins.isLocalNetworkHost("https://nas.local"))
        assertFalse(Origins.isLocalNetworkHost("https://172.32.0.1"))
        assertFalse(Origins.isLocalNetworkHost("https://vps.example.com"))
    }
}
