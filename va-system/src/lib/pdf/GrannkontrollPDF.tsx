// src/lib/pdf/GrannkontrollPDF.tsx
//
// Definierar hur grannkontrollprotokollet ser ut som PDF.
// Byggs med @react-pdf/renderer (ren kod, ingen headless webbläsare behövs).
//
// Layout uppdaterad efter genomgång av riktiga protokoll (Täfteå 7:30 / Lövöudden 111):
// - Bakgrund/Instruktioner/Kartbilaga är FAST text, samma i varje protokoll
// - Grannfastigheterna läggs i EN <Page wrap> istället för en sida var, så att
//   react-pdf självt "flyter" innehållet vidare till nästa sida bara när det
//   behövs - precis som de riktiga protokollen (15 grannar => 5 sidor, inte 15+)

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

type GrannFastighet = {
  id: string;
  fastighetsbeteckning: string;
  hus_beteckning: string | null;
  avstand_m: number | null;
  besoksdatum: string | null;
  svar_erhallet: boolean | null;
  dricksvattentakt: "ja" | "nej" | "vet_ej" | null;
  dricksvatten_typ: string | null;
  brunn_anvandning: string | null;
  energibrunn: "ja" | "nej" | "vet_ej" | null;
  energibrunn_typ: string | null;
  lage_markerat_karta: boolean | null;
  kontaktperson: string | null;
  kommentar: string | null;
};

type Protokoll = {
  id: string;
  initiativ_fastighet: string;
  sokande_adress: string | null;
  omrade: string | null;
  kommun: string | null;
  syfte: string | null;
  skyddsavstand_m: number;
  status: string;
  upprattat_datum: string | null;
  fastighetsagare: string | null;
  kontaktuppgifter: string | null;
  karta_url: string | null;
  slutsats_kommentar: string | null;
};

const BRAND_FOOTER = "Avloppskonsult André Öhman · avloppinorr.se · Med hjärtat i Norrland";
// TODO: hämta detta från `settings`-tabellen istället för hårdkodat, om/när
// flera konsulter någonsin ska använda samma system.

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 56,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#1A1916",
  },
  h1: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    marginTop: 10,
  },
  body: {
    fontSize: 9.5,
    lineHeight: 1.4,
    marginBottom: 6,
  },
  metaBlock: {
    marginTop: 12,
    marginBottom: 12,
    paddingTop: 8,
    borderTop: "1pt solid #E0DED8",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  metaLabel: {
    width: 130,
    color: "#5A5850",
  },
  metaValue: {
    flex: 1,
  },
  map: {
    marginTop: 12,
    marginBottom: 12,
    width: "100%",
    maxHeight: 320,
    objectFit: "contain",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  listBullet: {
    width: 16,
  },
  fastighetBlock: {
    marginBottom: 10,
    paddingBottom: 8,
    paddingTop: 8,
    borderBottom: "1pt solid #E0DED8",
  },
  fastighetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  fastighetTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  fastighetAdress: {
    fontSize: 9,
    color: "#5A5850",
  },
  row: {
    flexDirection: "row",
    marginBottom: 2,
  },
  label: {
    width: 200,
    color: "#5A5850",
  },
  value: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },
  signatureLine: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureLabel: {
    fontSize: 7.5,
    color: "#9A9888",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: "#9A9888",
    textAlign: "center",
  },
  summaryBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F4F3EF",
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
});

function svarText(val: "ja" | "nej" | "vet_ej" | null, typ?: string | null) {
  if (val === "ja") return `Ja${typ ? ` (${typ})` : ""}`;
  if (val === "nej") return "Nej";
  if (val === "vet_ej") return "Vet ej";
  return "—";
}

function Footer() {
  return (
    <Text
      style={styles.footer}
      render={({ pageNumber, totalPages }) =>
        `${BRAND_FOOTER}  ·  sida ${pageNumber} av ${totalPages}`
      }
      fixed
    />
  );
}

export function GrannkontrollPDF({
  protokoll,
  grannar,
}: {
  protokoll: Protokoll;
  grannar: GrannFastighet[];
}) {
  const kontaktade = grannar.filter((g) => g.svar_erhallet).length;
  const ejNadda = grannar.length - kontaktade;
  const dricksvattenFynd = grannar.some((g) => g.dricksvattentakt === "ja");
  const energibrunnFynd = grannar.some((g) => g.energibrunn === "ja");

  return (
    <Document>
      {/* Sida 1: försättsblad med metadata + karta */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Grannkontrollprotokoll</Text>
        <Text style={{ color: "#5A5850" }}>
          Inventering av dricksvattentäkter och energibrunnar inom {protokoll.skyddsavstand_m} m
        </Text>

        <View style={styles.metaBlock}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Sökande fastighet</Text>
            <Text style={styles.metaValue}>{protokoll.initiativ_fastighet}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Adress</Text>
            <Text style={styles.metaValue}>{protokoll.sokande_adress ?? "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Område</Text>
            <Text style={styles.metaValue}>{protokoll.omrade ?? "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Kommun</Text>
            <Text style={styles.metaValue}>{protokoll.kommun ?? "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Fastighetsägare</Text>
            <Text style={styles.metaValue}>{protokoll.fastighetsagare ?? "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Kontaktuppgifter</Text>
            <Text style={styles.metaValue}>{protokoll.kontaktuppgifter ?? "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Protokollet upprättat</Text>
            <Text style={styles.metaValue}>{protokoll.upprattat_datum ?? "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Syfte</Text>
            <Text style={styles.metaValue}>{protokoll.syfte ?? "—"}</Text>
          </View>
        </View>

        {protokoll.karta_url && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={protokoll.karta_url} style={styles.map} />
        )}

        <Footer />
      </Page>

      {/* Sida 2: fast bakgrundstext, instruktioner, kartbilaga-legend */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Bakgrund och syfte</Text>
        <Text style={styles.body}>
          SGU:s brunnsarkiv är inte heltäckande och kan sakna uppgifter om befintliga
          dricksvattentäkter och energibrunnar. Fastighetsägaren för{" "}
          {protokoll.initiativ_fastighet} genomför därför en manuell grannkontroll hos
          samtliga berörda fastigheter inom {protokoll.skyddsavstand_m} meters avstånd
          från den planerade åtgärden.
        </Text>
        <Text style={styles.body}>Kontrollen syftar till att:</Text>
        <View style={styles.listItem}>
          <Text style={styles.listBullet}>•</Text>
          <Text style={styles.body}>
            Säkerställa att inga dricksvattentäkter (borrade, grävda brunnar, källor)
            finns inom skyddsavståndet.
          </Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.listBullet}>•</Text>
          <Text style={styles.body}>
            Säkerställa att inga energibrunnar eller jordvärmeinstallationer
            (bergvärme, horisontella kollektorer, sjövärme) finns inom skyddsavståndet.
          </Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.listBullet}>•</Text>
          <Text style={styles.body}>
            Dokumentera och markera eventuella anläggningars lägen på bifogad karta
            för vidarebefordran till handläggande myndighet.
          </Text>
        </View>

        <Text style={styles.h2}>Instruktioner för genomförande</Text>
        {[
          "Besök varje fastighet och tala med fastighetsägare eller representant.",
          "Fyll i formuläret nedan för varje fastighet. Kryssa i rätt ruta.",
          'Om svar är "Ja" på dricksvattentäkt eller energibrunn — rita ut läget på bifogad karta och notera fastighetsbeteckning.',
          "Be grannen bekräfta uppgifterna med underskrift.",
          "Om ingen är hemma — notera datum och återkom. Minst ett besöksförsök ska dokumenteras.",
        ].map((text, i) => (
          <View style={styles.listItem} key={i}>
            <Text style={styles.listBullet}>{i + 1}.</Text>
            <Text style={styles.body}>{text}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Kartbilaga — utmärkning av anläggningar</Text>
        <Text style={styles.body}>
          Bifoga kopia av kartöversikten (Lantmäteriet, SWEREF 99 TM, RH 2000) med
          markerade fastigheter. Märk ut läget för varje anläggning med följande
          symboler:
        </Text>
        <View style={styles.listItem}>
          <Text style={styles.body}>
            (B) Borrad dricksvattenbrunn　(G) Grävd dricksvattenbrunn / källa
          </Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.body}>
            (E) Energibrunn / bergvärme　(J) Jordvärmeslinga (horisontell)
          </Text>
        </View>

        <Footer />
      </Page>

      {/* En Page med wrap=true (standard) - react-pdf flyter innehållet
          vidare till nya sidor automatiskt, ungefär 3-4 fastigheter per sida,
          precis som de riktiga protokollen */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Grannkontroll per fastighet</Text>
        <Text style={{ ...styles.body, color: "#5A5850" }}>
          Skyddsavstånd: {protokoll.skyddsavstand_m} m. Sökande fastighet:{" "}
          {protokoll.initiativ_fastighet}
          {protokoll.sokande_adress ? `, ${protokoll.sokande_adress}` : ""}. Kartreferens:
          Lantmäteriet, SWEREF 99 TM.
        </Text>

        {grannar.map((g) => (
          // wrap={false} håller varje fastighets block ihop - delas aldrig
          // mitt itu över en sidbrytning, även om hela listan flyter vidare
          <View key={g.id} style={styles.fastighetBlock} wrap={false}>
            <View style={styles.fastighetHeader}>
              <Text style={styles.fastighetTitle}>{g.fastighetsbeteckning}</Text>
              <Text style={styles.fastighetAdress}>{g.hus_beteckning ?? ""}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Besöksdatum</Text>
              <Text style={styles.value}>{g.besoksdatum ?? "åååå-mm-dd"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Svar erhölls</Text>
              <Text style={styles.value}>{g.svar_erhallet ? "Ja" : "Nej"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Dricksvattentäkt inom {protokoll.skyddsavstand_m} m?</Text>
              <Text style={styles.value}>
                {svarText(g.dricksvattentakt, g.dricksvatten_typ)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Brunnen används för</Text>
              <Text style={styles.value}>{g.brunn_anvandning ?? "—"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Energibrunn / jordvärme inom {protokoll.skyddsavstand_m} m?</Text>
              <Text style={styles.value}>
                {svarText(g.energibrunn, g.energibrunn_typ)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Läge utmärkt på karta</Text>
              <Text style={styles.value}>
                {g.lage_markerat_karta ? "Ja" : "Nej (ej aktuellt)"}
              </Text>
            </View>
            {g.kommentar && (
              <View style={styles.row}>
                <Text style={styles.label}>Övrigt</Text>
                <Text style={styles.value}>{g.kommentar}</Text>
              </View>
            )}

            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>
                Kontaktperson: {g.kontaktperson ?? "___________________________"}
              </Text>
              <Text style={styles.signatureLabel}>Underskrift granne + datum: __________ / ______</Text>
            </View>
          </View>
        ))}

        <Footer />
      </Page>

      {/* Sista sidan: sammanfattning - alltid egen sida */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Sammanfattning och slutsats</Text>
        <Text style={{ color: "#5A5850" }}>{protokoll.initiativ_fastighet}</Text>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text>Fastigheter kontaktade (antal)</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              {kontaktade} av {grannar.length} fastigheter
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Fastigheter ej nåbara (antal)</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{ejNadda}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Dricksvattentäkter påträffade</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              {dricksvattenFynd ? "Ja (se karta)" : "Nej"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Energibrunnar / jordvärme påträffade</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              {energibrunnFynd ? "Ja (se karta)" : "Nej"}
            </Text>
          </View>
        </View>

        <Text style={styles.h2}>Slutsats / sammanfattande kommentar</Text>
        <Text style={styles.body}>
          {protokoll.slutsats_kommentar ?? "Ange sammanfattande slutsats här..."}
        </Text>

        <Text style={{ ...styles.body, marginTop: 10 }}>
          Undertecknad intygar att ovanstående grannkontroll genomförts efter bästa
          förmåga och att uppgifterna är korrekta.
        </Text>

        <View style={{ ...styles.signatureLine, marginTop: 30 }}>
          <Text style={styles.signatureLabel}>
            Underskrift fastighetsägare {protokoll.initiativ_fastighet}
          </Text>
          <Text style={styles.signatureLabel}>Ort och datum</Text>
        </View>

        <Footer />
      </Page>
    </Document>
  );
}
