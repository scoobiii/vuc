/**
 * DREX - Script de Medição de Latência em Rede Multi-Nó Distribuída (IBFT + Bend)
 * 
 * Executa rodadas de consenso com tolerância a falhas bizantinas entre 5 nós participantes
 * e registra métricas reais de tempo de parede (latência, dispersão e vazão).
 */

import fs from 'node:fs';
import { DrexDistributedNetwork } from '../src/vortex/drex-network.js';

function detectEnvironmentClassification(platform: string, arch: string): string {
  if (process.env.K_SERVICE || process.env.K_REVISION) {
    return `Container Cloud Run Linux ${arch} (Ambiente Virtualizado / Não Bare-Metal)`;
  }
  if (fs.existsSync('/.dockerenv')) {
    return `Container Docker Linux ${arch} (Ambiente Virtualizado / Não Bare-Metal)`;
  }
  if (process.env.TERMUX_VERSION || process.env.PREFIX?.includes('com.termux')) {
    return `Dispositivo Físico Android (Termux Linux ${arch} - Hardware Real)`;
  }
  return `Host ${platform} ${arch} (Execução Local Direta)`;
}

async function main() {
  console.log('================================================================================');
  console.log('   DREX PILOTO VUA - MEDIÇÃO DE LATÊNCIA EM REDE DISTRIBUÍDA MULTI-NÓ');
  console.log('================================================================================\n');

  console.log('Configuração da Rede:');
  console.log('  • Nós: 5 validadores independentes');
  console.log('    - [Bacen] selic-bacen-core-br (Líder / Proposer)');
  console.log('    - [Itaú] itau-drex-node-sp (Validador Comercial 1)');
  console.log('    - [Banco do Brasil] bb-drex-node-df (Validador Comercial 2)');
  console.log('    - [Bradesco] bradesco-drex-node-sp (Validador Comercial 3)');
  console.log('    - [Nubank] nubank-drex-node-sp (Fintech ITP)');
  console.log('  • Algoritmo de Consenso: IBFT 2.0 (Pre-Prepare -> Prepare -> Commit)');
  console.log('  • Quórum Bizantino: 2f + 1 = 3 assinaturas Ed25519 requeridas');
  console.log('  • Verificador Mecânico: Compilador Nativo Bend 2.0.25 (HVM2)');
  console.log('  • Atraso de Rede Simulado: 1.5ms (Jitter ±20% simulando enlaces RSFN/SPB)\n');

  const network = new DrexDistributedNetwork(1.5);

  console.log('Iniciando bateria de medição (30 iterações transacionais DvP)...\n');
  const metrics = await network.benchmarkNetworkLatency(30);

  const classification = detectEnvironmentClassification(metrics.environment.platform, metrics.environment.arch);

  console.log('================================================================================');
  console.log(`   RESULTADOS REAIS MEDIDOS (${metrics.environment.platform.toUpperCase()} / ${metrics.environment.arch.toUpperCase()})`);
  console.log('================================================================================\n');

  console.log(`Amostras Coletadas: ${metrics.sampleSize} transações`);
  console.log(`Tempo Total do Teste: ${(metrics.totalDurationMs / 1000).toFixed(2)} segundos`);
  console.log(`Vazão Efetiva (Throughput): ${metrics.throughputTps} tx/s (com consenso distribuído e prova mecânica)\n`);

  console.log('Métricas de Latência Ponta a Ponta:');
  console.log(`  • Média:         ${metrics.latency.meanMs} ms`);
  console.log(`  • Mediana (p50): ${metrics.latency.medianMs} ms`);
  console.log(`  • Percentil p90: ${metrics.latency.p90Ms} ms`);
  console.log(`  • Percentil p95: ${metrics.latency.p95Ms} ms`);
  console.log(`  • Percentil p99: ${metrics.latency.p99Ms} ms`);
  console.log(`  • Mínima:        ${metrics.latency.minMs} ms`);
  console.log(`  • Máxima:        ${metrics.latency.maxMs} ms`);
  console.log(`  • Desvio Padrão: ${metrics.latency.stdDevMs} ms\n`);

  console.log('Decomposição do Tempo por Fase (Médias):');
  console.log(`  • Fase 1 - Pre-Prepare & Broadcast:  ${metrics.breakdownAverageMs.prePrepareMs} ms`);
  console.log(`  • Fase 2 - Validação & Prepare:       ${metrics.breakdownAverageMs.preparePhaseMs} ms`);
  console.log(`    ↳ Prova Mecânica Bend (HVM):        ${metrics.breakdownAverageMs.bendVerificationMs} ms`);
  console.log(`  • Fase 3 - Commit & Quórum:           ${metrics.breakdownAverageMs.commitPhaseMs} ms`);
  console.log(`  • Aplicação Atômica no Ledger:        ${metrics.breakdownAverageMs.stateApplyMs} ms\n`);

  console.log('Auditoria de Consistência do Estado:');
  console.log(`  • Integridade Bizantina: ${metrics.consensusSummary.stateIntegrityVerified ? '✔ 100% Sincronizado (Zero bifurcação)' : '❌ Divergência de Estado'}`);
  console.log(`  • Hash Raiz de Estado:   ${metrics.consensusSummary.stateRootHash}\n`);

  console.log('Ambiente de Execução (Vortex Governance Compliance):');
  console.log(`  • Plataforma: ${metrics.environment.platform} (${metrics.environment.arch})`);
  console.log(`  • Núcleos: ${metrics.environment.cores} vCPUs`);
  console.log(`  • Runtime: ${metrics.environment.runtime}`);
  console.log(`  • Classificação: ${classification}\n`);
}

main().catch((err) => {
  console.error('Erro na medição da rede DREX:', err);
  process.exit(1);
});
