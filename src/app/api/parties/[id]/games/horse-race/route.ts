import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;

    // Get current active or latest race
    let currentRace = await prisma.horseRace.findFirst({
      where: { partyId },
      include: {
        bets: {
          include: { participant: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // If no race exists or current is finished, allow starting a new one
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
        return NextResponse.json({ error: "As apostas para esta corrida já estão fechadas" }, { status: 400 });
      }

      // Check penalty balance
      const pBalance = await prisma.penaltyBalance.findUnique({ where: { participantId } });
      const currentBal = pBalance?.balance || 0;
      if (currentBal - amount < -5) {
        return NextResponse.json({ error: "Não podes apostar! O teu saldo de penáltis não pode ser menor que -5." }, { status: 400 });
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

    if (action === "start_race") {
      // Manager starts race and resolves winner
      const race = await prisma.horseRace.findUnique({
        where: { id: raceId },
        include: { bets: { include: { participant: true } } },
      });

      if (!race) {
        return NextResponse.json({ error: "Corrida não encontrada" }, { status: 404 });
      }

      // Select random winning horse 1..6
      const winningHorse = Math.floor(Math.random() * 6) + 1;

      // Update race status
      const updatedRace = await prisma.horseRace.update({
        where: { id: raceId },
        data: {
          status: "finished",
          winnerHorse: winningHorse,
        },
        include: { bets: { include: { participant: true } } },
      });

      // Settle all bets
      for (const b of race.bets) {
        const won = b.horseNumber === winningHorse;
        if (won) {
          // Winner gets positive balance (can send penalties to others)
          await prisma.penaltyBalance.upsert({
            where: { participantId: b.participantId },
            update: { balance: { increment: b.amount * 2 } },
            create: { participantId: b.participantId, balance: b.amount * 2 },
          });
        } else {
          // Loser gets penalty to drink
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
              reason: `Perdeu na Corrida de Cavalos (Cavalo #${b.horseNumber})`,
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
    return NextResponse.json({ error: error.message || "Erro na corrida de cavalos" }, { status: 500 });
  }
}
