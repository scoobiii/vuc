# Auditoria preliminar — ônibus e eleição em São Paulo

**Data do evento:** 25/10/2026  
**Status:** ingestão oficial do TSE adicionada ao CI; estimativa causal do efeito dos ônibus ainda NÃO estimada.

## O que o CI agora executa
1. Valida os oito indicadores descritivos previamente transcritos de reportagens.
2. Executa testes automatizados para leitura dos dados do TSE, pareamento de seções entre os turnos e junção por local de votação.
3. Baixa o ZIP oficial de detalhe de votação por seção do TSE para 2026.
4. Filtra São Paulo (capital), verifica a identidade `comparecimento + abstenções = aptos`, exige dados de ambos os turnos e gera:
   - `tse-turnout-summary.json`: totais e taxas agregadas por turno, número de seções pareadas, hash do ZIP e estado da junção por exposição;
   - `tse_section_turnout.csv`: comparecimento/abstenção por seção nos dois turnos e variação da taxa de abstenção;
   - hashes SHA-256 das evidências e saídas.
5. Se for fornecido um mapeamento validado em `exposicao_locais.csv`, calcula uma diferença descritiva na mudança de abstenção entre locais classificados como `alta` exposição e `controle`.

## Dados de exposição a ônibus — bloqueio conhecido
O arquivo `exposicao_locais.csv` contém apenas o cabeçalho de esquema. Não foram incluídos registros porque ainda não há uma tabela verificável que ligue cada local de votação à exposição à redução de ônibus em 25/10/2026.

A API Olho Vivo da SPTrans documenta posições de veículos em tempo real; ela não substitui, por si só, um arquivo histórico de posições/viagens de 25/10/2026. Não se deve consultar o estado atual e tratá-lo como prova retrospectiva. A análise por exposição só será executada quando houver arquivo histórico ou levantamento documentado por local, com fonte, horário, definição e hash.

## Fontes públicas
- Portal oficial de dados abertos do TSE, conjunto Resultados 2026: https://dadosabertos.tse.jus.br/
- Arquivos oficiais de divulgação de resultados 2026: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados
- Documentação oficial da API Olho Vivo/SPTrans: https://www.sptrans.com.br/desenvolvedores/api-do-olho-vivo-guia-de-referencia/documentacao-api/
- Metrópoles: https://www.metropoles.com/sao-paulo/tse-da-prazo-para-prefeitura-de-sp-explicar-reducao-na-frota-de-onibus
- Diário do Povo: https://diario.dopovo.com.br/2026/10/25/frota-de-onibus-de-sao-paulo-opera-com-71-no-domingo-de-eleicao/
- Metrópoles: https://www.metropoles.com/sao-paulo/periferias-onde-lula-venceu-sao-as-mais-afetadas-por-falta-de-onibus-em-sp

## Limitações estatísticas
- Mudança de comparecimento entre 1º e 2º turnos não identifica, isoladamente, efeito causal da oferta de ônibus.
- O segundo turno tem dinâmica eleitoral própria; comparações simples podem refletir mobilização, candidatos, campanha, clima, características demográficas e outros fatores.
- A diferença entre grupos de exposição, se o mapeamento for fornecido, será descritiva e não ajustada por confundidores. Não é prova de causalidade.
- Eleitores aptos em locais expostos não equivalem a pessoas prejudicadas, abstenções causadas ou votos transferidos.
- Valores de frota transcritos de reportagens não foram recalculados a partir dos dados brutos da SPTrans.

## Critério para uma estimativa causal
Obter um arquivo histórico verificável de oferta/circulação por horário e região/local de votação; documentar a regra de exposição antes de observar os resultados; cruzar com dados de comparecimento por seção; pré-especificar controles e testes de robustez; apresentar intervalos de incerteza. Até lá, o CI valida ingestão e estatística descritiva, não o efeito eleitoral causal.
