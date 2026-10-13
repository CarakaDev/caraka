package dev.caraka.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.caraka.android.R
import dev.caraka.android.data.AppUi
import dev.caraka.android.data.Connectivity
import dev.caraka.android.data.Room
import dev.caraka.android.data.SessionStatus
import dev.caraka.android.ui.theme.Brand
import dev.caraka.android.ui.theme.JetBrainsMono
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomsScreen(vm: AppViewModel, ui: AppUi, locale: Locale) {
    var picking by remember { mutableStateOf(false) }
    val groups = ui.rooms.groupBy { it.workspace }
    val lastMessage = remember(ui.messages) { ui.messages.groupBy { it.roomId }.mapValues { it.value.lastOrNull() } }

    fun startNew() {
        when (ui.workspaces.size) {
            0 -> Unit
            1 -> vm.push(Screen.Chat(null, ui.workspaces.first().slug))
            else -> picking = true
        }
    }

    Column(Modifier.fillMaxSize().background(Brand.Bg).safeDrawingPadding()) {
        Row(
            Modifier.fillMaxWidth().padding(start = 20.dp, end = 8.dp, top = 12.dp, bottom = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Image(painterResource(R.drawable.ic_logo), contentDescription = null, modifier = Modifier.size(30.dp))
            Column(Modifier.weight(1f).padding(start = 12.dp)) {
                Text(t(R.string.rooms_title), color = Brand.Text, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                ConnectionLine(ui)
            }
            CkIconButton(Icons.Filled.Add, t(R.string.new_session), onClick = ::startNew, enabled = ui.workspaces.isNotEmpty())
            CkIconButton(Icons.Filled.Settings, t(R.string.devices_title), onClick = { vm.push(Screen.Devices) })
        }

        if (ui.rooms.isEmpty()) {
            Column(
                Modifier.fillMaxSize().padding(32.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    if (ui.workspaces.isEmpty()) t(R.string.no_workspace) else t(R.string.no_sessions),
                    color = Brand.Muted,
                    fontSize = 15.sp,
                    lineHeight = 22.sp,
                )
                if (ui.workspaces.isNotEmpty()) {
                    Box(Modifier.padding(top = 20.dp)) { CkButton(t(R.string.new_session), onClick = ::startNew) }
                }
            }
        } else {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 24.dp)) {
                groups.forEach { (workspace, rooms) ->
                    item(key = "h-$workspace") {
                        Text(
                            workspace,
                            color = Brand.Dim,
                            fontFamily = JetBrainsMono,
                            fontSize = 12.sp,
                            letterSpacing = 1.sp,
                            modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 6.dp),
                        )
                    }
                    items(rooms, key = { it.id }) { room ->
                        RoomRow(room, lastMessage[room.id]?.text, lastMessage[room.id]?.createdAt ?: room.createdAt, locale) {
                            vm.push(Screen.Chat(room.id, null))
                        }
                    }
                }
            }
        }
    }

    if (picking) {
        ModalBottomSheet(
            onDismissRequest = { picking = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = Brand.Surface,
        ) {
            Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
                Text(t(R.string.pick_workspace), color = Brand.Text, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    ui.workspaces.forEach { ws ->
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .heightIn(min = 56.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(Brand.Surface2)
                                .border(1.dp, Brand.Line, RoundedCornerShape(14.dp))
                                .clickable(role = Role.Button) {
                                    picking = false
                                    vm.push(Screen.Chat(null, ws.slug))
                                }
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(ws.slug, color = Brand.Text, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            ws.agent?.let { Text(it, color = Brand.Dim, fontFamily = JetBrainsMono, fontSize = 12.sp) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ConnectionLine(ui: AppUi) {
    val (label, color) = when (ui.connectivity) {
        Connectivity.Connected -> t(R.string.conn_connected) to Brand.Green
        Connectivity.Connecting -> t(R.string.conn_connecting) to Brand.Muted
        Connectivity.Reconnecting -> t(R.string.conn_reconnecting) to Brand.Gold
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(7.dp).background(color, CircleShape))
        Text(
            (ui.device?.name?.let { "$it · " } ?: "") + label,
            color = Brand.Muted,
            fontSize = 12.sp,
            fontFamily = JetBrainsMono,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(start = 6.dp),
        )
    }
}

@Composable
private fun RoomRow(room: Room, snippet: String?, time: Long, locale: Locale, onClick: () -> Unit) {
    val state = room.state
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 72.dp)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            Modifier.size(40.dp).clip(CircleShape).background(Brand.Surface).border(1.dp, Brand.Line, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            StatusGlyph(state)
        }
        Column(Modifier.weight(1f).padding(start = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    room.title?.takeIf { it.isNotBlank() } ?: room.workspace,
                    color = Brand.Text,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(formatTime(time, locale), color = Brand.Dim, fontSize = 12.sp, fontFamily = JetBrainsMono, modifier = Modifier.padding(start = 8.dp))
            }
            Text(statusLabel(state), color = statusColor(state), fontSize = 12.sp, fontFamily = JetBrainsMono, modifier = Modifier.padding(top = 2.dp))
            if (!snippet.isNullOrBlank()) {
                Text(
                    snippet.trim().lineSequence().firstOrNull { it.isNotBlank() }.orEmpty(),
                    color = Brand.Muted,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}
