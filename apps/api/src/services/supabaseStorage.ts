import { config } from "../config";
import { createClient } from "@supabase/supabase-js";

function sanitizeBlobName(name: string): string {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safe || "asset";
}

function buildStorageRef(bucket: string, path: string): string {
  return `supabase://${bucket}/${path}`;
}

function getSupabaseClient() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to upload screenshots or generate signed URLs");
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function parseStorageRef(storageRef: string): { bucket: string; path: string } {
  if (storageRef.startsWith("supabase://")) {
    const withoutScheme = storageRef.slice("supabase://".length);
    const slashIndex = withoutScheme.indexOf("/");

    if (slashIndex === -1) {
      throw new Error(`Invalid Supabase storage reference: ${storageRef}`);
    }

    return {
      bucket: withoutScheme.slice(0, slashIndex),
      path: withoutScheme.slice(slashIndex + 1),
    };
  }

  return {
    bucket: config.supabaseStorageBucket,
    path: storageRef,
  };
}

export async function uploadReviewAssetToStorage(params: {
  reviewId: string;
  name: string;
  mimeType: string;
  base64Data: string;
}): Promise<{ storageRef: string }> {
  const supabase = getSupabaseClient();
  const bucket = config.supabaseStorageBucket;
  const objectPath = `${params.reviewId}/${Date.now()}-${sanitizeBlobName(params.name)}`;
  const bytes = Buffer.from(params.base64Data, "base64");

  const { error } = await supabase.storage.from(bucket).upload(objectPath, bytes, {
    contentType: params.mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload asset to Supabase Storage: ${error.message}`);
  }

  return { storageRef: buildStorageRef(bucket, objectPath) };
}

export async function getSignedStorageReadUrl(storageRef: string, expiresInSeconds = config.supabaseStorageSignedUrlTtlSeconds): Promise<string> {
  if (/^data:/i.test(storageRef)) {
    return storageRef;
  }

  if (/^https?:\/\//i.test(storageRef) && !storageRef.includes("supabase.co/storage/v1/object")) {
    return storageRef;
  }

  const supabase = getSupabaseClient();
  const { bucket, path } = parseStorageRef(storageRef);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);

  if (error) {
    throw new Error(`Failed to create signed Supabase Storage URL: ${error.message}`);
  }

  return data.signedUrl;
}
