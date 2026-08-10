-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('partner','accountant','coordinator','editor');
CREATE TYPE public.expense_class AS ENUM ('operating','capital','financing');
CREATE TYPE public.project_status AS ENUM ('planned','active','completed','cancelled');
CREATE TYPE public.payment_type AS ENUM ('client_payment','other_income');

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES / ROLES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'coordinator');
  EXCEPTION WHEN others THEN _role := 'coordinator';
  END;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'partner') THEN
    _role := 'partner';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_partner_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'partner')) WITH CHECK (public.has_role(auth.uid(),'partner'));

CREATE POLICY "roles_select_all" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_partner_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'partner')) WITH CHECK (public.has_role(auth.uid(),'partner'));

-- ============ MASTERS ============
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  profit_share NUMERIC(5,2) NOT NULL DEFAULT 50,
  user_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT DEFAULT 'Surat',
  final_quote NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  default_class public.expense_class NOT NULL DEFAULT 'operating',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.payment_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type_id UUID NOT NULL REFERENCES public.project_types(id),
  rate NUMERIC(14,2) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.financial_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ TRANSACTIONS ============
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  project_type_id UUID NOT NULL REFERENCES public.project_types(id),
  partner_id UUID REFERENCES public.partners(id),
  shoot_date DATE NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  rate NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  editing_expense NUMERIC(14,2) NOT NULL DEFAULT 0,
  production_expense NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.project_status NOT NULL DEFAULT 'active',
  referred_by TEXT,
  org_name TEXT,
  notes TEXT,
  assigned_to UUID,
  created_by UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_client ON public.projects(client_id);
CREATE INDEX idx_projects_date ON public.projects(shoot_date);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id),
  project_id UUID REFERENCES public.projects(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_type public.payment_type NOT NULL DEFAULT 'client_payment',
  mode_id UUID REFERENCES public.payment_modes(id),
  reference_no TEXT,
  received_by UUID,
  notes TEXT,
  needs_approval BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_client ON public.payments(client_id);
CREATE INDEX idx_payments_date ON public.payments(payment_date);

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  partner_id UUID REFERENCES public.partners(id),
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  expense_class public.expense_class NOT NULL DEFAULT 'operating',
  client_id UUID REFERENCES public.clients(id),
  project_id UUID REFERENCES public.projects(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  bill_no TEXT,
  notes TEXT,
  created_by UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_client ON public.expenses(client_id);

CREATE TABLE public.partner_capital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.partner_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_entity ON public.documents(entity_type, entity_id);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'system',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14,2),
  severity TEXT NOT NULL DEFAULT 'medium',
  entity_type TEXT,
  entity_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  snoozed_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','partners','clients','project_types','expense_categories','payment_modes','price_lists','financial_years','projects','payments','expenses','partner_capital','partner_drawings','alerts']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============ GRANTS + RLS ============
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['partners','clients','project_types','expense_categories','payment_modes','price_lists','financial_years','settings','projects','payments','expenses','partner_capital','partner_drawings','documents','audit_logs','notifications','alerts']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%s TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%s TO service_role', t);
    EXECUTE format('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Masters: everyone signed in can read; partners+accountants can write
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['project_types','expense_categories','payment_modes','price_lists','financial_years']
  LOOP
    EXECUTE format('CREATE POLICY "%1$s_read" ON public.%1$s FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "%1$s_write" ON public.%1$s FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY[''partner'',''accountant'']::public.app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY[''partner'',''accountant'']::public.app_role[]))', t);
  END LOOP;
END $$;

-- Clients: financial-bearing, hidden from editors
CREATE POLICY "clients_read" ON public.clients FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['partner','accountant','coordinator']::public.app_role[]));
CREATE POLICY "clients_write" ON public.clients FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['partner','accountant']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['partner','accountant']::public.app_role[]));

-- Projects: all roles read; partner/accountant/coordinator create+edit; delete partner/accountant only
CREATE POLICY "projects_read" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['partner','accountant','coordinator']::public.app_role[]));
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['partner','accountant','coordinator','editor']::public.app_role[]));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['partner','accountant']::public.app_role[]));

-- Payments & expenses: no editor access
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['payments','expenses']
  LOOP
    EXECUTE format('CREATE POLICY "%1$s_read" ON public.%1$s FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY[''partner'',''accountant'',''coordinator'']::public.app_role[]))', t);
    EXECUTE format('CREATE POLICY "%1$s_insert" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY[''partner'',''accountant'',''coordinator'']::public.app_role[]))', t);
    EXECUTE format('CREATE POLICY "%1$s_update" ON public.%1$s FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY[''partner'',''accountant'']::public.app_role[]))', t);
    EXECUTE format('CREATE POLICY "%1$s_delete" ON public.%1$s FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY[''partner'',''accountant'']::public.app_role[]))', t);
  END LOOP;
END $$;

-- Partner financials: partners only
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['partners','partner_capital','partner_drawings']
  LOOP
    EXECUTE format('CREATE POLICY "%1$s_read" ON public.%1$s FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY[''partner'',''accountant'']::public.app_role[]))', t);
    EXECUTE format('CREATE POLICY "%1$s_write" ON public.%1$s FOR ALL TO authenticated USING (public.has_role(auth.uid(),''partner'')) WITH CHECK (public.has_role(auth.uid(),''partner''))', t);
  END LOOP;
END $$;

CREATE POLICY "settings_read" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_write" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'partner')) WITH CHECK (public.has_role(auth.uid(),'partner'));

CREATE POLICY "documents_read" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['partner','accountant']::public.app_role[]));

CREATE POLICY "audit_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['partner','accountant']::public.app_role[]));
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "notifications_read" ON public.notifications FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "alerts_read" ON public.alerts FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['partner','accountant','coordinator']::public.app_role[]));
CREATE POLICY "alerts_write" ON public.alerts FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['partner','accountant']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['partner','accountant']::public.app_role[]));

-- ============ SEED ============
INSERT INTO public.partners (name, profit_share) VALUES ('Jayu', 50), ('Mehulbhai', 50);

INSERT INTO public.financial_years (label, start_date, end_date, is_current) VALUES
  ('FY 2025-26','2025-04-01','2026-03-31', false),
  ('FY 2026-27','2026-04-01','2027-03-31', true);

INSERT INTO public.payment_modes (name) VALUES ('Cash'),('UPI'),('Bank Transfer'),('Cheque'),('Card');

INSERT INTO public.project_types (name, description) VALUES
  ('Baby Shoot','Newborn & baby photography'),
  ('Maternity Shoot','Maternity portfolio'),
  ('Wedding Shoot','Full wedding coverage'),
  ('Product Shoot','Catalogue / e-commerce'),
  ('Hospital Content','Monthly retainer content'),
  ('Corporate Video','Brand films & reels');

INSERT INTO public.price_lists (project_type_id, rate, effective_from)
SELECT id, CASE name
  WHEN 'Baby Shoot' THEN 12000
  WHEN 'Maternity Shoot' THEN 15000
  WHEN 'Wedding Shoot' THEN 85000
  WHEN 'Product Shoot' THEN 6000
  WHEN 'Hospital Content' THEN 35000
  ELSE 45000 END, '2025-04-01' FROM public.project_types;

INSERT INTO public.expense_categories (name, default_class) VALUES
  ('Editing / Post Production','operating'),
  ('Travel & Fuel','operating'),
  ('Props & Set','operating'),
  ('Studio Rent','operating'),
  ('Salary & Freelancers','operating'),
  ('Marketing','operating'),
  ('Camera & Lens','capital'),
  ('Lighting Equipment','capital'),
  ('Loan Interest','financing'),
  ('Bank Charges','financing');

INSERT INTO public.clients (name, company, phone, email, address, final_quote) VALUES
  ('Ridhi Shah','Ridhi Maternity Studio','+91 98250 11223','ridhi@example.com','Vesu, Surat', 180000),
  ('Dr. Nilesh Patel','Sunrise Children Hospital','+91 99043 55210','nilesh@sunrisehosp.in','Adajan, Surat', 420000),
  ('Kiran Textiles','Kiran Textiles Pvt Ltd','+91 90999 71234','sales@kirantex.in','Ring Road, Surat', 240000),
  ('Ankit & Pooja','—','+91 97250 44881','ankit.pooja@example.com','Piplod, Surat', 150000),
  ('Glow Skin Clinic','Glow Skin & Hair Clinic','+91 88667 30012','hello@glowskin.in','Athwalines, Surat', 95000);

-- Projects
INSERT INTO public.projects (client_id, project_type_id, partner_id, shoot_date, quantity, rate, amount, editing_expense, production_expense, status, referred_by, org_name)
SELECT c.id, pt.id, p.id, d.shoot_date, d.qty, d.rate, d.qty*d.rate, d.edit_exp, d.prod_exp, d.status::public.project_status, d.ref, d.org
FROM (VALUES
  ('Ridhi Shah','Maternity Shoot','Jayu','2026-04-12'::date,2,15000,2500,1800,'completed','Instagram','Ridhi Maternity Studio'),
  ('Ridhi Shah','Baby Shoot','Jayu','2026-05-08',3,12000,3000,2200,'completed','Repeat Client','Ridhi Maternity Studio'),
  ('Dr. Nilesh Patel','Hospital Content','Mehulbhai','2026-04-30',1,35000,6000,4500,'completed','Reference','Sunrise Children Hospital'),
  ('Dr. Nilesh Patel','Hospital Content','Mehulbhai','2026-05-31',1,35000,6500,4200,'completed','Reference','Sunrise Children Hospital'),
  ('Dr. Nilesh Patel','Hospital Content','Mehulbhai','2026-06-30',1,35000,7000,3900,'active','Reference','Sunrise Children Hospital'),
  ('Kiran Textiles','Product Shoot','Jayu','2026-05-14',20,6000,18000,9000,'completed','Cold Outreach','Kiran Textiles Pvt Ltd'),
  ('Kiran Textiles','Corporate Video','Mehulbhai','2026-06-18',1,45000,12000,8500,'active','Cold Outreach','Kiran Textiles Pvt Ltd'),
  ('Ankit & Pooja','Wedding Shoot','Jayu','2026-06-05',1,85000,15000,22000,'completed','Wedding Planner','—'),
  ('Ankit & Pooja','Baby Shoot','Jayu','2026-07-02',1,12000,1500,900,'planned','Repeat Client','—'),
  ('Glow Skin Clinic','Corporate Video','Mehulbhai','2026-06-22',1,45000,9000,7500,'active','Instagram','Glow Skin & Hair Clinic'),
  ('Glow Skin Clinic','Product Shoot','Jayu','2026-07-10',8,6000,5000,2000,'planned','Instagram','Glow Skin & Hair Clinic'),
  ('Ridhi Shah','Baby Shoot','Jayu','2026-07-18',2,12000,2000,1200,'planned','Repeat Client','Ridhi Maternity Studio')
) AS d(client,ptype,partner,shoot_date,qty,rate,edit_exp,prod_exp,status,ref,org)
JOIN public.clients c ON c.name = d.client
JOIN public.project_types pt ON pt.name = d.ptype
JOIN public.partners p ON p.name = d.partner;

-- Payments
INSERT INTO public.payments (client_id, payment_date, amount, payment_type, mode_id, reference_no, notes)
SELECT c.id, d.pdate, d.amt, d.ptype::public.payment_type, m.id, d.ref, d.note
FROM (VALUES
  ('Ridhi Shah','2026-04-15'::date,15000,'client_payment','UPI','UPI-448120','Maternity advance'),
  ('Ridhi Shah','2026-04-28',10000,'client_payment','Bank Transfer','NEFT-99120','Balance part 1'),
  ('Ridhi Shah','2026-05-12',20000,'client_payment','UPI','UPI-455901','Baby shoot payment'),
  ('Dr. Nilesh Patel','2026-05-05',35000,'client_payment','Bank Transfer','NEFT-10231','April retainer'),
  ('Dr. Nilesh Patel','2026-06-04',35000,'client_payment','Bank Transfer','NEFT-10388','May retainer'),
  ('Dr. Nilesh Patel','2026-06-28',20000,'client_payment','Cheque','CHQ-220145','June part payment'),
  ('Kiran Textiles','2026-05-20',60000,'client_payment','Bank Transfer','NEFT-77120','Product shoot full'),
  ('Kiran Textiles','2026-06-20',20000,'client_payment','UPI','UPI-812004','Corporate video advance'),
  ('Ankit & Pooja','2026-05-25',40000,'client_payment','Cash','CASH-001','Wedding booking advance'),
  ('Ankit & Pooja','2026-06-08',45000,'client_payment','UPI','UPI-900341','Wedding balance part'),
  ('Glow Skin Clinic','2026-06-25',25000,'client_payment','UPI','UPI-771290','Video advance'),
  ('Glow Skin Clinic','2026-07-01',15000,'client_payment','Card','CARD-4412','Second instalment'),
  ('Kiran Textiles','2026-07-05',15000,'client_payment','UPI','UPI-823110','Corporate video part'),
  ('Ridhi Shah','2026-07-08',12000,'client_payment','Cash','CASH-002','Advance for July shoot'),
  ('Dr. Nilesh Patel','2026-07-12',15000,'client_payment','Bank Transfer','NEFT-10555','June balance'),
  ('Ankit & Pooja','2026-07-15',8000,'other_income','UPI','UPI-901882','Album printing margin')
) AS d(client,pdate,amt,ptype,mode,ref,note)
JOIN public.clients c ON c.name = d.client
JOIN public.payment_modes m ON m.name = d.mode;

-- Expenses
INSERT INTO public.expenses (expense_date, partner_id, category_id, expense_class, client_id, amount, bill_no, notes)
SELECT d.edate, p.id, ec.id, ec.default_class, c.id, d.amt, d.bill, d.note
FROM (VALUES
  ('2026-04-10'::date,'Jayu','Props & Set','Ridhi Shah',4500,'B-1001','Maternity props'),
  ('2026-04-12','Jayu','Travel & Fuel','Ridhi Shah',1200,'B-1002','Local travel'),
  ('2026-04-25','Mehulbhai','Editing / Post Production','Dr. Nilesh Patel',6000,'B-1003','Reel editing'),
  ('2026-05-02','Mehulbhai','Studio Rent',NULL,25000,'B-1004','May studio rent'),
  ('2026-05-06','Jayu','Editing / Post Production','Ridhi Shah',3000,'B-1005','Album design'),
  ('2026-05-14','Jayu','Salary & Freelancers','Kiran Textiles',9000,'B-1006','Assistant + stylist'),
  ('2026-05-18','Mehulbhai','Camera & Lens',NULL,185000,'B-1007','Sony 24-70 GM II'),
  ('2026-05-28','Jayu','Marketing',NULL,7500,'B-1008','Instagram ads'),
  ('2026-06-02','Mehulbhai','Studio Rent',NULL,25000,'B-1009','June studio rent'),
  ('2026-06-05','Jayu','Props & Set','Ankit & Pooja',22000,'B-1010','Wedding decor support'),
  ('2026-06-09','Jayu','Editing / Post Production','Ankit & Pooja',15000,'B-1011','Wedding film edit'),
  ('2026-06-18','Mehulbhai','Lighting Equipment',NULL,68000,'B-1012','Aputure light kit'),
  ('2026-06-22','Mehulbhai','Travel & Fuel','Glow Skin Clinic',2400,'B-1013','Shoot travel'),
  ('2026-06-30','Mehulbhai','Loan Interest',NULL,9500,'B-1014','Equipment loan interest'),
  ('2026-07-03','Jayu','Bank Charges',NULL,850,'B-1015','Bank charges'),
  ('2026-07-08','Mehulbhai','Editing / Post Production','Glow Skin Clinic',9000,'B-1016','Video post production')
) AS d(edate,partner,cat,client,amt,bill,note)
JOIN public.partners p ON p.name = d.partner
JOIN public.expense_categories ec ON ec.name = d.cat
LEFT JOIN public.clients c ON c.name = d.client;

INSERT INTO public.partner_capital (partner_id, entry_date, amount, notes)
SELECT p.id, d.dt, d.amt, d.note FROM (VALUES
  ('Jayu','2025-04-05'::date,300000,'Initial capital'),
  ('Jayu','2026-05-18',92500,'Share of camera purchase'),
  ('Mehulbhai','2025-04-05',300000,'Initial capital'),
  ('Mehulbhai','2026-06-18',68000,'Lighting kit purchase')
) AS d(partner,dt,amt,note) JOIN public.partners p ON p.name = d.partner;

INSERT INTO public.partner_drawings (partner_id, entry_date, amount, notes)
SELECT p.id, d.dt, d.amt, d.note FROM (VALUES
  ('Jayu','2026-05-30'::date,40000,'Monthly drawing'),
  ('Jayu','2026-06-30',35000,'Monthly drawing'),
  ('Mehulbhai','2026-05-30',40000,'Monthly drawing'),
  ('Mehulbhai','2026-06-30',30000,'Monthly drawing')
) AS d(partner,dt,amt,note) JOIN public.partners p ON p.name = d.partner;

INSERT INTO public.settings (key, value) VALUES
  ('company', '{"name":"LEONIS","tagline":"Photography & Content Production","city":"Surat","gstin":"","phone":"+91 98250 00000","email":"studio@leonis.in"}'::jsonb),
  ('thresholds', '{"bill_required_above":10000,"cash_approval_above":50000,"low_margin_percent":20,"expense_spike_percent":40,"overdue_days":30}'::jsonb);
