import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (session?.role !== "manager") {
      return NextResponse.json({ error: "Acesso negado. Apenas a conta de Gestor pode aceder." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        participants: {
          select: {
            id: true,
            party: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao listar utilizadores" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== "manager") {
      return NextResponse.json({ error: "Acesso negado. Apenas a conta de Gestor pode expulsar contas." }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "ID de utilizador é obrigatório" }, { status: 400 });
    }

    if (userId === session.userId) {
      return NextResponse.json({ error: "Não podes expulsar a tua própria conta de Gestor!" }, { status: 400 });
    }

    // Delete User account (cascade will handle or cleanup participants)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: "Conta expulsa com sucesso!" });
  } catch (error: any) {
    console.error("Kick user error:", error);
    return NextResponse.json({ error: error.message || "Erro ao expulsar utilizador" }, { status: 500 });
  }
}
