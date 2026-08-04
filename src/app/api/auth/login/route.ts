import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password, partyId } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Nome de utilizador e password são obrigatórios" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
      include: {
        participants: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilizador ou password incorretos" }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Utilizador ou password incorretos" }, { status: 401 });
    }

    // Find participant for this party if partyId is provided
    let participantId: string | undefined = undefined;
    if (partyId) {
      const participant = user.participants.find((p) => p.partyId === partyId);
      participantId = participant?.id;
    } else if (user.participants.length > 0) {
      participantId = user.participants[0].id;
    }

    await setSessionCookie({
      userId: user.id,
      username: user.username,
      role: user.role as "manager" | "user",
      partyId,
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
    console.error("Login error:", error);
    return NextResponse.json({ error: error.message || "Erro ao efetuar login" }, { status: 500 });
  }
}
