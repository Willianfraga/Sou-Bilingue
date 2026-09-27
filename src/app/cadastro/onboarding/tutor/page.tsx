"use client";

import { CARD_CLASSE, useOnboarding, type Tutor } from "../_componentes/onboarding-context";
import { ResumoLateral } from "../_componentes/ResumoLateral";

const GRUPOS = [
  { faixa: "crianca", titulo: "Crianças" },
  { faixa: "jovem", titulo: "Jovens" },
  { faixa: "adulto", titulo: "Adultos" },
] as const;

function avatar(tutor: Tutor) {
  const feminino = tutor.genero === "feminino";
  if (tutor.faixa_etaria === "crianca") return feminino ? "👧" : "👦";
  if (tutor.faixa_etaria === "jovem") return feminino ? "👩" : "👨";
  if (tutor.faixa_etaria === "adulto") return feminino ? "👩‍🏫" : "👨‍🏫";
  return "🧑‍🏫";
}

function CartaoTutor({
  tutor,
  selecionado,
  onEscolher,
}: {
  tutor: Tutor;
  selecionado: boolean;
  onEscolher: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEscolher}
      aria-pressed={selecionado}
      className={`overflow-hidden rounded-2xl border text-left transition ${
        selecionado
          ? "border-emerald-300 bg-emerald-400/30 ring-2 ring-emerald-100/60"
          : "border-white/20 bg-white/5 hover:bg-white/12"
      }`}
    >
      <span className="block aspect-[16/10] bg-slate-900/50 p-3">
        {tutor.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tutor.foto_url} alt={tutor.nome} className="h-full w-full rounded-xl object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 text-4xl text-white">
            {avatar(tutor)}
          </span>
        )}
      </span>
      <span className="block px-4 py-3">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-black text-white">{tutor.nome}</span>
          {selecionado && (
            <span className="rounded-full bg-emerald-300 px-2 py-0.5 text-[10px] font-black text-emerald-950">
              Escolhido
            </span>
          )}
        </span>
        <span className="mt-1 block text-[11px] leading-4 text-slate-300">{tutor.descricao}</span>
      </span>
    </button>
  );
}

export default function EtapaTutor() {
  const { escolhas, atualizar, tutores, carregandoTutores, erroTutores } = useOnboarding();

  const semFaixa = tutores.filter((t) => !t.faixa_etaria);

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_420px]">
      <section className={CARD_CLASSE}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Escolha seu tutor</h2>
          <span className="text-xs font-bold uppercase text-cyan-200">Tutor IA</span>
        </div>

        {carregandoTutores ? (
          <div className="rounded-2xl bg-white/10 px-6 py-8 text-center text-slate-200">
            Carregando tutores...
          </div>
        ) : erroTutores ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
          >
            {erroTutores}
          </div>
        ) : tutores.length === 0 ? (
          <div className="rounded-2xl bg-white/10 px-6 py-8 text-center text-slate-200">
            Nenhum tutor disponível no momento.
          </div>
        ) : (
          <div className="space-y-6">
            {GRUPOS.map((grupo) => {
              const lista = tutores.filter((t) => t.faixa_etaria === grupo.faixa);
              if (lista.length === 0) return null;
              return (
                <div key={grupo.faixa}>
                  <h3 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                    {grupo.titulo}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {lista.map((tutor) => (
                      <CartaoTutor
                        key={tutor.id}
                        tutor={tutor}
                        selecionado={escolhas.tutorId === tutor.id}
                        onEscolher={() => atualizar({ tutorId: tutor.id })}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {semFaixa.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {semFaixa.map((tutor) => (
                  <CartaoTutor
                    key={tutor.id}
                    tutor={tutor}
                    selecionado={escolhas.tutorId === tutor.id}
                    onEscolher={() => atualizar({ tutorId: tutor.id })}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <ResumoLateral etapa="tutor" />
    </div>
  );
}
