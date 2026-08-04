import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password, partyId, partyPassword, isManager, participantName } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Nome de utilizador e password são obrigatórios" }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Este nome de utilizador já está em uso" }, { status: 400 });
    }

    let role = "user";
    let targetPartyId = partyId;

    // Check if registering as manager (e.g., initial manager registration)
    if (isManager) {
      // Check if manager already exists
      const existingManager = await prisma.user.findFirst({
        where: { role: "manager" },
      });
      if (existingManager) {
        return NextResponse.json({ error: "Já existe uma conta de Gestor registada no sistema" }, { status: 400 });
      }
      role = "manager";
    } else {
      // Normal user joining a party
      if (!partyId) {
        return NextResponse.json({ error: "É necessário selecionar uma festa para registar como utilizador" }, { status: 400 });
      }

      const party = await prisma.party.findUnique({
        where: { id: partyId },
      });

      if (!party) {
        return NextResponse.json({ error: "Festa não encontrada" }, { status: 404 });
      }

      // If party requires password, check it
      if (party.accessPassword && party.accessPassword !== partyPassword) {
        return NextResponse.json({ error: "Palavra-passe da festa incorreta" }, { status: 401 });
      }
    }

    // Create User
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash: hashPassword(password),
        role,
      },
    });

    let participantId: string | undefined = undefined;

    // If joining a party, create or link Participant
    if (targetPartyId) {
      const pName = participantName || username;
      
      // Check if participant with this name already exists in the party without a user
      const existingParticipant = await prisma.participant.findFirst({
        where: {
          partyId: targetPartyId,
          name: pName,
          userId: null,
        },
      });

      if (existingParticipant) {
        // Link user to existing participant
        const updated = await prisma.participant.update({
          where: { id: existingParticipant.id },
          data: { userId: user.id },
        });
        participantId = updated.id;
      } else {
        // Create new participant
        const created = await prisma.participant.create({
          data: {
            name: pName,
            partyId: targetPartyId,
            userId: user.id,
          },
        });
        participantId = created.id;

        // Initialize penalty balance for new participant
        await prisma.penaltyBalance.create({
          data: {
            participantId: created.id,
            balance: 0,
          },
        });
      }
    }

    await setSessionCookie({
      userId: user.id,
      username: user.username,
      role: user.role as "manager" | "user",
      partyId: targetPartyId,
      participantId,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        participantId,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: error.message || "Erro ao efetuar registo" }, { status: 500 });
  }
}
