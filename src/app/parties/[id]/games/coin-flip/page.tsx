"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { Coins, ArrowLeft, RotateCw, Sparkles, Swords, Trophy, Plus, UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useActiveParticipant } from "@/lib/use-active-participant";
import { toast } from "sonner";

interface BetItem {
  id: string;
  participantId: string;
  choice: string;
  amount: number;
  participant?: {
    name: string;
  };
}

interface DuelItem {
  id: string;
  result?: string;
  createdAt: string;
  bets?: BetItem[];
}

export default function CoinFlipPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;
  const { currentParticipant } = useActiveParticipant(partyId);

  const [duels, setDuels] = useState<DuelItem[]>([]);

  // Create Duel State
  const [choice, setChoice] = useState<"heads" | "tails">("heads");
  const [amount, setAmount] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  // Spin Animation State
  const [spinningId, setSpinningId] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<{ result: "heads" | "tails"; winner?: { name: string }; loser?: { name: string } } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const resD = await fetch(`/api/parties/${partyId}/games/coin-flip`);
      const dataD = await resD.json();
      if (dataD.coinFlips) setDuels(dataD.coinFlips);
    } catch {
      toast.error("Erro ao carregar duelos");
    }
  }, [partyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    } catch {
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

      toast.success("Aceitaste o duelo! A rodar a moeda... 🪙");
      startSpinAnimation(duelId, data.result, data.winner, data.loser);
    } catch {
      toast.error("Erro ao entrar no duelo");
    }
  };

  const startSpinAnimation = (duelId: string, result: "heads" | "tails", winner?: { name: string }, loser?: { name: string }) => {
    setSpinningId(duelId);
    setShowModal(true);
    setActiveResult(null);

    setTimeout(() => {
      setSpinningId(null);
      setActiveResult({ result, winner, loser });
      loadData();
    }, 2800);
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
              <Coins className="w-6 h-6 text-amber-500" /> Duelos 1v1 da Moeda
            </h1>
            <p className="text-muted-foreground text-xs">
              Sessão como <span className="font-bold text-foreground">{currentName}</span>. Desafia um amigo para um duelo de penáltis!
            </p>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2" />}>
            <Plus className="w-4 h-4" /> Criar Duelo 1v1
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Duelo 1v1 de Cara ou Coroa</DialogTitle>
              <DialogDescription>Aposta penáltis contra outro participante da festa.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateDuel} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>A tua escolha</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={choice === "heads" ? "default" : "outline"}
                    className={choice === "heads" ? "bg-amber-600 hover:bg-amber-700 font-bold" : ""}
                    onClick={() => setChoice("heads")}
                  >
                    👑 Cara (Heads)
                  </Button>
                  <Button
                    type="button"
                    variant={choice === "tails" ? "default" : "outline"}
                    className={choice === "tails" ? "bg-amber-600 hover:bg-amber-700 font-bold" : ""}
                    onClick={() => setChoice("tails")}
                  >
                    🏛️ Coroa (Tails)
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor da Aposta (Penáltis)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0.5)}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 font-bold gap-2">
                <Swords className="w-4 h-4" /> Lançar Desafio de Duelo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 3D Coin Animation Overlay Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl text-white">
            <h3 className="text-xl font-extrabold flex items-center justify-center gap-2 text-amber-400">
              <Coins className="w-6 h-6" /> Duelo em Curso!
            </h3>

            <div className="py-6 flex items-center justify-center">
              {spinningId ? (
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-4 border-amber-300 shadow-2xl flex items-center justify-center animate-spin text-4xl">
                  🪙
                </div>
              ) : activeResult ? (
                <div className="space-y-3 animate-in zoom-in-75 duration-300">
                  <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-4 border-white shadow-2xl flex flex-col items-center justify-center text-slate-950 font-black">
                    <span className="text-4xl">{activeResult.result === "heads" ? "👑" : "🏛️"}</span>
                    <span className="text-xs uppercase font-extrabold mt-1">
                      {activeResult.result === "heads" ? "Cara" : "Coroa"}
                    </span>
                  </div>
                  <div className="text-lg font-black text-amber-400">
                    Vencedor: {activeResult.winner?.name || "Ninguém"}! 🎉
                  </div>
                  <p className="text-xs text-slate-300">
                    {activeResult.loser?.name || "O adversário"} bebe o penálti de derrota! 🍺
                  </p>
                </div>
              ) : null}
            </div>

            {!spinningId && (
              <Button onClick={() => setShowModal(false)} className="w-full bg-amber-600 hover:bg-amber-700 font-bold">
                Fechar & Continuar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* DUELS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {duels.length === 0 ? (
          <Card className="col-span-2 border-dashed p-8 text-center text-muted-foreground text-sm">
            Nenhum duelo aberto no momento. Clica em &quot;Criar Duelo 1v1&quot; para desafiar os teus amigos! ⚔️
          </Card>
        ) : (
          duels.map((d) => {
            const hostBet = d.bets?.[0];
            const challengerBet = d.bets?.[1];
            const isFinished = !!d.result;
            const isHost = hostBet?.participantId === activeParticipantId;

            return (
              <Card key={d.id} className="border-amber-500/20 shadow-md">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Swords className="w-4 h-4 text-amber-500" /> Duelo 1v1
                    </CardTitle>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                      isFinished ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-600"
                    }`}>
                      {isFinished ? "Concluído" : "Aberto"}
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Criado por: <span className="font-semibold text-foreground">{hostBet?.participant?.name || "Desconhecido"}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    {/* Host Side */}
                    <div className="p-3 rounded-xl bg-slate-900 text-white space-y-1">
                      <span className="text-[10px] text-slate-400 block font-bold">Criador</span>
                      <div className="font-bold text-sm truncate">{hostBet?.participant?.name}</div>
                      <div className="text-xs text-amber-400 font-extrabold">
                        {hostBet?.choice === "heads" ? "👑 Cara" : "🏛️ Coroa"} ({hostBet?.amount} 🍺)
                      </div>
                    </div>

                    {/* Challenger Side */}
                    <div className="p-3 rounded-xl bg-slate-900 text-white space-y-1">
                      <span className="text-[10px] text-slate-400 block font-bold">Adversário</span>
                      {challengerBet ? (
                        <>
                          <div className="font-bold text-sm truncate">{challengerBet.participant?.name}</div>
                          <div className="text-xs text-amber-400 font-extrabold">
                            {challengerBet.choice === "heads" ? "👑 Cara" : "🏛️ Coroa"} ({challengerBet.amount} 🍺)
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-slate-400 italic py-2">A aguardar oponente...</div>
                      )}
                    </div>
                  </div>

                  {!isFinished ? (
                    isHost ? (
                      <div className="text-xs text-center text-muted-foreground py-2 font-medium">
                        À espera que outro utilizador entre no teu duelo... ⏳
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleJoinDuel(d.id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                      >
                        <UserCheck className="w-4 h-4" /> Aceitar Duelo como {currentName} ⚔️
                      </Button>
                    )
                  ) : (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold text-xs text-center">
                      🏆 Resultado: {d.result === "heads" ? "👑 Cara" : "🏛️ Coroa"}! Duelo Encerrado.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
