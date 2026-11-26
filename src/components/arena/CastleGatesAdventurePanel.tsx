import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  Lock,
  Unlock,
  ArrowRight,
  Wrench,
  Sparkles,
  RotateCcw,
  BookOpen,
  Key,
  Package,
} from 'lucide-react';
import type { ExecutionProof } from '../../vortex/types.js';
import {
  CASTLE_GATES_PUZZLES,
  CASTLE_TRANSLATION_TABLE,
  PATCH_SCENARIOS,
  playCastleSound,
  type ArenaLiveState,
  type PatchAuditResponse,
  type PatchScenarioPreset,
} from './arenaGameData.js';

const CASTLE_HERO_IMG = '/src/assets/images/castle_vuc_fortress_1791163014781.jpg';
const ROBOT_AVATAR_IMG = '/src/assets/images/robot_mission_repair_1791163025126.jpg';
const MAGIC_RECEIPT_IMG = '/src/assets/images/magic_royal_receipt_1791163041322.jpg';

type GameScreenState = 'TITLE_MENU' | 'PLAYING' | 'VICTORY';

interface CastleGatesAdventurePanelProps {
  liveState: ArenaLiveState | null;
  soundEnabled: boolean;
  selectedScenarioId: string;
  handleSelectScenario: (preset: PatchScenarioPreset) => void;
  handleQuickRepairCurrentPatch: () => void;
  executeArenaAudit: (chosenPrediction: 'PASS' | 'FAIL_CLOSED', forceClean?: boolean) => Promise<void>;
  isDeploying: boolean;
  lastAudit: PatchAuditResponse | null;
  clearedGates: number[];
  setClearedGates: React.Dispatch<React.SetStateAction<number[]>>;
  setArenaScore: React.Dispatch<React.SetStateAction<number>>;
  onSendToVerifier?: (proof: ExecutionProof) => void;
}

export const CastleGatesAdventurePanel: React.FC<CastleGatesAdventurePanelProps> = ({
  liveState,
  soundEnabled,
  selectedScenarioId,
  handleSelectScenario,
  handleQuickRepairCurrentPatch,
  executeArenaAudit,
  isDeploying,
  lastAudit,
  clearedGates,
  setClearedGates,
  setArenaScore,
  onSendToVerifier,
}) => {
  const [gameScreen, setGameScreen] = useState<GameScreenState>('TITLE_MENU');
  const [currentGateIndex, setCurrentGateIndex] = useState<number>(0);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [gateFeedback, setGateFeedback] = useState<{
    status: 'IDLE' | 'PASS' | 'FAIL';
    title: string;
    detail: string;
  }>({ status: 'IDLE', title: '', detail: '' });

  const [backpackItems, setBackpackItems] = useState<{
    tools: boolean;
    missionPackage: boolean;
    castleMap: boolean;
    wholeCastleDanger: boolean;
  }>({
    tools: true,
    missionPackage: true,
    castleMap: true,
    wholeCastleDanger: false,
  });

  const [showDictionary, setShowDictionary] = useState<boolean>(false);

  const handleStartAdventure = (preset?: PatchScenarioPreset) => {
    if (preset) {
      handleSelectScenario(preset);
    }
    playCastleSound('click', soundEnabled);
    setClearedGates([]);
    setCurrentGateIndex(0);
    setSelectedChoice(null);
    setGateFeedback({ status: 'IDLE', title: '', detail: '' });
    setBackpackItems({
      tools: true,
      missionPackage: true,
      castleMap: true,
      wholeCastleDanger: false,
    });
    setGameScreen('PLAYING');
  };

  const currentPuzzle = CASTLE_GATES_PUZZLES[currentGateIndex] || CASTLE_GATES_PUZZLES[0];
  const currentScenarioPreset =
    PATCH_SCENARIOS.find((p) => p.id === selectedScenarioId) || PATCH_SCENARIOS[0];

  const handleEvaluateGateChoice = (choice: 'A' | 'B') => {
    setSelectedChoice(choice);
    const pickedOption = choice === 'A' ? currentPuzzle.optionA : currentPuzzle.optionB;

    if (pickedOption.isSafe) {
      playCastleSound('gate_open', soundEnabled);
      setGateFeedback({
        status: 'PASS',
        title: currentPuzzle.passMessage,
        detail: currentPuzzle.passDetail,
      });
      setArenaScore((prev) => prev + 50);
      if (!clearedGates.includes(currentPuzzle.gateNumber)) {
        setClearedGates((prev) => [...prev, currentPuzzle.gateNumber]);
      }
    } else {
      playCastleSound('gate_blocked', soundEnabled);
      setGateFeedback({
        status: 'FAIL',
        title: currentPuzzle.failMessage,
        detail: currentPuzzle.failHint,
      });
    }
  };

  const handleConfirmBackpackGate2 = () => {
    if (backpackItems.wholeCastleDanger) {
      playCastleSound('gate_blocked', soundEnabled);
      setGateFeedback({
        status: 'FAIL',
        title: 'PERIGO! Essa mochila daria acesso a tudo.',
        detail:
          'O Guardião permite somente o pacote da missão (scoobiii/vuc). Desmarque "O castelo inteiro" para abrir o Portão 2!',
      });
      return;
    }
    if (!backpackItems.missionPackage || !backpackItems.tools) {
      playCastleSound('gate_blocked', soundEnabled);
      setGateFeedback({
        status: 'FAIL',
        title: 'Faltam ferramentas na mochila!',
        detail: 'Marque as Ferramentas e o Pacote da missão para o robô conseguir trabalhar.',
      });
      return;
    }

    playCastleSound('gate_open', soundEnabled);
    setGateFeedback({
      status: 'PASS',
      title: currentPuzzle.passMessage,
      detail: currentPuzzle.passDetail,
    });
    setArenaScore((prev) => prev + 50);
    if (!clearedGates.includes(2)) {
      setClearedGates((prev) => [...prev, 2]);
    }
  };

  const handleAdvanceToNextGate = async () => {
    playCastleSound('click', soundEnabled);
    if (currentGateIndex < CASTLE_GATES_PUZZLES.length - 1) {
      setCurrentGateIndex((prev) => prev + 1);
      setSelectedChoice(null);
      setGateFeedback({ status: 'IDLE', title: '', detail: '' });
    } else {
      handleQuickRepairCurrentPatch();
      await executeArenaAudit('PASS', true);
      playCastleSound('castle_victory', soundEnabled);
      setGameScreen('VICTORY');
    }
  };

  const handleJumpToGate = (index: number) => {
    playCastleSound('click', soundEnabled);
    setCurrentGateIndex(index);
    setSelectedChoice(null);
    setGateFeedback({ status: 'IDLE', title: '', detail: '' });
  };

  const pr68Data = liveState?.pull_requests.find((p) => p.number === 68) || null;

  return (
    <div className="space-y-8">
      {gameScreen !== 'TITLE_MENU' && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setGameScreen('TITLE_MENU')}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Voltar ao Início do Castelo</span>
          </button>
          <span className="text-xs font-mono text-emerald-400">
            {clearedGates.length}/8 portões destrancados
          </span>
        </div>
      )}

      {gameScreen === 'TITLE_MENU' && (
        <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/80 overflow-hidden shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>AVENTURA DOS 8 PORTÕES · CASTELO VUC</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-100 tracking-tight text-balance">
                  O Castelo VUC precisa proteger seus tesouros.
                </h2>

                <div className="space-y-3 text-base sm:text-lg text-zinc-200 leading-relaxed max-w-xl">
                  <p>
                    Existem <strong className="text-amber-400">8 portões</strong> guardados pelos vigias do castelo.
                  </p>
                  <p>Você recebeu uma missão:</p>
                  <div className="p-4 rounded-xl bg-zinc-950/90 border border-amber-500/40 text-amber-200 font-semibold flex items-center gap-3">
                    <Wrench className="w-6 h-6 text-amber-400 shrink-0" />
                    <span>Conserte o robô quebrado e faça ele passar pelos 8 portões.</span>
                  </div>
                  <p className="text-sm text-zinc-400">
                    Tem um castelo. Tem uma porta. Você tem um conserto. Tente abrir cada portão: se estiver seguro,
                    você avança! Se não, descubra o que está errado.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold text-zinc-300">
                  Escolha qual robô você quer ajudar a atravessar os 8 portões:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PATCH_SCENARIOS.map((preset) => {
                    const isSelected = selectedScenarioId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectScenario(preset)}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-zinc-100'
                            : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xs font-semibold text-amber-400 mb-1">{preset.code}</div>
                        <div className="text-xs font-semibold text-zinc-100 line-clamp-2 mb-1">
                          {preset.kidMissionTitle}
                        </div>
                        <div className="text-[11px] text-zinc-400 line-clamp-2">{preset.kidBrokenClue}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleStartAdventure()}
                  className="py-4 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-base sm:text-lg flex items-center gap-3 shadow-lg transition cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-5 h-5 fill-zinc-950 shrink-0" />
                  <span>JOGAR AGORA ({currentScenarioPreset.code})</span>
                </button>

                <span className="text-xs text-zinc-400">
                  Passe pelos 8 portões sem precisar saber nenhum código!
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 bg-zinc-950/80 border-t lg:border-t-0 lg:border-l border-zinc-800 p-6 flex flex-col justify-between gap-5">
              <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-video">
                <img
                  src={CASTLE_HERO_IMG}
                  alt="Ilustração do Castelo VUC com 8 portões iluminados"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-amber-300">As 8 Portas do Castelo VUC</div>
                    <div className="text-xs text-zinc-200">
                      Chave · Mochila · Lacre · Peça · Limpeza · Lei · Conserto · Recibo Mágico
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                <div className="text-xs font-semibold text-zinc-200 flex items-center justify-between">
                  <span>Como está o Castelo na Vida Real agora:</span>
                  <span className="text-emerald-400 font-mono">Ao Vivo</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-2">
                    <span className="text-zinc-200 font-medium">Missão 68 (Robô das Chaves)</span>
                    <span className="text-emerald-400 font-semibold whitespace-nowrap">
                      {pr68Data?.checks_summary.passed ?? 20}/{pr68Data?.checks_summary.total ?? 20} Guardiões · Entrou!
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-amber-500/30 flex items-center justify-between gap-2">
                    <span className="text-zinc-200 font-medium">Missão 67 (Robô na Oficina)</span>
                    <span className="text-amber-400 font-semibold whitespace-nowrap">
                      Precisa da sua ajuda!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameScreen === 'PLAYING' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-zinc-200">
                Mapa dos 8 Portões do Castelo ({currentScenarioPreset.kidMissionTitle})
              </span>
              <span className="text-zinc-400">
                Clique em qualquer portão para visitar ou avance um por um!
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {CASTLE_GATES_PUZZLES.map((g, idx) => {
                const isCurrent = idx === currentGateIndex;
                const isCleared = clearedGates.includes(g.gateNumber);
                return (
                  <button
                    key={g.gateNumber}
                    type="button"
                    onClick={() => handleJumpToGate(idx)}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500/20 border-amber-400 text-zinc-100'
                        : isCleared
                        ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px] font-semibold mb-0.5">
                      <span>Portão {g.gateNumber}</span>
                      {isCleared ? (
                        <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs font-medium truncate">
                      {g.title.replace(/^Portão \d+ — /, '')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-amber-500/40 bg-zinc-950 shrink-0">
                    <img
                      src={ROBOT_AVATAR_IMG}
                      alt="Robô da Missão"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-amber-400">{currentScenarioPreset.code}</div>
                    <div className="text-sm font-semibold text-zinc-100">
                      {currentScenarioPreset.kidMissionTitle}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">{currentScenarioPreset.kidMissionHook}</p>

                <div className="p-3.5 rounded-lg bg-zinc-950 border border-amber-500/30 space-y-1">
                  <div className="text-xs font-semibold text-amber-300">O Guardião do Portão diz:</div>
                  <p className="text-xs text-zinc-200 italic">&ldquo;{currentPuzzle.guardianQuote}&rdquo;</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 p-6 sm:p-8 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-4">
                <div>
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    Desafio {currentPuzzle.gateNumber} de 8
                  </div>
                  <h2 className="text-2xl font-semibold text-zinc-100 mt-0.5">{currentPuzzle.title}</h2>
                  <p className="text-sm text-zinc-400 mt-1">{currentPuzzle.subtitle}</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-300">
                  {clearedGates.includes(currentPuzzle.gateNumber) ? 'Portão Destrancado!' : 'Portão Trancado'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800/90 space-y-1.5">
                <div className="text-xs font-semibold text-indigo-300">{currentPuzzle.visualSceneTitle}</div>
                <p className="text-sm text-zinc-300 leading-relaxed">{currentPuzzle.visualSceneDescription}</p>
              </div>

              <div className="text-lg font-semibold text-zinc-100">{currentPuzzle.question}</div>

              {currentPuzzle.gateNumber === 2 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 flex items-start gap-3 cursor-pointer hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={backpackItems.tools}
                        onChange={(e) =>
                          setBackpackItems((prev) => ({ ...prev, tools: e.target.checked }))
                        }
                        className="mt-1 w-4 h-4 accent-emerald-500"
                      />
                      <div>
                        <div className="text-sm font-semibold text-zinc-100">Ferramentas de Conserto</div>
                        <div className="text-xs text-zinc-400">Chave de fenda e martelo seguro da oficina.</div>
                      </div>
                    </label>

                    <label className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 flex items-start gap-3 cursor-pointer hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={backpackItems.missionPackage}
                        onChange={(e) =>
                          setBackpackItems((prev) => ({ ...prev, missionPackage: e.target.checked }))
                        }
                        className="mt-1 w-4 h-4 accent-emerald-500"
                      />
                      <div>
                        <div className="text-sm font-semibold text-zinc-100">
                          Pacote da Missão (scoobiii/vuc)
                        </div>
                        <div className="text-xs text-zinc-400">Acesso somente à sala que precisa de conserto.</div>
                      </div>
                    </label>

                    <label className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 flex items-start gap-3 cursor-pointer hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={backpackItems.castleMap}
                        onChange={(e) =>
                          setBackpackItems((prev) => ({ ...prev, castleMap: e.target.checked }))
                        }
                        className="mt-1 w-4 h-4 accent-emerald-500"
                      />
                      <div>
                        <div className="text-sm font-semibold text-zinc-100">Mapa do Castelo</div>
                        <div className="text-xs text-zinc-400">Para o robô não se perder pelos corredores.</div>
                      </div>
                    </label>

                    <label
                      className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                        backpackItems.wholeCastleDanger
                          ? 'bg-rose-950/40 border-rose-500/80'
                          : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={backpackItems.wholeCastleDanger}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setBackpackItems((prev) => ({ ...prev, wholeCastleDanger: checked }));
                          if (checked) {
                            playCastleSound('gate_blocked', soundEnabled);
                            setGateFeedback({
                              status: 'FAIL',
                              title: 'PERIGO! Essa mochila daria acesso a tudo.',
                              detail:
                                'O Guardião permite somente o pacote da missão: scoobiii/vuc. Desmarque "O castelo inteiro"!',
                            });
                          } else {
                            setGateFeedback({ status: 'IDLE', title: '', detail: '' });
                          }
                        }}
                        className="mt-1 w-4 h-4 accent-rose-500"
                      />
                      <div>
                        <div className="text-sm font-semibold text-rose-300">O Castelo Inteiro</div>
                        <div className="text-xs text-zinc-400">
                          Pedir a chave-mestra de todas as salas e tesouros do reino!
                        </div>
                      </div>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmBackpackGate2}
                    className="py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm flex items-center gap-2 transition cursor-pointer shadow-md"
                  >
                    <Package className="w-4 h-4 shrink-0" />
                    <span>Mostrar Mochila para o Guardião do Portão 2</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleEvaluateGateChoice('A')}
                    className={`p-5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 ${
                      selectedChoice === 'A'
                        ? currentPuzzle.optionA.isSafe
                          ? 'bg-emerald-950/40 border-emerald-500 text-zinc-100'
                          : 'bg-rose-950/40 border-rose-500 text-zinc-100'
                        : 'bg-zinc-950/80 border-zinc-800 hover:border-amber-500/60 text-zinc-100'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-amber-400">ESCOLHA A</span>
                        <Key className="w-4 h-4 text-amber-400 shrink-0" />
                      </div>
                      <div className="text-base font-semibold text-zinc-100">{currentPuzzle.optionA.label}</div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{currentPuzzle.optionA.description}</p>
                    </div>
                    <div className="pt-2 border-t border-zinc-800/80 text-xs font-semibold text-amber-300 flex items-center gap-1">
                      <span>Escolher esta opção</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEvaluateGateChoice('B')}
                    className={`p-5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 ${
                      selectedChoice === 'B'
                        ? currentPuzzle.optionB.isSafe
                          ? 'bg-emerald-950/40 border-emerald-500 text-zinc-100'
                          : 'bg-rose-950/40 border-rose-500 text-zinc-100'
                        : 'bg-zinc-950/80 border-zinc-800 hover:border-amber-500/60 text-zinc-100'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-indigo-400">ESCOLHA B</span>
                        <Key className="w-4 h-4 text-indigo-400 shrink-0" />
                      </div>
                      <div className="text-base font-semibold text-zinc-100">{currentPuzzle.optionB.label}</div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{currentPuzzle.optionB.description}</p>
                    </div>
                    <div className="pt-2 border-t border-zinc-800/80 text-xs font-semibold text-indigo-300 flex items-center gap-1">
                      <span>Escolher esta opção</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>
              )}

              {gateFeedback.status !== 'IDLE' && (
                <div
                  className={`p-5 rounded-xl border space-y-3 ${
                    gateFeedback.status === 'PASS'
                      ? 'bg-emerald-950/40 border-emerald-600/80 text-emerald-100'
                      : 'bg-rose-950/40 border-rose-600/80 text-rose-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {gateFeedback.status === 'PASS' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="text-base font-semibold">{gateFeedback.title}</div>
                      <p className="text-sm text-zinc-200 leading-relaxed">
                        {gateFeedback.status === 'FAIL' ? `Dica: ${gateFeedback.detail}` : gateFeedback.detail}
                      </p>
                    </div>
                  </div>

                  {gateFeedback.status === 'PASS' && (
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={isDeploying}
                        onClick={handleAdvanceToNextGate}
                        className="py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm flex items-center gap-2 transition cursor-pointer shadow-md"
                      >
                        <span>
                          {currentGateIndex < CASTLE_GATES_PUZZLES.length - 1
                            ? `Avançar para o Portão ${currentPuzzle.gateNumber + 1}`
                            : 'Abrir o Castelo e Receber o Recibo Mágico!'}
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {gameScreen === 'VICTORY' && (
        <div className="p-6 sm:p-10 rounded-2xl bg-zinc-900/85 border border-emerald-500/50 space-y-8 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>MISSÃO CUMPRIDA · 8 DE 8 PORTÕES ABERTOS!</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-100 tracking-tight">
                Castelo Liberado! Você consertou o robô e passou pelos 8 guardiões!
              </h2>

              <p className="text-base text-zinc-300 leading-relaxed">
                O seu robô escolheu a <strong>Chave do Rei</strong>, levou só o <strong>Pacote da Missão</strong> na
                mochila, protegeu o <strong>Lacre Dourado</strong>, encaixou a <strong>Peça no lugar certo</strong>,
                limpou todo o <strong>Lixo escondido</strong> e entregou o <strong>Recibo Mágico</strong> sem nenhum
                rabisco!
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleStartAdventure()}
                  className="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm flex items-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>Jogar Outra Missão</span>
                </button>

                {lastAudit?.execution_proof && onSendToVerifier && (
                  <button
                    type="button"
                    onClick={() => onSendToVerifier(lastAudit.execution_proof!)}
                    className="py-3 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-semibold text-sm flex items-center gap-2 transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Levar Recibo Mágico ao Guardião Verificador</span>
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 p-5 rounded-xl bg-zinc-950/90 border border-amber-500/40 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-amber-500/40 bg-zinc-900 shrink-0">
                  <img
                    src={MAGIC_RECEIPT_IMG}
                    alt="Recibo Mágico Real"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-amber-400">RECIBO MÁGICO OFICIAL</div>
                  <div className="text-sm font-semibold text-zinc-100">
                    Prova Real de que a Missão Aconteceu
                  </div>
                  <div className="text-xs text-emerald-400">Carimbo Confirmado pelos 8 Guardiões</div>
                </div>
              </div>

              {lastAudit?.execution_proof && (
                <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block">Código do Recibo Mágico:</span>
                    <span className="text-zinc-200 break-all">{lastAudit.execution_proof.execution_id}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Chave do Rei Usada:</span>
                    <span className="text-emerald-400 break-all">{lastAudit.execution_proof.identity.key_id}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Lacre Matemático (Carimbo Real):</span>
                    <span className="text-amber-300 break-all">
                      {lastAudit.execution_proof.signature.slice(0, 44)}...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="pt-2">
        <button
          type="button"
          onClick={() => setShowDictionary((prev) => !prev)}
          className="px-4 py-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-2 cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {showDictionary
              ? 'Esconder Segredo dos Adultos (Tradução do Castelo)'
              : 'Curioso? Veja o que cada parte do Castelo significa no computador real'}
          </span>
        </button>

        {showDictionary && (
          <div className="mt-4 p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="text-xs font-semibold text-zinc-200">
              A Tradução do Castelo VUC (Como a brincadeira protege o sistema de verdade):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              {CASTLE_TRANSLATION_TABLE.map((item) => (
                <div
                  key={item.kidTerm}
                  className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-1"
                >
                  <div className="font-semibold text-amber-300">{item.kidTerm}</div>
                  <div className="font-mono text-[11px] text-indigo-300">{item.engineerTerm}</div>
                  <div className="text-zinc-400">{item.meaning}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
