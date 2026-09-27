"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Idioma, Plano } from "@/lib/types";

export type Tutor = {
  id: string;
  nome: string;
  descricao: string;
  foto_url?: string | null;
  faixa_etaria?: "crianca" | "jovem" | "adulto" | null;
  genero?: "feminino" | "masculino" | null;
};

export const IDIOMAS: { valor: Idioma; nome: string; bandeira: string }[] = [
  { valor: "ingles", nome: "Inglês", bandeira: "🇺🇸" },
  { valor: "espanhol", nome: "Espanhol", bandeira: "🇪🇸" },
  { valor: "frances", nome: "Francês", bandeira: "🇫🇷" },
  { valor: "italiano", nome: "Italiano", bandeira: "🇮🇹" },
  { valor: "mandarim", nome: "Mandarim", bandeira: "🇨🇳" },
];

export const PLANOS: { valor: Plano; nome: string; descricao: string; horas: string }[] = [
  { valor: "basico", nome: "Básico", descricao: "3x por semana", horas: "6h/mês" },
  { valor: "intermediario", nome: "Intermediário", descricao: "5x por semana", horas: "10h/mês" },
  { valor: "avancado", nome: "Avançado", descricao: "7x por semana", horas: "14h/mês" },
];

export const ETAPAS = [
  { slug: "idioma", titulo: "Idioma" },
  { slug: "plano", titulo: "Plano" },
  { slug: "tutor", titulo: "Tutor" },
  { slug: "objetivo", titulo: "Objetivo" },
  { slug: "resumo", titulo: "Resumo" },
] as const;

export type SlugEtapa = (typeof ETAPAS)[number]["slug"];

export const CARD_CLASSE = "rounded-[1.8rem] border border-white/20 bg-white/8 p-5";

type Escolhas = {
  idioma: Idioma;
  plano: Plano;
  tutorId: string;
  objetivo: string;
};

type OnboardingContexto = {
  escolhas: Escolhas;
  atualizar: (parcial: Partial<Escolhas>) => void;
  limpar: () => void;
  tutores: Tutor[];
  carregandoTutores: boolean;
  erroTutores: string | null;
};

const CHAVE_STORAGE = "soubilingue:onboarding";

const ESCOLHAS_INICIAIS: Escolhas = {
  idioma: "ingles",
  plano: "basico",
  tutorId: "",
  objetivo: "",
};

const Contexto = createContext<OnboardingContexto | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [escolhas, setEscolhas] = useState<Escolhas>(ESCOLHAS_INICIAIS);
  const [restaurado, setRestaurado] = useState(false);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [carregandoTutores, setCarregandoTutores] = useState(true);
  const [erroTutores, setErroTutores] = useState<string | null>(null);

  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem(CHAVE_STORAGE);
      if (salvo) setEscolhas({ ...ESCOLHAS_INICIAIS, ...JSON.parse(salvo) });
    } catch {
      // Storage indisponível: segue com as escolhas em memória.
    }
    setRestaurado(true);
  }, []);

  useEffect(() => {
    if (!restaurado) return;
    try {
      sessionStorage.setItem(CHAVE_STORAGE, JSON.stringify(escolhas));
    } catch {
      // idem
    }
  }, [escolhas, restaurado]);

  useEffect(() => {
    async function carregar() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.replace("/login?redirect=/cadastro/onboarding/idioma");
          return;
        }

        const resposta = await fetch("/api/tutores");
        const payload = await resposta.json().catch(() => null);
        if (!resposta.ok || !payload?.success) {
          throw new Error(payload?.error || "Não foi possível carregar os tutores.");
        }
        setTutores(payload.tutores ?? []);
      } catch (err) {
        setErroTutores(err instanceof Error ? err.message : "Não foi possível carregar os tutores.");
      } finally {
        setCarregandoTutores(false);
      }
    }
    carregar();
  }, [router]);

  useEffect(() => {
    if (!restaurado || tutores.length === 0) return;
    if (!tutores.some((t) => t.id === escolhas.tutorId)) {
      setEscolhas((atual) => ({ ...atual, tutorId: tutores[0].id }));
    }
  }, [tutores, escolhas.tutorId, restaurado]);

  const atualizar = useCallback((parcial: Partial<Escolhas>) => {
    setEscolhas((atual) => ({ ...atual, ...parcial }));
  }, []);

  const limpar = useCallback(() => {
    try {
      sessionStorage.removeItem(CHAVE_STORAGE);
    } catch {
      // idem
    }
  }, []);

  return (
    <Contexto.Provider
      value={{ escolhas, atualizar, limpar, tutores, carregandoTutores, erroTutores }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useOnboarding() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useOnboarding precisa estar dentro de OnboardingProvider");
  return contexto;
}
