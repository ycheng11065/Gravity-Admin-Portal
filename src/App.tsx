import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Login } from "./Login";
import { Dashboard } from "./Dashboard";
import { DEMO } from "./demo";

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (DEMO) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (DEMO) {
    return <Dashboard email="demo@admin (mock data)" onSignOut={() => {}} />;
  }

  if (!ready) return <div className="center">Loading…</div>;
  if (!session) return <Login />;

  return (
    <Dashboard
      email={session.user.email ?? ""}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
