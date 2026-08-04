"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Trophy, ArrowLeft, Play, Sparkles, User, RefreshCw, Flag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const HORSES = [
  { id: 1, name: "#1 Cerveja Turbo 🍺", color: "bg-amber-500" },
  { id: 2, name: "#2 Rebenta-Copos 🍷", color: "bg-red-500" },
  { id: 3, name: "#3 Whisky sem Gelo 🥃", color: "bg-yellow-600" },
  { id: 4, name: "#4 Vodka da Casa 🍸", color: "bg-cyan-500" },
  { id: 5, name: "#5 Gin Tónico 🍹", color: "bg-emerald-500" },
  { id: 6, name: "#6 Água de Torneira 💧", color: "bg-blue-500" },
];

export default function HorseRacePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;

  const [currentRace, setCurrentRace] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantId, setParticipantId] = useState("");
  const [horseNumber, setHorseNumber] = useState("1");
  const [amount, setAmount] = useState(1);

  // Animation states for the 6 horses (0 to 100%)
  const [horsePositions, setHorsePositions] = useState<number[]>([0, 0, 0, 0, 0, 0]);
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
          setHorsePositions([100, 100, 100, 100, 100, 100]);
        }
      }

      const resP = await fetch(`/api/parties/${partyId}/penalties`);
      const dataP = await resP.json();
      if (dataP.participants) setParticipants(dataP.participants);
    } catch (e) {
      toast.error("Erro ao carregar corrida");
    }
  };

  useEffect(() => {
    loadData();
  }, [partyId]);

  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantId || !currentRace) {
      toast.error("Seleciona quem és tu para apostar");
      return;
    }

    try {
      const res = await fetch(`/api/parties/${partyId}/games/horse-race`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bet",
          raceId: currentRace.id,
          participantId,
          horseNumber: Number(horseNumber),
          amount: Number(amount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao apostar");
        return;
      }

      toast.success("Aposta registada com sucesso! 🐎");
      loadData();
    } catch (e) {
      toast.error("Erro ao apostar");
    }
  };

  const handleStartRace = async () => {
    if (!currentRace) return;
    setRacing(true);
    setWinner(null);
    setHorsePositions([0, 0, 0, 0, 0, 0]);

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

      // Animate horse positions
      let positions = [0, 0, 0, 0, 0, 0];
      const interval = setInterval(() => {
        positions = positions.map((pos, idx) => {
          if (pos >= 100) return 100;
          // Winning horse gets slightly higher step boost
          const boost = idx + 1 === winningHorse ? Math.random() * 8 + 4 : Math.random() * 6 + 1;
          return Math.min(100, pos + boost);
        });

        setHorsePositions([...positions]);

        if (positions[winningHorse - 1] >= 100) {
          clearInterval(interval);
          setRacing(false);
          setWinner(winningHorse);
          toast.success(`🎉 O Cavalo #${winningHorse} venceu a corrida! Penáltis atribuídos!`);
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
        setHorsePositions([0, 0, 0, 0, 0, 0]);
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
              <Trophy className="w-6 h-6 text-amber-500" /> Corrida de Cavalos da Festa
            </h1>
            <p className="text-muted-foreground text-xs">
              Aposta no teu cavalo. O gestor dá a ordem de partida e a corrida acontece em tempo real!
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleNewRace} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Nova Corrida
        </Button>
      </div>

      {/* Race Track */}
      <Card className="border-border/60 shadow-xl bg-gradient-to-b from-card via-card to-muted/30 p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="font-bold text-lg flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" /> Pista de Corrida
          </div>
          {currentRace?.status === "betting" && (
            <Button onClick={handleStartRace} disabled={racing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
              <Play className="w-4 h-4 fill-white" />
              {racing ? "A CORRER..." : "DARR ORDEM DE PARTIDA! 🐎"}
            </Button>
          )}
        </div>

        {/* 6 Lanes */}
        <div className="space-y-4 pt-2">
          {HORSES.map((h, idx) => {
            const pos = horsePositions[idx] || 0;
            const isWinner = winner === h.id;

            return (
              <div key={h.id} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className={isWinner ? "text-amber-500 font-extrabold text-sm" : ""}>
                    {h.name} {isWinner ? "🏆 VENCEDOR!" : ""}
                  </span>
                  <span>{Math.round(pos)}%</span>
                </div>
                <div className="relative h-8 bg-muted/60 rounded-full overflow-hidden border">
                  <div
                    className={`h-full transition-all duration-150 rounded-full flex items-center justify-end pr-2 text-xs font-extrabold text-white ${h.color}`}
                    style={{ width: `${Math.max(5, pos)}%` }}
                  >
                    🐎
                  </div>
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
            <CardDescription>Mínimo 0.5 penáltis. Limite de saldo: -5.</CardDescription>
          </CardHeader>
          <form onSubmit={handlePlaceBet}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Apostador</Label>
                <Select value={participantId} onValueChange={(val) => setParticipantId(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolhe o teu nome..." />
                  </SelectTrigger>
                  <SelectContent>
                    {participants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Seleciona o Cavalo</Label>
                <Select value={horseNumber} onValueChange={(val) => setHorseNumber(val || "1")}>
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
                disabled={currentRace?.status !== "betting"}
              >
                <Sparkles className="w-4 h-4" /> Apostar no Cavalo! 🐎
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Current Race Bets */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
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
