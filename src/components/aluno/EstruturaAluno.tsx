"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuBento } from "./MenuBento";

// Moldura da área do aluno. A tela inicial (/aluno) é tela cheia, azul, e
// traz o próprio menu bento; as demais páginas ganham uma barra no topo com
// o menu bento no lugar da antiga barra lateral.
export function EstruturaAluno({ nome, children }: { nome: string; children: React.ReactNode }) {
  const caminho = usePathname();
  if (caminho === "/aluno") return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <header className="sticky top-0 z-40 border-b border-[#dfe4fa] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/aluno" className="text-base font-black uppercase tracking-[0.14em] text-[#3a4f9e] hover:text-[#2c3e60]">
            Sou Bilíngue
          </Link>
          <MenuBento nome={nome} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
