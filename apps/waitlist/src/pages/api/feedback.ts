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

  const { email, pricing, comments } = req.body as {
    email?: string;
    pricing?: string;
    comments?: string;
  };

  if (!email) return res.status(400).json({ error: "Missing email" });

  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;
  if (!apiKey || !dbId) {
    console.log(`[feedback] ${email}: pricing=${pricing}, comments=${comments}`);
    return res.status(200).json({ ok: true });
  }

  try {
    const query = await notionFetch(`/databases/${dbId}/query`, "POST", {
      filter: { property: "Email", email: { equals: email.toLowerCase().trim() } },
    });

    const page = query.results?.[0];
    if (!page) {
      console.warn(`[feedback] No Notion row found for ${email}`);
      return res.status(200).json({ ok: true });
    }

    const props: Record<string, unknown> = {};
    if (pricing) props["Pricing"] = { select: { name: pricing } };
    if (comments?.trim()) {
      props["Comments"] = {
        rich_text: [{ text: { content: comments.trim().slice(0, 2000) } }],
      };
    }

    if (Object.keys(props).length > 0) {
      await notionFetch(`/pages/${page.id}`, "PATCH", { properties: props });
    }

    console.log(`[feedback] Updated ${email}: pricing=${pricing}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[feedback] Error:", err);
    return res.status(500).json({ error: "Failed to save feedback" });
  }
}
