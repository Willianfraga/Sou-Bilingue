"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SairButton({ inverted = false }: { inverted?: boolean }) {
  const router = useRouter();

  async function sair() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      className={`mt-1 rounded-xl px-3 py-2 text-left text-sm transition ${inverted ? "text-indigo-100 hover:bg-white/15 hover:text-white" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"}`}
    >
      Sair
    </button>
  );
}
