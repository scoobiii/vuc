/**
 * DREX Integration Types & Architecture Specification
 * Protocol: Vortex Universal Adapter (VUA) + Bend / HVM
 * Governance: Banco Central do Brasil (Bacen) - DREX Phase 1 & 2
 */

export type DrexActorRole =
  | 'CENTRAL_BANK' // Autoridade Central (Bacen): emissão, queima, custódia mestre, auditoria
  | 'COMMERCIAL_BANK' // Banco Comercial: custodiante, nó validador, reserva bancária, atacado DvP
  | 'FINTECH' // Fintech / ITP: iniciação de pagamentos, real varejo, smart contracts, microcrédito
  | 'END_USER'; // Usuário / Cidadão: carteira soberana, transações peer-to-peer / varejo

export type DrexAssetType =
  | 'REAL_DIGITAL' // CBDC Atacado (interbancário Bacen)
  | 'REAL_TOKENIZADO' // CBDC Varejo (depósitos tokenizados bancos/fintechs)
  | 'TPFT_LFT' // Título Público Federal Tokenizado (Tesouro Selic)
  | 'TPFT_LTN'; // Título Público Federal Tokenizado (Prefixado)

export type DrexOperationType =
  | 'MINT_RESERVE' // Central Bank: emissão primária contra reservas
  | 'BURN_RESERVE' // Central Bank: queima e recolhimento de reservas
  | 'SETTLE_DVP' // Atacado DvP: Real Digital vs TPFT (Delivery vs Payment)
  | 'TRANSFER_RETAIL' // Varejo: Transferência P2P ou C2B com sigilo LC 105/2001
  | 'JUDICIAL_FREEZE' // Compliance: Bloqueio cautelar SisbaJud / BacenJud
  | 'JUDICIAL_UNFREEZE' // Desbloqueio judicial por ordem homologada
  | 'STRIKE_PROOF_AUDIT'; // Auditoria cética de prova de reserva sem revelar saldos individuais

export interface DrexAccountState {
  id: string;
  ownerName: string;
  role: DrexActorRole;
  cnpjOrCpfMasked: string;
  realDigitalBalance: number; // Centavos de BRL (CBDC)
  tpftBalance: number; // Unidades de Título Público
  frozenBalance: number; // Centavos bloqueados judicialmente
  nodeId: string;
  complianceStatus: 'VERIFIED' | 'CAUTION' | 'RESTRICTED';
}

export interface DrexTransactionPayload {
  operation: DrexOperationType;
  actorRole: DrexActorRole;
  senderId: string;
  receiverId: string;
  amountRealDigital: number;
  volumeTpft: number;
  tpftSeries?: string;
  legalBasis: string; // ex: 'LC 105/2001 Art. 1 § 3', 'Bacen Resolução 315/2023', 'SisbaJud Processo 5001'
  judicialOrderNumber?: string;
  privacyPreserving: boolean; // Flag de prova zk / soma cega sem vazar partes
}

export interface DrexExecutionResponse {
  success: boolean;
  transactionId: string;
  operation: DrexOperationType;
  actorRole: DrexActorRole;
  lawsVerified: string[];
  proofHash: string;
  canonicalJcs: string;
  ed25519Signature: string;
  settlementTimestamp: string;
  invariantPreserved: boolean;
  balancePreSum: number;
  balancePostSum: number;
  auditTrail: {
    rule: string;
    description: string;
    passed: boolean;
  }[];
  stateSnapshot: {
    senderPre: Partial<DrexAccountState>;
    senderPost: Partial<DrexAccountState>;
    receiverPre: Partial<DrexAccountState>;
    receiverPost: Partial<DrexAccountState>;
  };
}
