import type { NextApiRequest, NextApiResponse } from "next";

async function notionFetch(endpoint: string, method: string, body?: unknown) {
  const res = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Notion ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body as { email?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const cleanEmail = email.toLowerCase().trim();
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !dbId) {
    console.log(`[waitlist] ${cleanEmail} (Notion not configured)`);
    return res.status(200).json({ ok: true });
  }

  try {
    const query = await notionFetch(`/databases/${dbId}/query`, "POST", {
      filter: { property: "Email", email: { equals: cleanEmail } },
    });
    if (query.results?.length > 0) {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    // Get current count for auto-index
    const all = await notionFetch(`/databases/${dbId}/query`, "POST", {});
    const nextIndex = (all.results?.length ?? 0) + 1;

    await notionFetch("/pages", "POST", {
      parent: { database_id: dbId },
      properties: {
        Email: { email: cleanEmail },
        "#": { number: nextIndex },
        "Joined At": { date: { start: new Date().toISOString() } },
      },
    });

    console.log(`[waitlist] #${nextIndex} ${cleanEmail}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[waitlist] Error:", err);
    return res.status(500).json({ error: "Failed to save signup" });
  }
}
