package dev.caraka.android.data

import java.net.URI

/** A pairing link split into the machine origin and the one-time code. */
data class PairLink(val origin: String, val code: String)

sealed interface OriginCheck {
    data class Ok(val origin: String) : OriginCheck
    data object Insecure : OriginCheck
    data object Invalid : OriginCheck
}

sealed interface LinkResult {
    data class Parsed(val link: PairLink) : LinkResult
    data object NotALink : LinkResult
    data object Insecure : LinkResult
    data object Invalid : LinkResult
}

object Origins {
    private val codePattern = Regex("^[A-Za-z0-9_-]{1,64}$")

    fun isLoopbackOrEmulator(host: String): Boolean {
        val h = host.lowercase().removePrefix("[").removeSuffix("]")
        return h == "localhost" || h == "10.0.2.2" || h == "::1" || h.startsWith("127.")
    }

    /** True when the host sits on the local network, where Android 17 asks for a permission. */
    fun isLocalNetworkHost(origin: String): Boolean {
        val host = runCatching { URI(origin).host }.getOrNull()?.lowercase() ?: return false
        if (host.endsWith(".local") || host.endsWith(".lan")) return true
        val parts = host.split('.').mapNotNull { it.toIntOrNull() }
        if (parts.size != 4) return false
        val (a, b) = parts
        return a == 10 || (a == 172 && b in 16..31) || (a == 192 && b == 168) || (a == 169 && b == 254)
    }

    /**
     * Turns user input into an exact origin: scheme, host, and a non-default port.
     * HTTPS is required. Plain HTTP passes only for loopback hosts on a debug build.
     */
    fun check(input: String, allowCleartextDev: Boolean): OriginCheck {
        val text = input.trim()
        if (text.isEmpty()) return OriginCheck.Invalid
        val withScheme = if (text.contains("://")) text else "https://$text"
        val uri = try {
            URI(withScheme)
        } catch (_: Exception) {
            return OriginCheck.Invalid
        }
        val scheme = uri.scheme?.lowercase() ?: return OriginCheck.Invalid
        val host = uri.host?.lowercase() ?: return OriginCheck.Invalid
        if (uri.userInfo != null) return OriginCheck.Invalid
        if (scheme != "https" && scheme != "http") return OriginCheck.Invalid
        if (scheme == "http" && !(allowCleartextDev && isLoopbackOrEmulator(host))) return OriginCheck.Insecure
        val defaultPort = if (scheme == "https") 443 else 80
        val port = if (uri.port == -1 || uri.port == defaultPort) "" else ":${uri.port}"
        return OriginCheck.Ok("$scheme://$host$port")
    }

    /** Parses `ORIGIN/#pair=CODE`. Pure function: it sends nothing. */
    fun parseLink(text: String, allowCleartextDev: Boolean): LinkResult {
        val trimmed = text.trim()
        val hash = trimmed.indexOf('#')
        if (hash < 0) return LinkResult.NotALink
        val fragment = trimmed.substring(hash + 1)
        val code = fragment.split('&')
            .map { it.split('=', limit = 2) }
            .firstOrNull { it.size == 2 && it[0] == "pair" }
            ?.get(1)
            ?.trim()
            ?: return LinkResult.NotALink
        if (!codePattern.matches(code)) return LinkResult.Invalid
        return when (val origin = check(trimmed.substring(0, hash), allowCleartextDev)) {
            is OriginCheck.Ok -> LinkResult.Parsed(PairLink(origin.origin, code))
            OriginCheck.Insecure -> LinkResult.Insecure
            OriginCheck.Invalid -> LinkResult.Invalid
        }
    }
}
