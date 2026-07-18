import { useEffect, useState } from "react";
import { getSignedUrl, parseStorageRef } from "@/lib/storage";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  bucket?: string;
  fallback?: string;
}

/**
 * Renders an image whose source is stored either as:
 *  - a full https URL (used directly)
 *  - a "bucket:path" string
 *  - a bare path (uses defaultBucket)
 * Fetches a signed URL for private buckets. Renders a neutral placeholder while loading / missing.
 */
export function SignedImage({ src, alt, className, bucket = "product-images", fallback }: Props) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!src) { setUrl(""); return; }
      const parsed = parseStorageRef(src, bucket);
      if (!parsed.bucket) { setUrl(parsed.path); return; }
      const signed = await getSignedUrl(parsed.bucket, parsed.path);
      if (!cancelled) setUrl(signed);
    })();
    return () => { cancelled = true; };
  }, [src, bucket]);

  if (!url) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className ?? ""}`}>
        <span className="eyebrow">{fallback ?? "Image"}</span>
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
