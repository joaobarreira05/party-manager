"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { Dices, ArrowLeft, RefreshCw, Sparkles, Check, Edit3, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useActiveParticipant } from "@/lib/use-active-participant";
import { toast } from "sonner";

const DEFAULT_9_IDEAS = [
  "Alguém entornou bebida 🍺",
  "João foi ao frigorífico 🧊",
  "Alguém cantou karaoke 🎤",
  "Foto de grupo tirada 📸",
  "Dança em cima da mesa 💃",
  "Partiram um copo 💥",
  "Shot de tequila pedido 🍸",
  "Discussão de música 🎶",
  "Telemóvel perdido 📱",
];

interface BingoGameData {
  id: string;
  status: string;
}

interface BingoCardData {
  id: string;
  numbers: string;
  markedNumbers: string;
}

export default function BingoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;
  const { currentParticipant } = useActiveParticipant(partyId);

  const [game, setGame] = useState<BingoGameData | null>(null);
  const [card, setCard] = useState<BingoCardData | null>(null);

  // 9 Slots Editor
  const [items9, setItems9] = useState<string[]>(DEFAULT_9_IDEAS);
  const [editorOpen, setEditorOpen] = useState(false);

  const fetchCard = useCallback(async (gameId: string, pId: string) => {
    try {
      const res = await fetch(`/api/parties/${partyId}/games/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_card", gameId, participantId: pId }),
      });
      const data = await res.json();
      if (data.card) {
        setCard(data.card);
        const parsed: string[] = JSON.parse(data.card.numbers || "[]");
        if (parsed.length === 9) setItems9(parsed);
      }
    } catch {
      toast.error("Erro ao carregar cartão");
    }
  }, [partyId]);

  const loadData = useCallback(async () => {
    try {
      const resG = await fetch(`/api/parties/${partyId}/games/bingo`);
      const dataG = await resG.json();
      if (dataG.game) {
        setGame(dataG.game);
        if (currentParticipant?.participantId) {
          fetchCard(dataG.game.id, currentParticipant.participantId);
        }
      }
    } catch {
      toast.error("Erro ao carregar Bingo");
    }
  }, [partyId, currentParticipant?.participantId, fetchCard]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeParticipantId = currentParticipant?.participantId;
  const currentName = currentParticipant?.name || "Utilizador";

  const handleSave9Card = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParticipantId || !game) return;
    if (items9.some((it) => !it.trim())) {
      toast.error("Preenche as 9 posições do cartão!");
      return;
    }

    try {
      const res = await fetch(`/api/parties/${partyId}/games/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_scratch_card",
          gameId: game.id,
          participantId: activeParticipantId,
          items: items9,
        }),
      });

      const data = await res.json();
      if (data.card) {
        setCard(data.card);
        setEditorOpen(false);
        toast.success("O teu Cartão 3x3 foi criado com sucesso! 🎉");
      }
    } catch {
      toast.error("Erro ao guardar cartão 3x3");
    }
  };

  const handleToggleCell = async (activityText: string) => {
    if (!card || !game || !activeParticipantId) return;
    try {
      const res = await fetch(`/api/parties/${partyId}/games/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_activity",
          gameId: game.id,
          participantId: activeParticipantId,
          activityToMark: activityText,
        }),
      });
      const data = await res.json();
      if (data.card) {
        setCard(data.card);
        const marked: string[] = JSON.parse(data.card.markedNumbers || "[]");
        if (marked.includes(activityText)) {
          toast.success(`✓ "${activityText}" assinalado no teu Bingo! 🎉`);
          if (marked.length >= 3) {
            toast.success("🔥 BINGO! Já tens várias posições assinaladas!", { duration: 5000 });
          }
        }
      }
    } catch {
      toast.error("Erro ao marcar posição");
    }
  };

  const handleResetGame = async () => {
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
        toast.success("Novo Bingo 3x3 iniciado!");
      }
    } catch {
      toast.error("Erro ao reiniciar Bingo");
    }
  };

  const grid: string[] = card?.numbers ? JSON.parse(card.numbers) : [];
  const marked: string[] = card?.markedNumbers ? JSON.parse(card.markedNumbers) : [];

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/parties/${partyId}/games`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              <Dices className="w-6 h-6 text-purple-500" /> Bingo 3x3 de Atividades
            </h1>
            <p className="text-muted-foreground text-xs">
              Sessão como <span className="font-bold text-foreground">{currentName}</span>. Cada pessoa cria o seu cartão 3x3 (9 posições)!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5">
                  <Edit3 className="w-4 h-4" /> {card ? "Editar o meu Cartão 3x3" : "Criar Cartão 3x3"}
                </Button>
              }
            />
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Cartão de Bingo 3x3 (9 Posições)</DialogTitle>
                <DialogDescription>
                  Escreve ou personaliza as 9 frases/acontecimentos do teu cartão de Bingo.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave9Card} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {items9.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <Label className="text-[11px] font-bold text-muted-foreground">Posição #{idx + 1}</Label>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const copy = [...items9];
                          copy[idx] = e.target.value;
                          setItems9(copy);
                        }}
                        className="text-xs"
                        required
                      />
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-11">
                  Guardar e Jogar no meu Cartão 3x3! 🎉
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={handleResetGame} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Reiniciar Bingo
          </Button>
        </div>
      </div>

      {/* Main Card 3x3 Grid Section */}
      <Card className="border-purple-500/30 shadow-xl bg-gradient-to-b from-card via-card to-purple-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" /> Cartão 3x3 de {currentName}
              {marked.length > 0 && (
                <span className="text-xs bg-purple-600 text-white px-2.5 py-0.5 rounded-full font-extrabold">
                  {marked.length}/9 Assinalados
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!card ? (
            <div className="text-center py-16 text-muted-foreground text-sm space-y-3">
              <Dices className="w-12 h-12 text-purple-400 mx-auto animate-bounce" />
              <div className="font-bold text-lg text-foreground">Ainda não criaste o teu Cartão 3x3!</div>
              <p className="text-xs max-w-md mx-auto">
                Clica no botão <span className="font-bold text-purple-600">&quot;Criar Cartão 3x3&quot;</span> para preencheres as tuas 9 posições da noite!
              </p>
              <Button onClick={() => setEditorOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2">
                <Plus className="w-4 h-4" /> Preencher o meu Cartão 3x3 Agora
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {grid.map((actText, idx) => {
                  const isDone = marked.includes(actText);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleToggleCell(actText)}
                      className={`p-4 rounded-xl font-semibold text-xs sm:text-sm leading-tight transition-all border flex flex-col justify-between text-left min-h-[110px] ${
                        isDone
                          ? "bg-purple-600 text-white border-purple-700 shadow-lg scale-95 ring-2 ring-purple-400/50"
                          : "bg-card hover:bg-purple-500/10 text-foreground border-border/80 shadow-sm"
                      }`}
                    >
                      <span>{actText}</span>
                      <div className="flex justify-end pt-2">
                        {isDone ? (
                          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> ✓ FEITO
                          </span>
                        ) : (
                          <span className="text-[10px] opacity-50">Toca p/ marcar</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-muted-foreground text-center pt-4 border-t flex items-center justify-center gap-2">
                <span>💡 Toca nas células do teu Bingo à medida que os acontecimentos se realizarem na festa!</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
