// src/app/(admin)/projects/[id]/grannkontroll/page.tsx

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GrannFastighet = {
  id: string;
  fastighetsbeteckning: string;
  avstand_m: number | null;
  besoksdatum: string | null;
  svar_erhallet: boolean | null;
  dricksvattentakt: "ja" | "nej" | "vet_ej" | null;
  dricksvatten_typ: string | null;
  energibrunn: "ja" | "nej" | "vet_ej" | null;
  energibrunn_typ: string | null;
  lage_markerat_karta: boolean | null;
  kontaktperson: string | null;
  kommentar: string | null;
};

type Protokoll = {
  id: string;
  initiativ_fastighet: string;
  omrade: string | null;
  skyddsavstand_m: number;
  status: string;
};

export default function GrannkontrollPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [protokoll, setProtokoll] = useState<Protokoll | null>(null);
  const [grannar, setGrannar] = useState<GrannFastighet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: protokollData } = await supabase
        .from("grannkontroll_protokoll")
        .select("*")
        .eq("project_id", params.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (protokollData) {
        setProtokoll(protokollData);
        const { data: grannData } = await supabase
          .from("grannkontroll_fastighet")
          .select("*")
          .eq("protokoll_id", protokollData.id)
          .order("fastighetsbeteckning");
        setGrannar(grannData ?? []);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function uppdateraGranne(id: string, fields: Partial<GrannFastighet>) {
    setGrannar((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...fields } : g))
    );
    await supabase.from("grannkontroll_fastighet").update(fields).eq("id", id);
  }

  if (loading) return <div className="p-6">Laddar...</div>;

  if (!protokoll) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Grannkontroll</h1>
        <p className="text-gray-600 mb-4">
          Inget protokoll är skapat för det här projektet ännu.
        </p>
      </div>
    );
  }

  const kontaktade = grannar.filter((g) => g.svar_erhallet).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold">
        Grannkontrollprotokoll — {protokoll.initiativ_fastighet}
      </h1>
      <p className="text-gray-600 mb-1">{protokoll.omrade}</p>
      <p className="text-sm text-gray-500 mb-6">
        Skyddsavstånd {protokoll.skyddsavstand_m} m · {kontaktade} av {grannar.length}{" "}
        fastigheter kontaktade
      </p>

      <div className="space-y-4">
        {grannar.map((g) => (
          <div key={g.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-medium">{g.fastighetsbeteckning}</h2>
              {g.avstand_m != null && (
                <span className="text-xs text-gray-500">~{g.avstand_m} m</span>
              )}
            </div>

            <label className="block text-sm mb-2">
              Besöksdatum
              <input
                type="date"
                className="block border rounded px-2 py-1 mt-1"
                value={g.besoksdatum ?? ""}
                onChange={(e) =>
                  uppdateraGranne(g.id, { besoksdatum: e.target.value })
                }
              />
            </label>

            <label className="flex items-center gap-2 text-sm mb-3">
              <input
                type="checkbox"
                checked={!!g.svar_erhallet}
                onChange={(e) =>
                  uppdateraGranne(g.id, { svar_erhallet: e.target.checked })
                }
              />
              Svar erhållet
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Dricksvattentäkt inom {protokoll.skyddsavstand_m} m?</p>
                {(["ja", "nej", "vet_ej"] as const).map((val) => (
                  <label key={val} className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name={`dricks-${g.id}`}
                      checked={g.dricksvattentakt === val}
                      onChange={() => uppdateraGranne(g.id, { dricksvattentakt: val })}
                    />
                    {val === "vet_ej" ? "Vet ej" : val === "ja" ? "Ja" : "Nej"}
                  </label>
                ))}
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Energibrunn / jordvärme inom {protokoll.skyddsavstand_m} m?</p>
                {(["ja", "nej", "vet_ej"] as const).map((val) => (
                  <label key={val} className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name={`energi-${g.id}`}
                      checked={g.energibrunn === val}
                      onChange={() => uppdateraGranne(g.id, { energibrunn: val })}
                    />
                    {val === "vet_ej" ? "Vet ej" : val === "ja" ? "Ja" : "Nej"}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm mt-3">
              <input
                type="checkbox"
                checked={!!g.lage_markerat_karta}
                onChange={(e) =>
                  uppdateraGranne(g.id, { lage_markerat_karta: e.target.checked })
                }
              />
              Läge utmärkt på karta
            </label>

            <textarea
              placeholder="Kommentar..."
              className="w-full border rounded px-2 py-1 mt-3 text-sm"
              value={g.kommentar ?? ""}
              onChange={(e) => uppdateraGranne(g.id, { kommentar: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}