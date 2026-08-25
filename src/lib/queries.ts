import { queryOptions } from "@tanstack/react-query";

import { getCandidate, listCandidates, listVotePackages } from "./pichnet.functions";
import type { Category } from "./types";

export const candidatesQuery = (category?: Category | null) =>
  queryOptions({
    queryKey: ["candidates", category ?? "all"],
    queryFn: () => listCandidates({ data: { category: category ?? null } }),
  });

export const candidateQuery = (id: string) =>
  queryOptions({
    queryKey: ["candidate", id],
    queryFn: () => getCandidate({ data: { id } }),
  });

export const votePackagesQuery = () =>
  queryOptions({
    queryKey: ["vote-packages"],
    queryFn: () => listVotePackages(),
  });
