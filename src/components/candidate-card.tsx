import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { candidateFullName, type CandidateStanding } from "@/lib/types";

export function CandidateCard({
  candidate,
  rank,
}: {
  candidate: CandidateStanding;
  rank?: number;
}) {
  const name = candidateFullName(candidate);
  const accent = candidate.category === "miss" ? "text-miss" : "text-master";

  return (
    <Link
      to="/candidat/$id"
      params={{ id: candidate.id }}
      className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-accent/60"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary pattern-toghu">
        {candidate.photo_url ? (
          <img
            src={candidate.photo_url}
            alt={`Portrait de ${name}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-4xl font-bold text-muted-foreground">
            {candidate.first_name.charAt(0)}
            {candidate.last_name.charAt(0)}
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <Badge variant="secondary" className="font-mono">
            N°{candidate.candidate_number}
          </Badge>
          {rank ? <Badge className="bg-accent text-accent-foreground">#{rank}</Badge> : null}
          {candidate.is_demo ? (
            <Badge variant="outline" className="border-accent/60 text-accent">
              DEMO
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="space-y-1 p-3">
        <h3 className="truncate text-sm font-semibold text-foreground">{name}</h3>
        <p className="truncate text-xs text-muted-foreground">
          {[candidate.city, candidate.region].filter(Boolean).join(", ") || "Cameroun"}
        </p>
        <p className={`text-xs font-semibold ${accent}`}>
          {candidate.total_votes.toLocaleString("fr-FR")} vote
          {candidate.total_votes === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}
