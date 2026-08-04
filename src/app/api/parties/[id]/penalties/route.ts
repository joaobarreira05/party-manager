import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;

    // Get all participants of this party with their penalty balances & transactions
    const participants = await prisma.participant.findMany({
      where: { partyId },
      include: {
        penaltyBalance: true,
        drinksToConfirm: {
          include: { confirmedBy: true },
        },
      },
    });

    // Ensure all participants have a PenaltyBalance
    for (const p of participants) {
      if (!p.penaltyBalance) {
        await prisma.penaltyBalance.create({
          data: { participantId: p.id, balance: 0 },
        });
      }
    }

    const updatedParticipants = await prisma.participant.findMany({
      where: { partyId },
      include: {
        penaltyBalance: true,
      },
      orderBy: { name: "asc" },
    });

    const pendingTransactions = await prisma.penaltyTransaction.findMany({
      where: { partyId, status: "pending" },
      include: {
        to: true,
        from: true,
        confirmations: {
          include: { confirmedBy: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      participants: updatedParticipants,
      pendingTransactions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao carregar penáltis" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: partyId } = await params;
    const session = await getSession();
    const body = await req.json();
    const { action } = body;

    if (action === "transfer") {
      // Transfer penalties to someone else (min 0.5)
      const { fromParticipantId, toParticipantId, amount } = body;

      if (!fromParticipantId || !toParticipantId || !amount) {
        return NextResponse.json({ error: "Dados incompletos para transferência" }, { status: 400 });
      }

      if (amount < 0.5) {
        return NextResponse.json({ error: "A quantidade mínima para envio é 0.5 penáltis" }, { status: 400 });
      }

      // Check balance of sender: cannot drop below -5
      const senderBalance = await prisma.penaltyBalance.findUnique({
        where: { participantId: fromParticipantId },
      });

      const currentBal = senderBalance?.balance || 0;
      if (currentBal - amount < -5) {
        return NextResponse.json({ error: "Não podes ficar com menos de -5 penáltis!" }, { status: 400 });
      }

      // Update sender balance (subtract)
      await prisma.penaltyBalance.upsert({
        where: { participantId: fromParticipantId },
        update: { balance: { decrement: amount } },
        create: { participantId: fromParticipantId, balance: -amount },
      });

      // Update receiver balance (subtract - meaning they owe drinking it)
      await prisma.penaltyBalance.upsert({
        where: { participantId: toParticipantId },
        update: { balance: { decrement: amount } },
        create: { participantId: toParticipantId, balance: -amount },
      });

      // Create pending transaction for receiver to drink
      const tx = await prisma.penaltyTransaction.create({
        data: {
          partyId,
          fromId: fromParticipantId,
          toId: toParticipantId,
          amount,
          reason: "Envio de penálti",
          status: "pending",
          confirmationsNeeded: 3,
        },
      });

      return NextResponse.json({ success: true, transaction: tx });
    }

    if (action === "confirm_drink") {
      // 3 people confirmation to clear a drank penalty
      const { transactionId, confirmedById } = body;

      if (!transactionId || !confirmedById) {
        return NextResponse.json({ error: "IDs de transação e confirmador são necessários" }, { status: 400 });
      }

      const tx = await prisma.penaltyTransaction.findUnique({
        where: { id: transactionId },
        include: { confirmations: true, to: true },
      });

      if (!tx) {
        return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
      }

      // Cannot confirm your own drink
      if (tx.toId === confirmedById) {
        return NextResponse.json({ error: "Não podes confirmar o teu próprio penálti!" }, { status: 400 });
      }

      // Check if already confirmed by this person
      const alreadyConfirmed = tx.confirmations.some((c) => c.confirmedById === confirmedById);
      if (alreadyConfirmed) {
        return NextResponse.json({ error: "Já confirmaste esta bebida" }, { status: 400 });
      }

      // Add confirmation
      await prisma.drinkConfirmation.create({
        data: {
          partyId,
          participantId: tx.toId,
          confirmedById,
          transactionId,
        },
      });

      const updatedConfirmationsCount = tx.confirmations.length + 1;

      // If reached 3 confirmations, mark transaction as cleared and restore balance
      if (updatedConfirmationsCount >= 3) {
        await prisma.penaltyTransaction.update({
          where: { id: transactionId },
          data: { status: "cleared" },
        });

        // Restore balance for drinker (+amount)
        await prisma.penaltyBalance.update({
          where: { participantId: tx.toId },
          data: { balance: { increment: tx.amount } },
        });
      }

      return NextResponse.json({
        success: true,
        confirmationsCount: updatedConfirmationsCount,
        cleared: updatedConfirmationsCount >= 3,
      });
    }

    return NextResponse.json({ error: "Ação não reconhecida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro no sistema de penáltis" }, { status: 500 });
  }
}
