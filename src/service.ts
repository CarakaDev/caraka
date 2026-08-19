// Caraka prints unit files. It never writes one, never calls `systemctl`,
// `launchctl`, or `schtasks`, and the package has no install lifecycle script.
// The operator runs the steps, so the operator can read them first.
//
// The launchd and schtasks templates have not been run on macOS or Windows.
// They are literal strings with no branching, and their status is written in
// `docs/install-guide.md` rather than implied by shipping them.

export type ServiceKind = "systemd" | "launchd" | "schtasks";

export const serviceKinds: ServiceKind[] = ["systemd", "launchd", "schtasks"];

export function isServiceKind(value: string | undefined): value is ServiceKind {
  return serviceKinds.includes(value as ServiceKind);
}

export type ServiceInput = {
  kind: ServiceKind;
  execPath: string;
  cliPath: string;
  workspace: string;
};

function systemd({ execPath, cliPath, workspace }: ServiceInput) {
  return `# ~/.config/systemd/user/caraka.service
[Unit]
Description=Caraka — Telegram to the coding agent on this machine
After=network-online.target

[Service]
Type=simple
WorkingDirectory=${workspace}
ExecStart=${execPath} ${cliPath} start --workspace ${workspace}
Restart=on-failure
RestartSec=5
RestartPreventExitStatus=78

[Install]
WantedBy=default.target

# Steps you run yourself:
#   1. Save the block above to ~/.config/systemd/user/caraka.service
#   2. systemctl --user daemon-reload
#   3. systemctl --user enable --now caraka.service
#   4. systemctl --user status caraka.service
#
# A second Caraka on this machine needs a second unit and its own data
# directory, or the two share one config, one database, one secrets directory,
# and one PID file (issue #13). Save it as caraka-<name>.service and add, under
# [Service]:
#   Environment=CARAKA_HOME=%h/.caraka-<name>
#
# Optional, and a separate decision: loginctl enable-linger $USER
# Lingering keeps the unit running after you log out, which means Caraka can act
# on your machine at a time when nobody is at it.`;
}

function launchd({ execPath, cliPath, workspace }: ServiceInput) {
  return `<!-- ~/Library/LaunchAgents/dev.caraka.gateway.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>dev.caraka.gateway</string>
  <key>ProgramArguments</key>
  <array>
    <string>${execPath}</string>
    <string>${cliPath}</string>
    <string>start</string>
    <string>--workspace</string>
    <string>${workspace}</string>
  </array>
  <key>WorkingDirectory</key><string>${workspace}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key>
  <dict><key>SuccessfulExit</key><false/></dict>
</dict>
</plist>

<!--
This is a per-user LaunchAgent. It starts when you log in and stops when you log
out. It does not start at boot; starting at boot needs a root daemon, which
Caraka does not print.

Steps you run yourself:
  1. Save the block above to ~/Library/LaunchAgents/dev.caraka.gateway.plist
  2. chmod 0600 ~/Library/LaunchAgents/dev.caraka.gateway.plist
  3. launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/dev.caraka.gateway.plist
  4. launchctl print gui/$(id -u)/dev.caraka.gateway

macOS will show it under Login Items as a background item.
-->`;
}

function schtasks({ execPath, cliPath, workspace }: ServiceInput) {
  return `REM Run this in your own account. It creates a logon task, not a system task.
schtasks /create /tn "Caraka" /sc ONLOGON /it /np /f ^
  /tr "\\"${execPath}\\" \\"${cliPath}\\" start --workspace \\"${workspace}\\""

REM Steps you run yourself:
REM   1. Run the command above in a normal (not elevated) Command Prompt
REM   2. schtasks /query /tn "Caraka"
REM   3. schtasks /run /tn "Caraka"
REM
REM The task runs only while you are logged in, and only as you. It has no
REM restart-on-failure setting; Task Scheduler restarts are configured in the
REM task's Settings tab if you want them.`;
}

const templates: Record<ServiceKind, (input: ServiceInput) => string> = {
  systemd,
  launchd,
  schtasks,
};

export function serviceUnit(input: ServiceInput) {
  return templates[input.kind](input);
}
