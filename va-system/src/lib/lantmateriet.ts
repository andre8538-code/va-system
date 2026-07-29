// src/lib/lantmateriet.ts
//
// Integration mot Lantmäteriets Nationella Geodataplattform (NGP).
// Produkt: "Fastighet och samfällighet Direkt" (hitta/hämta-tjänst för fastighetsgeometri).
//
// VIKTIGT — innan detta fungerar behöver du:
// 1. Logga in på Geotorget (https://geotorget.lantmateriet.se) och beställ produkten
//    "Fastighet och samfällighet Direkt" (eller "Fastighetsindelning Direkt" för enbart gränser).
// 2. Skapa en applikation i API-portalen och generera OAuth2 client_id + client_secret.
// 3. Lägg in dessa som miljövariabler i Vercel (INTE med NEXT_PUBLIC_-prefix,
//    de ska bara vara tillgängliga server-side):
//      LANTMATERIET_CLIENT_ID
//      LANTMATERIET_CLIENT_SECRET
//      LANTMATERIET_TOKEN_URL      (från Geotorgets dokumentation för din produkt)
//      LANTMATERIET_API_BASE_URL   (bas-URL för "hitta"/"hämta"-anropen, från samma dokumentation)
//
// De exakta URL:erna och anropsformaten (GetFeature-parametrar, svarsformat GML/GeoJSON)
// står i produktdokumentationen du får tillgång till i Geotorget efter beställning —
// jag har lämnat platshållare nedan istället för att gissa fel URL:er.

import * as turf from "@turf/turf";

// ---- Typer ----

export type Punkt = { lat: number; lng: number }; // SWEREF99 TM eller WGS84 — var konsekvent i hela appen

export type FastighetGeometri = {
  beteckning: string;         // t.ex. "Holmsund 7:192"
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  centroid: Punkt;
};

export type GrannFastighet = {
  beteckning: string;
  avstand_m: number;          // kortaste avstånd mellan gränserna, INTE centroid-till-centroid
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon;
};

// ---- Autentisering ----

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const tokenUrl = process.env.LANTMATERIET_TOKEN_URL;
  const clientId = process.env.LANTMATERIET_CLIENT_ID;
  const clientSecret = process.env.LANTMATERIET_CLIENT_SECRET;

  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error(
      "Lantmäteriet-uppgifter saknas. Kontrollera LANTMATERIET_TOKEN_URL, " +
      "LANTMATERIET_CLIENT_ID och LANTMATERIET_CLIENT_SECRET i miljövariablerna."
    );
  }

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Kunde inte hämta OAuth2-token från Lantmäteriet (${res.status})`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

// ---- Hämta fastighetens geometri ----

export async function hamtaFastighetGeometri(
  beteckning: string
): Promise<FastighetGeometri> {
  const token = await getAccessToken();
  const baseUrl = process.env.LANTMATERIET_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("LANTMATERIET_API_BASE_URL saknas i miljövariablerna.");
  }

  // TODO: byt ut mot exakt endpoint/parametrar enligt din produkts API-dokumentation
  const res = await fetch(
    `${baseUrl}/fastighet?beteckning=${encodeURIComponent(beteckning)}&format=geojson`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    throw new Error(`Kunde inte hämta fastighet "${beteckning}" (${res.status})`);
  }

  const geojson = await res.json();
  const feature = geojson.features?.[0];
  if (!feature) {
    throw new Error(`Fastigheten "${beteckning}" hittades inte hos Lantmäteriet.`);
  }

  const centroidFeature = turf.centroid(feature);
  const [lng, lat] = centroidFeature.geometry.coordinates;

  return {
    beteckning,
    polygon: feature.geometry,
    centroid: { lat, lng },
  };
}

export async function hittaGrannarInomRadie(
  initiativFastighet: FastighetGeometri,
  radieMeter: number
): Promise<GrannFastighet[]> {
  const token = await getAccessToken();
  const baseUrl = process.env.LANTMATERIET_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("LANTMATERIET_API_BASE_URL saknas i miljövariablerna.");
  }

  const buffered = turf.buffer(
    turf.feature(initiativFastighet.polygon),
    radieMeter,
    { units: "meters" }
  );
  if (!buffered) {
    throw new Error("Kunde inte beräkna buffertzon runt fastigheten.");
  }
  const bbox = turf.bbox(buffered);

  // TODO: byt ut mot exakt "hitta"-endpoint enligt din produkts API-dokumentation
  const res = await fetch(
    `${baseUrl}/fastigheter?bbox=${bbox.join(",")}&format=geojson`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    throw new Error(`Kunde inte söka grannfastigheter (${res.status})`);
  }

  const geojson = await res.json();
  const grannar: GrannFastighet[] = [];

  for (const feature of geojson.features ?? []) {
    const beteckning: string = feature.properties?.beteckning ?? "okänd";
    if (beteckning === initiativFastighet.beteckning) continue;

    const intersectsBuffer = turf.booleanIntersects(buffered, feature);
    if (!intersectsBuffer) continue;

    const centroidA = turf.centroid(initiativFastighet.polygon);
    const centroidB = turf.centroid(feature);
    const approxDistance = turf.distance(centroidA, centroidB, { units: "meters" });

    grannar.push({
      beteckning,
      avstand_m: Math.round(approxDistance),
      polygon: feature.geometry,
    });
  }

  return grannar;
}