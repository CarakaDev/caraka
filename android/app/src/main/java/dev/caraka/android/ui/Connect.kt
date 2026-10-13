package dev.caraka.android.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboard
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import dev.caraka.android.BuildConfig
import dev.caraka.android.R
import dev.caraka.android.data.LinkResult
import dev.caraka.android.data.Notice
import dev.caraka.android.data.Origins
import dev.caraka.android.data.PairResult
import dev.caraka.android.ui.theme.Brand
import kotlinx.coroutines.launch

private enum class ConnectError { Insecure, Invalid, Rejected, Unreachable, NotCaraka, ScanFailed, EmptyCode }

@Composable
fun ConnectScreen(vm: AppViewModel) {
    val ui by vm.ui.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val clipboard = LocalClipboard.current
    var origin by rememberSaveable { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("") }
    var error by remember { mutableStateOf<ConnectError?>(null) }
    var busy by remember { mutableStateOf(false) }

    fun applyText(text: String): Boolean =
        when (val r = Origins.parseLink(text, BuildConfig.DEBUG)) {
            is LinkResult.Parsed -> {
                origin = r.link.origin.removePrefix("https://")
                if (r.link.origin.startsWith("http://")) origin = r.link.origin
                code = r.link.code
                error = null
                true
            }
            LinkResult.Insecure -> {
                error = ConnectError.Insecure
                true
            }
            LinkResult.Invalid -> {
                error = ConnectError.Invalid
                true
            }
            LinkResult.NotALink -> false
        }

    fun connect() {
        if (busy) return
        scope.launch {
            busy = true
            error = null
            val result = vm.repo.pair(origin, code)
            busy = false
            error = when (result) {
                PairResult.Success -> null
                PairResult.Insecure -> ConnectError.Insecure
                PairResult.Invalid -> ConnectError.Invalid
                PairResult.Rejected -> if (code.isBlank()) ConnectError.EmptyCode else ConnectError.Rejected
                PairResult.Unreachable -> ConnectError.Unreachable
            }
        }
    }

    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { connect() }
    fun connectChecked() {
        val checked = (Origins.check(origin, BuildConfig.DEBUG) as? dev.caraka.android.data.OriginCheck.Ok)?.origin
        val needs = checked != null && Origins.isLocalNetworkHost(checked) && Build.VERSION.SDK_INT >= 37 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_LOCAL_NETWORK) != PackageManager.PERMISSION_GRANTED
        if (needs) permission.launch(Manifest.permission.ACCESS_LOCAL_NETWORK) else connect()
    }

    fun scan() {
        val options = GmsBarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
        GmsBarcodeScanning.getClient(context, options).startScan()
            .addOnSuccessListener { barcode ->
                val raw = barcode.rawValue.orEmpty()
                if (!applyText(raw)) error = ConnectError.NotCaraka
            }
            .addOnFailureListener { error = ConnectError.ScanFailed }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(Brand.Bg)
            .safeDrawingPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        // Header is centred: logo, wordmark, title, help text.
        Column(
            Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Image(painterResource(R.drawable.ic_logo), contentDescription = null, modifier = Modifier.size(60.dp))
                Text("caraka", color = Brand.Text, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.8).sp)
            }
            Text(t(R.string.connect_title), color = Brand.Text, fontSize = 26.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            Text(t(R.string.connect_help), color = Brand.Muted, fontSize = 15.sp, lineHeight = 22.sp, textAlign = TextAlign.Center)
        }

        if (ui.notice == Notice.SignedOut) {
            Text(t(R.string.signed_out), color = Brand.Gold, fontSize = 14.sp, lineHeight = 20.sp)
        }

        CkButton(t(R.string.scan_qr), onClick = ::scan, modifier = Modifier.fillMaxWidth())
        CkButton(
            t(R.string.paste_link),
            onClick = {
                scope.launch {
                    val text = clipboard.getClipEntry()?.clipData?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.text?.toString().orEmpty()
                    if (!applyText(text)) error = ConnectError.NotCaraka
                }
            },
            primary = false,
            modifier = Modifier.fillMaxWidth(),
        )

        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.weight(1f).height(1.dp).background(Brand.Line))
            Text(t(R.string.or_manual), color = Brand.Dim, fontSize = 12.sp)
            Box(Modifier.weight(1f).height(1.dp).background(Brand.Line))
        }

        CkField(
            value = origin,
            onChange = { value ->
                if (!applyText(value)) {
                    origin = value
                    error = null
                }
            },
            label = t(R.string.machine_address),
            placeholder = "vps-rama.tail-net.ts.net",
            keyboard = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Next),
        )
        CkField(
            value = code,
            onChange = { code = it.trim(); error = null },
            label = t(R.string.pair_code),
            mono = true,
            keyboard = KeyboardOptions(keyboardType = KeyboardType.Ascii, imeAction = ImeAction.Go),
            actions = KeyboardActions(onGo = { if (!busy && origin.isNotBlank() && code.isNotBlank()) connectChecked() }),
        )

        error?.let {
            Text(
                when (it) {
                    ConnectError.Insecure -> t(R.string.err_https)
                    ConnectError.Invalid -> t(R.string.err_address)
                    ConnectError.Rejected -> t(R.string.err_pair)
                    ConnectError.Unreachable -> t(R.string.err_unreachable)
                    ConnectError.NotCaraka -> t(R.string.err_not_caraka)
                    ConnectError.ScanFailed -> t(R.string.err_scan)
                    ConnectError.EmptyCode -> t(R.string.err_pair)
                },
                color = Color(0xFFFF93B2),
                fontSize = 14.sp,
                lineHeight = 20.sp,
            )
        }

        CkButton(
            if (busy) t(R.string.connecting) else t(R.string.connect),
            onClick = ::connectChecked,
            enabled = !busy && origin.isNotBlank() && code.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        )

        CkButton(t(R.string.try_demo), onClick = { vm.enterDemo() }, primary = false, modifier = Modifier.fillMaxWidth())

        PrivacyPolicyLink(Modifier.align(Alignment.CenterHorizontally))
    }
}
