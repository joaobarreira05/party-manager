import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;

    const coinFlips = await prisma.coinFlip.findMany({
      where: { partyId },
      include: {
        bets: {
          include: { participant: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ coinFlips });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao carregar duelos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;
    const { action, participantId, choice, amount, coinFlipId } = await req.json();

    // 1. Create a 1v1 Duel Room
    if (action === "create_duel") {
      if (!participantId || !choice || !amount) {
        return NextResponse.json({ error: "Escolha o participante, a aposta e Cara/Coroa" }, { status: 400 });
      }

      const pBalance = await prisma.penaltyBalance.findUnique({ where: { participantId } });
      const currentBal = pBalance?.balance || 0;
      if (currentBal - amount < -5) {
        return NextResponse.json({ error: "Saldo insuficiente! Não podes ter menos de -5 penáltis." }, { status: 400 });
      }

      const duel = await prisma.coinFlip.create({
        data: {
          partyId,
          bets: {
            create: {
              participantId,
              choice,
              amount: Number(amount),
            },
          },
        },
        include: {
          bets: { include: { participant: true } },
        },
      });

      return NextResponse.json({ success: true, duel });
    }

    // 2. Join and Automatically Resolve 1v1 Duel
    if (action === "join_duel") {
      if (!participantId || !coinFlipId) {
        return NextResponse.json({ error: "ID do duelo e participante são necessários" }, { status: 400 });
      }

      const duel = await prisma.coinFlip.findUnique({
        where: { id: coinFlipId },
        include: { bets: { include: { participant: true } } },
      });

      if (!duel) return NextResponse.json({ error: "Duelo não encontrado" }, { status: 404 });
      if (duel.result) return NextResponse.json({ error: "Este duelo já foi concluído!" }, { status: 400 });
      if (duel.bets.length >= 2) return NextResponse.json({ error: "Este duelo já tem 2 jogadores!" }, { status: 400 });

      const creatorBet = duel.bets[0];
      if (creatorBet.participantId === participantId) {
        return NextResponse.json({ error: "Não podes jogar contra ti próprio!" }, { status: 400 });
      }

      const opponentChoice = creatorBet.choice === "heads" ? "tails" : "heads";

      const pBalance = await prisma.penaltyBalance.findUnique({ where: { participantId } });
      const currentBal = pBalance?.balance || 0;
      if (currentBal - creatorBet.amount < -5) {
        return NextResponse.json({ error: "Saldo insuficiente para aceitar o duelo!" }, { status: 400 });
      }

      // Random Coin Flip Result ("heads" or "tails")
      const result = Math.random() < 0.5 ? "heads" : "tails";

      // Add opponent bet and mark duel result as finished
      await prisma.coinFlipBet.create({
        data: {
          coinFlipId,
          participantId,
          choice: opponentChoice,
          amount: creatorBet.amount,
        },
      });

      const updatedDuel = await prisma.coinFlip.update({
        where: { id: coinFlipId },
        data: { result },
        include: { bets: { include: { participant: true } } },
      });

      const winnerBet = updatedDuel.bets.find((b) => b.choice === result);
      const loserBet = updatedDuel.bets.find((b) => b.choice !== result);

      if (winnerBet && loserBet) {
        await prisma.penaltyBalance.upsert({
          where: { participantId: winnerBet.participantId },
          update: { balance: { increment: winnerBet.amount } },
          create: { participantId: winnerBet.participantId, balance: winnerBet.amount },
        });

        await prisma.penaltyBalance.upsert({
          where: { participantId: loserBet.participantId },
          update: { balance: { decrement: loserBet.amount } },
          create: { participantId: loserBet.participantId, balance: -loserBet.amount },
        });

        await prisma.penaltyTransaction.create({
          data: {
            partyId,
            fromId: winnerBet.participantId,
            toId: loserBet.participantId,
            amount: loserBet.amount,
            reason: `Perdeu Duelo de Moeda contra ${winnerBet.participant?.name}`,
            status: "pending",
            confirmationsNeeded: 3,
          },
        });
      }

      return NextResponse.json({
        success: true,
        result,
        winner: winnerBet?.participant,
        loser: loserBet?.participant,
        duel: updatedDuel,
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro no duelo de moeda" }, { status: 500 });
  }
}
