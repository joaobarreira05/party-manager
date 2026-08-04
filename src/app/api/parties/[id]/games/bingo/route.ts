import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const DEFAULT_PARTY_ACTIVITIES = [
  "Alguém entornou uma bebida 🍺",
  "Alguém foi ao frigorífico buscar gelo 🧊",
  "Alguém começou a cantar karaoke 🎤",
  "Foto de grupo tirada 📸",
  "Dança animada na sala 💃",
  "Alguém partiu um copo ou prato 💥",
  "Pedido de shot em grupo 🍸",
  "Discussão engraçada sobre a música 🎶",
  "Alguém procurou o telemóvel perdido 📱",
  "Chegou a comida encomendada 🍕",
  "Alguém adormeceu no sofá 😴",
  "Brinde ruidoso à festa 🥂",
  "Conversa profunda de madrugada 💬",
  "Mistura de 3 bebidas diferentes 🍹",
  "Rir até chorar 😂",
  "Alguém esqueceu-se de um nome 😅",
  "Jogo de beber improvisado 🎲",
  "Acabou o gelo no congelador 🧊",
  "Selfie engraçada tirada 🤳",
  "Troca de adereços ou óculos 🎩",
  "Música repetida 2 vezes 🎵",
  "Alguém disse 'Melhor festa de sempre!' 🎉",
  "Abraço de grupo 🫂",
  "Alguém bebeu um penálti 🍺",
  "Alguém perdeu um par de chinelos 🩴",
];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;

    let game = await prisma.bingoGame.findFirst({
      where: { partyId },
      include: {
        cards: {
          include: { participant: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!game) {
      game = await prisma.bingoGame.create({
        data: {
          partyId,
          status: "playing",
          drawnNumbers: JSON.stringify(DEFAULT_PARTY_ACTIVITIES),
        },
        include: {
          cards: {
            include: { participant: true },
          },
        },
      });
    }

    return NextResponse.json({ game });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro no bingo de atividades" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;
    const { action, gameId, participantId, activityToMark, customActivity } = await req.json();

    if (action === "get_card") {
      if (!participantId || !gameId) {
        return NextResponse.json({ error: "IDs do participante e jogo são necessários" }, { status: 400 });
      }

      let card = await prisma.bingoCard.findFirst({
        where: { gameId, participantId },
        include: { participant: true },
      });

      if (!card) {
        const game = await prisma.bingoGame.findUnique({ where: { id: gameId } });
        const pool: string[] = JSON.parse(game?.drawnNumbers || JSON.stringify(DEFAULT_PARTY_ACTIVITIES));
        const shuffled = shuffleArray(pool).slice(0, 16); // 4x4 Grid of activities

        card = await prisma.bingoCard.create({
          data: {
            gameId,
            participantId,
            numbers: JSON.stringify(shuffled),
            markedNumbers: JSON.stringify([]),
          },
          include: { participant: true },
        });
      }

      return NextResponse.json({ card });
    }

    if (action === "toggle_activity") {
      const card = await prisma.bingoCard.findFirst({ where: { gameId, participantId } });
      if (!card) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

      let marked: string[] = JSON.parse(card.markedNumbers || "[]");
      if (marked.includes(activityToMark)) {
        marked = marked.filter((a) => a !== activityToMark);
      } else {
        marked.push(activityToMark);
      }

      const updatedCard = await prisma.bingoCard.update({
        where: { id: card.id },
        data: { markedNumbers: JSON.stringify(marked) },
        include: { participant: true },
      });

      return NextResponse.json({ success: true, card: updatedCard });
    }

    if (action === "add_activity") {
      if (!customActivity) return NextResponse.json({ error: "Atividade não fornecida" }, { status: 400 });

      const game = await prisma.bingoGame.findUnique({ where: { id: gameId } });
      if (!game) return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });

      const pool: string[] = JSON.parse(game.drawnNumbers || "[]");
      if (!pool.includes(customActivity)) {
        pool.push(customActivity);
      }

      const updatedGame = await prisma.bingoGame.update({
        where: { id: gameId },
        data: { drawnNumbers: JSON.stringify(pool) },
      });

      return NextResponse.json({ success: true, game: updatedGame });
    }

    if (action === "reset_game") {
      const newGame = await prisma.bingoGame.create({
        data: {
          partyId,
          status: "playing",
          drawnNumbers: JSON.stringify(DEFAULT_PARTY_ACTIVITIES),
        },
        include: { cards: { include: { participant: true } } },
      });
      return NextResponse.json({ success: true, game: newGame });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro no bingo" }, { status: 500 });
  }
}
