// Painel de acompanhamento: recebe as mensagens dos grupos do Telegram (webhook do bot)
// e grava em public.painel_mensagens. Não responde nada no grupo.
//
// Segredos: TELEGRAM_BOT_TOKEN fica nos Secrets das Edge Functions (colocado pela dona do bot).
// O segredo do webhook e o sal de pseudonimização ficam em public.painel_config (gerados no banco).
// Privacidade: guarda só o primeiro nome e um código pseudônimo do autor. Fotos ficam só como referência.
// Grupos novos ficam "aguardando liberação" (painel_chats.permitido = false) e nada é gravado até liberar.
//
// GET ?acao=configurar  liga o webhook do bot a esta função (só aponta para ela mesma).
// GET ?acao=status      mostra se o bot e o webhook estão ok, sem expor segredos.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const URL_SB = Deno.env.get("SUPABASE_URL")!;
const db = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const URL_FUNCAO = `${URL_SB}/functions/v1/painel-telegram`;

let config: Record<string, string> | null = null;
async function cfg(): Promise<Record<string, string>> {
  if (config) return config;
  const { data, error } = await db.from("painel_config").select("chave, valor");
  if (error) throw new Error("painel_config: " + error.message);
  config = Object.fromEntries((data ?? []).map((r: any) => [r.chave, r.valor]));
  return config;
}

async function tg(metodo: string, corpo: unknown = {}): Promise<any> {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${metodo}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
  return await r.json();
}

async function evento(tipo: string, detalhe: string) {
  await db.from("painel_eventos").insert({ tipo, detalhe: detalhe.slice(0, 500) });
}

// Código pseudônimo estável para o autor (não guarda o id do Telegram).
async function pseudonimo(valor: string): Promise<string> {
  const { hash_salt } = await cfg();
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hash_salt + ":" + valor));
  return "tg_" + Array.from(new Uint8Array(d)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

async function registrarChat(chat: any, statusBot?: string): Promise<any> {
  const id = String(chat.id);
  const { data } = await db.from("painel_chats").select("*").eq("chat_id", id).maybeSingle();
  if (!data) {
    const novo = { chat_id: id, titulo: chat.title ?? null, tipo: chat.type, bot_status: statusBot ?? null };
    await db.from("painel_chats").insert(novo);
    await evento("grupo_novo", `Bot está no grupo "${chat.title ?? id}". Aguardando liberação.`);
    return { ...novo, permitido: false, admins_ref: [], admins_atualizado_em: null };
  }
  const mudou: Record<string, unknown> = {};
  if (chat.title && chat.title !== data.titulo) mudou.titulo = chat.title;
  if (statusBot && statusBot !== data.bot_status) mudou.bot_status = statusBot;
  if (Object.keys(mudou).length) await db.from("painel_chats").update(mudou).eq("chat_id", id);
  return { ...data, ...mudou };
}

// Administradores do grupo contam como equipe (atualizado no máximo 1x por hora).
async function adminsDoGrupo(c: any): Promise<string[]> {
  const velho = !c.admins_atualizado_em || Date.now() - new Date(c.admins_atualizado_em).getTime() > 3600_000;
  if (!velho) return c.admins_ref ?? [];
  const r = await tg("getChatAdministrators", { chat_id: c.chat_id });
  if (!r.ok) return c.admins_ref ?? [];
  const refs = await Promise.all(r.result.filter((a: any) => !a.user.is_bot).map((a: any) => pseudonimo(String(a.user.id))));
  await db.from("painel_chats").update({ admins_ref: refs, admins_atualizado_em: new Date().toISOString() }).eq("chat_id", c.chat_id);
  return refs;
}

function midiaDe(msg: any): { tipo: string | null; ref: string | null } {
  if (msg.photo) return { tipo: "foto", ref: msg.photo[msg.photo.length - 1].file_id };
  if (msg.video) return { tipo: "video", ref: msg.video.file_id };
  if (msg.voice) return { tipo: "audio", ref: msg.voice.file_id };
  if (msg.audio) return { tipo: "audio", ref: msg.audio.file_id };
  if (msg.video_note) return { tipo: "video_redondo", ref: msg.video_note.file_id };
  if (msg.document) return { tipo: "documento", ref: msg.document.file_id };
  if (msg.sticker) return { tipo: "figurinha", ref: null };
  return { tipo: null, ref: null };
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  try {
    if (req.method === "GET") {
      const acao = u.searchParams.get("acao");
      if (!acao) return json({ ok: true, servico: "painel-telegram" });
      if (!TOKEN) return json({ ok: false, erro: "TELEGRAM_BOT_TOKEN não encontrado nos Secrets das Edge Functions." }, 500);
      const eu = await tg("getMe");
      if (!eu.ok) {
        await evento("erro_token", "Telegram recusou o token: " + (eu.description ?? ""));
        return json({ ok: false, erro: "O Telegram não aceitou o token. Confira o TELEGRAM_BOT_TOKEN." }, 400);
      }
      if (acao === "configurar") {
        const { tg_webhook_secret } = await cfg();
        const r = await tg("setWebhook", {
          url: URL_FUNCAO,
          secret_token: tg_webhook_secret,
          allowed_updates: ["message", "edited_message", "my_chat_member"],
        });
        await evento("configurado", `@${eu.result.username}: setWebhook ${r.ok ? "ok" : "falhou: " + r.description}`);
        return json({ ok: !!r.ok, bot: "@" + eu.result.username, mensagem: r.ok ? "Telegram ligado ao painel." : r.description });
      }
      if (acao === "status") {
        const w = (await tg("getWebhookInfo")).result ?? {};
        return json({
          ok: true,
          bot: "@" + eu.result.username,
          bot_le_grupos: eu.result.can_read_all_group_messages === true,
          webhook_ligado_ao_painel: w.url === URL_FUNCAO,
          mensagens_na_fila: w.pending_update_count ?? 0,
          ultimo_erro: w.last_error_message ?? null,
        });
      }
      return json({ ok: false, erro: "ação desconhecida" }, 400);
    }

    if (req.method !== "POST") return json({ ok: false }, 405);
    const { tg_webhook_secret } = await cfg();
    if (req.headers.get("x-telegram-bot-api-secret-token") !== tg_webhook_secret) return json({ ok: false }, 401);

    const up = await req.json();
    if (up.my_chat_member) {
      const ch = up.my_chat_member.chat;
      if (ch.type === "group" || ch.type === "supergroup") await registrarChat(ch, up.my_chat_member.new_chat_member?.status);
      return json({ ok: true });
    }
    const msg = up.message ?? up.edited_message;
    if (!msg) return json({ ok: true });
    const chat = msg.chat;
    if (chat.type !== "group" && chat.type !== "supergroup") return json({ ok: true }); // conversa privada com o bot: ignora
    const c = await registrarChat(chat);
    if (!c.permitido) return json({ ok: true });

    const texto = msg.text ?? msg.caption ?? null;
    const m = midiaDe(msg);
    if (!texto && !m.tipo) return json({ ok: true }); // avisos do sistema (entrou, saiu, fixou...)

    const autorRef = msg.from && !msg.from.is_bot ? await pseudonimo(String(msg.from.id)) : null;
    const admins = await adminsDoGrupo(c);
    const linha = {
      origem: "telegram",
      chat_id: String(chat.id),
      mensagem_id: String(msg.message_id),
      data: new Date(msg.date * 1000).toISOString(),
      autor_ref: autorRef,
      autor_nome: msg.from && !msg.from.is_bot ? (msg.from.first_name ?? null) : null,
      autor_equipe: autorRef ? admins.includes(autorRef) : false,
      texto,
      responde_a: msg.reply_to_message ? String(msg.reply_to_message.message_id) : null,
      tem_midia: !!m.tipo,
      tipo_midia: m.tipo,
      midia_ref: m.ref,
      editada: !!up.edited_message,
    };
    const { error } = await db.from("painel_mensagens").upsert(linha, { onConflict: "origem,chat_id,mensagem_id" });
    if (error) {
      await evento("erro_gravar", error.message);
      return json({ ok: false }, 500);
    }
    await db.from("painel_chats").update({ ultima_msg_em: linha.data }).eq("chat_id", linha.chat_id);
    return json({ ok: true });
  } catch (e) {
    await evento("erro", String((e as Error)?.message ?? e)).catch(() => {});
    return json({ ok: false }, 500);
  }
});
