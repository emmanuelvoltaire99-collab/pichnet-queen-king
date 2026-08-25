import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { PageShell } from "@/components/page-shell";
import { CandidateCard } from "@/components/candidate-card";
import { candidatesQuery } from "@/lib/queries";

export const Route = createFileRoute("/miss")({
  head: () => ({
    meta: [
      { title: "Candidates Miss PICHNET 2026" },
      {
        name: "description",
        content:
          "Découvrez toutes les candidates au titre de Miss PICHNET 2026 : profils, régions et nombre de votes.",
      },
      { property: "og:title", content: "Candidates Miss PICHNET 2026" },
      {
        property: "og:description",
        content: "Les ambassadrices de l'élégance camerounaise, édition 2026.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(candidatesQuery("miss")),
  component: MissPage,
});

function MissPage() {
  const { data } = useSuspenseQuery(candidatesQuery("miss"));

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-extrabold md:text-4xl">
          Candidates <span className="text-miss">Miss</span> 2026
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {data.length} candidate{data.length === 1 ? "" : "s"} en compétition. Cliquez sur un
          profil pour en savoir plus.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
