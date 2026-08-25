// Génère des liens temporaires pour les photos stockées dans le bucket privé
// "candidate-photos". Server-only : jamais importé côté client.

const BUCKET = "candidate-photos";
const EXPIRES_IN = 60 * 60; // 1 heure

export async function signPhotoPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return {};

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result: Record<string, string> = {};

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrls(unique, EXPIRES_IN);

  if (error || !data) return result;

  data.forEach((entry, index) => {
    const path = unique[index];
    if (path && entry.signedUrl && !entry.error) {
      result[path] = entry.signedUrl;
    }
  });

  return result;
}

export async function signPhotoPath(path: string | null): Promise<string | null> {
  if (!path) return null;
  const map = await signPhotoPaths([path]);
  return map[path] ?? null;
}
