# Leads da Meta

Os novos indicadores sao adicionados como um modulo independente a apresentacao.html, grupo.html e painel.html. Nenhuma formula anterior de vendas, metas, impostos ou ROAS e substituida.

## Fonte e consolidacao

- Fonte unica: Meta Insights, action_type onsite_conversion.messaging_conversation_started_7d, agrupado diariamente.
- Jaragua recebe a soma de Escritorio SC e Joinville, como ocorre nas vendas.
- Nao e uma contagem de contatos novos nem necessariamente exclusiva do WhatsApp.
- A tabela moises_meta_leads_daily e separada de moises_daily_metrics, preservando os leads e gastos preenchidos manualmente no historico.
- meta_spend serve apenas ao custo por lead do novo modulo. Nao substitui o gasto ou o imposto usado no ROAS existente.

## Conversao aparente

Pedidos registrados / conversas atribuidas, somente nas mesmas datas. Uma data entra no calculo apenas quando todas as operacoes selecionadas possuem leads completos e vendas registradas. O dia corrente e parcial. Ausencia de dados nao equivale a zero. A razao nao comprova que as vendas vieram dos anuncios e pode ultrapassar 100% por defasagem ou origens diferentes.

## Acesso e sincronizacao

O SQL cria somente a nova tabela, sua politica de leitura e grants. Nao modifica os vinculos de acesso existentes. Leitura exige usuario autenticado com vinculo a workspace_id; anon nao tem acesso e o navegador nao escreve nessa tabela.

A coleta continua local pelo script meta-orcamento/exportar-leads.ps1, fora deste repositorio. Ela usa a credencial Meta ads_read protegida pelo Windows. A rotina local importa o JSON validado pelo conector Supabase. Nenhuma chave Meta, credencial administrativa, nome de cliente ou conversa e incluida neste repositorio publico.

O banco ja recebeu setembro e outubro de 2026 ate 26/10 (224 registros, quatro operacoes). O front-end permanece pendente de publicacao. Dados parciais sao identificados e a ultima consulta aparece no painel. A pagina reconsulta o banco a cada minuto; isso nao significa que o PC coletou novamente a Meta.

## Validacao

`node --test tests/meta-leads.test.cjs` verifica consolidacao, escopo por operacao, ausencia vs zero, datas parciais e conciliacao com vendas. A previa tests/preview-leads.html usa exclusivamente dados ficticios e permite conferir layout e mes sem dados.

Revisar a exibicao em uma sessao autenticada apos a publicacao. O modulo nao cria login nem altera o fluxo de autenticacao atual.
