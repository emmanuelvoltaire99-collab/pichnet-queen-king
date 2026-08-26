import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, Plus } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListCandidates,
  adminListPackages,
  adminListPayments,
  adminStats,
  adminSaveCandidate,
  adminSavePackage,
  adminSetCandidateActive,
  amIAdmin,
} from "@/lib/admin.functions";
import { candidateFullName, formatPrice } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — PICHNET 2026" },
      {
        name: "description",
        content: "Tableau de bord administrateur du concours PICHNET 2026.",
      },
      { property: "og:title", content: "Administration — PICHNET 2026" },
      { property: "og:description", content: "Gestion des candidats, packs et votes." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["admin", "candidates"], queryFn: () => adminListCandidates() }),
      context.queryClient.ensureQueryData({ queryKey: ["admin", "packages"], queryFn: () => adminListPackages() }),
      context.queryClient.ensureQueryData({ queryKey: ["admin", "payments"], queryFn: () => adminListPayments() }),
      context.queryClient.ensureQueryData({ queryKey: ["admin", "stats"], queryFn: () => adminStats() }),
    ]),
  component: AdminPage,
});

const candidatesQuery = { queryKey: ["admin", "candidates"], queryFn: () => adminListCandidates() };
const packagesQuery = { queryKey: ["admin", "packages"], queryFn: () => adminListPackages() };
const paymentsQuery = { queryKey: ["admin", "payments"], queryFn: () => adminListPayments() };
const statsQuery = { queryKey: ["admin", "stats"], queryFn: () => adminStats() };

function AdminPage() {
  const { data: isAdmin } = useSuspenseQuery({
    queryKey: ["admin", "amIAdmin"],
    queryFn: useServerFn(amIAdmin),
  });

  if (!isAdmin?.isAdmin) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Accès réservé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vous devez être administrateur pour accéder à cette page.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">Administration</h1>
            <p className="text-sm text-muted-foreground">Gestion du concours MISS & MISTER PICHNET 2026.</p>
          </div>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            <LogOut className="mr-2 size-4" /> Déconnexion
          </Button>
        </div>

        <StatsCards />

        <Tabs defaultValue="candidates" className="mt-10">
          <TabsList>
            <TabsTrigger value="candidates">Candidats</TabsTrigger>
            <TabsTrigger value="packages">Packs</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
          </TabsList>
          <TabsContent value="candidates">
            <CandidatesTab />
          </TabsContent>
          <TabsContent value="packages">
            <PackagesTab />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}

function StatsCards() {
  const { data: stats } = useSuspenseQuery(statsQuery);

  const cards = [
    { label: "Candidates Miss", value: stats?.missCount ?? 0 },
    { label: "Candidats Mister", value: stats?.masterCount ?? 0 },
    { label: "Votes confirmés", value: stats?.totalVotes ?? 0 },
    { label: "Paiements payés", value: stats?.paidPayments ?? 0 },
    { label: "Paiements en attente", value: stats?.pendingPayments ?? 0 },
    { label: "Revenus", value: formatPrice(stats?.revenue ?? 0, "XAF") },
  ];

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className="mt-1 text-2xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function CandidatesTab() {
  const { data: candidates, refetch } = useSuspenseQuery(candidatesQuery);
  const saveCandidate = useServerFn(adminSaveCandidate);
  const setActive = useServerFn(adminSetCandidateActive);
  const [open, setOpen] = useState(false);

  async function onSubmit(formData: FormData) {
    const values = {
      first_name: String(formData.get("first_name")),
      last_name: String(formData.get("last_name")),
      candidate_number: Number(formData.get("candidate_number")),
      category: String(formData.get("category")) as "miss" | "master",
      region: String(formData.get("region") || ""),
      city: String(formData.get("city") || ""),
      biography: String(formData.get("biography") || ""),
      photo_url: String(formData.get("photo_url") || ""),
      is_active: true,
      is_demo: false,
    };

    try {
      await saveCandidate({ data: { values } });
      toast.success("Candidat enregistré.");
      setOpen(false);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1 size-4" /> Ajouter
        </Button>
      </div>

      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
          className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2"
        >
          <div>
            <Label>Prénom</Label>
            <Input name="first_name" required />
          </div>
          <div>
            <Label>Nom</Label>
            <Input name="last_name" required />
          </div>
          <div>
            <Label>Numéro</Label>
            <Input name="candidate_number" type="number" min={1} required />
          </div>
          <div>
            <Label>Catégorie</Label>
            <select name="category" className="h-10 w-full rounded-md border border-input bg-background px-3">
              <option value="miss">Miss</option>
              <option value="master">Mister</option>
            </select>
          </div>
          <div>
            <Label>Région</Label>
            <Input name="region" />
          </div>
          <div>
            <Label>Ville</Label>
            <Input name="city" />
          </div>
          <div className="md:col-span-2">
            <Label>URL photo</Label>
            <Input name="photo_url" />
          </div>
          <div className="md:col-span-2">
            <Label>Biographie</Label>
            <textarea
              name="biography"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      ) : null}

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {candidates?.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">
                {candidateFullName(c)} <span className="font-mono text-xs text-muted-foreground">N°{c.candidate_number}</span>
              </p>
              <p className="text-xs text-muted-foreground capitalize">{c.category}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={c.is_active ? "default" : "secondary