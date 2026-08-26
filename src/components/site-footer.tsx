import { Link } from "@tanstack/react-router";

import { PichnetLogo } from "./pichnet-logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-card/40">
      <div className="pichnet-stripe h-[3px] w-full" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <PichnetLogo className="h-10 w-auto" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Le concours officiel célébrant la beauté, l'élégance et la culture camerounaise.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Navigation</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/miss" className="hover:text-accent">
                Candidates Miss
              </Link>
            </li>
            <li>
              <Link to="/master" className="hover:text-accent">
                Candidats Mister
              </Link>
            </li>
            <li>
              <Link to="/classement" className="hover:text-accent">
                Classement
              </Link>
            </li>
            <li>
                <Link to="/vote" search={{ candidat: undefined }} className="hover:text-accent">
                  Voter
                </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Informations</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Les votes sont validés uniquement après confirmation du paiement. Un vote payé est
            définitif.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            © {new Date().getFullYear()} PICHNET. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
