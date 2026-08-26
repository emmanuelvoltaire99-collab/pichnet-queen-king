import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { candidatesQuery } from "@/lib/queries";
import { candidateFullName, type CandidateStanding } from "@/lib/types";

export const Route = createFileRoute("/classement")({
  head: () => ({
    meta: [
      { title: "Classement en direct — MISS & MISTER PICHNET 2026" },
      {
        name: "description",
        content:
          "Suivez le classement en direct des candidates Miss et candidats Mister PICHNET 2026, calculé sur les votes payés.",
      },
      { property: "og:title", content: "Classement en direct — PICHNET 2026" },
      {
        property: "og:description",
        content: "Le classement officiel basé uniquement sur les votes confirmés.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(candidatesQuery()),
  component: Classement,
});

function Table({ rows }: { rows: CandidateStanding[] }) {
  const total = rows.reduce((sum, r) => sum + r.total_votes, 0) || 1;

  if (rows.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">Aucun candidat pour le moment.</p>;
  }

  return (
    <ol className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {rows.map((row, index) => (
        <li key={row.id}>
          <Link
            to="/candidat/$id"
            params={{ id: row.id }}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
          >
            <span className="w-8 shrink-0 text-center text-sm font-bold text-accent">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {candidateFullName(row)}{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  N°{row.candidate_number}
                </span>
                {row.is_demo ? (
                  <Badge variant="outline" className="ml-2 border-accent/60 text-accent">
                    DEMO
                  </Badge>
                ) : null}
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={row.category === "miss" ? "h-full bg-miss" : "h-full bg-master"}
                  style={{ width: `${Math.max(2, (row.total_votes / total) * 100)}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {row.total_votes.toLocaleString("fr-FR")}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function Classement() {
  const { data } = useSuspenseQuery(candidatesQuery());
  const miss = data.filter((c) => c.category === "miss");
  const master = data.filter((c) => c.category === "master");

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-extrabold md:text-4xl">Classement en direct</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le classement ne prend en compte que les votes dont le paiement a été confirmé.
        </p>

        <Tabs defaultValue="miss" className="mt-8">
          <TabsList>
            <TabsTrigger value="miss">Miss</TabsTrigger>
            <TabsTrigger value="master">Mister</TabsTrigger>
          </TabsList>
          <TabsContent value="miss">
            <Table rows={miss} />
          </TabsContent>
          <TabsContent value="master">
            <Table rows={master} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
