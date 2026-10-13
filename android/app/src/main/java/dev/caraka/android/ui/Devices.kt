package dev.caraka.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.caraka.android.R
import dev.caraka.android.data.AppUi
import dev.caraka.android.data.PairedDevice
import dev.caraka.android.ui.theme.Brand
import dev.caraka.android.ui.theme.JetBrainsMono
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

@Composable
fun DevicesScreen(vm: AppViewModel, ui: AppUi) {
    val scope = rememberCoroutineScope()
    var devices by remember { mutableStateOf<List<PairedDevice>?>(null) }
    var failed by remember { mutableStateOf(false) }
    var reload by remember { mutableIntStateOf(0) }
    var confirmLogout by remember { mutableStateOf(false) }
    var confirmRevoke by remember { mutableStateOf<PairedDevice?>(null) }

    LaunchedEffect(reload) {
        failed = false
        try {
            devices = vm.repo.devices()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            failed = true
        }
    }

    Column(Modifier.fillMaxSize().background(Brand.Bg).safeDrawingPadding()) {
        Row(Modifier.fillMaxWidth().padding(end = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            CkIconButton(Icons.AutoMirrored.Filled.ArrowBack, t(R.string.back), onClick = { vm.back() })
            Text(t(R.string.devices_title), color = Brand.Text, fontSize = 19.sp, fontWeight = FontWeight.Bold)
        }
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Brand.Surface)
                    .border(1.dp, Brand.Line, RoundedCornerShape(16.dp))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(t(R.string.connection), color = Brand.Dim, fontSize = 12.sp, fontFamily = JetBrainsMono)
                ConnectionLine(ui)
                ui.origin?.let { Text(it, color = Brand.Text, fontSize = 14.sp, fontFamily = JetBrainsMono) }
            }

            Text(t(R.string.paired_devices), color = Brand.Text, fontSize = 17.sp, fontWeight = FontWeight.Bold)
            when {
                failed -> {
                    Text(t(R.string.err_devices), color = Color(0xFFFF93B2), fontSize = 14.sp)
                    CkButton(t(R.string.retry), onClick = { reload++ }, primary = false)
                }
                devices == null -> Text(t(R.string.loading), color = Brand.Muted, fontSize = 14.sp)
                else -> Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    devices.orEmpty().forEach { device ->
                        val current = device.id == ui.device?.id
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Brand.Surface)
                                .border(1.dp, if (current) Brand.Coral.copy(alpha = 0.5f) else Brand.Line, RoundedCornerShape(14.dp))
                                .padding(start = 16.dp, top = 8.dp, bottom = 8.dp, end = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(device.name, color = Brand.Text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                                if (current) Text(t(R.string.this_device), color = Brand.Coral, fontSize = 12.sp, fontFamily = JetBrainsMono)
                            }
                            if (!current) {
                                CkButton(t(R.string.revoke), onClick = { confirmRevoke = device }, primary = false, modifier = Modifier.padding(start = 8.dp))
                            }
                        }
                    }
                }
            }
            Text(t(R.string.add_device_hint), color = Brand.Muted, fontSize = 13.sp, lineHeight = 19.sp)
            CkButton(t(R.string.disconnect), onClick = { confirmLogout = true }, danger = true, modifier = Modifier.fillMaxWidth())
            Box(Modifier.size(8.dp))
        }
    }

    if (confirmLogout) {
        AlertDialog(
            onDismissRequest = { confirmLogout = false },
            containerColor = Brand.Surface,
            title = { Text(t(R.string.disconnect_title), color = Brand.Text) },
            text = { Text(t(R.string.disconnect_body), color = Brand.Muted) },
            confirmButton = {
                TextButton(onClick = {
                    confirmLogout = false
                    vm.logout()
                }) { Text(t(R.string.disconnect), color = Color(0xFFFF93B2)) }
            },
            dismissButton = { TextButton(onClick = { confirmLogout = false }) { Text(t(R.string.cancel), color = Brand.Text) } },
        )
    }
    confirmRevoke?.let { device ->
        AlertDialog(
            onDismissRequest = { confirmRevoke = null },
            containerColor = Brand.Surface,
            title = { Text(t(R.string.revoke_title, device.name), color = Brand.Text) },
            text = { Text(t(R.string.revoke_body), color = Brand.Muted) },
            confirmButton = {
                TextButton(onClick = {
                    confirmRevoke = null
                    scope.launch {
                        try {
                            vm.repo.revokeDevice(device.id)
                        } catch (e: CancellationException) {
                            throw e
                        } catch (_: Exception) {
                            failed = true
                        }
                        reload++
                    }
                }) { Text(t(R.string.revoke), color = Color(0xFFFF93B2)) }
            },
            dismissButton = { TextButton(onClick = { confirmRevoke = null }) { Text(t(R.string.cancel), color = Brand.Text) } },
        )
    }
}
