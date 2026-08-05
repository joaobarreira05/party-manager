"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { Flame, ArrowLeft, Plus, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useActiveParticipant } from "@/lib/use-active-participant";
import { toast } from "sonner";

interface ParticipantItem {
  id: string;
  name: string;
}

interface ChallengeBet {
  id: string;
  amount: number;
  participant?: {
    name: string;
  };
}

interface ChallengeItem {
  id: string;
  description: string;
  status: string;
  createdBy?: {
    name: string;
  };
  winner?: {
    name: string;
  };
  bets?: ChallengeBet[];
}

export default function ChallengesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;
  const { currentParticipant } = useActiveParticipant(partyId);

  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);

  // Create Challenge state
  const [description, setDescription] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Bet State
  const [betAmount, setBetAmount] = useState(1);

  const loadData = useCallback(async () => {
    try {
      const resP = await fetch(`/api/parties/${partyId}/penalties`);
      const dataP = await resP.json();
      if (dataP.participants) setParticipants(dataP.participants);

      const resC = await fetch(`/api/parties/${partyId}/games/challenges`);
      const dataC = await resC.json();
      if (dataC.challenges) setChallenges(dataC.challenges);
    } catch {
      toast.error("Erro ao carregar desafios");
    }
  }, [partyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeParticipantId = currentParticipant?.participantId;
  const currentName = currentParticipant?.name || "Utilizador";

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParticipantId || !description) {
      toast.error("Preenche a descrição do desafio");
      return;
    }

    try {
      const res = await fetch(`/api/parties/${partyId}/games/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", createdById: activeParticipantId, description }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar desafio");
        return;
      }

      toast.success("Desafio criado com sucesso! 🔥");
      setDescription("");
      setOpenDialog(false);
      loadData();
    } catch {
      toast.error("Erro de ligação");
    }
  };

  const handleBet = async (challengeId: string) => {
    if (!activeParticipantId || betAmount < 0.5) {
      toast.error("Erro no teu utilizador (mín. 0.5 penáltis)");
      return;
    }

    try {
      const res = await fetch(`/api/parties/${partyId}/games/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bet",
          challengeId,
          participantId: activeParticipantId,
          amount: Number(betAmount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao apostar");
        return;
      }

      toast.success(`Aposta registada como ${currentName}! 🍺`);
      loadData();
    } catch {
      toast.error("Erro ao apostar");
    }
  };

  const handleResolve = async (challengeId: string, winnerId: string) => {
    try {
      const res = await fetch(`/api/parties/${partyId}/games/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve",
          challengeId,
          winnerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao resolver");
        return;
      }

      toast.success("Desafio resolvido! O vencedor ganha as apostas! 🏆");
      loadData();
    } catch {
      toast.error("Erro ao resolver desafio");
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
              <Flame className="w-6 h-6 text-red-500" /> Desafios & Apostas Livres
            </h1>
            <p className="text-muted-foreground text-xs">
              Sessão como <span className="font-bold text-foreground">{currentName}</span>. Cria desafios loucos!
            </p>
          </div>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger render={<Button className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2" />}>
            <Plus className="w-4 h-4" /> Criar Desafio
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Desafio</DialogTitle>
              <DialogDescription>Ex: Quem aguentar mais tempo sem piscar ganha 2 penáltis de cada um.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateChallenge} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Descrição do Desafio</Label>
                <Input
                  placeholder="Ex: Beber 3 shots de tequila de seguida..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-bold">
                Lançar Desafio 🔥
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* LIST OF CHALLENGES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {challenges.length === 0 ? (
          <Card className="col-span-2 border-dashed p-8 text-center text-muted-foreground text-sm">
            Ainda não há desafios criados. Clica em &quot;Criar Desafio&quot; para começar a festa! 🔥
          </Card>
        ) : (
          challenges.map((c) => {
            const totalPot = c.bets?.reduce((sum, b) => sum + b.amount, 0) || 0;

            return (
              <Card key={c.id} className="border-red-500/20 shadow-md flex flex-col justify-between">
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base font-bold leading-snug">{c.description}</CardTitle>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                      c.status === "open" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                    }`}>
                      {c.status === "open" ? "Aberto" : "Resolvido"}
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Criado por: <span className="font-semibold text-foreground">{c.createdBy?.name || "Anónimo"}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-sm">
                    <span className="font-bold flex items-center gap-1.5 text-xs text-red-600">
                      <Trophy className="w-4 h-4" /> Pot Total de Penáltis:
                    </span>
                    <span className="font-black text-base text-red-600">{totalPot} 🍺</span>
                  </div>

                  {/* Bets list */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase">Apostas colocadas:</div>
                    {!c.bets || c.bets.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic">Nenhuma aposta ainda.</div>
                    ) : (
                      c.bets.map((b) => (
                        <div key={b.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-muted/40">
                          <span>{b.participant?.name}</span>
                          <span className="font-bold text-amber-600">{b.amount} 🍺</span>
                        </div>
                      ))
                    )}
                  </div>

                  {c.status === "open" ? (
                    <div className="space-y-3 pt-2 border-t">
                      {/* Bet Form */}
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.5"
                          min="0.5"
                          className="h-8 text-xs font-bold w-24"
                          value={betAmount}
                          onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0.5)}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleBet(c.id)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex-1"
                        >
                          Apostar como {currentName} 🍺
                        </Button>
                      </div>

                      {/* Resolve Form */}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-bold">Declarar Vencedor</Label>
                        <Select onValueChange={(val) => { if (typeof val === "string") handleResolve(c.id, val); }}>
                          <SelectTrigger className="h-8 text-xs font-bold">
                            <SelectValue placeholder="Escolher vencedor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {participants.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                🏆 {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 font-bold text-xs text-center border border-emerald-500/20">
                      🏆 Vencedor: {c.winner?.name || "Ninguém"}! Pot distribuído!
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
