import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PaymentIntentResult } from "./types";

/**
 * Crée une intention de paiement pour un pack de votes.
 * Le frontend ne peut JAMAIS créer ni modifier de votes :
 * les votes sont uniquement créés côté serveur après vérification du paiement.
 */
export const createPaymentIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        candidateId: z.string().uuid(),
        packageId: z.string().uuid(),
        paymentMethod: z.string().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PaymentIntentResult> => {
    const { supabase, userId } = context;

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id, is_active")
      .eq("id", data.candidateId)
      .maybeSingle();
    if (candidateError) throw new Error(candidateError.message);
    if (!candidate?.is_active) throw new Error("Candidat introuvable ou inactif.");

    const { data: pack, error: packError } = await supabase
      .from("vote_packages")
      .select("id, price, currency, is_active")
      .eq("id", data.packageId)
      .maybeSingle();
    if (packError) throw new Error(packError.message);
    if (!pack?.is_active) throw new Error("Pack de votes indisponible.");

    const reference = `PICHNET-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        candidate_id: data.candidateId,
        package_id: data.packageId,
        amount: pack.price,
        currency: pack.currency,
        payment_method: data.paymentMethod ?? null,
        transaction_reference: reference,
        status: "pending",
      })
      .select("id")
      .single();
    if (paymentError || !payment) throw new Error(paymentError?.message ?? "Paiement non créé.");

    const { getPaymentProvider } = await import("./payment-provider.server");
    const provider = getPaymentProvider();
    const result = await provider.initiate({
      paymentId: payment.id,
      reference,
      amount: Number(pack.price),
      currency: pack.currency,
      candidateId: data.candidateId,
      userId,
    });

    return {
      paymentId: payment.id,
      reference,
      status: result.status,
      providerName: result.providerName,
      message: result.message,
    };
  });

/**
 * Vérification serveur d'un paiement : interroge le prestataire et, si le
 * paiement est confirmé, valide le vote (source unique de vérité).
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ paymentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: payment, error } = await supabase
      .from("payments")
      .select("id, status, transaction_reference, candidate_id, package_id")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment) throw new Error("Paiement introuvable.");
    if (payment.status === "paid") return { status: "paid" as const };

    const { getPaymentProvider } = await import("./payment-provider.server");
    const provider = getPaymentProvider();
    if (!provider.isConfigured()) {
      return {
        status: "pending" as const,
        message: "Le paiement ne peut pas encore être vérifié : aucun prestataire connecté.",
      };
    }

    const verification = await provider.verify(payment.transaction_reference ?? "");
    if (!verification.paid) return { status: "pending" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pack } = await supabaseAdmin
      .from("vote_packages")
      .select("vote_quantity")
      .eq("id", payment.package_id)
      .single();

    await supabaseAdmin
      .from("payments")
      .update({ status: "paid", payment_method: verification.method ?? null })
      .eq("id", payment.id);

    await supabaseAdmin.from("votes").insert({
      candidate_id: payment.candidate_id,
      user_id: userId,
      payment_id: payment.id,
      quantity: pack?.vote_quantity ?? 1,
    });

    return { status: "paid" as const };
  });

export const listMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payments")
      .select("id, amount, currency, status, transaction_reference, created_at, candidate_id")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
