"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/landing"; return; }
      supabase.from("profiles").select("role, approved").eq("id", session.user.id).single()
        .then(({ data: profile }) => {
          if (!profile) window.location.href = "/landing";
          else if (profile.role === "admin") window.location.href = "/admin";
          else if (profile.approved) window.location.href = "/dashboard";
          else window.location.href = "/landing";
        });
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );
}
