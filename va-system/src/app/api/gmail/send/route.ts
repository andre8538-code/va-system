// src/app/api/gmail/send/route.ts
// Server-side Gmail send via Claude MCP
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Auth check
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, subject, body, threadId } = await req.json();
  if (!to || !body) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        mcp_servers: [{ type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail" }],
        messages: [{
          role: "user",
          content: `Use Gmail MCP to send an email reply.
To: ${to}
Subject: ${subject.startsWith("Re:") ? subject : "Re: " + subject}
${threadId ? `ThreadId: ${threadId}` : ""}
Body:
${body}

After sending confirm with: {"sent": true}`,
        }],
      }),
    });

    if (!res.ok) throw new Error("MCP request failed");
    return NextResponse.json({ sent: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
