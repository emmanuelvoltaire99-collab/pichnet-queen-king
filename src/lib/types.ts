export type Category = "miss" | "master";

export type CandidateStanding = {
  id: string;
  first_name: string;
  last_name: string;
  candidate_number: number;
  category: Category;
  region: string | null;
  city: string | null;
  photo_url: string | null;
  is_demo: boolean;
  total_votes: number;
};

export type CandidateDetail = CandidateStanding & {
  biography: string | null;
};

export type VotePackage = {
  id: string;
  name: string;
  vote_quantity: number;
  price: number;
  currency: string;
};

export type PaymentIntentResult = {
  paymentId: string;
  reference: string;
  status: "pending" | "unavailable";
  providerName: string;
  message: string;
};

export const CATEGORY_LABEL: Record<Category, string> = {
  miss: "Miss",
  master: "Mister",
};

export function candidateFullName(c: { first_name: string; last_name: string }) {
  return `${c.first_name} ${c.last_name}`.trim();
}

export function formatPrice(amount: number, currency = "XAF") {
  const label = currency === "XAF" ? "FCFA" : currency;
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${label}`;
}
