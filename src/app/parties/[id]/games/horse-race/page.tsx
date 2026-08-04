"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Trophy, ArrowLeft, Play, Sparkles, User, RefreshCw, Flag, Flame, Layers, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveParticipant } from "@/lib/use-active-participant";
import { toast } from "sonner";

const SUITS = [
  { id: 1, name: "Ás de Espadas ♠️", symbol: "♠️", color: "text-slate-900", bg: "bg-slate-900" },
  { id: 2, name: "Ás de Ouros ♦️", symbol: "♦️", color: "text-red-600", bg: "bg-red-600" },
  { id: 3, name: "Ás de Paus ♣️", symbol: "♣️", color: "text-slate-900", bg: "bg-slate-900" },
  { id: 4, name: "Ás de Copas ♥️", symbol: "♥️", color: "text-red-600", bg: "bg-red-600" },
];

const TRACK_STEPS = 10; // 10 steps to win

export default function HorseRacePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;
  const { currentParticipant } = useActiveParticipant(partyId);

  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horseNumber, setHorseNumber] = useState("1");
  const [amount, setAmount] = useState(1);

  // Positions of 4 Aces (0 to 10)
  const [positions, setPositions] = useState<number[]>([0, 0, 0, 0]);
  
  // Track obstacle cards for each row (10 rows)
  const [sideCards, setSideCards] = useState<{ suitIdx: number; flipped: boolean }[]>([]);
  const [drawnCard, setDrawnCard] = useState<{ suitIdx: number; name: string } | null>(null);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const resRace = await fetch(`/api/parties/${partyId}/games/horse-race`);
      const dataRace = await resRace.json();
      if (dataRace.currentRace) {
        setCurrentRace(dataRace.currentRace);
        if (dataRace.currentRace.status === "finished") {
          setWinner(dataRace.currentRace.winnerHorse);
          setPositions([10, 10, 10, 10]);
        }
      }
    } catch (e) {
      toast.error("Erro ao carregar corrida de cartas");
    }
  };

  useEffect(() => {
    loadData();
    initTrackCards();
  }, [partyId]);

  const initTrackCards = () => {
    // Generate 10 hidden side cards randomly from 4 suits
    const cards = Array.from({ length: TRACK_STEPS }, () => ({
      suitIdx: Math.floor(Math.random() * 4),
      flipped: false,
    }));
    setSideCards(cards);
    setPositions([0, 0, 0, 0]);
    setWinner(null);
    setDrawnCard(null);
  };

  const activeParticipantId = currentParticipant?.participantId;
  const currentName = currentParticipant?.name || "Utilizador";

  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParticipantId || !currentRace) {
      toast.error("Erro ao identificar o teu utilizador para apostar");
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
    } catch (e) {
      toast.error("Erro ao apostar");
    }
  };

  // Draw 1 single card step
  const drawNextCard = (currentPos: number[], currentSide: { suitIdx: number; flipped: boolean }[]) => {
    if (winner) return { newPos: currentPos, newSide: currentSide, newWinner: winner };

    // Pick random suit (0..3) to move forward 1 step
    const suitIdx = Math.floor(Math.random() * 4);
    const suitObj = SUITS[suitIdx];

    const newPos = [...currentPos];
    newPos[suitIdx] = Math.min(TRACK_STEPS, newPos[suitIdx] + 1);

    setDrawnCard({ suitIdx, name: suitObj.name });

    // Check if ALL 4 Aces have passed a row that hasn't been flipped yet!
    const minPos = Math.min(...newPos);
    const newSide = [...currentSide];

    if (minPos > 0 && minPos <= TRACK_STEPS) {
      const rowToFlip = minPos - 1;
      if (newSide[rowToFlip] && !newSide[rowToFlip].flipped) {
        newSide[rowToFlip].flipped = true;
        const penalizeSuit = newSide[rowToFlip].suitIdx;
        
        // THAT SUIT MOVES BACKWARDS 1 STEP!
        newPos[penalizeSuit] = Math.max(0, newPos[penalizeSuit] - 1);
        toast.error(`⚠️ Carta da Pista Virada! ${SUITS[penalizeSuit].name} RECUOU 1 PASSO! ⏪`);
      }
    }

    // Check if any Ace reached 10
    let newWinner = null;
    for (let i = 0; i < 4; i++) {
      if (newPos[i] >= TRACK_STEPS) {
        newWinner = i + 1;
        break;
      }
    }

    return { newPos, newSide, newWinner };
  };

  // Manual Draw Click
  const handleManualDraw = () => {
    if (winner || !currentRace) return;

    const { newPos, newSide, newWinner } = drawNextCard(positions, sideCards);
    setPositions(newPos);
    setSideCards(newSide);

    if (newWinner) {
      finishRace(newWinner);
    }
  };

  // Auto Play Mode
  const handleAutoPlay = () => {
    if (winner || !currentRace) return;
    setAutoPlaying(true);

    let pos = [...positions];
    let side = [...sideCards];

    const interval = setInterval(() => {
      const res = drawNextCard(pos, side);
      pos = res.newPos;
      side = res.newSide;
      setPositions([...pos]);
      setSideCards([...side]);

      if (res.newWinner) {
        clearInterval(interval);
        setAutoPlaying(false);
        finishRace(res.newWinner);
      }
    }, 500);
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
          raceId: currentRace.id,
          winningHorse,
        }),
      });
      loadData();
    } catch (e) {
      console.error("Error finishing race:", e);
    }
  };

  const handleNewRace = async () => {
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
        toast.success("Nova Corrida de Áses aberta para apostas!");
      }
    } catch (e) {
      toast.error("Erro ao criar nova corrida");
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
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
              Sessão como <span className="font-bold text-foreground">{currentName}</span>. Cartas da pista viram-se e fazem recuar os Áses!
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleNewRace} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Nova Corrida
        </Button>
      </div>

      {/* TRACK BOARD WITH CARDS & 4 ACES */}
      <Card className="border-amber-500/40 shadow-2xl overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 space-y-6 text-white">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="font-black text-lg text-amber-400 flex items-center gap-2">
              <Layers className="w-5 h-5" /> Pista dos 4 Áses (10 Passos)
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Cada carta tirada avança o Ás. Quando todos passam uma fila, a carta virada faz o respetivo Ás recuar 1 passo!
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleManualDraw}
              disabled={autoPlaying || !!winner || currentRace?.status === "finished"}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5"
            >
              <Eye className="w-4 h-4" /> Tirar Carta 🃏
            </Button>

            <Button
              onClick={handleAutoPlay}
              disabled={autoPlaying || !!winner || currentRace?.status === "finished"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
            >
              <Play className="w-4 h-4 fill-white" /> {autoPlaying ? "A correr..." : "Modo Automático ⚡"}
            </Button>
          </div>
        </div>

        {/* Drawn Card Center Indicator */}
        {drawnCard && (
          <div className="flex items-center justify-center gap-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-center animate-in zoom-in-95">
            <span className="text-xs text-slate-400">Última Carta Tirada do Baralho:</span>
            <span className={`font-black text-base px-3 py-1 bg-white rounded-md shadow ${SUITS[drawnCard.suitIdx].color}`}>
              {drawnCard.name}
            </span>
          </div>
        )}

        {/* 4 Aces Track Lanes */}
        <div className="space-y-4 py-2">
          {SUITS.map((s, idx) => {
            const pos = positions[idx] || 0;
            const isWinner = winner === s.id;
            const pct = (pos / TRACK_STEPS) * 100;

            return (
              <div key={s.id} className="space-y-1">
                <div className="flex justify-between text-xs font-bold px-1">
                  <span className={s.color}>{s.name}</span>
                  <span className="text-slate-400">Passo {pos}/10 {isWinner ? "🏆 VENCEDOR!" : ""}</span>
                </div>

                <div className="relative h-14 bg-slate-900 rounded-xl border-2 border-slate-700/80 flex items-center px-2 overflow-hidden shadow-inner">
                  {/* Step Grids */}
                  <div className="absolute inset-0 grid grid-cols-10 border-slate-800/50">
                    {Array.from({ length: 10 }).map((_, stepIdx) => {
                      const sideCard = sideCards[stepIdx];
                      return (
                        <div key={stepIdx} className="border-r border-slate-800/60 flex items-center justify-center relative">
                          {sideCard?.flipped && (
                            <span className="text-[10px] opacity-40 font-bold">
                              {SUITS[sideCard.suitIdx].symbol}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Physical Ace Playing Card Moving */}
                  <div
                    className="absolute transition-all duration-300 z-20 flex items-center"
                    style={{ left: `${Math.max(2, (pos / TRACK_STEPS) * 88)}%` }}
                  >
                    <div className={`w-10 h-12 bg-white rounded-lg border-2 border-slate-950 shadow-2xl flex flex-col items-center justify-center font-black text-sm ${s.color} ring-2 ring-amber-400/50`}>
                      <span>A</span>
                      <span className="text-[10px] -mt-1">{s.symbol}</span>
                    </div>
                  </div>

                  {/* Goal Finish Line */}
                  <div className="absolute right-0 top-0 bottom-0 w-10 bg-red-600/90 border-l-2 border-dashed border-white flex items-center justify-center text-[10px] font-black text-white z-10 shadow">
                    🏁
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Side Obstacle Cards Row Display */}
        <div className="border-t border-slate-800 pt-3">
          <div className="text-xs text-slate-400 font-bold mb-2 flex items-center gap-2">
            <span>🂠 Cartas de Obstáculo da Pista (Fazem recuar os Áses ao serem ultrapassadas):</span>
          </div>
          <div className="grid grid-cols-10 gap-1.5 text-center text-xs">
            {sideCards.map((sc, rowIdx) => (
              <div
                key={rowIdx}
                className={`h-12 rounded-lg border flex flex-col items-center justify-center font-bold transition-all ${
                  sc.flipped
                    ? "bg-white text-slate-950 border-amber-400 shadow"
                    : "bg-slate-800 text-slate-500 border-slate-700"
                }`}
              >
                <span className="text-[9px] opacity-60">#{rowIdx + 1}</span>
                <span className="text-sm">
                  {sc.flipped ? SUITS[sc.suitIdx].symbol : "🂠"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Betting Form & Active Bets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Fazer Aposta no Ás Vencedor</CardTitle>
            <CardDescription>
              Apostador: <span className="font-bold text-foreground">{currentName}</span>. Mínimo 0.5 penáltis.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePlaceBet}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Seleciona o Ás</Label>
                <Select value={horseNumber} onValueChange={(v) => setHorseNumber(v || "1")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolhe um Ás..." />
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
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                disabled={currentRace?.status !== "betting"}
              >
                <Sparkles className="w-4 h-4" /> Apostar como {currentName}! 🃏
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
              currentRace.bets.map((b: any) => (
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
