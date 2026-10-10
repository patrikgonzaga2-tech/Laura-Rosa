# Lista de testes

Marque cada item ao conferir. Os itens com (auto) também foram verificados automaticamente num navegador durante o desenvolvimento.

## Dados e identificação
- [ ] Ao abrir, a faixa amarela diz "Dados fictícios" (auto)
- [ ] Ao trocar para "Importados" sem ter importado nada, aparece a tela vazia com o botão "Ir para Importar"
- [ ] Depois de importar, a faixa fica azul, diz "Dados importados manualmente" e os números de exemplo não aparecem
- [ ] Ao recarregar a página, os dados importados somem

## Filtros e busca
- [ ] Período: 7, 14, 30, 60 dias, "Tudo" e "Escolher datas" mudam os números e o gráfico
- [ ] Canal, Assunto, Tipo, Autorização e Acompanhamento filtram a Visão geral, a Fila, as Mensagens, os Conteúdos e os Relatórios
- [ ] Tocar em um assunto em "Assuntos recorrentes" aplica o filtro
- [ ] "Limpar filtros" volta tudo, menos o período
- [ ] A busca encontra "televisão", "marmita", "glúteo" e o código "A-012" (auto)
- [ ] A busca não encontra telefones (eles aparecem como "[telefone oculto]")

## Permissões (simuladas)
- [ ] **Leitura:** não vê "Ver contato", não edita status nem classificação e não exporta (auto). As alunas aparecem só como "Aluna A-0xx" (auto)
- [ ] **Suporte (edição):** edita a fila e as classificações, vê o contato e não exporta
- [ ] **Exportação:** exporta e não edita
- [ ] **Administração:** tudo, incluindo assuntos, equipe e registro de ações
- [ ] "Ver contato" mostra nome completo, telefone e mensagem original, e gera uma linha no registro de ações (auto)

## Anonimização
- [ ] Mensagem com telefone aparece com "[telefone oculto]" na fila e nos relatórios (auto, com `exemplos/whatsapp-exemplo-ficticio.txt`)
- [ ] O sobrenome de uma aluna citado no texto vira "[sobrenome oculto]"
- [ ] O CSV exportado não tem telefone nem sobrenome (auto)
- [ ] O relatório não mostra código nem nome de aluna

## Classificação e revisão
- [ ] Mensagens novas aparecem com "Sugestão automática · confiança …"
- [ ] "Confirmar classificação" muda o selo para "Revisada" (auto)
- [ ] Com "Só classificações revisadas" marcado, o relatório informa quantas ficaram de fora
- [ ] Editar as palavras-chave de um assunto e clicar em "Reclassificar" muda só as mensagens não revisadas

## Fila de acompanhamento
- [ ] Mudar o status para "Concluído" tira o item de "Abertos" e atualiza os contadores
- [ ] Prioridade, Responsável e Status ficam registrados no registro de ações

## Autorizações, fotos e arquivos
- [ ] Registrar "Autorizada para divulgação" sem "Quem confirmou" mostra um erro e não salva (auto)
- [ ] "Marcar como pronta" só fica ativo com autorização para divulgação, quem confirmou e, se exigido, a cópia com o rosto oculto
- [ ] O editor gera a prévia antes de salvar e o card mostra "Cópia tratada" (auto). A imagem original continua igual
- [ ] Em "Importados", "Adicionar foto" aceita uma imagem que fica só na aba
- [ ] Na função Leitura, a foto original aparece como "acesso restrito"

## Pauta de conteúdo e necessidades
- [ ] Relatórios → "Pauta de conteúdo e necessidades" mostra: em poucas palavras, pauta sugerida (até 6), perguntas que se repetem, bloqueios de mentalidade, o que está crescendo, prova social por objeção, melhorias na entrega e limites (auto)
- [ ] Perguntas com palavras diferentes e o mesmo sentido aparecem agrupadas ("Também escrevem…") (auto)
- [ ] Na prova social, só aparece texto de relato revisado, autorizado para divulgação e com quem confirmou
- [ ] Mudar o "Tipo" de um assunto em Configurações (ex.: de "Vira conteúdo" para "Ajuste na entrega") tira o assunto da pauta e o leva para "Melhorias na entrega"
- [ ] Editar o "Ângulo do seu método" muda o texto na pauta
- [ ] Resumo do dia → "Alunas que pedem um olhar mais próximo" lista sinais e não aparece no resumo copiado nem nos relatórios (auto)

## Exportações
- [ ] "Baixar planilha (.csv)" abre no Excel com acentos corretos (auto)
- [ ] "Baixar relatório (.html)" abre no navegador e pode ser salvo como PDF por "Imprimir"
- [ ] O relatório "Divulgação" só lista itens revisados e autorizados
- [ ] Os arquivos baixados no modo de exemplo começam com "FICTICIO-" e trazem o aviso de dados fictícios (auto)

## Importação
- [ ] `exemplos/whatsapp-exemplo-ficticio.txt`: 5 mensagens, 1 mídia ignorada (auto)
- [ ] `exemplos/telegram-exemplo-ficticio.json`: 4 mensagens, 1 mídia ignorada (auto)
- [ ] `exemplos/planilha-exemplo-ficticia.csv`: 3 mensagens (auto)
- [ ] Um `.zip` mostra a orientação para extrair o `.txt`
- [ ] Marcar "Suporte Demo" como equipe tira as mensagens dele das contagens e marca como respondido o que veio antes da resposta

## Celular e acessibilidade
- [ ] Em tela de celular, não há rolagem para os lados (auto)
- [ ] O menu vira uma faixa rolável e os filtros ficam recolhidos
- [ ] Os temas claro e escuro ficam legíveis (auto)
- [ ] É possível navegar com a tecla Tab e o foco fica visível
