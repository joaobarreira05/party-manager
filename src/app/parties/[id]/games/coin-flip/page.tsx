"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Coins, ArrowLeft, RotateCw, Sparkles, Swords, Trophy, Plus, UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useActiveParticipant } from "@/lib/use-active-participant";
import { toast } from "sonner";

export default function CoinFlipPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;
  const { currentParticipant } = useActiveParticipant(partyId);

  const [duels, setDuels] = useState<any[]>([]);

  // Create Duel State
  const [choice, setChoice] = useState<"heads" | "tails">("heads");
  const [amount, setAmount] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  // Spin State
  const [spinningId, setSpinningId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const resD = await fetch(`/api/parties/${partyId}/games/coin-flip`);
      const dataD = await resD.json();
      if (dataD.coinFlips) setDuels(dataD.coinFlips);
    } catch (e) {
      toast.error("Erro ao carregar duelos");
    }
  };

  useEffect(() => {
    loadData();
  }, [partyId]);

  const activeParticipantId = currentParticipant?.participantId;
  const currentName = currentParticipant?.name || "Utilizador";

  const handleCreateDuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParticipantId || amount < 0.5) {
      toast.error("Erro no teu utilizador ou valor inválido (mín. 0.5 penáltis)");
      return;
    }

    try {
      const res = await fetch(`/api/parties/${partyId}/games/coin-flip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_duel",
          participantId: activeParticipantId,
          choice,
          amount: Number(amount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar duelo");
        return;
      }

      toast.success("Duelo 1v1 criado! Espera que um amigo aceite a aposta. ⚔️");
      setCreateOpen(false);
      loadData();
    } catch (e) {
      toast.error("Erro de ligação");
    }
  };

  const handleJoinDuel = async (duelId: string) => {
    if (!activeParticipantId) {
      toast.error("Erro ao identificar o teu utilizador!");
      return;
    }

    try {
      const res = await fetch(`/api/parties/${partyId}/games/coin-flip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join_duel",
          coinFlipId: duelId,
          participantId: activeParticipantId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao entrar no duelo");
        return;
      }

      toast.success("Entraste no duelo! Podem girar a moeda! 🪙");
      loadData();
    } catch (e) {
      toast.error("Erro de ligação");
    }
  };

  const handleSpinCoin = async (duelId: string) => {
    setSpinningId(duelId);

    try {
      const res = await fetch(`/api/parties/${partyId}/games/coin-flip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "spin", coinFlipId: duelId }),
      });

      const data = await res.json();

      setTimeout(() => {
        setSpinningId(null);
        if (!res.ok) {
          toast.error(data.error || "Erro ao girar moeda");
          return;
        }

        toast.success(`🎉 A moeda deu ${data.result === "heads" ? "CARA 👑" : "COROA ⚔️"}! Vencedor: ${data.winner?.name}!`);
        loadData();
      }, 1500);
    } catch (e) {
      setSpinningId(null);
      toast.error("Erro ao girar moeda");
    }
  };

  const openDuels = duels.filter((d) => !d.result && d.bets?.length === 1);
  const readyDuels = duels.filter((d) => !d.result && d.bets?.length === 2);
  const finishedDuels = duels.filter((d) => d.result);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/parties/${partyId}/games`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              <Swords className="w-6 h-6 text-amber-500" /> Duelos de Moeda 1v1
            </h1>
            <p className="text-muted-foreground text-xs">
              Sessão como <span className="font-bold text-foreground">{currentName}</span>. Cria um duelo 1v1 contra um amigo!
            </p>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2">
                <Plus className="w-4 h-4" /> Criar Duelo 1v1
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Duelo 1v1</DialogTitle>
              <DialogDescription>
                Criador: <span className="font-bold text-foreground">{currentName}</span>. Escolhe o teu lado e a aposta.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDuel} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>A Tua Escolha</Label>
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
                <Label>Penáltis em Jogo (Mínimo: 0.5)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0.5)}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold">
                Criar Sala de Duelo! ⚔️
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Duelos Prontos para Girar */}
      {readyDuels.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-600">
            <Sparkles className="w-5 h-5 animate-spin" /> Duelos Prontos para Girar a Moeda!
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readyDuels.map((d) => {
              const p1 = d.bets[0];
              const p2 = d.bets[1];
              const isSpinning = spinningId === d.id;

              return (
                <Card key={d.id} className="border-emerald-500/50 bg-emerald-500/5 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex justify-between items-center">
                      <span>Duelo por {p1.amount} Penálti(s) 🍺</span>
                      <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">Pronto!</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-around text-center py-2 bg-background/80 rounded-lg border">
                      <div>
                        <div className="font-extrabold text-sm">{p1.participant?.name}</div>
                        <div className="text-xs text-amber-600 font-bold">{p1.choice === "heads" ? "👑 CARA" : "⚔️ COROA"}</div>
                      </div>
                      <div className="text-lg font-black text-muted-foreground">VS</div>
                      <div>
                        <div className="font-extrabold text-sm">{p2.participant?.name}</div>
                        <div className="text-xs text-amber-600 font-bold">{p2.choice === "heads" ? "👑 CARA" : "⚔️ COROA"}</div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSpinCoin(d.id)}
                      disabled={isSpinning}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 gap-2"
                    >
                      {isSpinning ? <RotateCw className="w-5 h-5 animate-spin" /> : <Coins className="w-5 h-5" />}
                      {isSpinning ? "A girar a moeda..." : "GIRAR MOEDA AGORA! 🪙"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Duelos Abertos à Procura de Oponente */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Swords className="w-5 h-5 text-amber-500" /> Duelos Abertos (À espera de oponente)
        </h2>
        {openDuels.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm border-dashed">
            ⚔️ Nenhum duelo aberto neste momento. Clica em "Criar Duelo 1v1" para desafiares um amigo!
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openDuels.map((d) => {
              const creator = d.bets[0];
              const oppositeChoice = creator.choice === "heads" ? "COROA ⚔️" : "CARA 👑";
              const isMine = creator.participantId === activeParticipantId;

              return (
                <Card key={d.id} className="border-amber-500/30 bg-gradient-to-br from-card to-amber-500/5 shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex justify-between items-center">
                      <span>Desafio de {creator.participant?.name}</span>
                      <span className="text-xs font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                        {creator.amount} Penálti(s)
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Escolheu {creator.choice === "heads" ? "👑 CARA" : "⚔️ COROA"}. O oponente fica com {oppositeChoice}!
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isMine ? (
                      <div className="text-xs text-amber-600 font-semibold p-2 bg-amber-500/10 rounded text-center">
                        Este duelo é teu! À espera que outro amigo aceite...
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleJoinDuel(d.id)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 gap-2"
                      >
                        <UserCheck className="w-4 h-4" /> Aceitar Duelo como {currentName}! ⚔️
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Finished Duels */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Histórico de Duelos Concluídos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {finishedDuels.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">Ainda não há duelos concluídos.</div>
          ) : (
            finishedDuels.map((d) => {
              const winnerBet = d.bets.find((b: any) => b.choice === d.result);
              const loserBet = d.bets.find((b: any) => b.choice !== d.result);

              return (
                <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg bg-card text-xs">
                  <div>
                    <span className="font-bold text-emerald-600">🏆 {winnerBet?.participant?.name}</span> venceu contra{" "}
                    <span className="font-bold text-red-500">{loserBet?.participant?.name}</span> ({winnerBet?.amount} penálti(s))
                  </div>
                  <div className="font-mono font-bold bg-muted px-2 py-1 rounded">
                    Moeda: {d.result === "heads" ? "CARA 👑" : "COROA ⚔️"}
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
