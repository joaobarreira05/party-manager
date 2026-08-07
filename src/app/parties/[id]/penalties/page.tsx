"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Beer, Send, CheckCircle2, ShieldAlert, Award, User, Flame, RefreshCw, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveParticipant } from "@/lib/use-active-participant";
import { toast } from "sonner";

interface ParticipantWithPenalty {
  id: string;
  name: string;
  role?: string;
  penaltyBalance?: {
    balance: number;
  };
}

interface PendingTransaction {
  id: string;
  amount: number;
  reason: string;
  toId: string;
  fromId: string;
  to?: { name: string };
  from?: { name: string };
  confirmations?: { confirmedById: string }[];
}

export default function PenaltiesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;
  const { currentParticipant } = useActiveParticipant(partyId);

  const [participants, setParticipants] = useState<ParticipantWithPenalty[]>([]);
  const [pendingTx, setPendingTx] = useState<PendingTransaction[]>([]);

  // Transfer form state
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState(1);
  const [sending, setSending] = useState(false);

  const isManager = currentParticipant?.role === "manager";

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/parties/${partyId}/penalties`);
      const data = await res.json();
      if (data.participants) setParticipants(data.participants);
      if (data.pendingTransactions) setPendingTx(data.pendingTransactions);
    } catch {
      toast.error("Erro ao carregar penáltis");
    }
  }, [partyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeParticipantId = currentParticipant?.participantId || participants[0]?.id;

  const handleSendPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParticipantId || !toId || amount < 0.5) {
      toast.error("Preenche todos os campos. Mínimo para envio: 0.5 penáltis.");
      return;
    }
    if (activeParticipantId === toId) {
      toast.error("Não podes enviar penáltis para ti próprio!");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/parties/${partyId}/penalties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          fromParticipantId: activeParticipantId,
          toParticipantId: toId,
          amount: Number(amount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar penálti");
        setSending(false);
        return;
      }

      toast.success(`Penálti de ${amount} enviado com sucesso! 🍺`);
      setToId("");
      loadData();
    } catch {
      toast.error("Erro de ligação");
    } finally {
      setSending(false);
    }
  };

  const handleConfirmDrink = async (transactionId: string) => {
    if (!activeParticipantId) {
      toast.error("Erro na identificação do teu utilizador");
      return;
    }

    try {
      const res = await fetch(`/api/parties/${partyId}/penalties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_drink",
          transactionId,
          confirmedById: activeParticipantId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao confirmar bebida");
        return;
      }

      if (data.cleared) {
        toast.success("🍻 3 Confirmações atingidas! O penálti ficou SALDADO!");
      } else {
        toast.success(`Confirmação registada! (${data.confirmationsCount}/3 necessárias)`);
      }
      loadData();
    } catch {
      toast.error("Erro ao confirmar bebida");
    }
  };

  const handleResetAll = async () => {
    if (!confirm("Tem a certeza que deseja resetar os saldos e penáltis de todos os participantes para 0?")) return;
    try {
      const res = await fetch(`/api/parties/${partyId}/penalties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_all" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao resetar penáltis");
        return;
      }
      toast.success("Todos os penáltis foram resetados para 0 pelo Gestor! 🔄");
      loadData();
    } catch {
      toast.error("Erro de ligação");
    }
  };

  const currentName = currentParticipant?.name || "Utilizador";
  const selectedRecipient = participants.find((p) => p.id === toId);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 p-6 rounded-2xl border border-amber-500/20 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-amber-600 font-bold text-lg">
            <Beer className="w-6 h-6 animate-bounce" />
            <span>Sistema de Penáltis & Bebidas</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Sessão iniciada como <span className="font-bold text-foreground">{currentName}</span> ({isManager ? "Gestor" : "Utilizador"}).
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {isManager && (
            <Button variant="destructive" size="sm" onClick={handleResetAll} className="gap-1.5 font-bold">
              <RotateCcw className="w-4 h-4" /> Resetar Penáltis de Todos (Gestor)
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Grid: Send Penalties & User Identity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Send Penalty Card */}
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-500" />
              Enviar Penálti
            </CardTitle>
            <CardDescription>
              Transfere penáltis para outra pessoa beber. Mínimo 0.5, saldo não pode ser menor que -5.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSendPenalty}>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm flex items-center justify-between">
                <span className="text-muted-foreground">De (Tu):</span>
                <span className="font-bold text-foreground">{currentName}</span>
              </div>

              <div className="space-y-2">
                <Label>Para Quem Recebe (Vai ter de beber)</Label>
                <Select value={toId} onValueChange={(v) => setToId(v || "")}>
                  <SelectTrigger className="w-full">
                    {selectedRecipient ? (
                      <span className="font-bold text-foreground">
                        {selectedRecipient.name} (Saldo: {selectedRecipient.penaltyBalance?.balance ?? 0})
                      </span>
                    ) : (
                      <SelectValue placeholder="Seleciona quem vai beber..." />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {participants
                      .filter((p) => p.id !== activeParticipantId)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (Saldo: {p.penaltyBalance?.balance ?? 0})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade de Penáltis (Mínimo: 0.5)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0.5)}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2 font-semibold" disabled={sending}>
                <Flame className="w-4 h-4" />
                {sending ? "A enviar..." : "Enviar Penálti! 🍺"}
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Leaderboard / Balances Card */}
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Saldos de Penáltis da Festa
            </CardTitle>
            <CardDescription>Valores positivos = Penáltis ganhos. Valores negativos = Penáltis a beber.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {participants.map((p) => {
              const bal = p.penaltyBalance?.balance ?? 0;
              const isCurrentUser = p.id === activeParticipantId;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                    isCurrentUser ? "bg-amber-500/10 border-amber-500/30 font-bold" : "bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{p.name}</span>
                    {isCurrentUser && <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">Tu</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-sm ${bal > 0 ? "text-emerald-600" : bal < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {bal > 0 ? `+${bal}` : bal} 🍺
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Pending Drink Confirmations Section */}
      <Card className="border-amber-500/30 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Penáltis a Beber & Confirmações Pendentes (3 Pessoas Necessárias)
          </CardTitle>
          <CardDescription>
            Quando alguém bebe um penálti, 3 outros participantes têm de clicar para confirmar que a bebida foi terminada!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingTx.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground italic">
              Não há bebidas pendentes de confirmação neste momento! 🍻
            </div>
          ) : (
            pendingTx.map((tx) => {
              const confirmationsCount = tx.confirmations?.length || 0;
              const hasConfirmed = tx.confirmations?.some((c) => c.confirmedById === activeParticipantId);
              const isTargetDrinker = tx.toId === activeParticipantId;

              return (
                <div key={tx.id} className="p-4 rounded-xl border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-sm flex items-center gap-2">
                      <span className="text-red-600 font-extrabold">{tx.to?.name}</span>
                      <span>tem de beber</span>
                      <span className="text-amber-600 font-black">{tx.amount} penálti(s) 🍺</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Origem: <span className="font-medium text-foreground">{tx.reason || `De ${tx.from?.name}`}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold bg-muted px-3 py-1.5 rounded-lg border">
                       Confirmações: <span className="text-amber-600 font-extrabold">{confirmationsCount}/3</span>
                    </div>

                    {isTargetDrinker ? (
                      <span className="text-xs text-muted-foreground italic bg-muted/60 px-3 py-1.5 rounded-lg">
                        (Não podes confirmar a tua própria bebida)
                      </span>
                    ) : hasConfirmed ? (
                      <span className="text-xs text-emerald-600 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmado por ti!
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConfirmDrink(tx.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Confirmar que Bebeu!
                      </Button>
                    )}
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
