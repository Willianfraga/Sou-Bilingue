"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SairButton() {
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
      className="rounded px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
    >
      Sair
    </button>
  );
}
