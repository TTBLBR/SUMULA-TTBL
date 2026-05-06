import { supabase } from "./supabase";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  nickname: string | null;
  role: "admin" | "judge";
  approved: boolean;
  category_id: string | null;
  division_id: string | null;
  created_at: string;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getProfile(): Promise<Profile | null> {
  const session = await getSession();
  if (!session) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Sign in with nickname: we look up the email first, then sign in
export async function signInWithNickname(nickname: string, password: string) {
  // Find profile by nickname
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("nickname", nickname)
    .single();

  if (!profile) throw new Error("Usuario nao encontrado");

  return signIn(profile.email, password);
}

export async function signUp(nickname: string, password: string, fullName: string) {
  // Use nickname as fake email for Supabase auth
  const fakeEmail = `${nickname.toLowerCase().replace(/[^a-z0-9]/g, "")}@judge.local`;

  // Check if nickname is taken
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", nickname)
    .single();

  if (existing) throw new Error("Esse nickname ja esta em uso");

  const { data, error } = await supabase.auth.signUp({
    email: fakeEmail,
    password,
    options: {
      data: { full_name: fullName, role: "judge", nickname },
    },
  });
  if (error) throw error;

  // Update profile with nickname
  if (data.user) {
    await supabase
      .from("profiles")
      .update({ nickname, full_name: fullName })
      .eq("id", data.user.id);
  }

  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}
