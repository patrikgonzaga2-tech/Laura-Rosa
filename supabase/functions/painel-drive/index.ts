// Painel de acompanhamento: envia prints aprovados para o Google Drive.
// O painel chama com o login de quem está usando; aqui conferimos se a pessoa está ativa e pode
// exportar (Administração ou Exportação) e repassamos o PNG para o Apps Script da conta Google
// dona da pasta (integracoes/drive-apps-script.gs), que salva em
// Painel de acompanhamento / Materiais autorizados / Instagram / AAAA-MM /.
// Segredos (Edge Functions > Secrets, colocados pela dona da conta): DRIVE_URL e DRIVE_CHAVE.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const DRIVE_URL = Deno.env.get("DRIVE_URL") ?? "";
const DRIVE_CHAVE = Deno.env.get("DRIVE_CHAVE") ?? "";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
}

async function appsScript(corpo: Record<string, unknown>) {
  const r = await fetch(DRIVE_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...corpo, chave: DRIVE_CHAVE }), redirect: "follow" });
  const texto = await r.text();
  try { return JSON.parse(texto); } catch { return { ok: false, erro: "O Drive respondeu algo inesperado (HTTP " + r.status + "). Confira a publicação do Apps Script." }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false }, 405);
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: quem } = await db.auth.getUser(token);
    if (!quem?.user) return json({ ok: false, erro: "Entre novamente." }, 401);
    const { data: eu } = await db.from("painel_usuarios").select("email, funcao, ativo, trocar_senha").eq("user_id", quem.user.id).maybeSingle();
    if (!eu || !eu.ativo || eu.trocar_senha) return json({ ok: false, erro: "Sem acesso." }, 403);
    if (!["admin", "exportacao"].includes(eu.funcao)) return json({ ok: false, erro: "Só Administração e Exportação enviam ao Drive." }, 403);

    const corpo = await req.json().catch(() => ({}));
    if (!DRIVE_URL || !DRIVE_CHAVE) return json({ ok: true, configurado: false });
    if (corpo.acao === "status") {
      const r = await appsScript({ acao: "status" });
      return json({ ok: !!r.ok, configurado: !!r.ok, pastaUrl: r.url ?? null, erro: r.ok ? undefined : (r.erro === "chave" ? "A chave do Drive não confere. Confira DRIVE_CHAVE." : r.erro) });
    }

    const nome = String(corpo.nome ?? "");
    const mes = String(corpo.mes ?? "");
    const base64 = String(corpo.base64 ?? "");
    if (!/^[\w.-]{3,120}\.png$/.test(nome)) return json({ ok: false, erro: "Nome de arquivo inválido." }, 400);
    if (!/^\d{4}-\d{2}$/.test(mes)) return json({ ok: false, erro: "Mês inválido." }, 400);
    if (!base64 || base64.length > 12_000_000) return json({ ok: false, erro: "Imagem vazia ou grande demais." }, 400);
    const r = await appsScript({ nome, base64, pastas: ["Instagram", mes], descricao: String(corpo.descricao ?? "").slice(0, 1000) });
    await db.from("painel_eventos").insert({ tipo: "drive_envio", detalhe: `${nome} → Instagram/${mes}: ${r.ok ? (r.repetido ? "já estava no Drive" : "enviado") : "falhou (" + (r.erro ?? "") + ")"}`, usuario: eu.email });
    if (!r.ok) return json({ ok: false, erro: r.erro === "chave" ? "A chave do Drive não confere. Confira DRIVE_CHAVE." : (r.erro ?? "Falhou.") }, 502);
    return json({ ok: true, url: r.url, pastaUrl: r.pastaUrl, repetido: !!r.repetido });
  } catch (e) {
    return json({ ok: false, erro: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
