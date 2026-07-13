import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const partyId = formData.get("partyId") as string;
    const storeName = formData.get("storeName") as string | null;
    const notes = formData.get("notes") as string | null;
    const dateStr = formData.get("date") as string | null;

    if (!file || !partyId) {
      return NextResponse.json({ error: "Ficheiro e partyId são obrigatórios" }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", partyId);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name) || ".jpg";
    const filename = `receipt-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Save to database
    const receipt = await prisma.receipt.create({
      data: {
        imagePath: `/uploads/${partyId}/${filename}`,
        storeName: storeName || null,
        date: dateStr ? new Date(dateStr) : null,
        notes: notes || null,
        partyId,
      },
    });

    return NextResponse.json({ success: true, receipt });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Erro ao fazer upload" }, { status: 500 });
  }
}
