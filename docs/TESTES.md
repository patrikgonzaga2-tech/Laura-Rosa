# Lista de testes

Marque cada item ao conferir. Os itens com (auto) também foram verificados automaticamente num navegador durante o desenvolvimento.

## Dados e identificação
- [ ] Ao abrir, a faixa amarela diz "Dados fictícios" (auto)
- [ ] Ao trocar para "Importados" sem ter importado nada, aparece a tela vazia com o botão "Ir para Importar"
- [ ] Depois de importar, a faixa fica azul e os números de exemplo não aparecem
- [ ] Ao recarregar a página, os dados importados somem
- [ ] Nenhuma tela mostra telefone. Números citados no texto aparecem como "[telefone oculto]" (auto)

## Filtros e busca
- [ ] Período (7, 14, 30, 60 dias, "Tudo", "Escolher datas") muda números, gráfico e análises
- [ ] Canal, Assunto, Tipo e Autorização filtram todas as telas com filtro
- [ ] Tocar em um assunto em "Assuntos recorrentes" aplica o filtro
- [ ] A busca encontra "televisão", "marmita", "glúteo" e o código "A-012"
- [ ] Em "Mensagens e revisão", as objeções detectadas aparecem como etiqueta

## Conversas do dia
- [ ] Mostra o assunto do dia, quem perguntou (primeiro nome + código), a pergunta e a resposta da equipe com o horário (auto)
- [ ] Telegram importado: a resposta vem do "responder" da mensagem (auto)
- [ ] WhatsApp importado: a resposta é a primeira mensagem da equipe depois da pergunta, marcada como "ligação estimada" (auto)
- [ ] "Só as que não têm resposta registrada" filtra a lista

## Prints para o Instagram
- [ ] "Criar print" só fica ativo com autorização para divulgação, quem confirmou e cópia com rosto oculto, quando exigido (auto)
- [ ] O montador gera a prévia nos formatos feed, stories e quadrado e envia para aprovação (auto)
- [ ] Só a função Administração aprova ou pede ajuste (auto)
- [ ] Se a autorização da aluna for retirada depois, o print aparece como "não usar" e sai do pacote
- [ ] "Baixar pacote dos aprovados (.zip)" gera `Instagram/AAAA-MM/` com os PNGs e o `LEIA-ME.txt` sem dados pessoais (auto)
- [ ] "Enviar ao Drive" aparece desativado até a integração ser configurada
- [ ] Em "Importados", "Adicionar" aceita antes e depois (2 fotos) ou print de conversa (1 imagem), e "Ocultar rosto ou dados" funciona nos dois

## Dores e objeções
- [ ] "Objeções" mostra um cartão por objeção com exemplos, dia da semana em que mais aparece, "como quebrar" e prova social (auto)
- [ ] "Dores por assunto" agrupa dúvidas, dificuldades e queixas com as frases mais repetidas (auto)
- [ ] Editar as palavras-chave de uma objeção em Configurações muda a contagem

## Antes e depois e resultados
- [ ] "Ideias de antes e depois" mostra 6 tipos de resultado (medidas, roupa, força, constância, mentalidade, disposição), cada um com uma ideia (auto)
- [ ] "Convidar para antes e depois" lista quem relatou evolução e não tem foto (auto)
- [ ] "Relatos e depoimentos": registrar "Autorizada para divulgação" sem "Quem confirmou" mostra um erro e não salva
- [ ] "Fotos": o editor gera prévia antes de salvar e o card mostra "Cópia tratada". O original continua igual (auto)
- [ ] "Marcar como pronta" só fica ativo com autorização para divulgação, quem confirmou e, se exigido, cópia com rosto oculto
- [ ] Na função Leitura, a foto original aparece como "acesso restrito"

## Ideias de conteúdo e Como ajudar mais
- [ ] A pauta tem: em poucas palavras, pauta sugerida, objeções e como quebrar, ideias de antes e depois, o que mais gerou conversa no grupo, perguntas que se repetem, o que está crescendo e como ajudar mais (auto)
- [ ] Frases com palavras diferentes e o mesmo sentido aparecem agrupadas ("Também escrevem…")
- [ ] "O que mais gerou conversa no grupo" usa as mensagens marcadas como equipe no Telegram
- [ ] "Como ajudar mais" mostra sugestões com a evidência de cada uma (auto)
- [ ] Mudar o "Tipo" de um assunto em Configurações (ex.: para "Ajuste na entrega") tira o assunto da pauta

## Permissões (simuladas)
- [ ] **Leitura:** não edita nem exporta. As alunas aparecem só como "Aluna A-0xx" (auto)
- [ ] **Edição:** edita classificações e autorizações e vê o primeiro nome. Não exporta
- [ ] **Exportação:** exporta e não edita
- [ ] **Administração:** tudo, incluindo assuntos, objeções, equipe e registro de ações

## Exportações
- [ ] "Baixar planilha (.csv)" abre no Excel com acentos corretos (auto)
- [ ] O CSV e o relatório não têm nome, sobrenome, código de aluna nem telefone (auto)
- [ ] "Baixar relatório (.html)" abre no navegador e pode ser salvo como PDF por "Imprimir" (auto)
- [ ] O relatório "Divulgação" só lista itens revisados e autorizados
- [ ] No modo de exemplo, os arquivos começam com "FICTICIO-" e trazem o aviso de dados fictícios (auto)
- [ ] "Alunas que pedem um olhar" não aparece em nenhum relatório nem no resumo copiado

## Importação
- [ ] `exemplos/whatsapp-exemplo-ficticio.txt`: 5 mensagens, 1 mídia ignorada (auto)
- [ ] `exemplos/telegram-exemplo-ficticio.json`: 4 mensagens, 1 mídia ignorada (auto)
- [ ] `exemplos/planilha-exemplo-ficticia.csv`: 3 mensagens (auto)
- [ ] Um `.zip` mostra a orientação para extrair o `.txt`
- [ ] Quem é marcado como equipe não entra nas contagens e alimenta "O que mais gerou conversa no grupo"

## Celular e acessibilidade
- [ ] Em tela de celular, não há rolagem para os lados (auto)
- [ ] O menu vira uma faixa rolável e os filtros ficam recolhidos
- [ ] Os temas claro e escuro ficam legíveis (auto)
- [ ] É possível navegar com a tecla Tab e o foco fica visível
