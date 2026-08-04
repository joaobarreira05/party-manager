import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;

    const challenges = await prisma.challenge.findMany({
      where: { partyId },
      include: {
        createdBy: true,
        winner: true,
        bets: {
          include: { participant: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ challenges });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro nos desafios" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;
    const { action, createdById, description, challengeId, participantId, amount, prediction, winnerId } = await req.json();

    if (action === "create") {
      if (!createdById || !description) {
        return NextResponse.json({ error: "Descrição e criador são necessários" }, { status: 400 });
      }

      const challenge = await prisma.challenge.create({
        data: {
          partyId,
          createdById,
          description,
          status: "open",
        },
        include: { createdBy: true, bets: true },
      });

      return NextResponse.json({ success: true, challenge });
    }

    if (action === "bet") {
      if (!challengeId || !participantId || !amount) {
        return NextResponse.json({ error: "Dados de aposta incompletos" }, { status: 400 });
      }

      // Check penalty balance (cannot drop below -5)
      const pBalance = await prisma.penaltyBalance.findUnique({ where: { participantId } });
      const currentBal = pBalance?.balance || 0;
      if (currentBal - amount < -5) {
        return NextResponse.json({ error: "Saldo insuficiente! Não podes ter menos de -5 penáltis." }, { status: 400 });
      }

      const bet = await prisma.challengeBet.create({
        data: {
          challengeId,
          participantId,
          amount: Number(amount),
          prediction: prediction || "",
        },
        include: { participant: true },
      });

      return NextResponse.json({ success: true, bet });
    }

    if (action === "resolve") {
      if (!challengeId || !winnerId) {
        return NextResponse.json({ error: "ID do vencedor é obrigatório" }, { status: 400 });
      }

      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
        include: { bets: true },
      });

      if (!challenge) return NextResponse.json({ error: "Desafio não encontrado" }, { status: 404 });

      const updated = await prisma.challenge.update({
        where: { id: challengeId },
        data: {
          status: "resolved",
          winnerId,
        },
        include: { winner: true, createdBy: true, bets: { include: { participant: true } } },
      });

      // Distribute penalty points: winner gets all bets amount to send to others! Losers receive penalties to drink.
      for (const b of challenge.bets) {
        if (b.participantId === winnerId) {
          await prisma.penaltyBalance.upsert({
            where: { participantId: winnerId },
            update: { balance: { increment: b.amount * 2 } },
            create: { participantId: winnerId, balance: b.amount * 2 },
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
              reason: `Perdeu no Desafio: "${challenge.description}"`,
              status: "pending",
              confirmationsNeeded: 3,
            },
          });
        }
      }

      return NextResponse.json({ success: true, challenge: updated });
    }

    return NextResponse.json({ error: "Ação não suportada" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro no desafio" }, { status: 500 });
  }
}
