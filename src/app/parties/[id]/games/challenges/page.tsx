"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Flame, ArrowLeft, Plus, Trophy, CheckCircle2, User, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ChallengesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;

  const [challenges, setChallenges] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);

  // Create Challenge state
  const [createdById, setCreatedById] = useState("");
  const [description, setDescription] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Bet State
  const [betParticipantId, setBetParticipantId] = useState("");
  const [betAmount, setBetAmount] = useState(1);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const resP = await fetch(`/api/parties/${partyId}/penalties`);
      const dataP = await resP.json();
      if (dataP.participants) setParticipants(dataP.participants);

      const resC = await fetch(`/api/parties/${partyId}/games/challenges`);
      const dataC = await resC.json();
      if (dataC.challenges) setChallenges(dataC.challenges);
    } catch (e) {
      toast.error("Erro ao carregar desafios");
    }
  };

  useEffect(() => {
    loadData();
  }, [partyId]);

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdById || !description) {
      toast.error("Preenche o teu nome e a descrição do desafio");
      return;
    }

    try {
      const res = await fetch(`/api/parties/${partyId}/games/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", createdById, description }),
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
    } catch (e) {
      toast.error("Erro de ligação");
    }
  };

  const handleBet = async (challengeId: string) => {
    if (!betParticipantId || betAmount < 0.5) {
      toast.error("Seleciona quem és tu para apostar (mín. 0.5 penáltis)");
      return;
    }

    try {
      const res = await fetch(`/api/parties/${partyId}/games/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bet",
          challengeId,
          participantId: betParticipantId,
          amount: Number(betAmount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao apostar");
        return;
      }

      toast.success("Aposta registada!");
      setActiveChallengeId(null);
      loadData();
    } catch (e) {
      toast.error("Erro ao apostar");
    }
  };

  const handleResolve = async (challengeId: string, winnerId: string) => {
    try {
      const res = await fetch(`/api/parties/${partyId}/games/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", challengeId, winnerId }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao declarar vencedor");
        return;
      }

      toast.success("🏆 Vencedor declarado e penáltis distribuídos!");
      loadData();
    } catch (e) {
      toast.error("Erro de ligação");
    }
  };

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
              <Flame className="w-6 h-6 text-red-500" /> Desafios & Apostas Livres
            </h1>
            <p className="text-muted-foreground text-xs">Cria desafios personalizados e aposta penáltis com a malta!</p>
          </div>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger
            render={
              <Button className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2">
                <Plus className="w-4 h-4" /> Criar Desafio
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Desafio</DialogTitle>
              <DialogDescription>Qual é a aposta ou desafio que queres lançar à festa?</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateChallenge} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Criador do Desafio</Label>
                <Select value={createdById} onValueChange={(val) => setCreatedById(val || "")}>
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
                <Label>Descrição do Desafio</Label>
                <Input
                  placeholder="Ex: Quem conseguir beber 3 shotes seguidos sem usar as mãos..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                Lançar Desafio! 🔥
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Challenges List */}
      <div className="space-y-4">
        {challenges.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground text-sm border-dashed">
            🔥 Ainda não há desafios criados. Clica no botão "Criar Desafio" acima para lançares a primeira aposta!
          </Card>
        ) : (
          challenges.map((c) => (
            <Card key={c.id} className="border-border/60 shadow-md">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{c.description}</CardTitle>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        c.status === "open"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {c.status === "open" ? "Aberto a Apostas" : "Resolvido"}
                    </span>
                  </div>
                  <CardDescription className="text-xs mt-1">Criado por {c.createdBy?.name}</CardDescription>
                </div>

                {c.status === "open" && (
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(wId: string | null) => { if (typeof wId === "string") handleResolve(c.id, wId); }}>
                      <SelectTrigger className="w-44 text-xs font-semibold">
                        <SelectValue placeholder="Declarar Vencedor..." />
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
                )}
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {c.winner && (
                  <div className="p-3 bg-emerald-500/10 text-emerald-700 font-bold rounded-lg text-sm flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" /> Vencedor Declarado: {c.winner.name}!
                  </div>
                )}

                {/* Bets */}
                <div className="space-y-2 border-t pt-3">
                  <div className="text-xs font-semibold text-muted-foreground flex justify-between">
                    <span>Apostas Registadas ({c.bets?.length || 0})</span>
                  </div>

                  {c.bets?.map((b: any) => (
                    <div key={b.id} className="flex justify-between items-center text-xs p-2 rounded bg-muted/40">
                      <span>{b.participant?.name}</span>
                      <span className="font-bold text-amber-600">{b.amount} penáltis</span>
                    </div>
                  ))}

                  {c.status === "open" && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Select value={betParticipantId} onValueChange={(val) => setBetParticipantId(val || "")}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Quem és tu..." />
                        </SelectTrigger>
                        <SelectContent>
                          {participants.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        className="w-24 text-xs"
                        value={betAmount}
                        onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0.5)}
                      />

                      <Button size="sm" onClick={() => handleBet(c.id)} className="bg-amber-600 text-white font-bold shrink-0">
                        Apostar Penáltis! 🍺
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
