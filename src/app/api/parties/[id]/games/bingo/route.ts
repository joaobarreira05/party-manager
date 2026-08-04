import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
          drawnNumbers: JSON.stringify([]),
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
    return NextResponse.json({ error: error.message || "Erro no bingo" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;
    const { action, gameId, participantId, items, activityToMark } = await req.json();

    if (action === "get_card") {
      if (!participantId || !gameId) {
        return NextResponse.json({ error: "IDs do participante e jogo são necessários" }, { status: 400 });
      }

      const card = await prisma.bingoCard.findFirst({
        where: { gameId, participantId },
        include: { participant: true },
      });

      return NextResponse.json({ card });
    }

    if (action === "create_scratch_card") {
      if (!participantId || !gameId || !Array.isArray(items) || items.length !== 25) {
        return NextResponse.json({ error: "É necessário exatamente 25 frases para criar o cartão 5x5!" }, { status: 400 });
      }

      // Check if existing card
      const existing = await prisma.bingoCard.findFirst({
        where: { gameId, participantId },
      });

      let card;
      if (existing) {
        card = await prisma.bingoCard.update({
          where: { id: existing.id },
          data: {
            numbers: JSON.stringify(items),
            markedNumbers: JSON.stringify([]),
          },
          include: { participant: true },
        });
      } else {
        card = await prisma.bingoCard.create({
          data: {
            gameId,
            participantId,
            numbers: JSON.stringify(items),
            markedNumbers: JSON.stringify([]),
          },
          include: { participant: true },
        });
      }

      return NextResponse.json({ success: true, card });
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

    if (action === "reset_game") {
      const newGame = await prisma.bingoGame.create({
        data: {
          partyId,
          status: "playing",
          drawnNumbers: JSON.stringify([]),
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
