// src/app/api/grannkontroll/generate/route.ts
//
// POST body: { project_id, case_id?, initiativ_fastighet, omrade?, syfte?, skyddsavstand_m? }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hamtaFastighetGeometri, hittaGrannarInomRadie } from "@/lib/lantmateriet";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      case_id,
      initiativ_fastighet,
      omrade,
      syfte,
      skyddsavstand_m = 200,
    } = body;

    if (!project_id || !initiativ_fastighet) {
      return NextResponse.json(
        { error: "project_id och initiativ_fastighet krävs" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }

    const fastighet = await hamtaFastighetGeometri(initiativ_fastighet);
    const grannar = await hittaGrannarInomRadie(fastighet, skyddsavstand_m);

    const { data: protokoll, error: protokollError } = await supabase
      .from("grannkontroll_protokoll")
      .insert({
        project_id,
        case_id: case_id ?? null,
        initiativ_fastighet,
        omrade: omrade ?? null,
        syfte: syfte ?? null,
        skyddsavstand_m,
        center_lat: fastighet.centroid.lat,
        center_lng: fastighet.centroid.lng,
        status: "pågående",
        created_by: user.id,
      })
      .select()
      .single();

    if (protokollError) {
      return NextResponse.json({ error: protokollError.message }, { status: 500 });
    }

    if (grannar.length > 0) {
      const rows = grannar.map((g) => ({
        protokoll_id: protokoll.id,
        fastighetsbeteckning: g.beteckning,
        avstand_m: g.avstand_m,
        svar_erhallet: false,
        lage_markerat_karta: false,
      }));

      const { error: fastigheterError } = await supabase
        .from("grannkontroll_fastighet")
        .insert(rows);

      if (fastigheterError) {
        return NextResponse.json({ error: fastigheterError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      protokoll,
      antal_grannar: grannar.length,
    });
  } catch (err) {
    console.error("Grannkontroll-generering misslyckades:", err);
    const message = err instanceof Error ? err.message : "Okänt fel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}