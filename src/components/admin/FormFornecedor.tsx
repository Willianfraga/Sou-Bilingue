import { gravarFornecedor } from "@/app/admin/custos/actions";
import { CATEGORIAS } from "@/lib/financeiro/categorias";

type F = Record<string, unknown> | null;
const v = (f: F, k: string) => (f && f[k] !== null && f[k] !== undefined ? String(f[k]) : "");
const campo = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

// Cadastro de ferramenta/fornecedor. Valor fixo mensal entra no financeiro
// como PREVISTO (estimado) nos meses sem lançamento daquela ferramenta.
export function FormFornecedor({ fornecedor }: { fornecedor: F }) {
  const editando = Boolean(fornecedor);
  const L = ({ rotulo, children, ajuda }: { rotulo: string; children: React.ReactNode; ajuda?: string }) => (
    <label className="text-sm font-semibold text-slate-700">
      {rotulo}
      {children}
      {ajuda && <span className="mt-1 block text-xs font-normal text-slate-500">{ajuda}</span>}
    </label>
  );
  return (
    <form action={gravarFornecedor} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      {editando && <input type="hidden" name="id" value={v(fornecedor, "id")} />}
      <L rotulo="Nome da ferramenta *">
        <input name="nome" required maxLength={80} defaultValue={v(fornecedor, "nome")} className={campo} />
      </L>
      <L rotulo="Categoria *">
        <select name="categoria" required defaultValue={v(fornecedor, "categoria")} className={campo}>
          <option value="">Escolha</option>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>{c.grupo} · {c.rotulo}</option>
          ))}
        </select>
      </L>
      <L rotulo="Empresa / fornecedor">
        <input name="empresa" maxLength={80} defaultValue={v(fornecedor, "empresa")} className={campo} />
      </L>
      <L rotulo="Plano contratado">
        <input name="plano_contratado" maxLength={80} defaultValue={v(fornecedor, "plano_contratado")} className={campo} />
      </L>
      <L rotulo="Tipo de cobrança *">
        <select name="tipo_cobranca" required defaultValue={v(fornecedor, "tipo_cobranca") || "fixo"} className={campo}>
          <option value="fixo">Fixo mensal</option>
          <option value="variavel">Variável (por uso)</option>
          <option value="misto">Misto (fixo + uso)</option>
          <option value="anual">Anual</option>
          <option value="avulso">Avulso</option>
        </select>
      </L>
      <L rotulo="Moeda *">
        <select name="moeda" required defaultValue={v(fornecedor, "moeda") || "BRL"} className={campo}>
          <option value="BRL">Real (R$)</option>
          <option value="USD">Dólar (US$)</option>
          <option value="EUR">Euro (€)</option>
        </select>
      </L>
      <L rotulo="Valor fixo por mês" ajuda="Na moeda escolhida. Anual: informe o valor dividido por 12. Vazio se só cobra por uso.">
        <input name="valor_fixo_mensal" inputMode="decimal" maxLength={30} defaultValue={v(fornecedor, "valor_fixo_mensal")} className={campo} />
      </L>
      <L rotulo="Custo variável" ajuda='Texto livre, ex.: "US$ 1 por milhão de tokens".'>
        <input name="custo_variavel" maxLength={200} defaultValue={v(fornecedor, "custo_variavel")} className={campo} />
      </L>
      <L rotulo="Franquia incluída">
        <input name="franquia" maxLength={200} defaultValue={v(fornecedor, "franquia")} className={campo} />
      </L>
      <L rotulo="Unidade de consumo">
        <input name="unidade_consumo" maxLength={40} defaultValue={v(fornecedor, "unidade_consumo")} className={campo} />
      </L>
      <L rotulo="Dia do vencimento">
        <input name="dia_vencimento" type="number" min={1} max={31} defaultValue={v(fornecedor, "dia_vencimento")} className={campo} />
      </L>
      <L rotulo="Início da cobrança" ajuda="A partir deste mês o valor fixo entra como previsto.">
        <input name="inicio_cobranca" type="date" defaultValue={v(fornecedor, "inicio_cobranca")} className={campo} />
      </L>
      <L rotulo="Centro de custo">
        <input name="centro_custo" maxLength={60} defaultValue={v(fornecedor, "centro_custo")} className={campo} />
      </L>
      <L rotulo="Responsável">
        <input name="responsavel" maxLength={80} defaultValue={v(fornecedor, "responsavel")} className={campo} />
      </L>
      <L rotulo="Status">
        <select name="status" defaultValue={v(fornecedor, "status") || "ativo"} className={campo}>
          <option value="ativo">Ativo</option>
          <option value="teste">Em teste</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </L>
      <L rotulo="Provedor de IA ligado" ajuda="Se esta ferramenta é a Anthropic ou a ElevenLabs, a fatura dela substitui a estimativa pelo consumo.">
        <select name="provedor_ia" defaultValue={v(fornecedor, "provedor_ia")} className={campo}>
          <option value="">Nenhum</option>
          <option value="anthropic">Anthropic (texto)</option>
          <option value="elevenlabs">ElevenLabs (voz e transcrição)</option>
        </select>
      </L>
      <L rotulo="Link do painel do fornecedor" ajuda="Só o endereço (https://…). Nunca cole senha ou chave aqui.">
        <input name="link_painel" type="url" maxLength={300} defaultValue={v(fornecedor, "link_painel")} className={campo} />
      </L>
      <div className="md:col-span-2">
        <L rotulo="Observações">
          <textarea name="observacoes" maxLength={1000} rows={3} defaultValue={v(fornecedor, "observacoes")} className={campo} />
        </L>
      </div>
      {editando && (
        <div className="md:col-span-2">
          <L rotulo="Motivo da alteração *" ajuda="Fica no histórico (auditoria) com os valores anteriores.">
            <input name="motivo" required minLength={5} maxLength={500} className={campo} />
          </L>
        </div>
      )}
      <div className="md:col-span-2">
        <button type="submit" className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800">
          {editando ? "Salvar alterações" : "Cadastrar ferramenta"}
        </button>
      </div>
    </form>
  );
}
