import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function generateBingoGrid(): number[][] {
  const grid: number[][] = [];
  const getCol = (min: number, max: number) => {
    const nums: number[] = [];
    while (nums.length < 5) {
      const n = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!nums.includes(n)) nums.push(n);
    }
    return nums;
  };

  const b = getCol(1, 15);
  const i = getCol(16, 30);
  const n = getCol(31, 45);
  const g = getCol(46, 60);
  const o = getCol(61, 75);

  for (let r = 0; r < 5; r++) {
    grid.push([b[r], i[r], n[r], g[r], o[r]]);
  }
  return grid;
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
    const { action, gameId, participantId, numberToMark } = await req.json();

    if (action === "get_card") {
      if (!participantId || !gameId) {
        return NextResponse.json({ error: "IDs do participante e jogo são necessários" }, { status: 400 });
      }

      let card = await prisma.bingoCard.findFirst({
        where: { gameId, participantId },
        include: { participant: true },
      });

      if (!card) {
        const numbers = generateBingoGrid();
        card = await prisma.bingoCard.create({
          data: {
            gameId,
            participantId,
            numbers: JSON.stringify(numbers),
            markedNumbers: JSON.stringify([]),
          },
          include: { participant: true },
        });
      }

      return NextResponse.json({ card });
    }

    if (action === "draw_number") {
      const game = await prisma.bingoGame.findUnique({ where: { id: gameId } });
      if (!game) return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });

      const drawn: number[] = JSON.parse(game.drawnNumbers || "[]");
      if (drawn.length >= 75) {
        return NextResponse.json({ error: "Todos os números já foram sorteados!" }, { status: 400 });
      }

      let nextNum: number;
      do {
        nextNum = Math.floor(Math.random() * 75) + 1;
      } while (drawn.includes(nextNum));

      drawn.push(nextNum);

      const updatedGame = await prisma.bingoGame.update({
        where: { id: gameId },
        data: { drawnNumbers: JSON.stringify(drawn) },
        include: { cards: { include: { participant: true } } },
      });

      return NextResponse.json({ success: true, drawnNumber: nextNum, game: updatedGame });
    }

    if (action === "mark_number") {
      const card = await prisma.bingoCard.findFirst({ where: { gameId, participantId } });
      if (!card) return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });

      const marked: number[] = JSON.parse(card.markedNumbers || "[]");
      if (!marked.includes(numberToMark)) {
        marked.push(numberToMark);
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
