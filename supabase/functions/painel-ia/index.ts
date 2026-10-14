// Painel de acompanhamento: a IA (Claude) lê as mensagens dos últimos dias e devolve
// ideias de post, dúvidas que se repetem, provas sociais e alertas.
// Ações (sempre com o login de quem usa o painel):
//   { acao: "ler" }   → última análise. Se tiver mais de 20 h, gera uma nova em segundo plano.
//   { acao: "gerar" } → gera agora (Administração e Edição).
// Minimização: a IA recebe só o texto. Cada aluna vira um código ("aluna 7"); nome, telefone,
// e-mail e links saem antes do envio. A análise é guardada em painel_ia, sem dados pessoais.
// Segredo (Edge Functions > Secrets): ANTHROPIC_API_KEY.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const chaveIA = () => (Deno.env.get("ANTHROPIC_API_KEY") ?? "").trim();

const MODELO = "claude-opus-5-5";
const DIAS = 7;
const MAX_MSGS = 2500;
const VALIDADE_H = 20;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
}

const SISTEMA = `Você ajuda a equipe da Laura Rosa, educadora física que comanda a Comunidade Corpo Feliz: treinos em casa para mulheres, com treinos novos todo mês (A, B, C... e treinos hormonais), grupo no Telegram e WhatsApp de suporte.
O método da Laura: constância vence a semana perfeita; fazer a versão possível do treino no dia difícil; trocar em vez de cortar na alimentação; perder gordura sem flacidez; sem culpa e sem terrorismo nutricional; rituais da comunidade (água em jejum, foto do treino feito, blusinha rosa às quartas).

Você vai receber as mensagens dos últimos dias do grupo e do suporte. Cada linha traz número, data, canal, autor ("aluna N" ou "EQUIPE") e texto. "↪ #N" indica resposta à mensagem N.

Seu trabalho é transformar isso em material de decisão e de conteúdo para o Instagram da Laura:
- ideias: de 6 a 10 posts concretos, do mais forte ao mais fraco. Cada ideia nasce de algo que as alunas disseram de verdade (cite o número das mensagens). Use o ângulo do método da Laura e, quando houver, a resposta que a equipe já deu. Gancho curto e forte, roteiro em 3 a 6 passos (slides ou cenas), legenda pronta em português do Brasil, com tom acolhedor e direto, sem promessas de resultado.
- duvidas: as perguntas que mais se repetem, com uma resposta curta sugerida no estilo da Laura.
- provas: relatos de resultado ou de mudança (peso, medidas, autoestima, saúde, rotina, comunidade) que podem virar depoimento. Eles só podem ser usados com autorização da aluna.
- alertas: o que pede ação da equipe (pedido de cancelamento, reclamação de renovação ou cobrança, problema de acesso ao app, saúde ou lesão, insatisfação, pergunta sem resposta).
- humor: estimativa em porcentagem do tom geral das alunas no período.
- resumo: 2 ou 3 frases simples sobre a semana.

Regras:
- Nunca escreva nomes, telefones, e-mails, @ ou qualquer dado que identifique alguém. Nas frases citadas, corte o que identificar a pessoa e limite a 140 caracteres.
- Não invente fatos nem números. "evidencia" diz quantas alunas ou mensagens sustentam a ideia.
- Não crie oferta, preço, desconto ou chamada de venda.
- Em temas de saúde (doenças, remédios, gestação, lesões), oriente procurar o profissional e não dê diagnóstico.
- Ignore mensagens de teste do painel e conversas sem relação com treino, alimentação, rotina, autoestima ou a comunidade.
- Escreva tudo em português do Brasil, frases curtas, sem jargão.`;

const LISTA_NUM = { type: "array", items: { type: "integer" } };
const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "humor", "ideias", "duvidas", "provas", "alertas"],
  properties: {
    resumo: { type: "string" },
    humor: {
      type: "object", additionalProperties: false, required: ["positivo", "neutro", "negativo"],
      properties: { positivo: { type: "integer" }, neutro: { type: "integer" }, negativo: { type: "integer" } },
    },
    ideias: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["titulo", "formato", "tema", "gancho", "evidencia", "frases", "resposta_equipe", "roteiro", "legenda", "prioridade", "usa_depoimento", "mensagens"],
        properties: {
          titulo: { type: "string" },
          formato: { type: "string", enum: ["Reels", "Carrossel", "Stories", "Post"] },
          tema: { type: "string" },
          gancho: { type: "string" },
          evidencia: { type: "string" },
          frases: { type: "array", items: { type: "string" } },
          resposta_equipe: { type: "string" },
          roteiro: { type: "array", items: { type: "string" } },
          legenda: { type: "string" },
          prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          usa_depoimento: { type: "boolean" },
          mensagens: LISTA_NUM,
        },
      },
    },
    duvidas: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["pergunta", "vezes", "resposta_sugerida", "ja_respondida", "mensagens"],
        properties: { pergunta: { type: "string" }, vezes: { type: "integer" }, resposta_sugerida: { type: "string" }, ja_respondida: { type: "boolean" }, mensagens: LISTA_NUM },
      },
    },
    provas: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["tipo", "resumo", "frase", "mensagens"],
        properties: {
          tipo: { type: "string", enum: ["peso", "medidas", "autoestima", "saude", "rotina", "comunidade"] },
          resumo: { type: "string" }, frase: { type: "string" }, mensagens: LISTA_NUM,
        },
      },
    },
    alertas: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["tipo", "titulo", "detalhe", "quantidade", "urgencia", "mensagens"],
        properties: {
          tipo: { type: "string", enum: ["cancelamento", "cobranca", "acesso", "saude", "insatisfacao", "sem_resposta", "outro"] },
          titulo: { type: "string" }, detalhe: { type: "string" }, quantidade: { type: "integer" },
          urgencia: { type: "string", enum: ["alta", "media", "baixa"] }, mensagens: LISTA_NUM,
        },
      },
    },
  },
};

const DIA_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
function quando(iso: string) {
  const d = new Date(new Date(iso).getTime() - 3 * 3600_000); // horário de Brasília
  const p = (n: number) => String(n).padStart(2, "0");
  return `${DIA_SEMANA[d.getUTCDay()]} ${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
// Tira o que identifica alguém antes de mandar para a IA.
function limpar(t: string, nomes: string[]) {
  let s = t.replace(/\s+/g, " ").trim();
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[e-mail]").replace(/https?:\/\/\S+/g, "[link]").replace(/@\w{3,}/g, "[@]").replace(/\+?\d[\d\s().-]{7,}\d/g, "[número]");
  for (const n of nomes) s = s.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "[nome]");
  return s.length > 500 ? s.slice(0, 500) + "…" : s;
}

async function gerar(pedidoPor: string) {
  const fim = new Date();
  const inicio = new Date(fim.getTime() - DIAS * 86400_000);
  const { data: msgs, error } = await db.from("painel_mensagens")
    .select("id, origem, chat_id, mensagem_id, data, autor_ref, autor_nome, autor_equipe, texto, responde_a, tem_midia, tipo_midia")
    .gte("data", inicio.toISOString()).order("data", { ascending: false }).limit(MAX_MSGS);
  if (error) throw error;
  const lista = (msgs ?? []).reverse();
  if (lista.length < 5) throw new Error("Poucas mensagens nos últimos dias para analisar.");

  const nomes = [...new Set(lista.map((m: any) => String(m.autor_nome ?? "").trim()).filter((n) => n.length >= 3))];
  const codigo = new Map<string, number>();
  const numero = new Map<string, number>(); // origem:chat:mensagem_id → número da linha
  const ids: number[] = [];
  const linhas: string[] = [];
  for (const m of lista as any[]) {
    let texto = m.texto ? limpar(m.texto, nomes) : "";
    if (/teste (técnico )?do painel/i.test(texto)) continue;
    if (m.tem_midia) texto = `(${m.tipo_midia ?? "mídia"}) ${texto}`.trim();
    if (!texto) continue;
    const n = ids.length + 1;
    ids.push(m.id);
    numero.set(`${m.origem}:${m.chat_id}:${m.mensagem_id}`, n);
    let autor = "EQUIPE";
    if (!m.autor_equipe) {
      const ref = String(m.autor_ref ?? m.id);
      if (!codigo.has(ref)) codigo.set(ref, codigo.size + 1);
      autor = `aluna ${codigo.get(ref)}`;
    }
    const resp = m.responde_a ? numero.get(`${m.origem}:${m.chat_id}:${m.responde_a}`) : undefined;
    linhas.push(`#${n} [${quando(m.data)}] ${m.origem} · ${autor}: ${texto}${resp ? ` ↪ #${resp}` : ""}`);
  }

  const ia = new Anthropic({ apiKey: chaveIA() });
  const stream = ia.beta.messages.stream({
    model: MODELO,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: ESQUEMA } },
    system: SISTEMA,
    messages: [{ role: "user", content: `Mensagens de ${quando(inicio.toISOString())} a ${quando(fim.toISOString())} (${linhas.length} mensagens, ${codigo.size} alunas):\n\n${linhas.join("\n")}` }],
  } as any);
  const resp: any = await stream.finalMessage();
  if (resp.stop_reason === "refusal") throw new Error("A IA recusou esta análise. Tente de novo mais tarde.");
  if (resp.stop_reason === "max_tokens") throw new Error("A resposta da IA ficou longa demais. Tente de novo.");
  const texto = (resp.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const resultado = JSON.parse(texto);

  // Troca os números das linhas pelos ids do banco, para o painel abrir a mensagem certa.
  const paraIds = (xs: number[]) => (xs ?? []).map((x) => ids[x - 1]).filter(Boolean);
  for (const k of ["ideias", "duvidas", "provas", "alertas"]) for (const it of resultado[k] ?? []) it.mensagens = paraIds(it.mensagens);

  const { data: salvo, error: e2 } = await db.from("painel_ia").insert({
    inicio: inicio.toISOString(), fim: fim.toISOString(), mensagens: linhas.length, modelo: resp.model ?? MODELO, resultado,
    tokens_entrada: resp.usage?.input_tokens ?? null, tokens_saida: resp.usage?.output_tokens ?? null, pedido_por: pedidoPor,
  }).select("id, criado_em, inicio, fim, mensagens, resultado").single();
  if (e2) throw e2;
  await db.from("painel_eventos").insert({ tipo: "ia_analise", detalhe: `${linhas.length} mensagens, ${resultado.ideias?.length ?? 0} ideias (${pedidoPor})` });
  return salvo;
}

async function ultima() {
  const { data } = await db.from("painel_ia").select("id, criado_em, inicio, fim, mensagens, resultado").order("criado_em", { ascending: false }).limit(1).maybeSingle();
  return data;
}
// Evita duas análises ao mesmo tempo: marca o início em painel_eventos e confere os últimos 4 minutos.
async function gerandoAgora() {
  const desde = new Date(Date.now() - 4 * 60_000).toISOString();
  const { data } = await db.from("painel_eventos").select("tipo, criado_em").in("tipo", ["ia_inicio", "ia_analise", "ia_erro"]).gte("criado_em", desde).order("criado_em", { ascending: false }).limit(1);
  return data?.[0]?.tipo === "ia_inicio";
}
async function gerarRegistrando(quem: string) {
  await db.from("painel_eventos").insert({ tipo: "ia_inicio", detalhe: quem });
  try { return await gerar(quem); } catch (e) {
    await db.from("painel_eventos").insert({ tipo: "ia_erro", detalhe: String((e as Error)?.message ?? e).slice(0, 300) });
    throw e;
  }
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

    const corpo = await req.json().catch(() => ({}));
    const configurado = !!chaveIA();
    const atual = await ultima();

    if (corpo.acao === "gerar") {
      if (!["admin", "edicao"].includes(eu.funcao)) return json({ ok: false, erro: "Só Administração e Edição pedem uma nova análise." }, 403);
      if (!configurado) return json({ ok: false, erro: "Falta a chave da IA (ANTHROPIC_API_KEY) nos Secrets das Edge Functions." }, 400);
      if (await gerandoAgora()) return json({ ok: true, configurado, gerando: true, analise: atual });
      const nova = await gerarRegistrando(eu.email);
      return json({ ok: true, configurado, gerando: false, analise: nova });
    }

    // "ler": devolve a última e, se estiver velha, gera outra em segundo plano.
    const velha = !atual || Date.now() - new Date(atual.criado_em).getTime() > VALIDADE_H * 3600_000;
    let gerando = configurado && await gerandoAgora();
    if (configurado && velha && !gerando) {
      gerando = true;
      const tarefa = gerarRegistrando("automático").catch(() => null);
      (globalThis as any).EdgeRuntime?.waitUntil?.(tarefa);
    }
    return json({ ok: true, configurado, gerando, analise: atual });
  } catch (e) {
    return json({ ok: false, erro: String((e as Error)?.message ?? e).slice(0, 300) }, 500);
  }
});
