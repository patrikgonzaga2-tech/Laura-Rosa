# Lista de testes

Marque cada item ao conferir. Os itens com (auto) também foram verificados automaticamente num navegador durante o desenvolvimento.

## Login e acesso
- [ ] Sem login, o painel mostra só a tela de entrar (auto)
- [ ] Senha errada mostra "E-mail ou senha incorretos" (auto)
- [ ] Primeiro acesso com a senha inicial (nome + 1234) pede uma senha nova antes de mostrar dados, e não aceita repetir a inicial (auto)
- [ ] "Manter conectado neste aparelho por 30 dias" desmarcado: ao recarregar, pede login de novo (auto)
- [ ] Marcado: ao recarregar continua conectado; "Sair" apaga a chave; depois de 30 dias pede login (auto)
- [ ] "Minha conta" troca a senha (auto)
- [ ] Usuários (só Administração): adicionar cria o acesso e mostra a mensagem pronta; "Voltar para a senha inicial"; editar função e painéis; desativar (auto)
- [ ] Cada pessoa só vê no menu os painéis liberados para ela (auto)

## Dados e identificação
- [ ] A faixa verde diz "Dados reais do grupo do Telegram" (auto)
- [ ] Sem mensagens, aparece "Ainda não chegaram mensagens" com o botão "Buscar agora"
- [ ] Nenhuma tela mostra telefone. Números citados no texto aparecem como "[telefone oculto]" (auto)

## Navegação, atualização e personalização
- [ ] O menu aparece agrupado (Acompanhar, Entender, Criar, Cuidar, Dados). No celular fica atrás do botão "Menu" (auto)
- [ ] O endereço muda ao trocar de tela (ex.: `#dia`), e o botão voltar do navegador funciona (auto)
- [ ] O topo mostra "mensagens até …" e "análises às …" (auto)
- [ ] "Atualizar dados" mostra grupos e última busca, "Buscar mensagens novas" traz as mensagens do servidor e "Recalcular análises" refaz as classificações não revisadas
- [ ] "Personalizar painel": adicionar, remover e reordenar indicadores; mostrar, ocultar e reordenar seções; período e métrica ao abrir (auto)
- [ ] "Salvar visualização" com "Abrir sempre" reabre igual depois de recarregar (auto). Em janela anônima, o painel avisa que não conseguiu salvar
- [ ] "Redefinir" volta ao padrão sem apagar as visualizações salvas (auto)
- [ ] "Pede atenção agora" só mostra alertas com dados, e cada link leva à tela certa (auto)
- [ ] Os indicadores mostram unidade, variação com "melhorou/piorou" quando faz sentido e tendência (auto)

## Filtros e busca
- [ ] Os botões de período (7, 14, 30, 60 dias, Tudo, Escolher datas) mudam números, gráfico e análises (auto)
- [ ] Filtros ativos aparecem como etiquetas removíveis em todas as telas que usam filtro, inclusive Conversas do dia (auto)
- [ ] Canal, Assunto, Tipo e Autorização filtram todas as telas com filtro
- [ ] Tocar em um assunto em "Assuntos recorrentes" aplica o filtro
- [ ] A busca encontra "televisão", "marmita", "glúteo" e o código "A-012"
- [ ] Em "Mensagens e revisão", as objeções detectadas aparecem como etiqueta

## Conversas do dia
- [ ] Mostra o assunto do dia, quem perguntou (primeiro nome + código), a pergunta e a resposta da equipe com o horário (auto)
- [ ] Telegram: a resposta vem do "responder" da mensagem (auto)
- [ ] Sem "responder", a resposta é a primeira mensagem da equipe depois da pergunta, marcada como "ligação estimada"
- [ ] "Só as que não têm resposta registrada" filtra a lista

## Prints para o Instagram
- [ ] "Criar print" só fica ativo com autorização para divulgação, quem confirmou e cópia com rosto oculto, quando exigido (auto)
- [ ] O montador gera a prévia nos formatos feed, stories e quadrado e envia para aprovação (auto)
- [ ] Só a função Administração aprova ou pede ajuste (auto)
- [ ] Se a autorização da aluna for retirada depois, o print aparece como "não usar" e sai do pacote
- [ ] "Baixar pacote dos aprovados (.zip)" gera `Instagram/AAAA-MM/` com os PNGs e o `LEIA-ME.txt` sem dados pessoais (auto)
- [ ] "Enviar ao Drive" aparece desativado até a integração ser configurada
- [ ] Em "Fotos", "Adicionar" aceita antes e depois (2 fotos) ou print de conversa (1 imagem), e "Ocultar rosto ou dados" funciona nos dois (auto)

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

## Permissões (conferidas no servidor)
- [ ] **Leitura:** não edita nem exporta. As alunas aparecem só como "Aluna A-0xx" (auto)
- [ ] **Edição:** edita classificações e autorizações e vê o primeiro nome. Não exporta
- [ ] **Exportação:** exporta e não edita
- [ ] **Administração:** tudo, incluindo assuntos, objeções, equipe e registro de ações

## Exportações
- [ ] "Baixar planilha (.csv)" abre no Excel com acentos corretos (auto)
- [ ] O CSV e o relatório não têm nome, sobrenome, código de aluna nem telefone (auto)
- [ ] "Baixar relatório (.html)" abre no navegador e pode ser salvo como PDF por "Imprimir" (auto)
- [ ] O relatório "Divulgação" só lista itens revisados e autorizados
- [ ] "Alunas que pedem um olhar" não aparece em nenhum relatório nem no resumo copiado

## Celular e acessibilidade
- [ ] Em tela de celular, não há rolagem para os lados (auto)
- [ ] O menu vira uma faixa rolável e os filtros ficam recolhidos
- [ ] Os temas claro e escuro ficam legíveis (auto)
- [ ] É possível navegar com a tecla Tab e o foco fica visível
