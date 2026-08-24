import Image from "next/image";
import { alterarTutor } from "@/app/aluno/tutor/actions";
import type { Tutor } from "@/lib/types";

export function SeletorTutor({ tutores, atualId }: { tutores: Tutor[]; atualId: string }) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-2 py-1 text-sm font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
        Escolher meu professor
        <span className="text-indigo-600 transition group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
        {tutores.map((tutor) => (
          <form action={alterarTutor} key={tutor.id}>
            <input type="hidden" name="tutorId" value={tutor.id} />
            <button type="submit" className={`w-full overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-md ${tutor.id === atualId ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200"}`}>
              <span className="relative block aspect-[16/10] overflow-hidden bg-indigo-950">
                {tutor.foto_url ? <Image src={tutor.foto_url} alt={tutor.nome} fill className="object-cover object-top" sizes="(max-width: 640px) 50vw, 220px" /> : <span className="flex h-full items-center justify-center text-3xl">🧑‍🏫</span>}
              </span>
              <span className="block px-3 py-2">
                <span className="block text-sm font-bold text-slate-900">{tutor.nome}</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{tutor.descricao}</span>
              </span>
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}
