/**
 * One-time setup script to create Supabase Storage buckets.
 *
 * Run from the project root:
 *   npx dotenv -e .env -- npx tsx scripts/setup-storage-buckets.ts
 *
 * Required env vars (loaded from .env via dotenv-cli):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * This creates two buckets:
 *
 *   ┌──────────────┬─────────┬─────────┬──────────────────────────────────────────────┐
 *   │ Bucket       │ Public? │ Max     │ Folder structure (created by app on upload)   │
 *   ├──────────────┼─────────┼─────────┼──────────────────────────────────────────────┤
 *   │ avatars      │ Yes     │ 2 MB    │ {userId}/{filename}                          │
 *   │ attachments  │ No      │ 50 MB   │ {workspacePublicId}/{cardPublicId}/{file}     │
 *   └──────────────┴─────────┴─────────┴──────────────────────────────────────────────┘
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing required env vars. Make sure .env contains:\n" +
      "  NEXT_PUBLIC_SUPABASE_URL\n" +
      "  SUPABASE_SERVICE_ROLE_KEY\n",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// ── Bucket definitions ───────────────────────────────────────────────
interface BucketDef {
  id: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes?: string[];
}

const BUCKETS: BucketDef[] = [
  {
    id: "avatars",
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    id: "attachments",
    public: false,
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB
  },
];

// ── Helpers ──────────────────────────────────────────────────────────
async function ensureBucket(def: BucketDef) {
  const { data: existing } = await supabase.storage.getBucket(def.id);

  if (existing) {
    console.log(`  Bucket "${def.id}" already exists - updating settings`);
    const { error } = await supabase.storage.updateBucket(def.id, {
      public: def.public,
      fileSizeLimit: def.fileSizeLimit,
      allowedMimeTypes: def.allowedMimeTypes ?? null,
    });
    if (error)
      throw new Error(`Failed to update "${def.id}": ${error.message}`);
    return;
  }

  console.log(`  Creating bucket "${def.id}"`);
  const { error } = await supabase.storage.createBucket(def.id, {
    public: def.public,
    fileSizeLimit: def.fileSizeLimit,
    allowedMimeTypes: def.allowedMimeTypes,
  });
  if (error)
    throw new Error(`Failed to create "${def.id}": ${error.message}`);
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== Setting up Supabase Storage buckets ===\n");

  for (const bucket of BUCKETS) {
    await ensureBucket(bucket);
  }

  console.log("\n=== Done! Buckets are ready. ===");
  console.log("\nMake sure your .env also has:");
  console.log("  NEXT_PUBLIC_AVATAR_BUCKET_NAME=avatars");
  console.log("  NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME=attachments");
  console.log("");
}

main().catch((err) => {
  console.error("\nSetup failed:", err);
  process.exit(1);
});
