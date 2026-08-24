import { alterarIdioma } from "@/app/aluno/idioma/actions";
import type { Idioma } from "@/lib/types";

const OPCOES: Array<{ valor: Idioma; bandeira: string; nome: string }> = [
  { valor: "ingles", bandeira: "🇺🇸", nome: "Inglês" },
  { valor: "espanhol", bandeira: "🇪🇸", nome: "Espanhol" },
  { valor: "frances", bandeira: "🇫🇷", nome: "Francês" },
  { valor: "italiano", bandeira: "🇮🇹", nome: "Italiano" },
  { valor: "mandarim", bandeira: "🇨🇳", nome: "Mandarim" },
];

export function SeletorIdioma({ atual, destino }: { atual: Idioma; destino: "/aluno/aula" | "/aluno/licoes" }) {
  return (
    <form action={alterarIdioma} className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
      <input type="hidden" name="destino" value={destino} />
      <label className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
        Qual língua você quer aprender?
        <select name="idioma" defaultValue={atual} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
          {OPCOES.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.bandeira} {opcao.nome}</option>)}
        </select>
      </label>
      <button type="submit" className="btn-premium border-indigo-100">Escolher idioma <span aria-hidden="true">→</span></button>
    </form>
  );
}
