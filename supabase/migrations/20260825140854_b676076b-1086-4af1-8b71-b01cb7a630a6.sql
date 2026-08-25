-- roles
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.candidate_category AS ENUM ('miss','master');
CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','cancelled');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- candidates
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  candidate_number integer NOT NULL,
  category public.candidate_category NOT NULL,
  region text,
  city text,
  biography text,
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, candidate_number)
);
GRANT SELECT ON public.candidates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active candidates public" ON public.candidates FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admins read all candidates" ON public.candidates FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert candidates" ON public.candidates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update candidates" ON public.candidates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete candidates" ON public.candidates FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- vote packages
CREATE TABLE public.vote_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vote_quantity integer NOT NULL CHECK (vote_quantity > 0),
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'XAF',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vote_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vote_packages TO authenticated;
GRANT ALL ON public.vote_packages TO service_role;
ALTER TABLE public.vote_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active packages public" ON public.vote_packages FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admins read all packages" ON public.vote_packages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert packages" ON public.vote_packages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update packages" ON public.vote_packages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.vote_packages(id),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'XAF',
  payment_method text,
  transaction_reference text UNIQUE,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments readable" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read payments" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- votes (server-side writes only)
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id)
);
GRANT SELECT ON public.votes TO anon, authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes readable" ON public.votes FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX votes_candidate_idx ON public.votes(candidate_id);

-- ranking function (validated votes only)
CREATE OR REPLACE FUNCTION public.candidate_standings(_category public.candidate_category DEFAULT NULL)
RETURNS TABLE (
  id uuid, first_name text, last_name text, candidate_number integer,
  category public.candidate_category, region text, city text, photo_url text,
  is_demo boolean, total_votes bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.first_name, c.last_name, c.candidate_number, c.category, c.region, c.city,
         c.photo_url, c.is_demo,
         COALESCE((SELECT SUM(v.quantity) FROM public.votes v
                   JOIN public.payments p ON p.id = v.payment_id
                   WHERE v.candidate_id = c.id AND p.status = 'paid'), 0)::bigint AS total_votes
  FROM public.candidates c
  WHERE c.is_active = true AND (_category IS NULL OR c.category = _category)
  ORDER BY total_votes DESC, c.candidate_number ASC
$$;
GRANT EXECUTE ON FUNCTION public.candidate_standings(public.candidate_category) TO anon, authenticated, service_role;

-- demo data
INSERT INTO public.vote_packages (name, vote_quantity, price, currency, is_active) VALUES
  ('1 vote', 1, 100, 'XAF', true),
  ('5 votes', 5, 500, 'XAF', true),
  ('10 votes', 10, 1000, 'XAF', true),
  ('25 votes', 25, 2500, 'XAF', true),
  ('50 votes', 50, 5000, 'XAF', true);

INSERT INTO public.candidates (first_name, last_name, candidate_number, category, region, city, biography, is_active, is_demo) VALUES
  ('DEMO', 'Candidate 01', 1, 'miss', 'Littoral', 'Douala', 'Profil de démonstration (DEMO) — les informations officielles seront ajoutées par l''administrateur.', true, true),
  ('DEMO', 'Candidate 02', 2, 'miss', 'Centre', 'Yaoundé', 'Profil de démonstration (DEMO) — les informations officielles seront ajoutées par l''administrateur.', true, true),
  ('DEMO', 'Candidate 03', 3, 'miss', 'Ouest', 'Bafoussam', 'Profil de démonstration (DEMO) — les informations officielles seront ajoutées par l''administrateur.', true, true),
  ('DEMO', 'Candidate 04', 4, 'miss', 'Nord-Ouest', 'Bamenda', 'Profil de démonstration (DEMO) — les informations officielles seront ajoutées par l''administrateur.', true, true),
  ('DEMO', 'Candidat 01', 1, 'master', 'Littoral', 'Douala', 'Profil de démonstration (DEMO) — les informations officielles seront ajoutées par l''administrateur.', true, true),
  ('DEMO', 'Candidat 02', 2, 'master', 'Sud', 'Kribi', 'Profil de démonstration (DEMO) — les informations officielles seront ajoutées par l''administrateur.', true, true),
  ('DEMO', 'Candidat 03', 3, 'master', 'Adamaoua', 'Ngaoundéré', 'Profil de démonstration (DEMO) — les informations officielles seront ajoutées par l''administrateur.', true, true),
  ('DEMO', 'Candidat 04', 4, 'master', 'Extrême-Nord', 'Maroua', 'Profil de démonstration (DEMO) — les informations officielles seront ajoutées par l''administrateur.', true, true);