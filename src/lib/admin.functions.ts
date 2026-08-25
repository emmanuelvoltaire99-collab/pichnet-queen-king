import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const candidateInput = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  candidate_number: z.number().int().positive(),
  category: z.enum(["miss", "master"]),
  region: z.string().max(80).nullish(),
  city: z.string().max(80).nullish(),
  biography: z.string().max(4000).nullish(),
  photo_url: z.string().max(500).nullish(),
  is_active: z.boolean().default(true),
  is_demo: z.boolean().default(false),
});

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Accès réservé aux administrateurs.");
}

export const adminListCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("candidates")
      .select("*")
      .order("category", { ascending: true })
      .order("candidate_number", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().nullish(), values: candidateInput }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const values = {
      ...data.values,
      region: data.values.region ?? null,
      city: data.values.city ?? null,
      biography: data.values.biography ?? null,
      photo_url: data.values.photo_url ?? null,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("candidates")
        .update(values)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: row, error } = await context.supabase
      .from("candidates")
      .insert(values)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const adminSetCandidateActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("candidates")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("vote_packages")
      .select("*")
      .order("vote_quantity", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p: { price: number }) => ({ ...p, price: Number(p.price) }));
  });

export const adminSavePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().nullish(),
        values: z.object({
          name: z.string().min(1).max(60),
          vote_quantity: z.number().int().positive(),
          price: z.number().nonnegative(),
          currency: z.string().min(2).max(6),
          is_active: z.boolean(),
        }),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { error } = await context.supabase
        .from("vote_packages")
        .update(data.values)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("vote_packages")
      .insert(data.values)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("payments")
      .select(
        "id, amount, currency, status, payment_method, transaction_reference, created_at, candidate_id, package_id",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((p: { amount: number }) => ({ ...p, amount: Number(p.amount) }));
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [candidates, payments, standings] = await Promise.all([
      context.supabase.from("candidates").select("id, category, is_active"),
      context.supabase.from("payments").select("amount, status"),
      context.supabase.rpc("candidate_standings", {}),
    ]);

    const cand = (candidates.data ?? []) as { category: string; is_active: boolean }[];
    const pays = (payments.data ?? []) as { amount: number; status: string }[];
    const stand = (standings.data ?? []) as { total_votes: number }[];

    return {
      missCount: cand.filter((c) => c.category === "miss" && c.is_active).length,
      masterCount: cand.filter((c) => c.category === "master" && c.is_active).length,
      inactiveCount: cand.filter((c) => !c.is_active).length,
      totalVotes: stand.reduce((sum, s) => sum + Number(s.total_votes ?? 0), 0),
      paidPayments: pays.filter((p) => p.status === "paid").length,
      pendingPayments: pays.filter((p) => p.status === "pending").length,
      revenue: pays
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
    };
  });
