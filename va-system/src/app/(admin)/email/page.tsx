"use client";
// src/app/(admin)/email/page.tsx
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// Gmail via Claude MCP
async function fetchGmailInbox(n = 25) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      mcp_servers: [{ type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail" }],
      messages: [{ role: "user", content: `Use Gmail MCP to list ${n} most recent INBOX messages. Return ONLY a JSON array with: id, threadId, snippet, from, subject, date, unread(boolean). No markdown.` }],
    }),
  });
  const d = await res.json();
  const text = [...(d.content ?? [])].map((b: any) => b.text ?? b.content?.[0]?.text ?? "").join("\n");
  const m = text.match(/\[[\s\S]*\]/);
  if (m) try { return JSON.parse(m[0]); } catch {}
  return [];
}

function extractSender(from: string) {
  const m = from?.match(/^(.*?)\s*<(.+)>$/);
  if (m) return { name: m[1].replace(/"/g, "").trim() || m[2], email: m[2] };
  return { name: from ?? "Okänd", email: from ?? "" };
}

function fmtDate(d: string) {
  if (!d) return "";
  const dt = new Date(d), now = new Date(), diff = now.getTime() - dt.getTime();
  if (diff < 86400000) return dt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return dt.toLocaleDateString("sv-SE", { weekday: "short" });
  return dt.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default function EmailPage() {
  const [emails, setEmails]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [linked, setLinked]     = useState<Record<string, { projectName: string; note: string }>>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [modal, setModal]       = useState<"link" | "reply" | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    createClient().from("projects").select("id,name").then(({ data }) => setProjects(data ?? []));
    loadEmails();
  }, []);

  const loadEmails = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const msgs = await fetchGmailInbox(25);
      if (msgs.length) setEmails(msgs);
      else setError("Inga mejl hittades. Kontrollera att Gmail är anslutet.");
    } catch (e: any) {
      setError("Kunde inte hämta mejl: " + e.message);
    } finally { setLoading(false); }
  }, []);

  const handleSend = async () => {
    if (!replyBody.trim() || !selected) return;
    setSending(true);
    // In production, send via Gmail API route handler
    setTimeout(() => { setSending(false); setModal(null); setReplyBody(""); }, 1000);
  };

  return (
    <div className="flex h-full">
      {/* List */}
      <div className={`${selected ? "w-[38%]" : "w-full"} flex flex-col border-r border-[#DDDBD6] bg-white transition-all`}>
        <div className="p-4 border-b border-[#DDDBD6]">
          <div className="flex justify-between items-center mb-3">
            <h1 className="page-title text-xl">E-post</h1>
            <button onClick={loadEmails} disabled={loading}
              className="btn-secondary text-xs px-2.5 py-1.5">{loading ? "…" : "↻ Uppdatera"}</button>
          </div>
          <div className="flex gap-1.5 flex-wrap text-[11px]">
            {[["Alla", emails.length], ["Olästa", emails.filter(e => e.unread).length], ["Kopplade", Object.keys(linked).length]].map(([l, v]) => (
              <span key={l} className="px-2.5 py-1 rounded-full bg-[#F0EEE9] text-[#5A5850] font-semibold">{l}: {v}</span>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && !emails.length
            ? <div className="flex flex-col items-center justify-center p-10 gap-3">
                <div className="w-7 h-7 rounded-full border-2 border-[#E8EEF7] border-t-[#1E4D8C] animate-spin" />
                <p className="text-sm text-[#7A7870]">Hämtar från Gmail…</p>
              </div>
            : error
            ? <div className="p-8 text-center">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm text-[#B52A2A] mb-4">{error}</p>
                <button onClick={loadEmails} className="btn-primary">Försök igen</button>
              </div>
            : emails.map(email => {
                const sender  = extractSender(email.from);
                const lp      = linked[email.id];
                const isSel   = selected?.id === email.id;
                return (
                  <div key={email.id} onClick={() => setSelected(isSel ? null : email)}
                    className={`px-4 py-3 border-b border-[#E8E5DF] cursor-pointer transition-colors
                      border-l-2 ${isSel ? "bg-[#E8EEF7] border-l-[#1E4D8C]" : email.unread ? "border-l-[#3A6DB5]" : "border-l-transparent"}
                      ${!isSel ? "hover:bg-[#F4F3EF]" : ""}`}>
                    <div className="flex gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${isSel ? "bg-[#1E4D8C] text-white" : "bg-[#E8EEF7] text-[#1E4D8C]"}`}>
                        {sender.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-0.5">
                          <span className={`text-xs font-${email.unread ? "bold" : "medium"} truncate max-w-[60%]`}>{sender.name}</span>
                          <span className="text-[11px] text-[#A8A49A] shrink-0">{fmtDate(email.date)}</span>
                        </div>
                        <p className={`text-xs truncate mb-0.5 ${email.unread ? "font-semibold" : "text-[#7A7870]"}`}>
                          {email.subject || "(Inget ämne)"}
                        </p>
                        <p className="text-[11px] text-[#A8A49A] truncate">{email.snippet}</p>
                        {lp && <span className="badge bg-[#E8EEF7] text-[#1E4D8C] text-[10px] mt-1">📁 {lp.projectName}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Thread panel */}
      {selected && (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="p-5 border-b border-[#DDDBD6]">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-display font-bold text-[15px] text-[#1A1916] flex-1 pr-4 leading-snug">
                {selected.subject || "(Inget ämne)"}
              </h3>
              <button onClick={() => setSelected(null)} className="text-[#7A7870] hover:text-[#1A1916] text-lg">✕</button>
            </div>
            {linked[selected.id] && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E8EEF7] mb-3">
                <span className="text-xs text-[#1E4D8C]">📁</span>
                <span className="text-xs font-bold text-[#1E4D8C]">{linked[selected.id].projectName}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setModal("reply")} className="btn-primary text-xs px-3 py-1.5">↩ Svara</button>
              <button onClick={() => setModal("link")} className="btn-secondary text-xs px-3 py-1.5">
                {linked[selected.id] ? "🔗 Byt projekt" : "🔗 Koppla till projekt"}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F0EEE9] flex items-center justify-center text-xs font-bold text-[#5A5850] shrink-0">
                {extractSender(selected.from).name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold">{extractSender(selected.from).name}</p>
                <p className="text-xs text-[#7A7870] mb-3">{selected.date}</p>
                <div className="bg-[#F4F3EF] rounded-xl p-4 text-sm text-[#1A1916] leading-relaxed border border-[#DDDBD6]">
                  {selected.snippet || "(Inget innehåll)"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link modal */}
      {modal === "link" && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-5"
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl">
            <h2 className="font-display text-lg font-bold mb-4">Koppla till projekt</h2>
            <div className="bg-[#F4F3EF] rounded-lg p-3 mb-5">
              <p className="text-sm font-semibold">{selected.subject}</p>
              <p className="text-xs text-[#7A7870]">{selected.from}</p>
            </div>
            <label className="label">Projekt</label>
            <select id="link-proj" className="input mb-4">
              <option value="">— Välj projekt —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="btn-secondary">Avbryt</button>
              <button onClick={() => {
                const sel = (document.getElementById("link-proj") as HTMLSelectElement).value;
                if (!sel) return;
                const proj = projects.find(p => p.id === sel);
                setLinked(prev => ({ ...prev, [selected.id]: { projectName: proj?.name ?? "", note: "" } }));
                setModal(null);
              }} className="btn-primary">Koppla</button>
            </div>
          </div>
        </div>
      )}

      {/* Reply modal */}
      {modal === "reply" && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-5"
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-lg shadow-2xl">
            <h2 className="font-display text-lg font-bold mb-4">Svara</h2>
            <div className="space-y-1.5 mb-4 text-sm">
              <div className="flex gap-3"><span className="text-[#7A7870] w-12">Till:</span><span className="font-medium">{extractSender(selected.from).email}</span></div>
              <div className="flex gap-3"><span className="text-[#7A7870] w-12">Ärende:</span><span className="font-medium">Re: {selected.subject}</span></div>
            </div>
            <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} rows={5}
              placeholder="Skriv ditt svar…"
              className="input resize-none mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="btn-secondary">Avbryt</button>
              <button onClick={handleSend} disabled={sending} className="btn-primary">
                {sending ? "Skickar…" : "Skicka svar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
