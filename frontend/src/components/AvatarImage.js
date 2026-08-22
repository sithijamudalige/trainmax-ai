import { useEffect, useState } from "react";
import { supabase } from "../pages/supabaseClient";

export default function AvatarImage({ photoPath }) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setErr("");
      setUrl("");

      if (!photoPath) return;

      // For PRIVATE buckets:
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(photoPath, 60 * 10);

      if (cancelled) return;

      if (error) {
        setErr(error.message);
        return;
      }

      setUrl(data?.signedUrl || "");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  if (!photoPath) return null;
  if (err) return <div style={{ color: "crimson" }}>Avatar error: {err}</div>;
  if (!url) return <div>Loading avatar...</div>;

  return <img src={url} alt="avatar" style={{ width: 120, height: 120, borderRadius: "50%" }} />;
}