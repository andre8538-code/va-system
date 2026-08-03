// src/app/api/grannkontroll/[protokollId]/pdf/route.ts
//
// GET /api/grannkontroll/[protokollId]/pdf
// Hämtar protokoll + grannfastigheter från Supabase och returnerar en
// färdig PDF-fil (inte en länk till en fil - PDF:en byggs live vid varje anrop).

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { GrannkontrollPDF } from "@/lib/pdf/GrannkontrollPDF";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ protokollId: string }> }
) {
  try {
    const { protokollId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }

    const { data: protokoll, error: protokollError } = await supabase
      .from("grannkontroll_protokoll")
      .select("*")
      .eq("id", protokollId)
      .single();

    if (protokollError || !protokoll) {
      return NextResponse.json({ error: "Protokoll hittades inte" }, { status: 404 });
    }

    const { data: grannar, error: grannarError } = await supabase
      .from("grannkontroll_fastighet")
      .select("*")
      .eq("protokoll_id", protokollId)
      .order("fastighetsbeteckning");

    if (grannarError) {
      return NextResponse.json({ error: grannarError.message }, { status: 500 });
    }

    const buffer = await renderToBuffer(
      GrannkontrollPDF({ protokoll, grannar: grannar ?? [] })
    );

    const filnamn = `Grannkontrollprotokoll_${protokoll.initiativ_fastighet.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filnamn}"`,
      },
    });
  } catch (err) {
    console.error("PDF-generering misslyckades:", err);
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
