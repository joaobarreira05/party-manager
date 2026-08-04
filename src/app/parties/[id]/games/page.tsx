"use client";

import { use } from "react";
import Link from "next/link";
import { Coins, Trophy, Sparkles, Flame, Dices, Beer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GamesHubPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const partyId = resolvedParams.id;

  const games = [
    {
      title: "Moeda ao Ar (Coin Flip)",
      description: "Atira a moeda 3D ao ar! Aposta cara ou coroa em penáltis de bebidas.",
      icon: Coins,
      href: `/parties/${partyId}/games/coin-flip`,
      color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30",
      buttonText: "Jogar Moeda",
    },
    {
      title: "Corrida de Cavalos",
      description: "Aposta no teu cavalo! O gestor dá a ordem de partida e os cavalos correm em tempo real.",
      icon: Trophy,
      href: `/parties/${partyId}/games/horse-race`,
      color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30",
      buttonText: "Ver Corrida",
    },
    {
      title: "Bingo da Festa",
      description: "Gera o teu cartão 5x5. Sorteia números e compete com a malta para fazer Bingo!",
      icon: Dices,
      href: `/parties/${partyId}/games/bingo`,
      color: "from-purple-500/20 to-pink-500/10 border-purple-500/30",
      buttonText: "Abrir Bingo",
    },
    {
      title: "Desafios & Apostas",
      description: "Cria desafios personalizados (ex: 'Quem beber 3 shotes de seguida') e faz apostas livremente.",
      icon: Flame,
      href: `/parties/${partyId}/games/challenges`,
      color: "from-red-500/20 to-orange-500/10 border-red-500/30",
      buttonText: "Ver Desafios",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
          <Sparkles className="w-4 h-4" /> Jogos & Apostas da Festa
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Centro de Jogos da Festa</h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Escolhe um jogo abaixo. Todas as apostas usam o sistema de penáltis de bebidas!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {games.map((g) => (
          <Card key={g.title} className={`border bg-gradient-to-br ${g.color} shadow-lg hover:shadow-xl transition-all`}>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-3 bg-background/80 rounded-2xl shadow-inner border border-border/50">
                <g.icon className="w-8 h-8 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">{g.title}</CardTitle>
                <CardDescription className="text-xs mt-1">{g.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={g.href}>
                <Button className="w-full font-bold gap-2">
                  {g.buttonText} →
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
