import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Texto inválido" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Analisa o seguinte texto de compras de uma festa e extrai todos os produtos mencionados com nome, quantidade, unidade (ex: "un", "Caixas", "Garrafas", "kg", "Packs"), preço unitário em Euros (€) e preço total em Euros (€).

Devolve APENAS um JSON válido no seguinte formato sem texto adicional ou markdown format blocks:
[
  {
    "name": "Caixas de Minis",
    "quantity": 7,
    "unit": "Caixas",
    "unitPrice": 15.0,
    "totalPrice": 105.0
  }
]

Texto de compras:
"${text}"`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim().replace(/```json|```/g, "").trim();
        const items = JSON.parse(responseText);

        return NextResponse.json({ success: true, items });
      } catch (geminiError) {
        console.error("Gemini AI text parsing error, using regex fallback:", geminiError);
      }
    }

    // Regex fallback parsing
    const items: any[] = [];
    // Matches patterns like "7 caixas de minis a 15 euros", "15 vodkas cada uma a 7 paus", "5 gins cada um 7.5"
    const lines = text.split(/,|\n|;/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const qtyMatch = line.match(/^(\d+(?:\.\d+)?)\s*(caixas|garrafas|packs|un|kg|l)?\s+(?:de\s+)?(.+?)(?:\s+(?:a|cada|custou)\s+(\d+(?:\.\d+)?))?$/i);

      if (qtyMatch) {
        const qty = parseFloat(qtyMatch[1]);
        const rawUnit = (qtyMatch[2] || "un").toLowerCase();
        let unit = "un";
        if (rawUnit.includes("caixa")) unit = "Caixas";
        else if (rawUnit.includes("garrafa")) unit = "Garrafas";
        else if (rawUnit.includes("pack")) unit = "Packs";
        else if (rawUnit.includes("kg")) unit = "kg";

        const name = qtyMatch[3].trim().replace(/\s+(?:a|cada|por|custaram|cada uma|cada um)\b.*/i, "");
        const priceMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:€|euros|paus|massa)?/gi);
        let unitPrice = 0;
        if (priceMatch && priceMatch.length > 1) {
          unitPrice = parseFloat(priceMatch[priceMatch.length - 1]);
        } else if (qtyMatch[4]) {
          unitPrice = parseFloat(qtyMatch[4]);
        }

        const totalPrice = unitPrice > 0 ? qty * unitPrice : 0;

        items.push({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          quantity: qty,
          unit,
          unitPrice,
          totalPrice,
        });
      }
    }

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Error in parse-text-purchases:", error);
    return NextResponse.json({ error: "Erro ao processar texto de compras com IA" }, { status: 500 });
  }
}
