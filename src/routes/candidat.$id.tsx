import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { candidateQuery } from "@/lib/queries";
import { CATEGORY_LABEL, candidateFullName } from "@/lib/types";

export const Route = createFileRoute("/candidat/$id")({
  loader: async ({ context, params }) => {
    const candidate = await context.queryClient.ensureQueryData(candidateQuery(params.id));
    if (!candidate) throw notFound();
    return { candidate };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Candidat introuvable — PICHNET 2026" }, { name: "robots", content: "noindex" }],
      };
    }
    const name = candidateFullName(loaderData.candidate);
    const title = `${name} — ${CATEGORY_LABEL[loaderData.candidate.category]} PICHNET 2026`;
    const description =
      loaderData.candidate.biography?.slice(0, 155) ??
      `Profil de ${name}, candidat N°${loaderData.candidate.candidate_number} au concours PICHNET 2026.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CandidatePage,
  notFoundComponent: CandidateNotFound,
});

function CandidateNotFound() {
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Candidat introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce profil n'existe pas ou n'est plus en compétition.
        </p>
        <Button asChild className="mt-6">
          <Link to="/classement">Voir le classement</Link>
        </Button>
      </div>
    </PageShell>
  );
}

function CandidatePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(candidateQuery(id));
  if (!data) return <CandidateNotFound />;

  const name = candidateFullName(data);
  const backTo = data.category === "miss" ? "/miss" : "/master";

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Retour aux candidats
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-secondary pattern-toghu">
            <div className="aspect-[3/4]">
              {data.photo_url ? (
                <img src={data.photo_url} alt={`Portrait de ${name}`} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-6xl font-bold text-muted-foreground">
                  {data.first_name.charAt(0)}
                  {data.last_name.charAt(0)}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  data.category === "miss"
                    ? "bg-miss text-primary-foreground"
                    : "bg-master text-primary-foreground"
                }
              >
                {CATEGORY_LABEL[data.category]}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                N°{data.candidate_number}
              </Badge>
              {data.is_demo ? (
                <Badge variant="outline" className="border-accent/60 text-accent">
                  DEMO
                </Badge>
              ) : null}
            </div>

            <h1 className="mt-4 text-3xl font-extrabold md:text-4xl">{name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[data.city, data.region].filter(Boolean).join(", ") || "Cameroun"}
            </p>

            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Votes confirmés
              </p>
              <p className="text-3xl font-bold text-accent">
                {data.total_votes.toLocaleString("fr-FR")}
              </p>
            </div>

            {data.biography ? (
              <div className="mt-6">
                <h2 className="text-lg font-semibold">Biographie</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {data.biography}
                </p>
              </div>
            ) : null}

            <Button asChild size="lg" className="mt-8 w-full">
              <Link to="/vote" search={{ candidat: data.id }}>
                Voter pour {data.first_name}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
