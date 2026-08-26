import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { candidatesQuery, votePackagesQuery } from "@/lib/queries";
import { createPaymentIntent, verifyPayment } from "@/lib/vote.functions";
import { CATEGORY_LABEL, candidateFullName, formatPrice } from "@/lib/types";
import type { PaymentIntentResult } from "@/lib/types";

export const Route = createFileRoute("/vote")({
  validateSearch: (search: Record<string, unknown>) => ({
    candidat: typeof search["candidat"] === "string" ? search["candidat"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Voter — MISS & MISTER PICHNET 2026" },
      {
        name: "description",
        content:
          "Choisissez votre candidat favori et un pack de votes pour soutenir sa candidature au concours PICHNET 2026.",
      },
      { property: "og:title", content: "Voter — MISS & MISTER PICHNET 2026" },
      {
        property: "og:description",
        content: "Soutenez votre favori avec un pack de votes sécurisé.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(candidatesQuery()),
      context.queryClient.ensureQueryData(votePackagesQuery()),
    ]);
  },
  component: VotePage,
});

function VotePage() {
  const { candidat } = Route.useSearch();
  const { data: candidates } = useSuspenseQuery(candidatesQuery());
  const { data: packages } = useSuspenseQuery(votePackagesQuery());

  const [candidateId, setCandidateId] = useState<string | undefined>(candidat);
  const [packageId, setPackageId] = useState<string | undefined>(packages[0]?.id);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [intent, setIntent] = useState<PaymentIntentResult | null>(null);
  const [busy, setBusy] = useState(false);

  const createIntent = useServerFn(createPaymentIntent);
  const verify = useServerFn(verifyPayment);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const selected = candidates.find((c) => c.id === candidateId);
  const pack = packages.find((p) => p.id === packageId);

  async function submit() {
    if (!candidateId || !packageId) return;
    setBusy(true);
    try {
      const result = await createIntent({ data: { candidateId, packageId } });
      setIntent(result);
      toast.info(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer le paiement.");
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    if (!intent) return;
    setBusy(true);
    try {
      const result = await verify({ data: { paymentId: intent.paymentId } });
      if (result.status === "paid") {
        toast.success("Paiement confirmé, votre vote est enregistré !");
        setIntent(null);
      } else {
        toast.info("Paiement encore en attente de confirmation.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vérification impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold md:text-4xl">Voter</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chaque vote est enregistré uniquement après confirmation du paiement par notre serveur.
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">1. Choisir un candidat</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => setCandidateId(c.id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  candidateId === c.id
                    ? "border-accent bg-secondary"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  N°{c.candidate_number}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {candidateFullName(c)}
                </span>
                <Badge variant="secondary">{CATEGORY_LABEL[c.category]}</Badge>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">2. Choisir un pack de votes</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {packages.map((p) => (
              <button
                key={p.id}
                onClick={() => setPackageId(p.id)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  packageId === p.id
                    ? "border-accent bg-secondary"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.vote_quantity} votes</p>
                <p className="mt-1 text-base font-bold text-accent">
                  {formatPrice(p.price, p.currency)}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">3. Confirmation</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {selected && pack
              ? `${pack.vote_quantity} votes pour ${candidateFullName(selected)} — ${formatPrice(
                  pack.price,
                  pack.currency,
                )}`
              : "Sélectionnez un candidat et un pack de votes."}
          </p>

          {signedIn === false ? (
            <Button asChild className="mt-4 w-full">
              <Link to="/auth">Se connecter pour voter</Link>
            </Button>
          ) : (
            <Button
              className="mt-4 w-full"
              disabled={!selected || !pack || busy || signedIn === null}
              onClick={submit}
            >
              {busy ? "Traitement…" : "Payer et voter"}
            </Button>
          )}

          {intent ? (
            <div className="mt-4 rounded-lg border border-accent/40 bg-secondary/60 p-4 text-sm">
              <p className="font-semibold">Référence : {intent.reference}</p>
              <p className="mt-1 text-muted-foreground">{intent.message}</p>
              <Button variant="outline" className="mt-3 w-full" onClick={check} disabled={busy}>
                J'ai payé — vérifier le paiement
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
