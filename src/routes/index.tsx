import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Crown, Sparkles, Trophy } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { CandidateCard } from "@/components/candidate-card";
import { Button } from "@/components/ui/button";
import { candidatesQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MISS & MISTER PICHNET 2026 — Site officiel" },
      {
        name: "description",
        content:
          "Découvrez les candidates Miss et candidats Mister PICHNET 2026, consultez leurs profils et soutenez votre favori par un vote payant.",
      },
      { property: "og:title", content: "MISS & MISTER PICHNET 2026 — Site officiel" },
      {
        property: "og:description",
        content: "Beauté, élégance et culture camerounaise. Votez pour votre favori.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(candidatesQuery()),
  component: Index,
});

function Index() {
  const { data: candidates } = useSuspenseQuery(candidatesQuery());
  const featured = candidates.slice(0, 8);

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-border/60 pattern-ndop">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            <Sparkles className="size-3" /> Édition 2026
          </p>
          <h1 className="text-balance-title mt-5 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            MISS &amp; MISTER <span className="text-accent">PICHNET</span> 2026
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Le concours officiel qui célèbre la beauté, l'élégance et la richesse culturelle du
            Cameroun. Découvrez les candidats et faites entendre votre voix.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/vote">Voter maintenant</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/classement">Voir le classement</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-3">
        {[
          {
            icon: Crown,
            title: "Candidates Miss",
            text: "Des jeunes femmes ambassadrices de l'élégance camerounaise.",
            to: "/miss" as const,
          },
          {
            icon: Trophy,
            title: "Candidats Mister",
            text: "Des jeunes hommes engagés, porteurs de talents et de valeurs.",
            to: "/master" as const,
          },
          {
            icon: Sparkles,
            title: "Votes sécurisés",
            text: "Chaque vote est validé côté serveur après confirmation du paiement.",
            to: "/vote" as const,
          },
        ].map((item) => (
          <Link
            key={item.title}
            to={item.to}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/60"
          >
            <item.icon className="size-5 text-accent" />
            <h2 className="mt-3 text-lg font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold">Candidats à la une</h2>
          <Link to="/classement" className="text-sm font-medium text-accent hover:underline">
            Tout voir
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
        {featured.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Les candidats seront publiés très prochainement.
          </p>
        ) : null}
      </section>
    </PageShell>
  );
}
