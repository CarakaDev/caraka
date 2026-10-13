package dev.caraka.android.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Holds the machine origin and the device cookie between launches. */
interface SessionStore {
    fun origin(): String?
    fun cookie(): String?
    fun save(origin: String, cookie: String)
    fun clear()
}

/** AES-GCM with a key that never leaves the Android Keystore. */
class KeystoreSessionStore(context: Context) : SessionStore {
    private val prefs = context.applicationContext.getSharedPreferences("session", Context.MODE_PRIVATE)

    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return gen.generateKey()
    }

    private fun seal(plain: String): String {
        val cipher = Cipher.getInstance(TRANSFORM)
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val out = cipher.iv + cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(out, Base64.NO_WRAP)
    }

    private fun open(blob: String): String? = try {
        val bytes = Base64.decode(blob, Base64.NO_WRAP)
        val cipher = Cipher.getInstance(TRANSFORM)
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes, 0, IV_SIZE))
        String(cipher.doFinal(bytes, IV_SIZE, bytes.size - IV_SIZE), Charsets.UTF_8)
    } catch (_: Exception) {
        null
    }

    private fun read(name: String): String? = prefs.getString(name, null)?.let { open(it) }

    override fun origin(): String? = read("o")
    override fun cookie(): String? = read("c")

    override fun save(origin: String, cookie: String) {
        prefs.edit().putString("o", seal(origin)).putString("c", seal(cookie)).apply()
    }

    override fun clear() {
        prefs.edit().clear().apply()
        try {
            KeyStore.getInstance("AndroidKeyStore").apply { load(null) }.deleteEntry(ALIAS)
        } catch (_: Exception) {
        }
    }

    private companion object {
        const val ALIAS = "caraka_session"
        const val TRANSFORM = "AES/GCM/NoPadding"
        const val IV_SIZE = 12
    }
}

/** Keeps data in memory only. Used by tests and by the demo build. */
class MemorySessionStore(private var origin: String? = null, private var cookie: String? = null) : SessionStore {
    override fun origin() = origin
    override fun cookie() = cookie
    override fun save(origin: String, cookie: String) {
        this.origin = origin
        this.cookie = cookie
    }

    override fun clear() {
        origin = null
        cookie = null
    }
}
