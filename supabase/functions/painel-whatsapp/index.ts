// Painel de acompanhamento: recebe as mensagens do WhatsApp de suporte (canal "Suporte alunas"
// na UMCLIQUE, que reenvia cada evento para cá por um webhook split) e grava em painel_mensagens.
// Não responde nada para ninguém.
//
// Proteção: o webhook manda o cabeçalho x-painel-chave igual a painel_config.wa_webhook_secret.
// Privacidade: o telefone da aluna NUNCA é gravado. Vira um código pseudônimo (wa_ + hash com sal),
// que identifica a conversa. Do nome, só o primeiro nome. Mídia só como tipo (sem arquivo).
// Grupos do WhatsApp são ignorados: só conversas individuais do número de suporte.
// Se chegar um formato que não sabemos ler, guardamos só a lista de campos (sem valores)
// em painel_eventos, para ajustar a leitura.
//
// Respostas da equipe: a UMCLIQUE só reenvia as mensagens RECEBIDAS. Das enviadas pelo celular
// do suporte chega só o aviso de entrega/leitura (messages_update) com os códigos das mensagens.
// Se algum código ainda não está no painel, é uma mensagem enviada pelo suporte: buscamos o texto
// no provedor do número (uazapi, POST {BaseUrl}/message/find) com a chave do canal que vem no
// próprio aviso. A chave é usada só nesta requisição e nunca é gravada; só aceitamos *.uazapi.com.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

let config: Record<string, string> | null = null;
async function cfg(): Promise<Record<string, string>> {
  if (config) return config;
  const { data, error } = await db.from("painel_config").select("chave, valor");
  if (error) throw new Error("painel_config: " + error.message);
  config = Object.fromEntries((data ?? []).map((r: any) => [r.chave, r.valor]));
  return config;
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

async function evento(tipo: string, detalhe: string) {
  await db.from("painel_eventos").insert({ tipo, detalhe: detalhe.slice(0, 1500) });
}

async function pseudonimo(valor: string): Promise<string> {
  const { hash_salt } = await cfg();
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hash_salt + ":wa:" + valor));
  return "wa_" + Array.from(new Uint8Array(d)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Só os nomes dos campos (sem valores), para diagnosticar formatos novos sem guardar dados pessoais.
function formato(o: any, prefixo = "", saida: string[] = [], nivel = 0): string[] {
  if (!o || typeof o !== "object" || nivel > 4 || saida.length > 80) return saida;
  for (const k of Object.keys(o)) {
    const v = o[k];
    const caminho = prefixo ? prefixo + "." + k : k;
    saida.push(caminho + ":" + (Array.isArray(v) ? "lista" : typeof v));
    if (v && typeof v === "object" && !Array.isArray(v)) formato(v, caminho, saida, nivel + 1);
  }
  return saida;
}

const primeiro = (...vs: any[]) => vs.find((v) => v !== undefined && v !== null && v !== "");
const soDigitos = (s: any) => String(s ?? "").split("@")[0].split(":")[0].replace(/\D/g, "");

// Lê os formatos mais comuns (uazapi, Baileys/Evolution, Meta Cloud API).
function lerEvento(b: any): any | null {
  // Meta Cloud API
  const meta = b?.entry?.[0]?.changes?.[0]?.value;
  if (meta?.messages?.[0]) {
    const m = meta.messages[0];
    const tipo = m.type;
    return {
      id: m.id, contato: m.from, deMim: false, grupo: false,
      nome: meta.contacts?.[0]?.profile?.name,
      texto: m.text?.body ?? m[tipo]?.caption ?? null,
      tipoMidia: tipo && tipo !== "text" ? tipo : null,
      quando: (Number(m.timestamp) * 1000) || Date.now(), responde: m.context?.id ?? null,
    };
  }
  // Escolhe o objeto que tem a identificação da conversa (uazapi: b.message; Evolution/Baileys: b.data).
  const cand = [b?.message, b?.data, b?.msg, b?.data?.message, b];
  const m = cand.find((x) => x && typeof x === "object" && (x.chatid || x.chatId || x.remoteJid || x.key?.remoteJid || x.from));
  if (!m) return null;
  const key = m.key ?? {};
  const chat = primeiro(m.chatid, m.chatId, m.remoteJid, key.remoteJid, m.from, b?.chat?.wa_chatid, b?.chat?.id);
  const id = primeiro(m.messageid, m.messageId, key.id, m.id);
  if (!chat || !id) return null;
  const conteudo = m.message ?? m.content ?? {};
  const tipoBruto = String(primeiro(m.messageType, m.type, Object.keys(typeof conteudo === "object" ? conteudo : {})[0], "") ?? "");
  const texto = primeiro(
    typeof m.text === "string" ? m.text : undefined, typeof m.body === "string" ? m.body : undefined,
    typeof conteudo === "string" ? conteudo : undefined, conteudo?.text, conteudo?.conversation,
    conteudo?.extendedTextMessage?.text, conteudo?.imageMessage?.caption, conteudo?.videoMessage?.caption,
    conteudo?.caption, m.caption,
  );
  const t = tipoBruto.toLowerCase();
  const tipoMidia = /image/.test(t) ? "foto" : /video/.test(t) ? "video" : /audio|ptt/.test(t) ? "audio" : /sticker/.test(t) ? "figurinha" : /document/.test(t) ? "documento" : null;
  let quando = Number(primeiro(m.messageTimestamp, m.timestamp, m.t, Date.now()));
  if (!Number.isFinite(quando) || quando <= 0) quando = Date.now();
  if (quando < 1e12) quando *= 1000; // segundos -> milissegundos
  const ctx = conteudo?.extendedTextMessage?.contextInfo ?? conteudo?.contextInfo ?? m.contextInfo ?? {};
  return {
    id: String(id).split(":").pop(), contato: chat,
    deMim: !!primeiro(m.fromMe, key.fromMe, m.wasSentByApi ? true : undefined, false),
    grupo: !!m.isGroup || String(chat).endsWith("@g.us"),
    nome: primeiro(m.senderName, m.pushName, m.notifyName, b?.chat?.wa_contactName, b?.chat?.name),
    texto: texto ?? null, tipoMidia,
    quando, responde: primeiro(typeof m.quoted === "string" ? m.quoted : m.quoted?.messageid, ctx.stanzaId) ?? null,
  };
}

async function gravar(ev: any): Promise<boolean> {
  if (ev.grupo) return false;
  const numero = soDigitos(ev.contato);
  if (numero.length < 8) return false;
  const conversa = await pseudonimo(numero);
  if (!ev.texto && !ev.tipoMidia) return false;

  await db.from("painel_chats").upsert(
    { chat_id: conversa, origem: "whatsapp", titulo: "WhatsApp de suporte", tipo: "privado", permitido: true },
    { onConflict: "chat_id", ignoreDuplicates: true },
  );
  const nome = ev.deMim ? null : (String(ev.nome ?? "").trim().split(/\s+/)[0] || null);
  const linha = {
    origem: "whatsapp", chat_id: conversa, mensagem_id: String(ev.id),
    data: new Date(ev.quando).toISOString(),
    autor_ref: ev.deMim ? "wa_equipe" : conversa,
    autor_nome: ev.deMim ? "Equipe" : (nome && !/^\+?\d[\d\s()-]*$/.test(nome) ? nome.slice(0, 40) : null),
    autor_equipe: !!ev.deMim,
    texto: ev.texto ? String(ev.texto).slice(0, 4000) : null,
    responde_a: ev.responde ? String(ev.responde).split(":").pop() : null,
    tem_midia: !!ev.tipoMidia, tipo_midia: ev.tipoMidia, midia_ref: null, editada: false,
  };
  const { error } = await db.from("painel_mensagens").upsert(linha, { onConflict: "origem,chat_id,mensagem_id" });
  if (error) { await evento("wa_erro_gravar", error.message); return false; }
  await db.from("painel_chats").update({ ultima_msg_em: linha.data }).eq("chat_id", conversa);
  return true;
}

// Aviso de entrega/leitura: se cita mensagens que ainda não temos, são mensagens enviadas pelo
// suporte (as recebidas já chegaram pelo webhook). Busca o texto delas no provedor.
// Obs.: o aviso de leitura de uma mensagem enviada vem com IsFromMe = false (quem leu foi a aluna).
async function buscarEnviadas(b: any): Promise<number> {
  const e = b?.event ?? {};
  if (e.IsGroup === true) return 0;
  const ids: string[] = (Array.isArray(e.MessageIDs) ? e.MessageIDs : []).map((x: any) => String(x));
  const chat = primeiro(e.chatid, e.Chat);
  if (!ids.length || !chat || String(chat).endsWith("@g.us")) return 0;
  const conversa = await pseudonimo(soDigitos(chat));
  const { data: ja } = await db.from("painel_mensagens").select("mensagem_id").eq("origem", "whatsapp").eq("chat_id", conversa).in("mensagem_id", ids);
  const faltam = ids.filter((id) => !(ja ?? []).some((r: any) => r.mensagem_id === id));
  if (!faltam.length) return 0;
  const base = String(b?.BaseUrl ?? "");
  const token = String(b?.token ?? "");
  let host = "";
  try { const u = new URL(base); host = u.protocol === "https:" ? u.hostname : ""; } catch { /* inválida */ }
  if (!token || !/(^|\.)uazapi\.com$/.test(host)) { await evento("wa_busca", `Endereço do provedor não aceito para buscar respostas: ${host || "(vazio)"}${token ? "" : ", sem chave"}`); return 0; }
  const r = await fetch(base.replace(/\/+$/, "") + "/message/find", {
    method: "POST",
    headers: { "content-type": "application/json", token },
    body: JSON.stringify({ chatid: chat, fromMe: true, limit: 30 }),
  });
  const corpo = await r.json().catch(() => null);
  const lista: any[] = Array.isArray(corpo) ? corpo : (corpo?.messages ?? corpo?.data ?? corpo?.result ?? []);
  let n = 0;
  for (const m of lista) {
    const id = String(primeiro(m?.messageid, m?.id, "")).split(":").pop();
    if (!faltam.includes(id)) continue;
    const ev = lerEvento({ message: { ...m, chatid: primeiro(m.chatid, chat), messageid: id, fromMe: true } });
    if (ev && await gravar(ev)) n++;
  }
  if (!n && e.IsFromMe !== true) await evento("wa_busca", `Busca de ${faltam.length} mensagem(ns) enviada(s) sem resultado (HTTP ${r.status}). Campos: ` + formato(corpo).slice(0, 40).join(", "));
  return n;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "GET") return json({ ok: true, servico: "painel-whatsapp" });
    if (req.method !== "POST") return json({ ok: false }, 405);
    const { wa_webhook_secret } = await cfg();
    const chave = req.headers.get("x-painel-chave");
    if (!wa_webhook_secret || chave !== wa_webhook_secret) return json({ ok: false }, 401);

    const corpo = await req.json().catch(() => null);
    if (!corpo) return json({ ok: true });
    const lista = Array.isArray(corpo) ? corpo : [corpo];
    let gravadas = 0;
    for (const b of lista) {
      if (/messages_update/i.test(String(b?.EventType ?? ""))) { gravadas += await buscarEnviadas(b); continue; }
      const ev = lerEvento(b);
      if (!ev) {
        const tipoEvento = String(b?.EventType ?? b?.event ?? b?.type ?? "");
        if (!/presence|status|ack|receipt|update|connection|chats|contacts|history|call|label/i.test(tipoEvento)) {
          await evento("wa_formato", "Evento não lido (" + tipoEvento + "): " + formato(b).join(", "));
        }
        continue;
      }
      if (await gravar(ev)) gravadas++;
    }
    return json({ ok: true, gravadas });
  } catch (e) {
    await evento("wa_erro", String((e as Error)?.message ?? e)).catch(() => {});
    return json({ ok: false }, 500);
  }
});
