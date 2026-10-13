package dev.caraka.android.ui

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.caraka.android.R
import dev.caraka.android.ui.theme.Brand

private const val PRIVACY_URL = "https://caraka.dev/privacy"
private val LICENSE_FILES = listOf("PublicSans-OFL.txt", "JetBrainsMono-OFL.txt")

// A text link with a touch target of 48 dp. It uses the muted colour.
@Composable
private fun LegalLink(label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier.heightIn(min = 48.dp).clickable(onClick = onClick).padding(horizontal = 4.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Text(label, color = Brand.Muted, fontSize = 14.sp, textDecoration = TextDecoration.Underline)
    }
}

// Open the policy in the system browser. No WebView is used.
@Composable
fun PrivacyPolicyLink(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    LegalLink(
        t(R.string.privacy_policy),
        onClick = {
            try {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_URL)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (_: ActivityNotFoundException) {
                // The device has no browser. Do nothing.
            }
        },
        modifier,
    )
}

// Show the bundled font licenses in a scrollable dialog.
@Composable
fun LicensesLink(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var open by remember { mutableStateOf(false) }
    LegalLink(t(R.string.open_source_licenses), onClick = { open = true }, modifier)
    if (open) {
        val text = remember {
            LICENSE_FILES.joinToString("\n\n----\n\n") { name ->
                try {
                    context.assets.open("licenses/$name").bufferedReader().use { it.readText() }
                } catch (_: java.io.IOException) {
                    name
                }
            }
        }
        AlertDialog(
            onDismissRequest = { open = false },
            containerColor = Brand.Surface,
            title = { Text(t(R.string.open_source_licenses), color = Brand.Text) },
            text = {
                Text(
                    text,
                    color = Brand.Muted,
                    fontSize = 11.sp,
                    lineHeight = 15.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                )
            },
            confirmButton = { TextButton(onClick = { open = false }) { Text(t(R.string.close), color = Brand.Text) } },
        )
    }
}
