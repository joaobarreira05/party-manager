"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Coins, ArrowLeft, RotateCw, Sparkles, Beer, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CoinFlipPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;

  const [participants, setParticipants] = useState<any[]>([]);
  const [participantId, setParticipantId] = useState("");
  const [choice, setChoice] = useState<"heads" | "tails">("heads");
  const [amount, setAmount] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [coinResult, setCoinResult] = useState<"heads" | "tails" | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/parties/${partyId}/penalties`)
      .then((res) => res.json())
      .then((data) => {
        if (data.participants) setParticipants(data.participants);
      });

    loadHistory();
  }, [partyId]);

  const loadHistory = async () => {
    const res = await fetch(`/api/parties/${partyId}/games/coin-flip`);
    const data = await res.json();
    if (data.coinFlips) setHistory(data.coinFlips);
  };

  const handleFlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantId || amount < 0.5) {
      toast.error("Seleciona quem está a jogar e uma aposta mínima de 0.5 penáltis");
      return;
    }

    setSpinning(true);
    setCoinResult(null);

    try {
      const res = await fetch(`/api/parties/${partyId}/games/coin-flip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, choice, amount: Number(amount) }),
      });

      const data = await res.json();

      // Wait 1.5s for 3D animation
      setTimeout(() => {
        setSpinning(false);
        if (!res.ok) {
          toast.error(data.error || "Erro ao rodar moeda");
          return;
        }

        setCoinResult(data.result);
        if (data.isWinner) {
          toast.success(data.message);
        } else {
          toast.error(data.message);
        }
        loadHistory();
      }, 1500);
    } catch (e) {
      setSpinning(false);
      toast.error("Erro de ligação");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Link href={`/parties/${partyId}/games`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-500" /> Moeda ao Ar 3D
          </h1>
          <p className="text-muted-foreground text-xs">Aposta cara ou coroa. Quem perder ganha penáltis para beber!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Coin Display */}
        <Card className="border-border/60 shadow-xl bg-gradient-to-b from-card via-card to-amber-500/5 p-8 text-center flex flex-col items-center justify-center min-h-[320px]">
          <div className="relative mb-6">
            <div
              className={`w-36 h-36 rounded-full border-8 border-amber-400 bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-2xl flex items-center justify-center text-4xl font-extrabold text-amber-950 transition-transform duration-1000 ${
                spinning ? "animate-spin scale-110" : ""
              }`}
            >
              {spinning ? (
                <RotateCw className="w-12 h-12 animate-spin text-amber-900" />
              ) : coinResult === "heads" ? (
                "👑 CARA"
              ) : coinResult === "tails" ? (
                "⚔️ COROA"
              ) : (
                "🪙 ?"
              )}
            </div>
          </div>

          <div className="text-sm font-semibold text-muted-foreground">
            {spinning ? (
              <span className="text-amber-600 animate-pulse">A rodar a moeda no ar...</span>
            ) : coinResult ? (
              <span className="text-lg font-bold text-foreground">
                Resultado: {coinResult === "heads" ? "Cara! 👑" : "Coroa! ⚔️"}
              </span>
            ) : (
              "Seleciona a tua aposta e clica em Rodar!"
            )}
          </div>
        </Card>

        {/* Bet Form */}
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Fazer Aposta</CardTitle>
            <CardDescription>Mínimo 0.5 penáltis. Limite de saldo: -5.</CardDescription>
          </CardHeader>
          <form onSubmit={handleFlip}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Quem está a Jogar?</Label>
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
                <Label>Escolha da Moeda</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={choice === "heads" ? "default" : "outline"}
                    className={choice === "heads" ? "bg-amber-600 text-white font-bold" : ""}
                    onClick={() => setChoice("heads")}
                  >
                    👑 CARA
                  </Button>
                  <Button
                    type="button"
                    variant={choice === "tails" ? "default" : "outline"}
                    className={choice === "tails" ? "bg-amber-600 text-white font-bold" : ""}
                    onClick={() => setChoice("tails")}
                  >
                    ⚔️ COROA
                  </Button>
                </div>
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
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-12 text-base gap-2"
                disabled={spinning}
              >
                <Sparkles className="w-5 h-5" />
                {spinning ? "A rodar..." : "RODAR MOEDA! 🪙"}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>

      {/* History */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Histórico Recente de Lançamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">Ainda não foram feitas jogadas.</div>
          ) : (
            history.map((h) => {
              const bet = h.bets?.[0];
              const isWin = bet?.choice === h.result;
              return (
                <div key={h.id} className="flex items-center justify-between p-3 border rounded-lg bg-card text-sm">
                  <div>
                    <span className="font-bold">{bet?.participant?.name}</span> apostou em{" "}
                    <span className="font-semibold">{bet?.choice === "heads" ? "Cara" : "Coroa"}</span> (
                    {bet?.amount} penálti(s))
                  </div>
                  <div className="flex items-center gap-2 font-semibold">
                    <span>Deu {h.result === "heads" ? "Cara 👑" : "Coroa ⚔️"}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isWin ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                      {isWin ? "Ganhou! 🎉" : "Perdeu! 🍺"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
