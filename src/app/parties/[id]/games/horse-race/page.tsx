"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { Trophy, ArrowLeft, Play, Sparkles, User, RefreshCw, Layers, Eye, ShieldAlert, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveParticipant } from "@/lib/use-active-participant";
import { toast } from "sonner";

const SUITS = [
  { id: 1, name: "Ás de Espadas ♠️", symbol: "♠️", color: "text-slate-900", isRed: false },
  { id: 2, name: "Ás de Ouros ♦️", symbol: "♦️", color: "text-red-600", isRed: true },
  { id: 3, name: "Ás de Paus ♣️", symbol: "♣️", color: "text-slate-900", isRed: false },
  { id: 4, name: "Ás de Copas ♥️", symbol: "♥️", color: "text-red-600", isRed: true },
];

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const TRACK_STEPS = 12;

interface TrackCard {
  suitIdx: number;
  rank: string;
  flipped: boolean;
}

interface DrawnCardInfo {
  suitIdx: number;
  rank: string;
  symbol: string;
  isRed: boolean;
}

interface RaceBet {
  id: string;
  horseNumber: number;
  amount: number;
  participant?: {
    name: string;
  };
}

interface RaceData {
  id: string;
  status: string;
  winnerHorse?: number;
  bets?: RaceBet[];
}

export default function HorseRacePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;
  const { currentParticipant } = useActiveParticipant(partyId);

  const [currentRace, setCurrentRace] = useState<RaceData | null>(null);
  const [horseNumber, setHorseNumber] = useState("1");
  const [amount, setAmount] = useState(1);

  // Positions of 4 Aces (0 to 12)
  const [positions, setPositions] = useState<number[]>([0, 0, 0, 0]);

  // 12 Track obstacle cards (6 left, 6 right)
  const [leftColumnCards, setLeftColumnCards] = useState<TrackCard[]>([]);
  const [rightColumnCards, setRightColumnCards] = useState<TrackCard[]>([]);

  // Currently drawn card
  const [drawnCard, setDrawnCard] = useState<DrawnCardInfo | null>(null);
  const [isFlippingCard, setIsFlippingCard] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);

  const isManager = currentParticipant?.role === "manager";
  const activeParticipantId = currentParticipant?.participantId;
  const currentName = currentParticipant?.name || "Utilizador";

  const getRandomCard = useCallback((): TrackCard => ({
    suitIdx: Math.floor(Math.random() * 4),
    rank: RANKS[Math.floor(Math.random() * RANKS.length)],
    flipped: false,
  }), []);

  const initTrackCards = useCallback(() => {
    const left = Array.from({ length: 6 }, () => getRandomCard());
    const right = Array.from({ length: 6 }, () => getRandomCard());
    setLeftColumnCards(left);
    setRightColumnCards(right);
    setPositions([0, 0, 0, 0]);
    setWinner(null);
    setDrawnCard(null);
  }, [getRandomCard]);

  const loadData = useCallback(async () => {
    try {
      const resRace = await fetch(`/api/parties/${partyId}/games/horse-race`);
      const dataRace = await resRace.json();
      if (dataRace.currentRace) {
        setCurrentRace(dataRace.currentRace);
        if (dataRace.currentRace.status === "finished") {
          setWinner(dataRace.currentRace.winnerHorse);
          setPositions([12, 12, 12, 12]);
        }
      }
    } catch {
      toast.error("Erro ao carregar corrida de cartas");
    }
  }, [partyId]);

  useEffect(() => {
    loadData();
    initTrackCards();
  }, [loadData, initTrackCards]);

  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParticipantId || !currentRace) {
      toast.error("Erro ao identificar o teu utilizador para apostar");
      return;
    }
    if (currentRace.status !== "betting") {
      toast.error("As apostas já estão FECHADAS para esta corrida!");
      return;
    }

    try {
      const res = await fetch(`/api/parties/${partyId}/games/horse-race`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bet",
          raceId: currentRace.id,
          participantId: activeParticipantId,
          horseNumber: Number(horseNumber),
          amount: Number(amount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao apostar");
        return;
      }

      toast.success(`Aposta registada como ${currentName}! 🃏`);
      loadData();
    } catch {
      toast.error("Erro ao apostar");
    }
  };

  const lockBetsIfNeeded = async () => {
    if (currentRace && currentRace.status === "betting") {
      try {
        await fetch(`/api/parties/${partyId}/games/horse-race`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "lock_bets", raceId: currentRace.id }),
        });
        setCurrentRace({ ...currentRace, status: "racing" });
      } catch (err) {
        console.error("Error locking bets:", err);
      }
    }
  };

  const drawNextCardStep = (
    currentPos: number[],
    currentLeft: TrackCard[],
    currentRight: TrackCard[]
  ) => {
    if (winner) return { newPos: currentPos, newLeft: currentLeft, newRight: currentRight, newWinner: winner };

    const suitIdx = Math.floor(Math.random() * 4);
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const suitObj = SUITS[suitIdx];

    const newPos = [...currentPos];
    newPos[suitIdx] = Math.min(TRACK_STEPS, newPos[suitIdx] + 1);

    setDrawnCard({
      suitIdx,
      rank,
      symbol: suitObj.symbol,
      isRed: suitObj.isRed,
    });

    const minPos = Math.min(...newPos);
    const newLeft = [...currentLeft];
    const newRight = [...currentRight];

    if (minPos > 0 && minPos <= TRACK_STEPS) {
      const stepIdx = minPos - 1;

      if (stepIdx < 6) {
        if (newLeft[stepIdx] && !newLeft[stepIdx].flipped) {
          newLeft[stepIdx].flipped = true;
          const penalizeSuit = newLeft[stepIdx].suitIdx;
          newPos[penalizeSuit] = Math.max(0, newPos[penalizeSuit] - 1);
          toast.error(`⚠️ Carta da Esquerda (${newLeft[stepIdx].rank}${SUITS[penalizeSuit].symbol}) virou! ${SUITS[penalizeSuit].name} RECUOU 1 PASSO! ⏪`);
        }
      } else {
        const rightIdx = stepIdx - 6;
        if (newRight[rightIdx] && !newRight[rightIdx].flipped) {
          newRight[rightIdx].flipped = true;
          const penalizeSuit = newRight[rightIdx].suitIdx;
          newPos[penalizeSuit] = Math.max(0, newPos[penalizeSuit] - 1);
          toast.error(`⚠️ Carta da Direita (${newRight[rightIdx].rank}${SUITS[penalizeSuit].symbol}) virou! ${SUITS[penalizeSuit].name} RECUOU 1 PASSO! ⏪`);
        }
      }
    }

    let newWinner = null;
    for (let i = 0; i < 4; i++) {
      if (newPos[i] >= TRACK_STEPS) {
        newWinner = i + 1;
        break;
      }
    }

    return { newPos, newLeft, newRight, newWinner };
  };

  const handleManualDraw = async () => {
    if (!isManager) {
      toast.error("Apenas a conta de Gestor tem autorização para dar ordem de partida e virar cartas!");
      return;
    }
    if (winner || !currentRace) return;
    await lockBetsIfNeeded();
    setIsFlippingCard(true);

    setTimeout(() => {
      const { newPos, newLeft, newRight, newWinner } = drawNextCardStep(positions, leftColumnCards, rightColumnCards);
      setPositions(newPos);
      setLeftColumnCards(newLeft);
      setRightColumnCards(newRight);
      setIsFlippingCard(false);

      if (newWinner) {
        finishRace(newWinner);
      }
    }, 250);
  };

  const handleAutoPlay = async () => {
    if (!isManager) {
      toast.error("Apenas a conta de Gestor tem autorização para iniciar o Modo Automático!");
      return;
    }
    if (winner || !currentRace) return;
    await lockBetsIfNeeded();
    setAutoPlaying(true);

    let pos = [...positions];
    let left = [...leftColumnCards];
    let right = [...rightColumnCards];

    const interval = setInterval(() => {
      setIsFlippingCard(true);
      const res = drawNextCardStep(pos, left, right);
      pos = res.newPos;
      left = res.newLeft;
      right = res.newRight;
      setPositions([...pos]);
      setLeftColumnCards([...left]);
      setRightColumnCards([...right]);

      setTimeout(() => setIsFlippingCard(false), 200);

      if (res.newWinner) {
        clearInterval(interval);
        setAutoPlaying(false);
        finishRace(res.newWinner);
      }
    }, 600);
  };

  const finishRace = async (winningHorse: number) => {
    setWinner(winningHorse);
    toast.success(`🎉 O ${SUITS[winningHorse - 1].name} VENCEU A CORRIDA! Penáltis distribuídos!`);

    try {
      await fetch(`/api/parties/${partyId}/games/horse-race`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "finish_race",
          raceId: currentRace?.id,
          winningHorse,
        }),
      });
      loadData();
    } catch (err) {
      console.error("Error finishing race:", err);
    }
  };

  const handleNewRace = async () => {
    if (!isManager) {
      toast.error("Apenas o Gestor pode criar novas corridas!");
      return;
    }
    try {
      const res = await fetch(`/api/parties/${partyId}/games/horse-race`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "new_race" }),
      });
      const data = await res.json();
      if (data.currentRace) {
        setCurrentRace(data.currentRace);
        initTrackCards();
        toast.success("Nova Corrida de Cartas aberta pelo Gestor!");
      }
    } catch {
      toast.error("Erro ao criar nova corrida");
    }
  };

  const isBettingClosed = currentRace?.status !== "betting";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/parties/${partyId}/games`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" /> Corrida dos 4 Áses (Baralho de Cartas)
            </h1>
            <p className="text-muted-foreground text-xs">
              Sessão como <span className="font-bold text-foreground">{currentName}</span> ({isManager ? "Gestor" : "Utilizador"}).
            </p>
          </div>
        </div>

        {isManager && (
          <Button variant="outline" size="sm" onClick={handleNewRace} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Nova Corrida (Gestor)
          </Button>
        )}
      </div>

      {/* TRACK BOARD */}
      <Card className="border-amber-500/40 shadow-2xl overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 space-y-6 text-white">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="font-black text-lg text-amber-400 flex items-center gap-2">
              <Layers className="w-5 h-5" /> Baralho de Cartas & 2 Colunas Laterais
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {isBettingClosed ? (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Apostas Fechadas (Corrida em Curso)
                </span>
              ) : (
                <span className="text-emerald-400 font-bold">🟢 Apostas Abertas! Aposta no teu Ás favorito.</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isManager ? (
              <>
                <Button
                  onClick={handleManualDraw}
                  disabled={autoPlaying || !!winner || currentRace?.status === "finished"}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-lg"
                >
                  <Eye className="w-4 h-4" /> Tirar Carta 🃏
                </Button>

                <Button
                  onClick={handleAutoPlay}
                  disabled={autoPlaying || !!winner || currentRace?.status === "finished"}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-lg"
                >
                  <Play className="w-4 h-4 fill-white" /> {autoPlaying ? "A correr..." : "Modo Automático ⚡"}
                </Button>
              </>
            ) : (
              <div className="text-xs font-bold bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-amber-500/30">
                <Lock className="w-3.5 h-3.5" /> A aguardar ordem de partida do Gestor...
              </div>
            )}
          </div>
        </div>

        {/* CENTER DECK & DRAWN PLAYING CARD ANIMATION STAGE */}
        <div className="flex items-center justify-center py-4 border-b border-slate-800/80">
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 h-24 rounded-xl bg-gradient-to-tr from-amber-700 via-amber-600 to-yellow-500 border-2 border-white shadow-2xl flex items-center justify-center font-black text-white text-xl">
                🂠
              </div>
              <span className="text-[10px] text-slate-400 font-bold">Baralho</span>
            </div>

            <div className="text-xl text-slate-500 font-black">➔</div>

            <div className="flex flex-col items-center gap-1 min-w-[90px]">
              {drawnCard ? (
                <div
                  className={`w-16 h-24 rounded-xl bg-white border-2 border-slate-900 shadow-2xl flex flex-col justify-between p-2 font-black transition-all transform ${
                    isFlippingCard ? "rotate-y-90 scale-95" : "scale-100"
                  }`}
                >
                  <div className={`text-xs ${drawnCard.isRed ? "text-red-600" : "text-slate-950"}`}>
                    {drawnCard.rank}
                  </div>
                  <div className={`text-2xl text-center ${drawnCard.isRed ? "text-red-600" : "text-slate-950"}`}>
                    {drawnCard.symbol}
                  </div>
                  <div className={`text-xs text-right ${drawnCard.isRed ? "text-red-600" : "text-slate-950"}`}>
                    {drawnCard.rank}
                  </div>
                </div>
              ) : (
                <div className="w-16 h-24 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500 text-center px-1">
                  Aguardar carta
                </div>
              )}
              <span className="text-[10px] text-amber-400 font-bold">Carta Revelada</span>
            </div>
          </div>
        </div>

        {/* MAIN BOARD */}
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Left Column (Rows 1..6) */}
          <div className="col-span-2 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 text-center">Coluna Esquerda</div>
            {leftColumnCards.map((card, idx) => (
              <div
                key={idx}
                className={`h-10 rounded-lg border flex items-center justify-between px-2 font-black transition-all ${
                  card.flipped
                    ? "bg-white text-slate-950 border-amber-400 shadow-md"
                    : "bg-slate-800 text-slate-500 border-slate-700"
                }`}
              >
                <span className="text-[9px] opacity-60">#{idx + 1}</span>
                {card.flipped ? (
                  <span className={`text-xs ${SUITS[card.suitIdx].color}`}>
                    {card.rank}{SUITS[card.suitIdx].symbol}
                  </span>
                ) : (
                  <span className="text-xs">🂠</span>
                )}
              </div>
            ))}
          </div>

          {/* Center: 4 Aces Track Lanes */}
          <div className="col-span-8 space-y-4">
            {SUITS.map((s, idx) => {
              const pos = positions[idx] || 0;
              const isWinner = winner === s.id;

              return (
                <div key={s.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold px-1">
                    <span className={s.color}>{s.name}</span>
                    <span className="text-slate-400">Passo {pos}/12 {isWinner ? "🏆 VENCEDOR!" : ""}</span>
                  </div>

                  <div className="relative h-14 bg-slate-900 rounded-xl border-2 border-slate-700/80 flex items-center px-2 overflow-hidden shadow-inner">
                    <div className="absolute inset-0 grid grid-cols-12 border-slate-800/50">
                      {Array.from({ length: 12 }).map((_, stepIdx) => (
                        <div key={stepIdx} className="border-r border-slate-800/60" />
                      ))}
                    </div>

                    <div
                      className="absolute transition-all duration-300 z-20 flex items-center"
                      style={{ left: `${Math.max(1, (pos / TRACK_STEPS) * 88)}%` }}
                    >
                      <div className={`w-9 h-11 bg-white rounded-lg border-2 border-slate-950 shadow-2xl flex flex-col items-center justify-center font-black text-xs ${s.color} ring-2 ring-amber-400/50`}>
                        <span>A</span>
                        <span className="text-[9px] -mt-1">{s.symbol}</span>
                      </div>
                    </div>

                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-red-600/90 border-l-2 border-dashed border-white flex items-center justify-center text-[10px] font-black text-white z-10 shadow">
                      🏁
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column (Rows 7..12) */}
          <div className="col-span-2 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 text-center">Coluna Direita</div>
            {rightColumnCards.map((card, idx) => (
              <div
                key={idx}
                className={`h-10 rounded-lg border flex items-center justify-between px-2 font-black transition-all ${
                  card.flipped
                    ? "bg-white text-slate-950 border-amber-400 shadow-md"
                    : "bg-slate-800 text-slate-500 border-slate-700"
                }`}
              >
                <span className="text-[9px] opacity-60">#{idx + 7}</span>
                {card.flipped ? (
                  <span className={`text-xs ${SUITS[card.suitIdx].color}`}>
                    {card.rank}{SUITS[card.suitIdx].symbol}
                  </span>
                ) : (
                  <span className="text-xs">🂠</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Betting Form & Active Bets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={`border-border/60 ${isBettingClosed ? "opacity-75" : ""}`}>
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-center">
              <span>Fazer Aposta no Ás Vencedor</span>
              {isBettingClosed && (
                <span className="text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full font-bold">
                  Apostas Fechadas
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Apostador: <span className="font-bold text-foreground">{currentName}</span>. Mínimo 0.5 penáltis.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePlaceBet}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Seleciona o Ás</Label>
                <Select
                  value={horseNumber}
                  onValueChange={(v) => setHorseNumber(v || "1")}
                  disabled={isBettingClosed}
                >
                  <SelectTrigger>
                    {SUITS.find((s) => s.id.toString() === horseNumber)?.name || <SelectValue placeholder="Escolhe um Ás..." />}
                  </SelectTrigger>
                  <SelectContent>
                    {SUITS.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade de Penáltis Apostados</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0.5)}
                  disabled={isBettingClosed}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                disabled={isBettingClosed}
              >
                <Sparkles className="w-4 h-4" /> {isBettingClosed ? "Apostas Fechadas" : `Apostar como ${currentName}! 🃏`}
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Current Race Bets */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" />
              Apostas nesta Corrida ({currentRace?.bets?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!currentRace?.bets || currentRace.bets.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">Ainda não há apostas nesta corrida.</div>
            ) : (
              currentRace.bets.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg bg-card text-sm">
                  <div className="font-semibold">{b.participant?.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-muted px-2 py-1 rounded font-bold">
                      {SUITS[b.horseNumber - 1]?.symbol} {SUITS[b.horseNumber - 1]?.name}
                    </span>
                    <span className="font-bold text-amber-600">{b.amount} 🍺</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
