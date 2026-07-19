import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; exp: number }>();

/**
 * Get a signed URL for a file in a private bucket.
 * Value is cached for ~50 minutes.
 */
export async function getSignedUrl(bucket: string, path: string): Promise<string> {
  if (!path) return "";
  const key = `${bucket}:${path}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.exp > now) return cached.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data) return "";
  cache.set(key, { url: data.signedUrl, exp: now + 50 * 60 * 1000 });
  return data.signedUrl;
}

/** Storage path can be stored either as a bare path or a `bucket:path` string */
export function parseStorageRef(
  ref: string,
  defaultBucket: string,
): { bucket: string; path: string } {
  if (!ref) return { bucket: defaultBucket, path: "" };
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    return { bucket: "", path: ref };
  }
  if (ref.includes(":")) {
    const [bucket, ...rest] = ref.split(":");
    return { bucket, path: rest.join(":") };
  }
  return { bucket: defaultBucket, path: ref };
}
