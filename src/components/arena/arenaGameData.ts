import type { ExecutionProof } from '../../vortex/types.js';

export interface CheckRunItem {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at?: string;
  completed_at?: string;
  html_url?: string;
}

export interface PullRequestState {
  number: number;
  title: string;
  state: string;
  merged: boolean;
  merged_at: string | null;
  mergeable: boolean | null;
  mergeable_state: string;
  html_url: string;
  head_ref: string;
  head_sha: string;
  base_ref: string;
  base_sha: string;
  changed_files: number;
  additions: number;
  deletions: number;
  checks_summary: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
  };
  checks: CheckRunItem[];
}

export interface ArenaLiveState {
  observed_at: string;
  external_effect: string;
  repository: string;
  github_pages: {
    html_url: string;
    status: string;
    branch: string;
  };
  local_preflight: {
    governance_markers_valid: boolean;
    governance_instruction_hash: string;
    signer_key_id: string;
    signer_algorithm: string;
    trust_store_anchored: boolean;
    active_gos3_sessions: number;
    cli_artifact_present: boolean;
    server_artifact_present: boolean;
    pycache_clean: boolean;
  };
  main_branch: {
    name: string;
    sha: string;
    message: string;
    author: string;
    date: string;
    protected: boolean;
    checks_summary: {
      total: number;
      passed: number;
      failed: number;
      pending: number;
    };
    checks: CheckRunItem[];
  };
  pull_requests: PullRequestState[];
}

export interface PreflightGateResult {
  id: string;
  order: number;
  name: string;
  category: string;
  passed: boolean;
  code: string;
  detail: string;
}

export interface PatchAuditResponse {
  success: boolean;
  external_effect: string;
  evaluated_at: string;
  duration_ms: number;
  scenario_id: string;
  title: string;
  target_branch: string;
  payload_hash: string;
  observed_payload_hash: string;
  verdict: 'PASS' | 'FAIL_CLOSED';
  player_prediction: 'PASS' | 'FAIL_CLOSED';
  prediction_correct: boolean;
  score_delta: number;
  gates_passed: number;
  total_gates: number;
  first_blocking_gate: PreflightGateResult | null;
  gates: PreflightGateResult[];
  execution_proof: ExecutionProof | null;
  verification: any;
}

export interface CastleGatePuzzle {
  gateNumber: number;
  backendGateId: string;
  title: string;
  subtitle: string;
  guardianQuote: string;
  question: string;
  visualSceneTitle: string;
  visualSceneDescription: string;
  optionA: {
    label: string;
    description: string;
    isSafe: boolean;
  };
  optionB: {
    label: string;
    description: string;
    isSafe: boolean;
  };
  failMessage: string;
  failHint: string;
  passMessage: string;
  passDetail: string;
  secretAdultTranslation: {
    castleTerm: string;
    vucTerm: string;
  };
}

export const CASTLE_GATES_PUZZLES: CastleGatePuzzle[] = [
  {
    gateNumber: 1,
    backendGateId: 's0_trust_anchor',
    title: 'Portão 1 — A Chave',
    subtitle: 'O Guardião da Entrada pede a chave para destrancar o primeiro portão.',
    guardianQuote: 'Pare! Só abro o Portão 1 para quem trouxer a chave verdadeira do Castelo!',
    question: 'Qual chave é verdadeira?',
    visualSceneTitle: 'Duas chaves estão na mesa diante do Portão 1',
    visualSceneDescription:
      'Uma chave já estava guardada no cofre oficial do castelo. A outra veio colada numa carta enviada por um desconhecido dizendo "Pode confiar em mim!".',
    optionA: {
      label: 'Chave A — "Chave do Rei"',
      description: 'Guardada desde o início no lugar confiável do castelo.',
      isSafe: true,
    },
    optionB: {
      label: 'Chave B — "Chave que chegou pela carta"',
      description: 'Veio junto com o pacote de fora pedindo para o guarda acreditar nela.',
      isSafe: false,
    },
    failMessage: 'Pare! Não pode passar. O castelo não reconheceu essa chave.',
    failHint: 'Uma chave verdadeira precisa vir do lugar confiável do castelo, nunca colada na carta do visitante.',
    passMessage: 'PORTÃO 1 ABERTO!',
    passDetail: 'A chave foi confirmada pelo Guardião VUC.',
    secretAdultTranslation: {
      castleTerm: 'Chave verdadeira vs Chave que chegou pela carta',
      vucTerm: 'S0 Trust Anchor (Trust Store) vs embeddedPublicKey',
    },
  },
  {
    gateNumber: 2,
    backendGateId: 'gos3_and_scope',
    title: 'Portão 2 — A Mochila',
    subtitle: 'O Guardião revista o que o robô quer levar para dentro do castelo.',
    guardianQuote: 'Deixe-me ver essa mochila! Você só pode levar o que precisa para a sua missão.',
    question: 'O que o robô pode levar na mochila?',
    visualSceneTitle: 'Lista de itens na mochila do robô',
    visualSceneDescription:
      'O robô precisa consertar apenas a oficina scoobiii/vuc. Mas alguém tentou colocar um item perigoso na mochila!',
    optionA: {
      label: 'Ferramentas + Pacote da missão + Mapa da sala (scoobiii/vuc)',
      description: 'Levar somente o equipamento da sala onde o robô vai trabalhar.',
      isSafe: true,
    },
    optionB: {
      label: 'Incluir também: "A chave do castelo inteiro"',
      description: 'Dar acesso total a todas as salas, torres e tesouros do castelo.',
      isSafe: false,
    },
    failMessage: 'PERIGO! Essa mochila daria acesso a tudo.',
    failHint: 'O Guardião permite somente o pacote da missão: scoobiii/vuc. Nunca dê a chave do castelo inteiro!',
    passMessage: 'PORTÃO 2 ABERTO!',
    passDetail: 'Mochila segura! O robô leva apenas o mapa da missão scoobiii/vuc.',
    secretAdultTranslation: {
      castleTerm: 'Pacote da missão vs O castelo inteiro',
      vucTerm: 'scope: ["scoobiii/vuc"] vs scope: ["*"]',
    },
  },
  {
    gateNumber: 3,
    backendGateId: 'approval_and_payload',
    title: 'Portão 3 — O Lacre',
    subtitle: 'O Rei aprovou o pacote e fechou com um Lacre Dourado.',
    guardianQuote: 'O pacote precisa chegar exatamente como o Rei aprovou, sem ninguém mexer no caminho!',
    question: 'Qual pacote você entrega para o Guardião?',
    visualSceneTitle: 'Inspeção do Lacre Real',
    visualSceneDescription:
      'Na mesa há o pacote original com o Lacre Dourado intacto, e outro pacote onde alguém trocou o conserto depois que o Rei assinou.',
    optionA: {
      label: 'Pacote com o Lacre Dourado intacto',
      description: 'O conserto dentro da caixa é exatamente o mesmo que recebeu a Permissão do Rei.',
      isSafe: true,
    },
    optionB: {
      label: 'Pacote que mudou depois do lacre',
      description: 'Alguém abriu a caixa escondido depois da aprovação e trocou as peças.',
      isSafe: false,
    },
    failMessage: 'Pare! Não pode passar. O pacote mudou depois do lacre!',
    failHint: 'Não pode trocar o pacote depois que ele foi aprovado pelo Rei.',
    passMessage: 'PORTÃO 3 ABERTO!',
    passDetail: 'O Lacre do Pacote bate 100% com a Permissão do Rei!',
    secretAdultTranslation: {
      castleTerm: 'Permissão do Rei + Lacre do pacote',
      vucTerm: 'approval_token + SHA-256 payload_hash binding',
    },
  },
  {
    gateNumber: 4,
    backendGateId: 'typescript_contract',
    title: 'Portão 4 — A Peça no Lugar Certo',
    subtitle: 'Na Missão 68, o robô parou aqui porque encaixou uma peça no lugar errado!',
    guardianQuote: 'Cada peça do robô tem seu encaixe certo. Se forçar no buraco errado, a máquina trava!',
    question: 'Onde você vai encaixar a Permissão do Rei no robô?',
    visualSceneTitle: 'O tabuleiro de encaixe do robô',
    visualSceneDescription:
      'O robô tem um encaixe para o Crachá (Identidade) e outro encaixe separado para a Permissão do Rei.',
    optionA: {
      label: 'Encaixar a Permissão no lugar próprio da Permissão',
      description: 'Cada peça no seu encaixe certo, sem misturar com o crachá.',
      isSafe: true,
    },
    optionB: {
      label: 'Forçar a Permissão para dentro da caixinha do Crachá',
      description: 'Tentar guardar duas peças diferentes no mesmo buraco.',
      isSafe: false,
    },
    failMessage: 'Pare! Peça encaixada no lugar errado!',
    failHint: 'Tire a Permissão de dentro do Crachá e coloque-a no encaixe principal do pedido.',
    passMessage: 'PORTÃO 4 ABERTO!',
    passDetail: 'Click! A peça encaixou perfeitamente — foi exatamente assim que a Missão 68 venceu!',
    secretAdultTranslation: {
      castleTerm: 'Peça encaixada no lugar errado',
      vucTerm: 'TypeScript error TS2353 (approval_token inside AuthorizationContext)',
    },
  },
  {
    gateNumber: 5,
    backendGateId: 'package_hygiene',
    title: 'Portão 5 — O Lixo Escondido na Mochila',
    subtitle: 'Na Missão 67, o alarme deste portão tocou! Vamos descobrir por quê.',
    guardianQuote: 'BIP! BIP! Meu Raio-X achou papéis de rascunho amassados no fundo da mochila da Missão 67!',
    question: 'O que você faz para o Robô da Missão 67 conseguir passar?',
    visualSceneTitle: 'Raio-X da Mochila da Missão 67',
    visualSceneDescription:
      'Dentro da mochila estão as ferramentas boas, mas também sobrou lixo de rascunho esquecido depois do treino.',
    optionA: {
      label: 'Limpar a mochila e jogar fora o lixo escondido',
      description: 'Deixar apenas as peças limpas e oficiais da missão.',
      isSafe: true,
    },
    optionB: {
      label: 'Tentar passar com o lixo escondido no fundo da mochila',
      description: 'Deixar a sujeira lá dentro e torcer para o Raio-X não ver.',
      isSafe: false,
    },
    failMessage: 'Pare! Não pode passar. Há lixo escondido na mochila!',
    failHint: 'Os guardiões nunca deixam entrar pacote com sujeira ou rascunho esquecido.',
    passMessage: 'PORTÃO 5 ABERTO!',
    passDetail: 'Mochila limpinha! Você resolveu o primeiro problema real da Missão 67!',
    secretAdultTranslation: {
      castleTerm: 'Lixo escondido na mochila',
      vucTerm: '__pycache__/*.pyc leak in npm pack provenance check',
    },
  },
  {
    gateNumber: 6,
    backendGateId: 'governance_contract',
    title: 'Portão 6 — O Juramento da Verdade',
    subtitle: 'No Castelo VUC, nenhum robô pode inventar histórias ou fingir que fez o que não fez.',
    guardianQuote: 'Antes de entrar na oficina real, o robô precisa jurar seguir o Código de Honra do Castelo!',
    question: 'Qual regra você programa na memória do robô?',
    visualSceneTitle: 'O Livro Dourado de Leis do Castelo',
    visualSceneDescription:
      'A primeira lei do castelo diz: "Se algo der errado ou faltar permissão, pare imediatamente e conte a verdade."',
    optionA: {
      label: 'Seguir o Livro de Leis: falar só a verdade e parar se houver perigo',
      description: 'Nunca inventar números nem fingir que terminou sem prova.',
      isSafe: true,
    },
    optionB: {
      label: 'Fingir que deu tudo certo mesmo quando a porta estiver trancada',
      description: 'Inventar uma resposta bonita para enganar o rei.',
      isSafe: false,
    },
    failMessage: 'Pare! No Castelo VUC é proibido fingir ou inventar!',
    failHint: 'Escolha sempre o Livro de Leis da Verdade: se não tiver certeza, o robô para com segurança.',
    passMessage: 'PORTÃO 6 ABERTO!',
    passDetail: 'O Juramento da Verdade está gravado no coração do robô!',
    secretAdultTranslation: {
      castleTerm: 'Livro de Leis da Verdade / Pare! Não pode passar',
      vucTerm: 'Normative AGENTS.md Governance Contract & Fail-Closed Barrier',
    },
  },
  {
    gateNumber: 7,
    backendGateId: 'gateway_execution',
    title: 'Portão 7 — A Sala do Conserto e o Recibo Mágico',
    subtitle: 'Chegou a hora do robô fazer o conserto e receber o Recibo Mágico.',
    guardianQuote: 'Entre na Sala Protegida! Quando terminar o conserto, minha máquina vai carimbar o seu Recibo Mágico.',
    question: 'Como o robô deve concluir o trabalho na Sala Protegida?',
    visualSceneTitle: 'A Bancada Oficial dos Guardiões',
    visualSceneDescription:
      'Na bancada oficial, cada parafuso apertado gera um Recibo Mágico assinado com o carimbo real do castelo.',
    optionA: {
      label: 'Fazer o conserto na Sala Protegida e pegar o Recibo Mágico',
      description: 'Trabalhar dentro da sala segura e guardar o comprovante oficial.',
      isSafe: true,
    },
    optionB: {
      label: 'Sair correndo pela janela sem fazer o teste nem pegar recibo',
      description: 'Tentar pular o Portão 7 sem comprovar que a missão aconteceu.',
      isSafe: false,
    },
    failMessage: 'Pare! Sem o Recibo Mágico ninguém sabe se a missão aconteceu de verdade.',
    failHint: 'Faça o conserto na Sala Protegida para receber o Recibo Mágico assinado.',
    passMessage: 'PORTÃO 7 ABERTO!',
    passDetail: 'Missão executada! O Guardião entregou o Recibo Mágico brilhante!',
    secretAdultTranslation: {
      castleTerm: 'Recibo mágico de que a missão realmente aconteceu',
      vucTerm: 'Signed Ed25519 ExecutionProof v1 from VUA Sandbox Gateway',
    },
  },
  {
    gateNumber: 8,
    backendGateId: 'independent_verification',
    title: 'Portão 8 — O Outro Guardião Conferindo o Recibo',
    subtitle: 'Último portão! Um segundo guardião independente vai ler o Recibo Mágico com sua lupa.',
    guardianQuote: 'Deixe-me conferir esse Recibo Mágico! Na Missão 67, deixaram um rabisco no final do papel e minha lupa travou!',
    question: 'Como você entrega o Recibo Mágico para o último Guardião?',
    visualSceneTitle: 'A Lupa do Segundo Guardião',
    visualSceneDescription:
      'O segundo guardião confere se o selo do recibo é verdadeiro e se não há nenhum rabisco estranho no final da folha.',
    optionA: {
      label: 'Entregar o Recibo Mágico limpinho, sem rabiscos no final',
      description: 'Folha limpa para a lupa ler o carimbo real de primeira.',
      isSafe: true,
    },
    optionB: {
      label: 'Entregar o recibo com um rabisco "\\n" sobrando no final',
      description: 'Deixar letras grudadas fora do lugar no fim do papel.',
      isSafe: false,
    },
    failMessage: 'Pare! O segundo guardião não conseguiu ler o recibo por causa do rabisco no final!',
    failHint: 'Apague o rabisco do final do recibo para a lupa confirmar o carimbo real.',
    passMessage: 'PORTÃO 8 ABERTO! CASTELO LIBERADO!',
    passDetail: 'O segundo guardião conferiu o Recibo Mágico: 8 de 8 Portões Abertos!',
    secretAdultTranslation: {
      castleTerm: 'Outro guardião conferindo o recibo (sem rabisco no fim)',
      vucTerm: 'Independent Verifier (RFC 8785 JCS + Ed25519) & clean JSON newline',
    },
  },
];

export const CASTLE_TRANSLATION_TABLE: Array<{
  kidTerm: string;
  engineerTerm: string;
  meaning: string;
}> = [
  {
    kidTerm: 'Missão 67 / Missão 68',
    engineerTerm: 'PR #67 / PR #68',
    meaning: 'As missões reais de evolução do projeto scoobiii/vuc no GitHub.',
  },
  {
    kidTerm: 'Os guardiões do castelo',
    engineerTerm: 'CI/CD (GitHub Actions)',
    meaning: 'Os vigias automáticos que testam cada robô antes de abrir o castelo.',
  },
  {
    kidTerm: '8 portas / 8 portões',
    engineerTerm: '8 Preflight Gates',
    meaning: 'As 8 verificações obrigatórias que precisam ficar verdes.',
  },
  {
    kidTerm: 'Chave verdadeira ("Chave do Rei")',
    engineerTerm: 'S0 Trust Anchor (Trust Store)',
    meaning: 'Chave pública guardada no cofre oficial do verificador.',
  },
  {
    kidTerm: 'Chave falsa ("Chave da carta")',
    engineerTerm: 'embeddedPublicKey',
    meaning: 'Chave enviada pelo próprio visitante tentando se auto-aprovar.',
  },
  {
    kidTerm: 'Dar a chave do castelo inteiro',
    engineerTerm: 'scope: ["*"]',
    meaning: 'Pedir permissão exagerada para mexer em tudo em vez de só na sua sala.',
  },
  {
    kidTerm: 'Permissão do rei',
    engineerTerm: 'approval_token',
    meaning: 'Autorização assinada antes de fazer qualquer mudança.',
  },
  {
    kidTerm: 'Lacre do pacote',
    engineerTerm: 'payload_hash (SHA-256)',
    meaning: 'Garante que ninguém trocou o conteúdo do pacote depois da aprovação.',
  },
  {
    kidTerm: 'Peça encaixada no lugar errado',
    engineerTerm: 'TypeScript error (TS2353)',
    meaning: 'Colocar a permissão dentro do bolso errado do código.',
  },
  {
    kidTerm: 'Lixo escondido na mochila',
    engineerTerm: '.pyc leak (__pycache__)',
    meaning: 'Arquivos de rascunho esquecidos dentro do pacote final.',
  },
  {
    kidTerm: 'Recibo mágico da missão',
    engineerTerm: 'ExecutionProof (Ed25519)',
    meaning: 'Comprovante matemático assinado de que o conserto aconteceu de verdade.',
  },
  {
    kidTerm: 'Outro guardião conferindo o recibo',
    engineerTerm: 'Independent Verifier (RFC 8785)',
    meaning: 'Fiscal independente que confere o Recibo Mágico com sua lupa.',
  },
  {
    kidTerm: '“Pare! Não pode passar.”',
    engineerTerm: 'FAIL_CLOSED',
    meaning: 'Se qualquer portão achar perigo, tudo para com segurança.',
  },
  {
    kidTerm: 'Castelo liberado!',
    engineerTerm: 'PASS 8/8',
    meaning: 'Todos os 8 portões abriram e o robô entrou no castelo!',
  },
];

export interface PatchScenarioPreset {
  id: string;
  code: string;
  kidMissionTitle: string;
  kidMissionHook: string;
  kidBrokenClue: string;
  startingGate: number;
  title: string;
  subtitle: string;
  targetBranch: string;
  linkedPrNumber?: number;
  expectedDefaultVerdict: 'PASS' | 'FAIL_CLOSED';
  config: {
    trustAnchorMode: 'trust_store' | 'caller_embedded_s0' | 'key_collision';
    approvalPlacement: 'top_level' | 'inside_authorization_ts2353' | 'missing';
    scopeMode: 'bounded' | 'wildcard';
    proofSerialization: 'clean_newline' | 'escaped_backslash_n';
    packageHygiene: 'clean' | 'leaked_pyc';
    payloadMutated: boolean;
  };
}

export const PATCH_SCENARIOS: PatchScenarioPreset[] = [
  {
    id: 'pr67-current-red-state',
    code: 'MISSÃO 67',
    kidMissionTitle: 'Missão 67 — O Robô Construtor que Quase Passou!',
    kidMissionHook:
      'Ele já acertou a chave, a mochila, o lacre e a peça... mas travou nos últimos portões por causa de um lixo escondido na mochila e um rabisco no recibo!',
    kidBrokenClue: 'Dica da Missão 67: Atenção especial ao Portão 5 (Mochila limpa) e ao Portão 8 (Recibo sem rabisco)!',
    startingGate: 1,
    title: 'PR #67 (HEAD c31b90ab2d) — Escaped "\\\\n" Proof JSON & .pyc Leak',
    subtitle: 'Reproduces the exact CI blockers on PR #67: literal "\\\\n" in --proof-out and __pycache__/*.pyc in npm pack.',
    targetBranch: 'ci/fail-closed-guard-all-gates',
    linkedPrNumber: 67,
    expectedDefaultVerdict: 'FAIL_CLOSED',
    config: {
      trustAnchorMode: 'trust_store',
      approvalPlacement: 'top_level',
      scopeMode: 'bounded',
      proofSerialization: 'escaped_backslash_n',
      packageHygiene: 'leaked_pyc',
      payloadMutated: false,
    },
  },
  {
    id: 'pr68-clean-s0-remediation',
    code: 'MISSÃO 68',
    kidMissionTitle: 'Missão 68 — O Robô Guardião da Chave do Rei',
    kidMissionHook:
      'Na vida real, este robô aprendeu a rejeitar chaves falsas, encaixou a peça no lugar certo e abriu todos os 8 portões do Castelo!',
    kidBrokenClue: 'Dica da Missão 68: Descubra como ele escolheu a Chave do Rei no Portão 1 e encaixou a peça certa no Portão 4!',
    startingGate: 1,
    title: 'PR #68 — Independent Trust Store & Top-Level Approval Contract',
    subtitle: 'Remediates S0 caller-key vulnerability and places approval_token on VortexRequest root.',
    targetBranch: 'feat/vuc-cli-s0-audit-suite',
    linkedPrNumber: 68,
    expectedDefaultVerdict: 'PASS',
    config: {
      trustAnchorMode: 'trust_store',
      approvalPlacement: 'top_level',
      scopeMode: 'bounded',
      proofSerialization: 'clean_newline',
      packageHygiene: 'clean',
      payloadMutated: false,
    },
  },
  {
    id: 's0-caller-key-injection',
    code: 'DESAFIO DA CHAVE FALSA',
    kidMissionTitle: 'Missão Secreta — O Impostor da Carta Misteriosa',
    kidMissionHook:
      'Um robô estranho chegou ao Portão 1 trazendo uma chave colada numa carta. Ajude o Guardião a descobrir qual chave é verdadeira!',
    kidBrokenClue: 'Dica: Comece pelo Portão 1 e nunca aceite chave que veio pela carta!',
    startingGate: 1,
    title: 'Attack S0 — Caller-Supplied Public Key Injection (embeddedPublicKey)',
    subtitle: 'Attempts to bypass verification by supplying an unanchored public key in the request.',
    targetBranch: 'fork/adversarial/s0-caller-anchor',
    expectedDefaultVerdict: 'FAIL_CLOSED',
    config: {
      trustAnchorMode: 'caller_embedded_s0',
      approvalPlacement: 'top_level',
      scopeMode: 'bounded',
      proofSerialization: 'clean_newline',
      packageHygiene: 'clean',
      payloadMutated: false,
    },
  },
];

export function playCastleSound(
  kind: 'gate_open' | 'gate_blocked' | 'castle_victory' | 'click',
  soundEnabled: boolean
) {
  if (!soundEnabled || typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const tone = (freq: number, startOffset: number, duration: number, type: OscillatorType = 'triangle', gainPeak = 0.08) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(gainPeak, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    if (kind === 'click') {
      tone(520, 0, 0.06, 'sine', 0.05);
    } else if (kind === 'gate_open') {
      tone(523.25, 0, 0.12, 'triangle', 0.09); // C5
      tone(659.25, 0.1, 0.14, 'triangle', 0.09); // E5
      tone(783.99, 0.2, 0.22, 'triangle', 0.1); // G5
    } else if (kind === 'gate_blocked') {
      tone(220, 0, 0.16, 'sawtooth', 0.07);
      tone(174.61, 0.15, 0.24, 'sawtooth', 0.07);
    } else if (kind === 'castle_victory') {
      tone(523.25, 0, 0.12, 'triangle', 0.1);
      tone(659.25, 0.11, 0.12, 'triangle', 0.1);
      tone(783.99, 0.22, 0.12, 'triangle', 0.1);
      tone(1046.5, 0.34, 0.35, 'triangle', 0.12);
    }
  } catch {
    // Ignore audio context restrictions
  }
}

export interface UniversalRepoConnectorResponse {
  success: boolean;
  cached?: boolean;
  connector_id: string;
  adapter?: string;
  environment?: string;
  authenticated?: boolean;
  external_effect: string;
  duration_ms?: number;
  repo: {
    full_name: string;
    name: string;
    description: string;
    html_url?: string;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    watchers_count: number;
    default_branch: string;
    language: string;
    updated_at: string;
    license: { spdx_id: string } | null;
    owner: {
      login: string;
      avatar_url: string;
      type: string;
    };
  };
  languages: Record<string, number>;
  commit: {
    sha: string;
    html_url?: string;
    commit: {
      message: string;
      author: {
        name: string;
        date: string;
      };
    };
  } | null;
  prs: Array<{
    number: number;
    title: string;
    state: string;
    draft?: boolean;
    html_url?: string;
    created_at: string;
    updated_at?: string;
    user: {
      login: string;
      avatar_url: string;
    };
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha?: string;
    };
    checks_summary?: {
      total: number;
      passed: number;
      failed: number;
      pending: number;
    };
  }>;
  runs: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    head_branch: string;
    head_sha?: string;
    html_url?: string;
    created_at: string;
  }>;
  branch_protection?: {
    enforced: boolean | null;
    status: string;
    reason?: string;
  } | null;
  vortex_governed?: boolean;
  audit_log: string[];
  execution_proof: ExecutionProof | null;
  verification: {
    valid: boolean;
    reason?: string;
  } | null;
  error_code?: string;
  error?: string;
}

export const UNIVERSAL_REPO_PRESETS = [
  { name: 'scoobiii/vuc', label: 'VUC (Pangolim)' },
  { name: 'facebook/react', label: 'React' },
  { name: 'vercel/next.js', label: 'Next.js' },
  { name: 'torvalds/linux', label: 'Linux Kernel' },
  { name: 'microsoft/vscode', label: 'VS Code' },
  { name: 'denoland/deno', label: 'Deno' },
  { name: 'rust-lang/rust', label: 'Rust' },
];

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Rust: '#dea584',
  C: '#555555',
  'C++': '#f34b7d',
  Python: '#3572A5',
  Go: '#00ADD8',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
};

export interface UniversalSecurityLever {
  id: number;
  gates: string;
  color: string;
  title: { pt: string; en: string };
  desc: { pt: string; en: string };
}

export const UNIVERSAL_SECURITY_LEVERS: UniversalSecurityLever[] = [
  {
    id: 1,
    gates: 'G1 • Escopo',
    color: '#00ff88',
    title: {
      pt: 'Lista de Tarefas (Sem Chave Mestra)',
      en: 'Task Allowlist (No Master Key)',
    },
    desc: {
      pt: 'Kids: O robô só pode mexer nos arquivos autorizados da missão! Senior: Capability allowlist + scope_hash por repositório sem wildcard ["*"].',
      en: 'Kids: Robot only touches authorized mission files! Senior: Per-repo capability allowlist + scope_hash without wildcard ["*"].',
    },
  },
  {
    id: 2,
    gates: 'G2 • Broker',
    color: '#ffd700',
    title: {
      pt: 'Guardião Separado (Non-Root → UDS)',
      en: 'Isolated Guardian (Non-Root → UDS)',
    },
    desc: {
      pt: 'Kids: O ajudante pede permissão pelo tubo secreto do castelo! Senior: Agente non-root conversa via Unix socket (/run/vuc/broker.sock) com broker mínimo.',
      en: 'Kids: Helper asks permission through the castle secret pipe! Senior: Non-root agent talks via UDS to minimal broker.',
    },
  },
  {
    id: 3,
    gates: 'G3 • Prova',
    color: '#a78bfa',
    title: {
      pt: 'Carimbo Mágico Ed25519',
      en: 'Magic Stamp Ed25519',
    },
    desc: {
      pt: 'Kids: Selo real impossível de falsificar no recibo da missão! Senior: RFC 8785 JCS canonicalization + Ed25519 signature sobre payload_hash e output_hash.',
      en: 'Kids: Unforgeable royal seal on the mission receipt! Senior: RFC 8785 JCS + Ed25519 signature over payload_hash and output_hash.',
    },
  },
  {
    id: 4,
    gates: 'G4 • Verificador',
    color: '#5eead4',
    title: {
      pt: 'Inspetor Independente (S0 Trust Store)',
      en: 'Independent Inspector (S0 Trust Store)',
    },
    desc: {
      pt: 'Kids: Outro guardião confere o recibo com a Chave do Rei antes de abrir! Senior: Verificador isolado resolve key_id na Trust Store S0 (rejeita embeddedPublicKey).',
      en: 'Kids: Another guardian checks the receipt with the King Key before opening! Senior: Isolated verifier resolves key_id from S0 Trust Store.',
    },
  },
  {
    id: 5,
    gates: 'G5 • Limites',
    color: '#f472b6',
    title: {
      pt: 'Mochila Leve & Tempo Contado',
      en: 'Light Backpack & Bounded Time',
    },
    desc: {
      pt: 'Kids: Não deixa o robô travar o castelo nem gastar toda a energia! Senior: cgroups v2, timeout estrito, no-new-privileges, PrivateTmp.',
      en: 'Kids: Never lets the robot freeze the castle! Senior: cgroups v2, strict timeout, no-new-privileges, PrivateTmp.',
    },
  },
  {
    id: 6,
    gates: 'G6 • Higiene',
    color: '#fb923c',
    title: {
      pt: 'Mochila Limpa & Lacre Intacto',
      en: 'Clean Backpack & Intact Seal',
    },
    desc: {
      pt: 'Kids: Sem lixo (__pycache__) na mochila e sem trocar o pacote depois do lacre! Senior: Rejeita mutação pós-aprovação e artefatos sujos no pacote.',
      en: 'Kids: No __pycache__ trash in the backpack and no post-seal tampering! Senior: Blocks post-approval payload mutation and dirty build artifacts.',
    },
  },
];

export const UNIVERSAL_ARENA_I18N = {
  pt: {
    title: 'VUC Universal Governance Arena',
    subtitle: 'Governança & Criptografia para QUALQUER Repositório GitHub via VUC Connector',
    repoPlaceholder: 'Digite qualquer repo: owner/repo ou URL do GitHub',
    loadRepo: 'Inspecionar via Conector',
    presets: 'Repositórios Populares:',
    modeKids: 'Kids',
    modeSenior: 'Senior',
    modeSplit: 'Split',
    modeGates: '8 Portões (Jogo)',
    modeWorkbench: 'CI/CD Workbench',
    towersTitle: 'Fortaleza de Governança (Qualquer Repo)',
    mainTower: 'Torre Principal',
    prTower: 'Torre de Proposta',
    protected: 'PROTEGIDA',
    vulnerable: 'VULNERÁVEL',
    ready: 'PRONTO',
    testing: 'EM TESTE',
    blocked: 'BLOQUEADO',
    noPrs: 'Nenhum PR aberto neste repositório — apenas a Torre Principal está ativa!',
    simTitle: 'Simulador Interativo: 6 Alavancas de Segurança',
    simSub: 'Desligue qualquer alavanca para ver como o repositório fica vulnerável e audite no Gateway VUC',
    allOn: 'Ligar Todas',
    testFail: 'Testar Falha',
    auditLevers: 'Auditar no Gateway VUC',
    architecture: 'Fluxo Universal VUC (Non-Root → UDS Broker → Ed25519)',
    install: 'Instalação Rápida (Qualquer Repo)',
    verify: 'Verificar Este Repositório via VUC CLI',
    stars: 'Stars',
    forks: 'Forks',
    issues: 'Issues',
    watchers: 'Watchers',
    defaultBranch: 'Branch Principal',
    lastCommit: 'Último Commit',
    workflows: 'GitHub Actions / Workflows',
    languages: 'Linguagens',
    lever: 'Alavanca',
    connectorBadge: 'CONECTOR VUC ATIVO',
    sendToVerifier: 'Conferir Prova no Verificador Independente',
  },
  en: {
    title: 'VUC Universal Governance Arena',
    subtitle: 'Governance & Cryptography for ANY GitHub Repository via VUC Connector',
    repoPlaceholder: 'Enter any repo: owner/repo or GitHub URL',
    loadRepo: 'Inspect via Connector',
    presets: 'Popular Repositories:',
    modeKids: 'Kids',
    modeSenior: 'Senior',
    modeSplit: 'Split',
    modeGates: '8 Gates (Game)',
    modeWorkbench: 'CI/CD Workbench',
    towersTitle: 'Governance Fortress (Any Repo)',
    mainTower: 'Main Tower',
    prTower: 'Proposal Tower',
    protected: 'PROTECTED',
    vulnerable: 'VULNERABLE',
    ready: 'READY',
    testing: 'TESTING',
    blocked: 'BLOCKED',
    noPrs: 'No open PRs in this repository — only Main Tower is active!',
    simTitle: 'Interactive Simulator: 6 Security Levers',
    simSub: 'Turn off any lever to see how the repository becomes vulnerable and audit in VUC Gateway',
    allOn: 'Turn All On',
    testFail: 'Test Failure',
    auditLevers: 'Audit in VUC Gateway',
    architecture: 'VUC Universal Flow (Non-Root → UDS Broker → Ed25519)',
    install: 'Quick Install (Any Repo)',
    verify: 'Verify This Repository via VUC CLI',
    stars: 'Stars',
    forks: 'Forks',
    issues: 'Issues',
    watchers: 'Watchers',
    defaultBranch: 'Default Branch',
    lastCommit: 'Latest Commit',
    workflows: 'GitHub Actions / Workflows',
    languages: 'Languages',
    lever: 'Lever',
    connectorBadge: 'VUC CONNECTOR ACTIVE',
    sendToVerifier: 'Verify Proof in Independent Verifier',
  },
};

