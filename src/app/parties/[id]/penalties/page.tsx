"use client";

import { useState, useEffect, use } from "react";
import { Beer, Send, CheckCircle2, ShieldAlert, Award, User, Flame, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveParticipant } from "@/lib/use-active-participant";
import { toast } from "sonner";

export default function PenaltiesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;
  const { currentParticipant } = useActiveParticipant(partyId);

  const [participants, setParticipants] = useState<any[]>([]);
  const [pendingTx, setPendingTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Transfer form state
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState(1);
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/parties/${partyId}/penalties`);
      const data = await res.json();
      if (data.participants) setParticipants(data.participants);
      if (data.pendingTransactions) setPendingTx(data.pendingTransactions);
    } catch (e) {
      toast.error("Erro ao carregar penáltis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [partyId]);

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
    } catch (e) {
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
    } catch (e) {
      toast.error("Erro ao confirmar bebida");
    }
  };

  const currentName = currentParticipant?.name || "Utilizador";

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
            Sessão iniciada como <span className="font-bold text-foreground">{currentName}</span>. Ganha penáltis nos jogos para enviar a outros!
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-2 self-start md:self-auto">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona quem vai beber..." />
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

        {/* Confirmer Info Card */}
        <Card className="border-border/60 shadow-md flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Confirmação de Bebidas
            </CardTitle>
            <CardDescription>
              Estás autenticado como <span className="font-bold text-foreground">{currentName}</span>. Quando vires os teus amigos a beber penáltis na vida real, clica em "Confirmar que Bebeu"!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-emerald-500/10 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <span>
                As tuas confirmações serão automaticamente registadas com o teu nome (<span className="font-bold">{currentName}</span>). São precisas 3 testemunhas para saldar cada penálti!
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard & Penalties list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <Card className="md:col-span-1 border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Classificação
            </CardTitle>
            <CardDescription>Saldo atual de penáltis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {participants.map((p) => {
              const bal = p.penaltyBalance?.balance ?? 0;
              const isNegative = bal < 0;
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{p.name}</span>
                  </div>
                  <span
                    className={`font-mono text-sm px-2.5 py-0.5 rounded-full font-bold ${
                      isNegative ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"
                    }`}
                  >
                    {bal > 0 ? `+${bal}` : bal} 🍺
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Pending Drinks to Confirm */}
        <Card className="md:col-span-2 border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Beer className="w-5 h-5 text-red-500" />
              Penáltis Pendentes de Confirmação (3 Testemunhas)
            </CardTitle>
            <CardDescription>
              Para um penálti ser saldado, 3 pessoas diferentes têm de clicar em "Confirmar que Bebeu"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingTx.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                🎉 Nenhum penálti pendente neste momento! Toda a gente está de copo cheio!
              </div>
            ) : (
              pendingTx.map((tx) => {
                const count = tx.confirmations?.length || 0;
                const progressPct = (count / 3) * 100;
                const alreadyConfirmed = tx.confirmations?.some((c: any) => c.confirmedById === activeParticipantId);

                return (
                  <div key={tx.id} className="p-4 rounded-xl border bg-card/60 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-foreground">{tx.to?.name}</span> tem de beber{" "}
                        <span className="font-bold text-amber-600">{tx.amount} penálti(s)</span>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Motivo: {tx.reason} {tx.from ? `(Enviado por ${tx.from.name})` : ""}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={alreadyConfirmed || tx.toId === activeParticipantId}
                        onClick={() => handleConfirmDrink(tx.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shrink-0 gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {alreadyConfirmed ? "Já Confirmaste! ✓" : `Confirmar que Bebeu! (${count}/3)`}
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progresso de Confirmação</span>
                        <span className="font-semibold">{count}/3 Testemunhas</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>

                    {count > 0 && (
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-1 items-center pt-1">
                        <span>Confirmado por:</span>
                        {tx.confirmations.map((c: any) => (
                          <span key={c.id} className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                            ✓ {c.confirmedBy?.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
