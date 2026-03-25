import fs from "fs";
import path from "path";
import { SUPABASE_ENABLED, STORAGE_BUCKET, getSupabaseClient } from "./supabase.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

if (!SUPABASE_ENABLED) {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Store an image buffer.
 *
 * - If SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set → uploads to Supabase Storage
 *   and returns the public URL.
 * - Otherwise → saves to local disk and returns a /api/uploads/<filename> path
 *   (development fallback).
 */
export async function storeImage(
  buffer: Buffer,
  filename: string,
  mimeType: string = "image/jpeg"
): Promise<string> {
  if (SUPABASE_ENABLED) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    const { data: publicData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return `/api/uploads/${filename}`;
}

export { UPLOADS_DIR };
