"use client";
// src/app/portal/project/[id]/messages/MessagesClient.tsx
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string; project_id: string; sender_name: string;
  sender_role: string; body: string; created_at: string;
}

export default function MessagesClient({ projectId, initialMessages, senderName, userId }: {
  projectId: string; initialMessages: Message[];
  senderName: string; userId: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft]       = useState("");
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const sb                      = createClient();

  // Realtime subscription
  useEffect(() => {
    const channel = sb
      .channel(`messages:${projectId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `project_id=eq.${projectId}`,
      }, payload => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [projectId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");

    const { error } = await sb.from("messages").insert({
      project_id: projectId,
      sender_id:  userId,
      sender_name: senderName,
      sender_role: "customer",
      body,
    });
    if (error) setDraft(body); // restore on error
    setSending(false);
  };

  const grouped = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const date = msg.created_at.slice(0, 10);
    const last = acc[acc.length - 1];
    if (last?.date === date) { last.msgs.push(msg); }
    else acc.push({ date, msgs: [msg] });
    return acc;
  }, []);

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    const now = new Date();
    if (dt.toDateString() === now.toDateString()) return "Idag";
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (dt.toDateString() === y.toDateString()) return "Igår";
    return dt.toLocaleDateString("sv-SE", { day: "numeric", month: "long" });
  };
  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <h1 className="font-display text-xl font-bold text-[#1C1A16] mb-4 shrink-0">Meddelanden</h1>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-[#E4E0D8] mb-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-10">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm text-[#7E7A6F]">Inga meddelanden ännu.<br />Skriv något nedan för att starta konversationen.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {grouped.map(group => (
              <div key={group.date}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-[#F0EDE8]" />
                  <p className="text-[11px] text-[#A8A49A] font-medium">{fmtDate(group.date)}</p>
                  <div className="flex-1 h-px bg-[#F0EDE8]" />
                </div>
                {group.msgs.map(msg => {
                  const isOwn = msg.sender_role === "customer";
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
                      {!isOwn && (
                        <div className="w-8 h-8 rounded-full bg-[#0D6B5E] flex items-center justify-center text-white text-xs font-bold mr-2 shrink-0 mt-0.5">
                          {msg.sender_name.charAt(0)}
                        </div>
                      )}
                      <div className={`max-w-[72%]`}>
                        {!isOwn && (
                          <p className="text-[11px] text-[#A8A49A] mb-1 ml-1">{msg.sender_name}</p>
                        )}
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                          ${isOwn
                            ? "bg-[#0D6B5E] text-white rounded-br-sm"
                            : "bg-[#F7F5F0] text-[#1C1A16] border border-[#E4E0D8] rounded-bl-sm"}`}>
                          {msg.body}
                        </div>
                        <p className={`text-[10px] text-[#A8A49A] mt-1 ${isOwn ? "text-right" : "text-left ml-1"}`}>
                          {fmtTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex gap-2.5 shrink-0">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Skriv ett meddelande… (Enter för att skicka)"
          rows={2}
          className="flex-1 px-4 py-3 rounded-xl border border-[#E4E0D8] bg-white text-sm text-[#1C1A16]
            resize-none outline-none focus:border-[#0D6B5E] transition-colors leading-relaxed"
        />
        <button onClick={send} disabled={!draft.trim() || sending}
          className={`px-5 rounded-xl text-sm font-semibold transition-all
            ${draft.trim() && !sending
              ? "bg-[#0D6B5E] text-white hover:bg-[#1A8C7C]"
              : "bg-[#E4E0D8] text-[#A8A49A] cursor-default"}`}>
          {sending ? "…" : "Skicka"}
        </button>
      </div>
    </div>
  );
}
