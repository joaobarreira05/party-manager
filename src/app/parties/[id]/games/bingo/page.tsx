"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Dices, ArrowLeft, RefreshCw, CheckCircle2, Sparkles, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function BingoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;

  const [participants, setParticipants] = useState<any[]>([]);
  const [participantId, setParticipantId] = useState("");
  const [game, setGame] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);

  const loadData = async () => {
    try {
      const resP = await fetch(`/api/parties/${partyId}/penalties`);
      const dataP = await resP.json();
      if (dataP.participants) setParticipants(dataP.participants);

      const resG = await fetch(`/api/parties/${partyId}/games/bingo`);
      const dataG = await resG.json();
      if (dataG.game) {
        setGame(dataG.game);
        setDrawnNumbers(JSON.parse(dataG.game.drawnNumbers || "[]"));
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

  const handleDrawNumber = async () => {
    if (!game) return;
    setDrawing(true);
    try {
      const res = await fetch(`/api/parties/${partyId}/games/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draw_number", gameId: game.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao sortear");
        setDrawing(false);
        return;
      }

      toast.success(`🎉 NÚMERO SORTEADO: ${data.drawnNumber}!`);
      setDrawnNumbers(JSON.parse(data.game.drawnNumbers || "[]"));
      setGame(data.game);
    } catch (e) {
      toast.error("Erro ao sortear número");
    } finally {
      setDrawing(false);
    }
  };

  const handleMarkCell = async (num: number) => {
    if (!card || !game) return;
    try {
      const res = await fetch(`/api/parties/${partyId}/games/bingo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_number", gameId: game.id, participantId: card.participantId, numberToMark: num }),
      });
      const data = await res.json();
      if (data.card) {
        setCard(data.card);
        toast.success(`Número ${num} marcado!`);
      }
    } catch (e) {
      toast.error("Erro ao marcar número");
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
        setDrawnNumbers([]);
        setCard(null);
        toast.success("Novo jogo de Bingo iniciado!");
      }
    } catch (e) {
      toast.error("Erro ao reiniciar jogo");
    }
  };

  const grid: number[][] = card?.numbers ? JSON.parse(card.numbers) : [];
  const marked: number[] = card?.markedNumbers ? JSON.parse(card.markedNumbers) : [];
  const lastDrawn = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null;

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
              <Dices className="w-6 h-6 text-purple-500" /> Bingo da Festa
            </h1>
            <p className="text-muted-foreground text-xs">Gera o teu cartão 5x5 e sorteia os números em direto!</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Novo Bingo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Draw Column */}
        <Card className="md:col-span-1 border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-card">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Globo de Sorteio</CardTitle>
            <CardDescription>Sorteia um número de 1 a 75</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="w-32 h-32 rounded-full border-4 border-purple-500 bg-background shadow-xl mx-auto flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-purple-600">
                {drawing ? "..." : lastDrawn || "?"}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase mt-1">Último Número</span>
            </div>

            <Button
              onClick={handleDrawNumber}
              disabled={drawing}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 text-base gap-2"
            >
              <Sparkles className="w-5 h-5" />
              {drawing ? "A sortear..." : "SORTEAR NÚMERO! 🎯"}
            </Button>

            <div className="space-y-2 text-left">
              <span className="text-xs font-semibold text-muted-foreground">Números Sorteados ({drawnNumbers.length}/75):</span>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-2 bg-background rounded-lg border text-xs font-mono">
                {drawnNumbers.map((n) => (
                  <span key={n} className="px-2 py-1 bg-purple-500/10 text-purple-600 rounded font-bold">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Column */}
        <Card className="md:col-span-2 border-border/60">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>O Teu Cartão 5x5</span>
              <Select value={participantId} onValueChange={handleGetCard}>
                <SelectTrigger className="w-48">
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!card ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Seleciona o teu nome acima para veres o teu cartão de Bingo!
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-2 text-center font-black text-purple-600 pb-2 border-b">
                  <div>B</div>
                  <div>I</div>
                  <div>N</div>
                  <div>G</div>
                  <div>O</div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {grid.map((row, rIdx) =>
                    row.map((val, cIdx) => {
                      const isMarked = marked.includes(val);
                      const isDrawn = drawnNumbers.includes(val);

                      return (
                        <button
                          key={`${rIdx}-${cIdx}`}
                          type="button"
                          onClick={() => handleMarkCell(val)}
                          className={`h-14 rounded-lg font-bold text-sm transition-all border flex flex-col items-center justify-center ${
                            isMarked
                              ? "bg-purple-600 text-white border-purple-700 shadow-md scale-95"
                              : isDrawn
                              ? "bg-amber-500/20 text-amber-700 border-amber-500 animate-pulse"
                              : "bg-card hover:bg-muted text-foreground"
                          }`}
                        >
                          <span>{val}</span>
                          {isDrawn && !isMarked && <span className="text-[9px] text-amber-600 font-normal">Sorteado!</span>}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="text-xs text-muted-foreground text-center pt-2">
                  Clica num número para marcares. Células amarelas indicam números que já foram sorteados!
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
