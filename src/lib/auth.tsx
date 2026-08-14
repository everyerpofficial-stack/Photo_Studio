import { createContext, useContext, useMemo, type ReactNode } from "react";

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
  profile: Profile | null;
  role: Role | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// Placeholder identity used until a real login flow is built. Matches the
// row seeded in the local database (src/lib/server/db.server.ts).
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";
export const DEFAULT_USER_EMAIL = "admin@leonis.studio";

const DEFAULT_PROFILE: Profile = {
  id: DEFAULT_USER_ID,
  full_name: "Studio Admin",
  email: DEFAULT_USER_EMAIL,
  is_active: true,
  last_login: null,
};

const DEFAULT_ROLE: Role = "partner";

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthState>(
    () => ({
      loading: false,
      profile: DEFAULT_PROFILE,
      role: DEFAULT_ROLE,
      signOut: async () => {},
    }),
    [],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Frontend mirror of the (currently unenforced) access rules — kept so permission-gated UI stays intact once real auth returns. */
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
