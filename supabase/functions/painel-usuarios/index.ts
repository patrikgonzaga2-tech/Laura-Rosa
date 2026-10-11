// Painel de acompanhamento: gestão de usuários (só Administração).
// Cria o acesso com a senha inicial no padrão da equipe (primeiro nome + 1234, ex.: laura1234),
// muda função e painéis, volta a senha para o padrão e desativa. No primeiro acesso a pessoa
// é obrigada a trocar a senha (conferido no banco: painel_senha_trocada).
// O convite por e-mail continua disponível (acao "convidar"), mas o painel usa a senha inicial.
//
// Chamada pelo painel com o login de quem está usando (Authorization: Bearer <token da sessão>).
// Configuração inicial: o banco pode chamar com a chave interna painel_config.admin_chave, só para
// criar o acesso de quem já está cadastrado como Administração. A resposta nunca traz senha.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const db = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });

const FUNCOES = ["admin", "edicao", "exportacao", "leitura"];
const PAINEIS = ["visao", "dia", "dores", "resultados", "ideias", "prints", "ajuda", "mensagens", "importar", "relatorios"];

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
}

async function cfg(chave: string): Promise<string | null> {
  const { data } = await db.from("painel_config").select("valor").eq("chave", chave).maybeSingle();
  return data?.valor ?? null;
}

async function evento(tipo: string, detalhe: string, usuario: string) {
  await db.from("painel_eventos").insert({ tipo, detalhe: detalhe.slice(0, 500), usuario });
}

function limparEmail(e: unknown): string {
  const s = String(e ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200 ? s : "";
}

// Primeiro nome sem acento, em minúsculas, + 1234 (ex.: "Laura Rosa" -> laura1234).
function senhaPadrao(nome: string): string {
  const base = String(nome ?? "").trim().split(/\s+/)[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  return base.length >= 2 ? base + "1234" : "";
}

// Cria (ou atualiza) o login com a senha inicial e marca que ela precisa ser trocada.
async function definirSenhaPadrao(email: string, por: string) {
  const { data: alvo } = await db.from("painel_usuarios").select("*").eq("email", email).maybeSingle();
  if (!alvo) return { ok: false, erro: "Cadastre a pessoa antes." };
  const senha = senhaPadrao(alvo.nome);
  if (!senha) return { ok: false, erro: "Preencha o nome da pessoa (a senha inicial usa o primeiro nome)." };
  let usuario = alvo.user_id ? (await db.auth.admin.getUserById(alvo.user_id)).data?.user : null;
  usuario = usuario ?? await acharUsuarioAuth(email);
  if (usuario) {
    const r = await db.auth.admin.updateUserById(usuario.id, { password: senha, email_confirm: true });
    if (r.error) return { ok: false, erro: r.error.message };
  } else {
    const r = await db.auth.admin.createUser({ email, password: senha, email_confirm: true });
    if (r.error) return { ok: false, erro: r.error.message };
    usuario = r.data.user;
  }
  const { error } = await db.from("painel_usuarios").update({ user_id: usuario.id, convidado_em: new Date().toISOString(), convidado_por: por, atualizado_em: new Date().toISOString() }).eq("email", email);
  if (error) return { ok: false, erro: error.message };
  const m = await db.rpc("painel_marcar_senha_inicial", { p_user: usuario.id });
  if (m.error) return { ok: false, erro: m.error.message };
  await evento("senha_inicial", `${email}: acesso com senha inicial (troca obrigatória no primeiro acesso)`, por);
  return { ok: true, senha };
}

async function acharUsuarioAuth(email: string): Promise<any | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const u = data.users.find((x: any) => (x.email ?? "").toLowerCase() === email);
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

// Envia o convite (ou, para quem já tem login, o e-mail de criar/trocar senha).
async function convidar(email: string, por: string, permitirLink: boolean) {
  const destino = await cfg("painel_url");
  if (!destino) return { ok: false, erro: "Endereço do painel ainda não configurado (painel_url)." };
  let usuario = await acharUsuarioAuth(email);
  let enviado = false, motivo = "";
  if (!usuario) {
    const r = await db.auth.admin.inviteUserByEmail(email, { redirectTo: destino });
    if (r.error) motivo = r.error.message; else { usuario = r.data.user; enviado = true; }
  } else {
    const r = await db.auth.resetPasswordForEmail(email, { redirectTo: destino });
    if (r.error) motivo = r.error.message; else enviado = true;
  }
  let link: string | null = null;
  if (!enviado && permitirLink) {
    usuario = usuario ?? await acharUsuarioAuth(email);
    const r = await db.auth.admin.generateLink({ type: usuario ? "recovery" : "invite", email, options: { redirectTo: destino } });
    // Link direto para o painel: o próprio painel valida o código (não depende da lista de endereços do Supabase).
    const hash = r.data?.properties?.hashed_token;
    if (!r.error && hash) { link = `${destino.replace(/#.*$/, "")}#token_hash=${encodeURIComponent(hash)}&type=${usuario ? "recovery" : "invite"}`; usuario = r.data.user ?? usuario; }
    else motivo += " / link: " + (r.error?.message ?? "sem código");
  }
  if (usuario) {
    await db.from("painel_usuarios").update({ user_id: usuario.id, convidado_em: new Date().toISOString(), convidado_por: por, atualizado_em: new Date().toISOString() }).eq("email", email);
  }
  await evento("convite", `${email}: ${enviado ? "e-mail enviado" : link ? "link gerado para envio manual" : "falhou"}${motivo ? " (" + motivo + ")" : ""}`, por);
  return { ok: enviado || !!link, enviado, link, motivo: enviado ? "" : motivo };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false }, 405);
  try {
    const corpo = await req.json().catch(() => ({}));

    // Primeiro acesso pelo banco (sem link na resposta).
    const chaveInterna = req.headers.get("x-painel-chave");
    if (chaveInterna) {
      const chave = await cfg("admin_chave");
      if (!chave || chaveInterna !== chave) return json({ ok: false }, 401);
      const email = limparEmail(corpo.email);
      const { data: alvo } = await db.from("painel_usuarios").select("*").eq("email", email).maybeSingle();
      if (!alvo || alvo.funcao !== "admin" || !alvo.ativo) return json({ ok: false, erro: "não permitido" }, 400);
      if (corpo.acao === "senha_padrao") {
        const r = await definirSenhaPadrao(email, "configuração inicial");
        return json({ ok: r.ok, erro: r.erro ?? "" }); // nunca devolve a senha aqui
      }
      if (alvo.user_id) return json({ ok: false, erro: "não permitido" }, 400);
      const r = await convidar(email, "configuração inicial", false);
      return json({ ok: r.ok, enviado: r.enviado, motivo: r.motivo });
    }

    // Demais chamadas: só Administração logada e ativa.
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: quem } = await db.auth.getUser(token);
    if (!quem?.user) return json({ ok: false, erro: "Entre novamente." }, 401);
    const { data: eu } = await db.from("painel_usuarios").select("*").eq("user_id", quem.user.id).eq("ativo", true).maybeSingle();
    if (!eu || eu.funcao !== "admin") return json({ ok: false, erro: "Só a Administração pode gerenciar usuários." }, 403);
    if (eu.trocar_senha) return json({ ok: false, erro: "Troque a sua senha inicial antes de gerenciar usuários." }, 403);

    const acao = String(corpo.acao ?? "");
    if (acao === "listar") {
      const { data: lista } = await db.from("painel_usuarios").select("*").order("criado_em");
      const usuarios = await Promise.all((lista ?? []).map(async (u: any) => {
        let situacao = "sem_convite", ultimoAcesso = null;
        if (u.user_id) {
          const { data } = await db.auth.admin.getUserById(u.user_id);
          const a = data?.user as any;
          ultimoAcesso = a?.last_sign_in_at ?? null;
          situacao = a?.email_confirmed_at || a?.last_sign_in_at ? "ativa" : "convite_enviado";
          if (u.trocar_senha) situacao = "senha_inicial";
        }
        if (!u.ativo) situacao = "desativada";
        return { email: u.email, nome: u.nome, funcao: u.funcao, paineis: u.paineis, ativo: u.ativo, convidado_em: u.convidado_em, situacao, ultimo_acesso: ultimoAcesso, eu: u.email === eu.email };
      }));
      return json({ ok: true, usuarios, paineis: PAINEIS });
    }

    if (acao === "salvar") {
      const email = limparEmail(corpo.email);
      if (!email) return json({ ok: false, erro: "E-mail inválido." }, 400);
      const funcao = FUNCOES.includes(corpo.funcao) ? corpo.funcao : "leitura";
      const paineis = Array.isArray(corpo.paineis) ? corpo.paineis.filter((p: string) => PAINEIS.includes(p)) : PAINEIS;
      const ativo = corpo.ativo !== false;
      const nome = corpo.nome ? String(corpo.nome).trim().slice(0, 60) : null;
      if (email === eu.email && (funcao !== "admin" || !ativo)) return json({ ok: false, erro: "Você não pode tirar o seu próprio acesso de Administração." }, 400);
      if (!paineis.length) return json({ ok: false, erro: "Escolha pelo menos um painel." }, 400);
      if (corpo.criar_acesso && !senhaPadrao(nome ?? "")) return json({ ok: false, erro: "Preencha o nome: a senha inicial usa o primeiro nome (ex.: laura1234)." }, 400);
      const { data: antes } = await db.from("painel_usuarios").select("email").eq("email", email).maybeSingle();
      const { error } = await db.from("painel_usuarios").upsert({ email, nome, funcao, paineis, ativo, atualizado_em: new Date().toISOString() }, { onConflict: "email" });
      if (error) return json({ ok: false, erro: error.message }, 400);
      await evento(antes ? "usuario_alterado" : "usuario_novo", `${email}: ${funcao}, ${ativo ? "ativo" : "desativado"}, painéis: ${paineis.join(", ")}`, eu.email);
      let convite = null, acesso = null;
      if (!antes && corpo.convidar) convite = await convidar(email, eu.email, true);
      if (!antes && corpo.criar_acesso) acesso = await definirSenhaPadrao(email, eu.email);
      return json({ ok: true, convite, acesso });
    }

    if (acao === "senha_padrao") {
      const email = limparEmail(corpo.email);
      if (email === eu.email) return json({ ok: false, erro: "Para trocar a sua própria senha, use Minha conta." }, 400);
      const { data: alvo } = await db.from("painel_usuarios").select("ativo").eq("email", email).maybeSingle();
      if (!alvo) return json({ ok: false, erro: "Pessoa não encontrada." }, 400);
      if (!alvo.ativo) return json({ ok: false, erro: "Reative a pessoa antes." }, 400);
      return json(await definirSenhaPadrao(email, eu.email));
    }

    if (acao === "convidar") {
      const email = limparEmail(corpo.email);
      const { data: alvo } = await db.from("painel_usuarios").select("*").eq("email", email).maybeSingle();
      if (!alvo) return json({ ok: false, erro: "Cadastre a pessoa antes de convidar." }, 400);
      if (!alvo.ativo) return json({ ok: false, erro: "Reative a pessoa antes de convidar." }, 400);
      return json(await convidar(email, eu.email, true));
    }

    return json({ ok: false, erro: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ ok: false, erro: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
