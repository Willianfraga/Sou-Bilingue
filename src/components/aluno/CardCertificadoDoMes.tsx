// § 05: certificado é 100% automático no fechamento do mês, sem ninguém do time
// apertar botão — esta tela só informa o placar, nunca oferece um botão de emitir.
export function CardCertificadoDoMes({ elegivel }: { elegivel: boolean }) {
  return (
    <div
      className={
        "rounded-lg border px-5 py-4 text-sm " +
        (elegivel
          ? "border-teal-200 bg-teal-50 text-teal-800"
          : "border-neutral-200 bg-neutral-50 text-neutral-600")
      }
    >
      {elegivel ? (
        <p>
          <strong>Todas as semanas batidas até aqui.</strong> Se isso continuar até
          o fim do mês, o certificado sai sozinho no fechamento — não precisa fazer
          nada.
        </p>
      ) : (
        <p>
          O certificado de conclusão mensal só é emitido se{" "}
          <strong>todas as semanas do mês</strong> baterem 100% da cota. Uma semana
          incompleta não impede a próxima — mas impede o certificado deste mês.
        </p>
      )}
    </div>
  );
}
