"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Trophy, ArrowLeft, Play, Sparkles, User, RefreshCw, Flag, Flame, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveParticipant } from "@/lib/use-active-participant";
import { toast } from "sonner";

const HORSES = [
  { id: 1, name: "#1 Cerveja 🍺", color: "from-amber-500 to-yellow-400" },
  { id: 2, name: "#2 Vinho 🍷", color: "from-red-600 to-rose-400" },
  { id: 3, name: "#3 Whisky 🥃", color: "from-amber-700 to-orange-500" },
  { id: 4, name: "#4 Shots 🍸", color: "from-emerald-500 to-teal-400" },
];

export default function HorseRacePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;
  const { currentParticipant } = useActiveParticipant(partyId);

  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horseNumber, setHorseNumber] = useState("1");
  const [amount, setAmount] = useState(1);

  // Physical 2D Race positions (0% to 100%)
  const [horsePositions, setHorsePositions] = useState<number[]>([0, 0, 0, 0]);
  const [horseStatuses, setHorseStatuses] = useState<string[]>(["", "", "", ""]);
  const [racing, setRacing] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const resRace = await fetch(`/api/parties/${partyId}/games/horse-race`);
      const dataRace = await resRace.json();
      if (dataRace.currentRace) {
        setCurrentRace(dataRace.currentRace);
        if (dataRace.currentRace.status === "finished") {
          setWinner(dataRace.currentRace.winnerHorse);
          setHorsePositions([90, 90, 90, 90]);
        }
      }
    } catch (e) {
      toast.error("Erro ao carregar corrida");
    }
  };

  useEffect(() => {
    loadData();
  }, [partyId]);

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

      toast.success(`Aposta registada como ${currentName}! 🐎`);
      loadData();
    } catch (e) {
      toast.error("Erro ao apostar");
    }
  };

  const handleStartRace = async () => {
    if (!currentRace) return;
    setRacing(true);
    setWinner(null);
    setHorsePositions([0, 0, 0, 0]);
    setHorseStatuses(["", "", "", ""]);

    try {
      const res = await fetch(`/api/parties/${partyId}/games/horse-race`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_race",
          raceId: currentRace.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao iniciar corrida");
        setRacing(false);
        return;
      }

      const winningHorse = data.winningHorse;

      // Long Suspenseful Race (~9 seconds) with forward & backward moves!
      let positions = [0, 0, 0, 0];
      let stepCount = 0;

      const interval = setInterval(() => {
        stepCount++;
        const statuses = ["", "", "", ""];

        positions = positions.map((pos, idx) => {
          if (pos >= 90) return 90;

          // Random event: Turbo forward, normal step, or stumble backward!
          const rand = Math.random();
          let delta = 0;

          if (rand < 0.18 && pos > 5 && stepCount < 40) {
            // Stumble & move BACKWARD!
            delta = -Math.random() * 3 - 1;
            statuses[idx] = "⚠️ Tropeçou! (-)";
          } else if (rand > 0.75) {
            // Turbo Burst!
            delta = Math.random() * 4 + 2.5;
            statuses[idx] = "⚡ TURBO!";
          } else {
            // Normal step
            delta = Math.random() * 2 + 0.8;
          }

          // Winner boost in the second half of the race
          if (idx + 1 === winningHorse && stepCount > 25) {
            delta += Math.random() * 2 + 1;
          }

          return Math.max(0, Math.min(90, pos + delta));
        });

        setHorsePositions([...positions]);
        setHorseStatuses(statuses);

        // Finish condition
        if (positions[winningHorse - 1] >= 90 || stepCount >= 60) {
          clearInterval(interval);
          setHorsePositions(positions.map((p, i) => (i + 1 === winningHorse ? 90 : Math.min(85, p))));
          setRacing(false);
          setWinner(winningHorse);
          toast.success(`🎉 O Cavalo #${winningHorse} venceu a corrida! Penáltis distribuídos!`);
          loadData();
        }
      }, 150);
    } catch (e) {
      setRacing(false);
      toast.error("Erro ao iniciar corrida");
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
        setWinner(null);
        setHorsePositions([0, 0, 0, 0]);
        setHorseStatuses(["", "", "", ""]);
        toast.success("Nova corrida aberta para apostas!");
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
              <Trophy className="w-6 h-6 text-amber-500" /> Corrida Física de 4 Cavalos (Com Emoção!)
            </h1>
            <p className="text-muted-foreground text-xs">
              Sessão como <span className="font-bold text-foreground">{currentName}</span>. Corrida longa com ultrapassagens e tropeções em direto!
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleNewRace} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Nova Corrida
        </Button>
      </div>

      {/* 2D PHYSICAL TURF RACE TRACK WITH DRAMA */}
      <Card className="border-amber-500/40 shadow-2xl overflow-hidden bg-emerald-950 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3 text-white">
          <div className="font-extrabold text-lg flex items-center gap-2 text-emerald-400">
            <Flag className="w-5 h-5 text-red-500" /> Hipódromo da Festa (4 Faixas de Relva)
          </div>
          {currentRace?.status === "betting" && (
            <Button onClick={handleStartRace} disabled={racing} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black gap-2 shadow-lg">
              <Play className="w-4 h-4 fill-slate-950" />
              {racing ? "CORRIDA EM CURSO... 🐎" : "DAR ORDEM DE PARTIDA! 🐎"}
            </Button>
          )}
        </div>

        {/* 4 Lanes Turf */}
        <div className="space-y-4 relative py-2 min-h-[320px]">
          {HORSES.map((h, idx) => {
            const pos = horsePositions[idx] || 0;
            const statusText = horseStatuses[idx] || "";
            const isWinner = winner === h.id;

            return (
              <div key={h.id} className="relative h-16 bg-emerald-900/90 rounded-xl border-2 border-emerald-700/60 overflow-hidden shadow-inner flex items-center px-4">
                {/* Lane Number & Name */}
                <div className="z-10 font-black text-xs text-white bg-black/70 px-3 py-1 rounded-md shrink-0 mr-4 border border-white/20 flex items-center gap-2">
                  <span>{h.name}</span>
                  {isWinner && <span className="text-amber-400">🏆 VENCEDOR!</span>}
                  {statusText && !isWinner && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded animate-pulse">
                      {statusText}
                    </span>
                  )}
                </div>

                {/* Distance Meter */}
                <div className="z-10 text-[10px] font-mono font-bold text-emerald-300 mr-2">
                  {Math.round(pos * 1.1)}m
                </div>

                {/* Physical Horse Sprite Galloping */}
                <div
                  className="absolute transition-all duration-150 flex items-center gap-1 z-20"
                  style={{ left: `${Math.max(16, pos)}%` }}
                >
                  <div className={`p-2.5 rounded-full bg-gradient-to-r ${h.color} shadow-2xl text-2xl border-2 border-white ${racing ? "animate-bounce" : ""}`}>
                    🏇
                  </div>
                </div>

                {/* Goal Finish Line Banner */}
                <div className="absolute right-0 top-0 bottom-0 w-14 bg-red-600/90 border-l-4 border-dashed border-white flex items-center justify-center text-xs font-black text-white z-10 shadow-lg">
                  🏁 GOAL
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Betting Form & Active Bets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Fazer Aposta na Corrida</CardTitle>
            <CardDescription>
              Apostador: <span className="font-bold text-foreground">{currentName}</span>. Mínimo 0.5 penáltis.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePlaceBet}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Seleciona o Cavalo (1 a 4)</Label>
                <Select value={horseNumber} onValueChange={(v) => setHorseNumber(v || "1")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolhe um cavalo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {HORSES.map((h) => (
                      <SelectItem key={h.id} value={h.id.toString()}>
                        {h.name}
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
                <Sparkles className="w-4 h-4" /> Apostar como {currentName}! 🐎
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
                    <span className="text-xs bg-muted px-2 py-1 rounded">Cavalo #{b.horseNumber}</span>
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
