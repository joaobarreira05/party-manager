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
      take: 10,
    });

    return NextResponse.json({ coinFlips });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao carregar moeda ao ar" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;
    const { participantId, choice, amount } = await req.json();

    if (!participantId || !choice || !amount) {
      return NextResponse.json({ error: "Escolha (cara/coroa), participante e montante são obrigatórios" }, { status: 400 });
    }

    // Check penalty balance - cannot go below -5
    const pBalance = await prisma.penaltyBalance.findUnique({
      where: { participantId },
    });
    const currentBal = pBalance?.balance || 0;
    if (currentBal - amount < -5) {
      return NextResponse.json({ error: "Não podes apostar! O teu saldo não pode ser menor que -5 penáltis." }, { status: 400 });
    }

    // Spin coin randomly: "heads" or "tails"
    const result = Math.random() < 0.5 ? "heads" : "tails";
    const isWinner = choice === result;

    const coinFlip = await prisma.coinFlip.create({
      data: {
        partyId,
        result,
        bets: {
          create: {
            participantId,
            choice,
            amount,
          },
        },
      },
      include: {
        bets: {
          include: { participant: true },
        },
      },
    });

    // Update penalty balance
    if (isWinner) {
      // Winner gains penalty points (+amount)
      await prisma.penaltyBalance.upsert({
        where: { participantId },
        update: { balance: { increment: amount } },
        create: { participantId, balance: amount },
      });
    } else {
      // Loser gets penalty (-amount) and creates pending drink transaction
      await prisma.penaltyBalance.upsert({
        where: { participantId },
        update: { balance: { decrement: amount } },
        create: { participantId, balance: -amount },
      });

      await prisma.penaltyTransaction.create({
        data: {
          partyId,
          toId: participantId,
          amount,
          reason: `Perdeu na Moeda ao Ar (${choice === "heads" ? "Cara" : "Coroa"})`,
          status: "pending",
          confirmationsNeeded: 3,
        },
      });
    }

    return NextResponse.json({
      coinFlip,
      result,
      isWinner,
      message: isWinner ? `Ganhaste! A moeda deu ${result === "heads" ? "Cara" : "Coroa"}.` : `Perdeste! A moeda deu ${result === "heads" ? "Cara" : "Coroa"}. Ganhaste ${amount} penálti(s) para beber!`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao rodar moeda" }, { status: 500 });
  }
}
