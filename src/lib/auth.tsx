import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "partner" | "accountant" | "coordinator" | "editor";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  last_login: string | null;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const DEFAULT_USER: User = {
  id: "00000000-0000-0000-0000-000000000000",
  app_metadata: {},
  user_metadata: { full_name: "Studio Admin" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
  email: "admin@leonis.studio",
} as User;

const DEFAULT_PROFILE: Profile = {
  id: "00000000-0000-0000-0000-000000000000",
  full_name: "Studio Admin",
  email: "admin@leonis.studio",
  is_active: true,
  last_login: null,
};

const DEFAULT_ROLE: Role = "partner";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(DEFAULT_PROFILE);
  const [role, setRole] = useState<Role | null>(DEFAULT_ROLE);

  const load = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(DEFAULT_PROFILE);
      setRole(DEFAULT_ROLE);
      return;
    }
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,is_active,last_login").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as Profile) ?? DEFAULT_PROFILE);
    const order: Role[] = ["partner", "accountant", "coordinator", "editor"];
    const found = (roles ?? []).map((r) => r.role as Role).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    setRole(found[0] ?? DEFAULT_ROLE);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void load(s?.user?.id).finally(() => setLoading(false));
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void load(data.session?.user?.id).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading: false,
      session,
      user: session?.user ?? DEFAULT_USER,
      profile: profile ?? DEFAULT_PROFILE,
      role: role ?? DEFAULT_ROLE,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refresh: async () => load(session?.user?.id),
    }),
    [session, profile, role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Frontend mirror of the database access rules. The database is the real gate. */
export const permissions = {
  viewFinance: ["partner", "accountant", "coordinator"] as Role[],
  viewPartnerFinance: ["partner", "accountant"] as Role[],
  managePartnerFinance: ["partner"] as Role[],
  editProjects: ["partner", "accountant", "coordinator"] as Role[],
  deleteRecords: ["partner", "accountant"] as Role[],
  manageMasters: ["partner", "accountant"] as Role[],
  manageUsers: ["partner"] as Role[],
  approvePayments: ["partner"] as Role[],
  manageCapitalExpense: ["partner"] as Role[],
  viewAudit: ["partner", "accountant"] as Role[],
};

export type Permission = keyof typeof permissions;

export function useCan() {
  const { role } = useAuth();
  return (perm: Permission) => !!role && permissions[perm].includes(role);
}

export const roleLabel: Record<Role, string> = {
  partner: "Partner / Owner",
  accountant: "Accountant",
  coordinator: "Coordinator",
  editor: "Editor",
};
