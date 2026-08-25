import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { CandidateDetail, CandidateStanding, VotePackage } from "./types";

const categorySchema = z.enum(["miss", "master"]);

export const listCandidates = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ category: categorySchema.nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<CandidateStanding[]> => {
    const { createPublicServerClient } = await import("./supabase-public.server");
    const { signPhotoPaths } = await import("./photos.server");
    const supabase = createPublicServerClient();

    const { data: rows, error } = await supabase.rpc("candidate_standings", {
      _category: data.category ?? undefined,
    });
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as CandidateStanding[];
    const signed = await signPhotoPaths(list.map((c) => c.photo_url ?? "").filter(Boolean));
    return list.map((c) => ({
      ...c,
      total_votes: Number(c.total_votes ?? 0),
      photo_url: c.photo_url ? (signed[c.photo_url] ?? null) : null,
    }));
  });

export const getCandidate = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<CandidateDetail | null> => {
    const { createPublicServerClient } = await import("./supabase-public.server");
    const { signPhotoPath } = await import("./photos.server");
    const supabase = createPublicServerClient();

    const { data: row, error } = await supabase
      .from("candidates")
      .select(
        "id, first_name, last_name, candidate_number, category, region, city, biography, photo_url, is_demo",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { data: standings } = await supabase.rpc("candidate_standings", {
      _category: row.category,
    });
    const match = (standings ?? []).find((s) => s.id === row.id);

    return {
      ...row,
      category: row.category as CandidateDetail["category"],
      total_votes: Number(match?.total_votes ?? 0),
      photo_url: await signPhotoPath(row.photo_url),
    };
  });

export const listVotePackages = createServerFn({ method: "GET" }).handler(
  async (): Promise<VotePackage[]> => {
    const { createPublicServerClient } = await import("./supabase-public.server");
    const supabase = createPublicServerClient();

    const { data, error } = await supabase
      .from("vote_packages")
      .select("id, name, vote_quantity, price, currency")
      .eq("is_active", true)
      .order("vote_quantity", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({ ...p, price: Number(p.price) }));
  },
);
