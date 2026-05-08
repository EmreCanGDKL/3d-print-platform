import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET() {
  try {
    const products = await prisma.model.findMany({
      where: { type: "CATALOG", status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Ürün listesi okunamadı:", error);
    return NextResponse.json({ success: false, message: "Listeleme başarısız." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, message: "Oturum gerekli." }, { status: 401 });
    }

    const response = await fetch(`${backendUrl}/api/models`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(await request.json()),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Ürün kaydedilirken hata oluştu:", error);
    return NextResponse.json({ success: false, message: "Kayıt başarısız." }, { status: 500 });
  }
}
