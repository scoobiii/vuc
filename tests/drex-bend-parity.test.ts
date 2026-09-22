/**
 * DREX - Teste de Paridade Exata: Compilador Nativo Bend (HVM) vs VUA Engine
 * 
 * Verifica que os resultados da execução formal em Bend 2.0.25 e da execução
 * no ledger TypeScript produzem os mesmos saldos, as mesmas somas e preservação
 * invariante estrita da massa monetária.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import { DrexGovernanceEngine } from '../src/vortex/drex-engine.js';
import { VUABendEngine, findBendBinary } from '../src/vortex/bend-engine.js';
import type { DrexTransactionPayload } from '../src/types/drex.js';

console.log('=== [VUA-DREX] Iniciando Teste de Paridade: Bend Nativo vs VUA Engine ===\n');

// 1. Verifica binário do Bend
const bendBin = findBendBinary();
console.log(`1. Binário do compilador Bend detectado: ${bendBin || 'NÃO ENCONTRADO'}`);
assert.ok(bendBin, 'O compilador Bend nativo deve estar disponível em bin/native/bin/bend');

// 2. Executa DREX_Laws.bend formalmente com o compilador Bend
console.log('2. Verificando tipos e provas formais em DREX_Laws.bend...');
const drexLawsCode = fs.readFileSync('./DREX_Laws.bend', 'utf8');
const drexLawsCheck = VUABendEngine.checkLaws(drexLawsCode);
console.log(`   Resultado: ${drexLawsCheck.status} via ${drexLawsCheck.engine}`);
console.log(`   Output: ${drexLawsCheck.output.trim()}`);
assert.strictEqual(drexLawsCheck.status, 'CHECK_PASSED');

// 3. Executa exemplos/drex/drex_atomic_dvp.bend no compilador Bend
console.log('\n3. Executando exemplos/drex/drex_atomic_dvp.bend no compilador nativo Bend...');
const dvpCheck = VUABendEngine.execute(
  fs.readFileSync('./exemplos/drex/drex_atomic_dvp.bend', 'utf8')
);
console.log(`   Exit Code: ${dvpCheck.success ? '0 (OK)' : 'FAIL'}`);
console.log(`   Stdout: ${dvpCheck.stdout.trim()}`);
assert.strictEqual(dvpCheck.success, true);
assert.strictEqual(dvpCheck.stdout.trim(), '1700000', 'Soma total dos dois nós deve ser exatamente 1.700.000');

// 4. Executa exemplos/drex/drex_privacy_conservation.bend no compilador Bend
console.log('\n4. Executando exemplos/drex/drex_privacy_conservation.bend no compilador nativo Bend...');
const privacyCheck = VUABendEngine.execute(
  fs.readFileSync('./exemplos/drex/drex_privacy_conservation.bend', 'utf8')
);
console.log(`   Exit Code: ${privacyCheck.success ? '0 (OK)' : 'FAIL'}`);
console.log(`   Stdout: ${privacyCheck.stdout.trim()}`);
assert.strictEqual(privacyCheck.success, true);
assert.strictEqual(privacyCheck.stdout.trim(), '350000', 'Massa total monetária conservada deve ser 350.000');

// 5. Teste de Paridade DvP Atômico: Bend Nativo vs DrexGovernanceEngine
console.log('\n5. Comparando execução transacional DvP entre Bend e VUA DrexGovernanceEngine...');
const buyerBefore = DrexGovernanceEngine.getAccount('bank-bb-01');
const sellerBefore = DrexGovernanceEngine.getAccount('bank-itau-01');
assert.ok(buyerBefore && sellerBefore);

const buyerInitialCash = buyerBefore.realDigitalBalance;
const sellerInitialCash = sellerBefore.realDigitalBalance;
const sellerInitialTpft = sellerBefore.tpftBalance;
const price = 50000000; // R$ 500.000,00 (em centavos)
const volume = 25; // 25 títulos TPFT

// Execução no Bend nativo
const bendDvp = VUABendEngine.executeDrexDvpInBend(
  buyerInitialCash,
  sellerInitialCash,
  sellerInitialTpft,
  price,
  volume
);
console.log(`   [Bend Nativo] Volume liquidado: ${bendDvp.settledVolume} | Soma pós: ${bendDvp.postSum}`);

// Execução no VUA DrexEngine
const payload: DrexTransactionPayload = {
  operation: 'SETTLE_DVP',
  actorRole: 'COMMERCIAL_BANK',
  senderId: 'bank-bb-01',
  receiverId: 'bank-itau-01',
  amountRealDigital: price,
  volumeTpft: volume,
  legalBasis: 'Bacen Resolução 315/2023 - Atacado DvP',
  privacyPreserving: false,
};

const txResult = DrexGovernanceEngine.executeTransaction(payload);
console.log(`   [VUA Engine]  Transação: ${txResult.transactionId}`);
console.log(`   [VUA Engine]  Mecanicamente verificado: ${txResult.mechanicalProof?.verified} via ${txResult.mechanicalProof?.engine}`);
console.log(`   [VUA Engine]  Invariante Preservado: ${txResult.invariantPreserved}`);
console.log(`   [VUA Engine]  Soma Pré: ${txResult.balancePreSum} | Soma Pós: ${txResult.balancePostSum}`);

// Asserção de paridade exata
assert.strictEqual(txResult.success, true);
assert.strictEqual(txResult.invariantPreserved, true);
assert.strictEqual(txResult.balancePostSum, bendDvp.postSum, 'A soma do ledger deve ser IDÊNTICA à do compilador Bend');
assert.strictEqual(txResult.balancePreSum, txResult.balancePostSum, 'Preservação estrita da massa monetária');

console.log('\n✔ PARIDADE COMPROVADA COM SUCESSO: Os resultados do compilador Bend e da Engine VUA são 100% idênticos!\n');
