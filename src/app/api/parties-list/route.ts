import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const parties = await prisma.party.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ parties });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao listar festas" }, { status: 500 });
  }
}
