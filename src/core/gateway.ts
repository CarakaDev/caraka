import { createHash } from "node:crypto";
import type {
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionNotification,
} from "@agentclientprotocol/sdk";
import type { CarakaConfig } from "../config.js";
import { Telegram, type TelegramMessage, type TelegramUpdate } from "../channels/telegram.js";
import { ClaudeAcp } from "../drivers/claude-acp.js";
import { Store, type Session } from "../store/db.js";
import { approvalCallbacks, verifyApprovalCallback, type createScrubber } from "./security.js";

type PendingPermission = {
  sessionId: string;
  timer: NodeJS.Timeout;
  finish(response: RequestPermissionResponse): void;
};

export class Gateway {
  private readonly abort = new AbortController();
  private readonly allowed: Set<string>;
  private readonly pending = new Map<string, PendingPermission>();
  private queue = Promise.resolve();
  private queued = 0;
  private active: { local: Session; agentId: string } | undefined;
  private stopping = false;
  private shutdown: Promise<void> | undefined;

  constructor(
    private readonly config: CarakaConfig,
    private readonly approvalKey: Buffer,
    private readonly telegram: Telegram,
    private readonly claude: ClaudeAcp,
    private readonly store: Store,
    private readonly scrub: ReturnType<typeof createScrubber>,
  ) {
    this.allowed = new Set(config.telegram.allowFrom);
  }

  async run() {
    this.store.expireApprovals();
    await this.telegram.deleteWebhook(false, this.abort.signal);
    await this.claude.start();
    for await (const update of this.telegram.updates(this.abort.signal)) this.dispatch(update);
  }

  private dispatch(update: TelegramUpdate) {
    if (update.callback_query) {
      void this.handleCallback(update).catch(() => undefined);
      return;
    }
    const message = update.message;
    if (
      !message?.from ||
      message.chat.type !== "private" ||
      !this.allowed.has(String(message.from.id))
    ) {
      this.store.audit(
        "msg.reject",
        "denied",
        { chatType: message?.chat.type },
        message?.from ? String(message.from.id) : undefined,
      );
      return;
    }
    const text = message.text?.trim();
    if (!text) return;
    this.store.audit(
      "msg.in",
      "accepted",
      { bytes: Buffer.byteLength(text), sha256: createHash("sha256").update(text).digest("hex") },
      String(message.from.id),
    );
    const command = /^\/(\w+)(?:@\w+)?(?:\s|$)/.exec(text)?.[1]?.toLowerCase();
    if (command === "stop") this.respond(message, this.stopActive(message));
    else if (command === "status") this.respond(message, this.status(message));
    else if (command === "help" || command === "start") this.respond(message, this.help(message));
    else if (command === "new") this.enqueue(message, () => this.createOnly(message));
    else this.enqueue(message, () => this.runTask(message, text));
  }

  private enqueue(message: TelegramMessage, task: () => Promise<void>) {
    if (this.stopping) return;
    if (this.queued > 0) {
      void this.sendText(
        String(message.chat.id),
        this.scrub("◌ Tugas masuk antrean."),
        String(message.message_thread_id ?? ""),
        undefined,
        String(message.from?.id),
      ).catch(() => undefined);
    }
    this.queued += 1;
    this.queue = this.queue
      .then(task)
      .catch((error: unknown) => (this.stopping ? undefined : this.reportError(message, error)))
      .finally(() => {
        this.queued -= 1;
      });
  }

  private route(message: TelegramMessage) {
    return { chatId: String(message.chat.id), threadId: String(message.message_thread_id ?? "") };
  }

  private respond(message: TelegramMessage, response: Promise<unknown>) {
    void response
      .catch((error: unknown) => this.reportError(message, error))
      .catch(() => undefined);
  }

  private async sendText(
    chatId: string,
    text: string,
    threadId = "",
    replyMarkup?: Record<string, unknown>,
    principal?: string,
    sessionId?: string,
  ) {
    const clean = this.scrub(text);
    const sent = await this.telegram.sendText(chatId, clean, threadId, replyMarkup);
    this.store.audit(
      "msg.out",
      "sent",
      { kind: "text", bytes: Buffer.byteLength(clean) },
      principal,
      sessionId,
    );
    return sent;
  }

  private async sendResult(session: Session, text: string) {
    const clean = this.scrub(text);
    const sent = await this.telegram.sendResult(session.chatId, clean, session.threadId);
    this.store.audit(
      "msg.out",
      "sent",
      { kind: "result", bytes: Buffer.byteLength(clean) },
      session.principal,
      session.id,
    );
    return sent;
  }

  private title(text: string) {
    return (
      text
        .split("\n")[0]
        ?.replace(/^\/new\s*/i, "")
        .trim()
        .slice(0, 72) || "Tugas baru"
    );
  }

  private async createSession(message: TelegramMessage, title: string, force: boolean) {
    const { chatId } = this.route(message);
    let threadId = String(message.message_thread_id ?? "");
    if (!threadId && this.config.telegram.topics) {
      try {
        threadId = String((await this.telegram.createTopic(chatId, title)).message_thread_id);
      } catch {
        threadId = "";
      }
    }
    if (!force) {
      const existing = this.store.sessionFor(chatId, threadId);
      if (existing) return existing;
    }
    return this.store.createSession({
      principal: String(message.from?.id),
      chatId,
      threadId,
      title,
    });
  }

  private async sessionFor(message: TelegramMessage, title: string) {
    const { chatId, threadId } = this.route(message);
    const existing = this.store.sessionFor(chatId, threadId);
    if (existing) return existing;
    return this.createSession(message, title, false);
  }

  private header(session: Session) {
    return session.threadId ? "" : `[${this.config.workspace.name} · #${session.id.slice(0, 4)}]\n`;
  }

  private async createOnly(message: TelegramMessage) {
    const session = await this.createSession(message, "Tugas baru", true);
    await this.sendText(
      session.chatId,
      this.scrub(`${this.header(session)}Tulis tugas untuk Claude di sini.`),
      session.threadId,
      undefined,
      session.principal,
      session.id,
    );
  }

  private async runTask(message: TelegramMessage, prompt: string) {
    const session = await this.sessionFor(message, this.title(prompt));
    this.store.setState(session.id, "running");
    const progress = await this.sendText(
      session.chatId,
      this.scrub(`${this.header(session)}◌ Claude sedang bekerja…`),
      session.threadId,
      undefined,
      session.principal,
      session.id,
    );
    let output = "";
    let lastEdit = 0;
    let agentId = session.agentSessionId;
    try {
      agentId = await this.claude.session(agentId, this.config.workspace.path);
      if (agentId !== session.agentSessionId) this.store.setAgentSession(session.id, agentId);
      this.active = { local: session, agentId };
      this.store.audit(
        "run.start",
        "running",
        { agent: "claude", promptBytes: Buffer.byteLength(prompt) },
        session.principal,
        session.id,
      );
      const result = await this.claude.prompt(agentId, prompt, {
        update: async (notification) => {
          const text = this.agentText(notification);
          if (!text) return;
          output = `${output}${text}`.slice(-240_000);
          const now = Date.now();
          if (now - lastEdit < 1500) return;
          lastEdit = now;
          await this.telegram
            .editText(
              session.chatId,
              progress.message_id,
              this.scrub(`${this.header(session)}${output.slice(-3500)}`),
            )
            .catch(() => undefined);
        },
        permission: (request) => this.askPermission(session, agentId!, request),
      });
      const cancelled = result.stopReason === "cancelled";
      this.store.setState(session.id, cancelled ? "cancelled" : "done");
      await this.sendResult(
        session,
        this.scrub(
          `${this.header(session)}${output || (cancelled ? "Tugas dibatalkan." : "Claude selesai tanpa keluaran teks.")}`,
        ),
      );
      this.store.audit(
        "run.finish",
        result.stopReason,
        { outputBytes: Buffer.byteLength(output) },
        session.principal,
        session.id,
      );
    } catch (error) {
      if (this.store.sessionById(session.id)?.state !== "cancelled")
        this.store.setState(session.id, "failed");
      throw error;
    } finally {
      this.active = undefined;
      await this.telegram.deleteMessage(session.chatId, progress.message_id).catch(() => undefined);
    }
  }

  private agentText(notification: SessionNotification) {
    const update = notification.update;
    return update.sessionUpdate === "agent_message_chunk" && update.content.type === "text"
      ? update.content.text
      : "";
  }

  private async askPermission(
    session: Session,
    agentId: string,
    request: RequestPermissionRequest,
  ) {
    const allow = request.options.find((option) => option.kind === "allow_once");
    const reject = request.options.find((option) => option.kind === "reject_once");
    if (!allow) return { outcome: { outcome: "cancelled" } } as RequestPermissionResponse;
    const callback = approvalCallbacks(this.approvalKey);
    const expiresAt = Date.now() + 10 * 60_000;
    this.store.createApproval({
      id: callback.id,
      principal: session.principal,
      sessionId: session.id,
      agentSessionId: agentId,
      toolCallId: request.toolCall.toolCallId,
      allowOptionId: allow.optionId,
      rejectOptionId: reject?.optionId ?? null,
      expiresAt,
    });
    this.store.setState(session.id, "awaiting_approval");
    await this.sendText(
      session.chatId,
      this.scrub(
        `${this.header(session)}⏸ Claude meminta izin\n${request.toolCall.title ?? request.toolCall.kind ?? "Operasi tool"}${this.permissionTarget(request)}\n\nBerlaku 10 menit.`,
      ),
      session.threadId,
      {
        inline_keyboard: [
          [
            { text: "Setujui sekali", callback_data: callback.allow },
            { text: "Tolak", callback_data: callback.reject },
          ],
        ],
      },
      session.principal,
      session.id,
    );
    return new Promise<RequestPermissionResponse>((resolve) => {
      const finish = (response: RequestPermissionResponse) => {
        const pending = this.pending.get(callback.id);
        if (pending) clearTimeout(pending.timer);
        this.pending.delete(callback.id);
        if (!this.stopping) this.store.setState(session.id, "running");
        resolve(response);
      };
      const timer = setTimeout(() => {
        this.store.expireApproval(callback.id);
        this.store.audit(
          "approval.decide",
          "expired",
          { toolCallId: request.toolCall.toolCallId },
          session.principal,
          session.id,
        );
        finish(
          reject
            ? { outcome: { outcome: "selected", optionId: reject.optionId } }
            : { outcome: { outcome: "cancelled" } },
        );
      }, expiresAt - Date.now());
      this.pending.set(callback.id, { sessionId: session.id, timer, finish });
    });
  }

  private permissionTarget(request: RequestPermissionRequest) {
    const locations = request.toolCall.locations?.map((item) => item.path).slice(0, 3) ?? [];
    if (locations.length) return `\nTarget: ${this.scrub(locations.join(", ")).slice(0, 700)}`;
    const raw = request.toolCall.rawInput;
    if (!raw || typeof raw !== "object") return "";
    const input = raw as Record<string, unknown>;
    for (const key of ["command", "path", "file_path", "url"]) {
      if (typeof input[key] === "string")
        return `\n${key}: ${this.scrub(input[key]).slice(0, 700)}`;
    }
    return "";
  }

  private async handleCallback(update: TelegramUpdate) {
    const query = update.callback_query;
    if (!query) return;
    const principal = String(query.from.id);
    if (!this.allowed.has(principal)) {
      this.store.audit("approval.decide", "denied", {}, principal);
      await this.telegram.answerCallback(
        query.id,
        "Kamu tidak diizinkan menyetujui tugas ini.",
        true,
      );
      return;
    }
    const verified = query.data ? verifyApprovalCallback(this.approvalKey, query.data) : null;
    const message = query.message;
    const session = message
      ? this.store.sessionFor(String(message.chat.id), String(message.message_thread_id ?? ""))
      : undefined;
    if (!verified || !session) {
      await this.telegram.answerCallback(query.id, "Approval tidak sah atau sudah berakhir.", true);
      return;
    }
    const approval = this.store.resolveApproval(
      verified.id,
      principal,
      session.id,
      verified.decision,
    );
    const pending = this.pending.get(verified.id);
    if (!approval || !pending || pending.sessionId !== session.id) {
      this.store.audit(
        "approval.decide",
        "rejected",
        { reason: "invalid, expired, or replayed" },
        principal,
        session.id,
      );
      await this.telegram.answerCallback(
        query.id,
        "Approval sudah dipakai atau kedaluwarsa.",
        true,
      );
      return;
    }
    const optionId =
      verified.decision === "allow" ? approval.allowOptionId : approval.rejectOptionId;
    pending.finish(
      optionId
        ? { outcome: { outcome: "selected", optionId } }
        : { outcome: { outcome: "cancelled" } },
    );
    this.store.audit(
      "approval.decide",
      verified.decision,
      { toolCallId: approval.toolCallId },
      principal,
      session.id,
    );
    await this.telegram.answerCallback(
      query.id,
      verified.decision === "allow" ? "Diizinkan sekali." : "Ditolak.",
    );
    if (message)
      await this.telegram
        .clearKeyboard(String(message.chat.id), message.message_id)
        .catch(() => undefined);
  }

  private async stopActive(message: TelegramMessage) {
    if (!this.active) {
      await this.sendText(
        String(message.chat.id),
        this.scrub("Tidak ada tugas yang sedang berjalan."),
        String(message.message_thread_id ?? ""),
        undefined,
        String(message.from?.id),
      );
      return;
    }
    await this.claude.cancel(this.active.agentId);
    for (const [id, pending] of this.pending) {
      if (pending.sessionId === this.active.local.id)
        pending.finish({ outcome: { outcome: "cancelled" } });
      this.pending.delete(id);
    }
    this.store.setState(this.active.local.id, "cancelled");
    await this.sendText(
      this.active.local.chatId,
      this.scrub(`${this.header(this.active.local)}Tugas sedang dibatalkan.`),
      this.active.local.threadId,
      undefined,
      this.active.local.principal,
      this.active.local.id,
    );
  }

  private async status(message: TelegramMessage) {
    const { chatId, threadId } = this.route(message);
    const session = this.store.sessionFor(chatId, threadId);
    await this.sendText(
      chatId,
      this.scrub(
        session
          ? `${this.header(session)}Status: ${session.state}.`
          : "Belum ada sesi di percakapan ini.",
      ),
      threadId,
      undefined,
      String(message.from?.id),
      session?.id,
    );
  }

  private help(message: TelegramMessage) {
    return this.sendText(
      String(message.chat.id),
      this.scrub("Kirim tugas sebagai pesan biasa. Perintah: /new, /status, /stop, /help."),
      String(message.message_thread_id ?? ""),
      undefined,
      String(message.from?.id),
    );
  }

  private async reportError(message: TelegramMessage, error: unknown) {
    const details = this.scrub(error instanceof Error ? error.message : error);
    this.store.audit("error", "failed", { message: details }, String(message.from?.id));
    await this.sendText(
      String(message.chat.id),
      this.scrub(
        `Claude tidak dapat menyelesaikan tugas. ${details}\nCoba /new atau jalankan \`npx caraka doctor\` di komputer.`,
      ),
      String(message.message_thread_id ?? ""),
      undefined,
      String(message.from?.id),
    ).catch(() => undefined);
  }

  stop() {
    this.stopping = true;
    return (this.shutdown ??= this.stopNow());
  }

  private async stopNow() {
    this.abort.abort();
    for (const pending of this.pending.values())
      pending.finish({ outcome: { outcome: "cancelled" } });
    this.pending.clear();
    if (this.active) await this.claude.cancel(this.active.agentId).catch(() => undefined);
    await this.claude.stop();
    this.store.expireApprovals();
    await this.queue.catch(() => undefined);
    this.store.close();
  }
}
