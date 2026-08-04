"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Dices, ArrowLeft, RefreshCw, CheckCircle2, Sparkles, Trophy, Plus, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function BingoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;

  const [participants, setParticipants] = useState<any[]>([]);
  const [participantId, setParticipantId] = useState("");
  const [game, setGame] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [newActivity, setNewActivity] = useState("");
  const [openAddDialog, setOpenAddDialog] = useState(false);

  const loadData = async () => {
    try {
      const resP = await fetch(`/api/parties/${partyId}/penalties`);
      const dataP = await resP.json();
      if (dataP.participants) setParticipants(dataP.participants);

      const resG = await fetch(`/api/parties/${partyId}/games/bingo`);
      const dataG = await resG.json();
      if (dataG.game) {
        setGame(dataG.game);
      }
    } catch (e) {
      toast.error("Erro ao carregar Bingo");
    }
  };

  useEffect(() => {
    loadData();
  }, [partyId]);

  const handleGetCard = async (pid: string | null) => {
    if (!pid) return;
    setParticipantId(pid);
    if (!game) return;

    try {
      const res = await fetch(`/api/parties/${partyId}/games/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_card", gameId: game.id, participantId: pid }),
      });
      const data = await res.json();
      if (data.card) setCard(data.card);
    } catch (e) {
      toast.error("Erro ao carregar cartão");
    }
  };

  const handleToggleActivity = async (activityText: string) => {
    if (!card || !game) return;
    try {
      const res = await fetch(`/api/parties/${partyId}/games/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_activity",
          gameId: game.id,
          participantId: card.participantId,
          activityToMark: activityText,
        }),
      });
      const data = await res.json();
      if (data.card) {
        setCard(data.card);
        const marked: string[] = JSON.parse(data.card.markedNumbers || "[]");
        if (marked.includes(activityText)) {
          toast.success(`✓ "${activityText}" assinalado no teu Bingo! 🎉`);
          if (marked.length >= 4) {
            toast.success("🔥 BINGO! Já tens várias atividades marcadas!", { duration: 5000 });
          }
        }
      }
    } catch (e) {
      toast.error("Erro ao marcar atividade");
    }
  };

  const handleAddCustomActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.trim() || !game) return;

    try {
      const res = await fetch(`/api/parties/${partyId}/games/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_activity",
          gameId: game.id,
          customActivity: newActivity.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Nova atividade adicionada ao Bingo da festa! 🎉");
        setNewActivity("");
        setOpenAddDialog(false);
        loadData();
      }
    } catch (e) {
      toast.error("Erro ao adicionar atividade");
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch(`/api/parties/${partyId}/games/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_game" }),
      });
      const data = await res.json();
      if (data.game) {
        setGame(data.game);
        setCard(null);
        toast.success("Novo Bingo da Festa gerado!");
      }
    } catch (e) {
      toast.error("Erro ao reiniciar Bingo");
    }
  };

  const grid: string[] = card?.numbers ? JSON.parse(card.numbers) : [];
  const marked: string[] = card?.markedNumbers ? JSON.parse(card.markedNumbers) : [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/parties/${partyId}/games`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              <Dices className="w-6 h-6 text-purple-500" /> Bingo de Atividades da Festa
            </h1>
            <p className="text-muted-foreground text-xs">
              À medida que estas coisas acontecem em real-life na festa, vai marcando no teu cartão!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
            <DialogTrigger
              render={
                <Button size="sm" variant="outline" className="gap-1.5 border-purple-500/40 text-purple-600">
                  <Plus className="w-4 h-4" /> Adicionar Frase/Atividade
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Frase ao Bingo</DialogTitle>
                <DialogDescription>Adiciona um acontecimento ou frase típica para figurar no Bingo da festa.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCustomActivity} className="space-y-4 pt-2">
                <Input
                  placeholder="Ex: João vestiu uma peruca engraçada..."
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold">
                  Adicionar ao Bingo
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Novo Bingo
          </Button>
        </div>
      </div>

      {/* Main Card Section */}
      <Card className="border-purple-500/30 shadow-xl bg-gradient-to-b from-card via-card to-purple-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" /> Cartão do Jogador
              {marked.length > 0 && (
                <span className="text-xs bg-purple-600 text-white px-2.5 py-0.5 rounded-full font-extrabold">
                  {marked.length}/16 Assinalados
                </span>
              )}
            </div>

            <Select value={participantId} onValueChange={handleGetCard}>
              <SelectTrigger className="w-56 border-purple-500/40">
                <SelectValue placeholder="Escolhe o teu nome para abrir cartão..." />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!card ? (
            <div className="text-center py-20 text-muted-foreground text-sm space-y-2">
              <Dices className="w-12 h-12 text-purple-400 mx-auto animate-bounce" />
              <div className="font-bold text-base text-foreground">Seleciona o teu nome acima!</div>
              <p className="text-xs max-w-sm mx-auto">
                Será gerado um cartão 4x4 único com acontecimentos e atividades da festa para irem assinalando ao longo da noite!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {grid.map((actText, idx) => {
                  const isDone = marked.includes(actText);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleToggleActivity(actText)}
                      className={`p-4 rounded-xl font-semibold text-xs transition-all border flex flex-col justify-between text-left min-h-[100px] ${
                        isDone
                          ? "bg-purple-600 text-white border-purple-700 shadow-lg scale-95 ring-2 ring-purple-400/50"
                          : "bg-card hover:bg-purple-500/10 text-foreground border-border/80 shadow-sm"
                      }`}
                    >
                      <span className="leading-snug">{actText}</span>
                      <div className="flex justify-end pt-2">
                        {isDone ? (
                          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                            <Check className="w-3 h-3" /> FEITO!
                          </span>
                        ) : (
                          <span className="text-[10px] opacity-60">Toca p/ marcar</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-muted-foreground text-center pt-4 border-t flex items-center justify-center gap-2">
                <span>💡 Toca numa célula sempre que aquele acontecimento se realizar na festa em tempo real!</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
