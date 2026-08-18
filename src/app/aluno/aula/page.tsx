"use client";

import { useState } from "react";
import { getPerfilDoAlunoMock, getTutoresMock } from "@/lib/mock/perfil";
import { NOME_DO_IDIOMA } from "@/lib/types";

type Mensagem = { role: "user" | "assistant"; content: string };

// Contexto do aluno (idioma, tutor) ainda vem do mesmo mock que o servidor usa
// — só pra exibir o cabeçalho consistente. A rota /api/aula/chat é quem
// decide de verdade o contexto no servidor, não este componente.
const perfil = getPerfilDoAlunoMock();
const tutor = getTutoresMock().find((t) => t.id === perfil.tutorId);

export default function Aula() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [entrada, setEntrada] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const texto = entrada.trim();
    if (!texto || enviando) return;

    const novasMensagens: Mensagem[] = [
      ...mensagens,
      { role: "user", content: texto },
    ];
    setMensagens(novasMensagens);
    setEntrada("");
    setEnviando(true);

    try {
      const resposta = await fetch("/api/aula/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: novasMensagens }),
      });

      if (!resposta.ok || !resposta.body) {
        throw new Error("Falha ao falar com o tutor");
      }

      setMensagens((atual) => [...atual, { role: "assistant", content: "" }]);

      const reader = resposta.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const pedaco = decoder.decode(value, { stream: true });
        setMensagens((atual) => {
          const copia = [...atual];
          const ultima = copia[copia.length - 1];
          copia[copia.length - 1] = {
            role: "assistant",
            content: ultima.content + pedaco,
          };
          return copia;
        });
      }
    } catch {
      setMensagens((atual) => [
        ...atual,
        {
          role: "assistant",
          content: "Não consegui responder agora. Tenta de novo?",
        },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] max-w-2xl flex-col gap-4">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          Aula com o tutor
        </span>
        <h1 className="mt-1 text-2xl font-bold">
          {tutor?.nome ?? "Tutor"} · {NOME_DO_IDIOMA[perfil.idioma]}
        </h1>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-neutral-200 p-4">
        {mensagens.length === 0 && (
          <p className="text-sm text-neutral-400">
            Manda uma mensagem pra começar a conversa com o tutor.
          </p>
        )}
        {mensagens.map((m, i) => (
          <div
            key={i}
            className={
              "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm " +
              (m.role === "user"
                ? "ml-auto bg-teal-600 text-white"
                : "bg-neutral-100 text-neutral-800")
            }
          >
            {m.content || (m.role === "assistant" ? "…" : "")}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
        className="flex gap-2"
      >
        <input
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          disabled={enviando}
          placeholder="Escreva em espanhol ou português..."
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
