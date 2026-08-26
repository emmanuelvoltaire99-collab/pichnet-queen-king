import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — PICHNET 2026" },
      {
        name: "description",
        content: "Connectez-vous pour voter ou accéder à l'espace administrateur PICHNET 2026.",
      },
      { property: "og:title", content: "Connexion — PICHNET 2026" },
      {
        property: "og:description",
        content: "Accédez à votre compte PICHNET 2026.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSignedIn(true);
        throw redirect({ to: "/admin" });
      }
    });
  }, []);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Identifiants incorrects.");
    } else {
      toast.success("Connexion réussie.");
      setSignedIn(true);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Impossible de lancer Google.");
    }
  }

  if (signedIn) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Connexion réussie</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vous êtes connecté. Accédez à l'espace admin ou retournez voter.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/admin">Espace admin</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Accueil</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-bold">Connexion</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour voter ou gérer le concours.
        </p>

        <form onSubmit={signInWithEmail} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Ou</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={signInWithGoogle} disabled={loading}>
          Continuer avec Google
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Pas encore de compte ?{" "}
          <button
            type="button"
            onClick={async () => {
              if (!email || !password) {
                toast.error("Renseignez d'abord email et mot de passe.");
                return;
              }
              setLoading(true);
              const { error } = await supabase.auth.signUp({ email, password });
              setLoading(false);
              if (error) toast.error(error.message || "Inscription impossible.");
              else toast.success("Compte créé. Vérifiez votre email si la confirmation est requise.");
            }}
            className="text-accent hover:underline"
          >
            Créer un compte
          </button>
        </p>
      </div>
    </PageShell>
  );
}
