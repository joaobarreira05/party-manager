import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const textInput = formData.get("text") as string | null;
    const file = formData.get("file") as File | null;
    const partyId = formData.get("partyId") as string;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!partyId) {
      return NextResponse.json({ error: "partyId é obrigatório" }, { status: 400 });
    }

    if (!textInput && !file) {
      return NextResponse.json({ error: "Fornece um texto ou uma imagem da fatura" }, { status: 400 });
    }

    let parsedItems: Array<{
      name: string;
      quantity: number;
      unit: string;
      totalPrice: number;
      unitPrice: number;
      isAlcohol?: boolean;
    }> = [];

    let rawText = textInput || "";

    // 1. If Text input provided
    if (rawText) {
      // If Gemini API Key exists, call Gemini for rich structured parsing
      if (apiKey) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `Extrai os itens de compras do seguinte texto. Retorna APENAS um array JSON de objetos com as seguintes chaves: "name" (string), "quantity" (number), "unit" (string ex: "un", "pack", "kg", "garrafa"), "totalPrice" (number), "unitPrice" (number), "isAlcohol" (boolean).
Texto:
${rawText}`,
                      },
                    ],
                  },
                ],
              }),
            }
          );
          const geminiData = await geminiRes.json();
          const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              parsedItems = JSON.parse(jsonMatch[0]);
            }
          }
        } catch (e) {
          console.error("Gemini API error, falling back to smart regex:", e);
        }
      }

      // Fallback regex parsing if Gemini is not set or failed
      if (parsedItems.length === 0) {
        const lines = rawText.split("\n").filter((l) => l.trim().length > 0);
        for (const line of lines) {
          // Match patterns like: "Vodka 5 garrafas 39.95" or "Cerveja 3x 44.85" or "Carne 1.5kg 12.50"
          const match = line.match(/^(.+?)\s+(?:(\d+(?:\.\d+)?)\s*(x|pack|packs|un|garrafas|kg|g|frasco|pacote)?\s+)?(?:(\d+(?:\.\d+)?)\s*€?)$/i);
          if (match) {
            const name = match[1].trim();
            const qty = match[2] ? parseFloat(match[2]) : 1;
            const unit = match[3] || "un";
            const totalPrice = parseFloat(match[4]);
            const unitPrice = Math.round((totalPrice / (qty || 1)) * 100) / 100;
            const isAlcohol = /vodka|cerveja|vinho|whisky|gin|licor|rum|tequila|super bock|sagres/i.test(name);

            parsedItems.push({
              name,
              quantity: qty,
              unit,
              totalPrice,
              unitPrice,
              isAlcohol,
            });
          } else {
            // Simple fallback line parser
            const parts = line.split(/\s+/);
            const price = parseFloat(parts[parts.length - 1]?.replace(",", "."));
            if (!isNaN(price) && parts.length > 1) {
              const name = parts.slice(0, -1).join(" ");
              parsedItems.push({
                name,
                quantity: 1,
                unit: "un",
                totalPrice: price,
                unitPrice: price,
                isAlcohol: /vodka|cerveja|vinho|whisky|gin|licor|rum|tequila/i.test(name),
              });
            }
          }
        }
      }
    }

    // 2. If Image file provided
    if (file && parsedItems.length === 0) {
      if (apiKey) {
        try {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const mimeType = file.type || "image/jpeg";

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        inline_data: {
                          mime_type: mimeType,
                          data: base64,
                        },
                      },
                      {
                        text: `Analisa a foto desta fatura/talão de compras. Extrai todos os itens comprados. Retorna APENAS um array JSON de objetos com: "name" (string), "quantity" (number), "unit" (string ex: "un", "kg", "garrafa"), "totalPrice" (number), "unitPrice" (number), "isAlcohol" (boolean).`,
                      },
                    ],
                  },
                ],
              }),
            }
          );
          const geminiData = await geminiRes.json();
          const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              parsedItems = JSON.parse(jsonMatch[0]);
            }
          }
        } catch (e) {
          console.error("Gemini Vision API error:", e);
        }
      }
    }

    // Existing categories in this party for auto-matching
    const categories = await prisma.category.findMany({ where: { partyId } });

    return NextResponse.json({
      success: true,
      items: parsedItems,
      categories,
    });
  } catch (error: any) {
    console.error("AI parse error:", error);
    return NextResponse.json({ error: error.message || "Erro ao analisar compras com IA" }, { status: 500 });
  }
}
