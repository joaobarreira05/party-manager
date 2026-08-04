import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const SUITS = [
  { id: 1, name: "Ás de Espadas ♠️", suit: "spades", symbol: "♠️", color: "text-slate-900 font-black" },
  { id: 2, name: "Ás de Ouros ♦️", suit: "diamonds", symbol: "♦️", color: "text-red-600 font-black" },
  { id: 3, name: "Ás de Paus ♣️", suit: "clubs", symbol: "♣️", color: "text-slate-900 font-black" },
  { id: 4, name: "Ás de Copas ♥️", suit: "hearts", symbol: "♥️", color: "text-red-600 font-black" },
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;

    let currentRace = await prisma.horseRace.findFirst({
      where: { partyId },
      include: {
        bets: {
          include: { participant: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!currentRace) {
      currentRace = await prisma.horseRace.create({
        data: {
          partyId,
          status: "betting",
        },
        include: {
          bets: {
            include: { participant: true },
          },
        },
      });
    }

    return NextResponse.json({ currentRace });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao carregar corrida" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;
    const { action, raceId, participantId, horseNumber, amount } = await req.json();

    if (action === "bet") {
      if (!participantId || !horseNumber || !amount || !raceId) {
        return NextResponse.json({ error: "Dados de aposta incompletos" }, { status: 400 });
      }

      const race = await prisma.horseRace.findUnique({ where: { id: raceId } });
      if (!race || race.status !== "betting") {
        return NextResponse.json({ error: "As apostas para esta corrida já estão FECHADAS!" }, { status: 400 });
      }

      const pBalance = await prisma.penaltyBalance.findUnique({ where: { participantId } });
      const currentBal = pBalance?.balance || 0;
      if (currentBal - amount < -5) {
        return NextResponse.json({ error: "Não podes apostar! Saldo mínimo: -5 penáltis." }, { status: 400 });
      }

      const bet = await prisma.horseRaceBet.create({
        data: {
          raceId,
          participantId,
          horseNumber: Number(horseNumber),
          amount: Number(amount),
        },
        include: { participant: true },
      });

      return NextResponse.json({ success: true, bet });
    }

    if (action === "lock_bets") {
      const race = await prisma.horseRace.update({
        where: { id: raceId },
        data: { status: "racing" },
        include: { bets: { include: { participant: true } } },
      });
      return NextResponse.json({ success: true, race });
    }

    if (action === "finish_race") {
      const { winningHorse } = await req.json();

      const race = await prisma.horseRace.findUnique({
        where: { id: raceId },
        include: { bets: { include: { participant: true } } },
      });

      if (!race) {
        return NextResponse.json({ error: "Corrida não encontrada" }, { status: 404 });
      }

      const updatedRace = await prisma.horseRace.update({
        where: { id: raceId },
        data: {
          status: "finished",
          winnerHorse: Number(winningHorse),
        },
        include: { bets: { include: { participant: true } } },
      });

      // Settle bets
      for (const b of race.bets) {
        const won = b.horseNumber === Number(winningHorse);
        if (won) {
          await prisma.penaltyBalance.upsert({
            where: { participantId: b.participantId },
            update: { balance: { increment: b.amount * 2 } },
            create: { participantId: b.participantId, balance: b.amount * 2 },
          });
        } else {
          await prisma.penaltyBalance.upsert({
            where: { participantId: b.participantId },
            update: { balance: { decrement: b.amount } },
            create: { participantId: b.participantId, balance: -b.amount },
          });

          await prisma.penaltyTransaction.create({
            data: {
              partyId,
              toId: b.participantId,
              amount: b.amount,
              reason: `Perdeu na Corrida de Áses (Ás #${b.horseNumber})`,
              status: "pending",
              confirmationsNeeded: 3,
            },
          });
        }
      }

      return NextResponse.json({ success: true, winningHorse, race: updatedRace });
    }

    if (action === "new_race") {
      const newRace = await prisma.horseRace.create({
        data: {
          partyId,
          status: "betting",
        },
        include: {
          bets: {
            include: { participant: true },
          },
        },
      });
      return NextResponse.json({ success: true, currentRace: newRace });
    }

    return NextResponse.json({ error: "Ação não suportada" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro na corrida de cartas" }, { status: 500 });
  }
}
