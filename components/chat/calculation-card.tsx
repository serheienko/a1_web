// components/chat/calculation-card.tsx
//
// 2026-09-03 (Aleksandr's Calculations-feature reference video): what a
// SENT calculation renders as inside a chat bubble -- confirmed off the
// video's own final frame (long-press on an already-sent calc message):
// a compact Description/Cost/Qty/Total grid, a bold grand-total row
// right underneath it, then the note text (if any) below a divider,
// before the bubble's own timestamp/ticks row (rendered by the caller,
// app/chats/[chatId]/page.tsx, same as every other message-content
// block in that file).
//
// `calc.rows[].unitAmount` is documented CENTS (app/api/chats/send/
// route.ts's own header) -- every amount here is divided by 100 before
// display. Quantity is a plain whole number (chat-server's own
// `quantity: UInt`, confirmed against the OpenAPI spec and mirrored in
// that same route's SendInput schema), never a decimal, regardless of
// what the compose-side numeric input technically lets someone type.
import { T, type Locale } from "@/components/t";
import type { MessageCalculation } from "@/lib/a1/chat-schemas";

type Props = {
  calc: MessageCalculation;
  mine: boolean;
};

function formatCalcAmount(rawCents: number): string {
  const amount = (typeof rawCents === "number" && Number.isFinite(rawCents) ? rawCents : 0) / 100;
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ChatCalculationCard({ calc, mine }: Props) {
  const currency = (calc.currency || "").toUpperCase();
  const total = calc.rows.reduce((sum, r) => {
    const unitAmount = typeof r.unitAmount === "number" ? r.unitAmount : 0;
    const quantity = typeof r.quantity === "number" && r.quantity > 0 ? r.quantity : 1;
    return sum + unitAmount * quantity;
  }, 0);
  const dividerClass = mine ? "border-white/20" : "border-black/10 dark:border-white/15";

  return (
    <div className="mb-1 min-w-[220px] overflow-hidden rounded-xl">
      {calc.rows.length > 0 && (
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr className={`border-b ${dividerClass}`}>
              <th className="py-1 pr-2 text-left font-semibold">
                <T uk="Опис" en="Description" ru="Описание" de="Beschr." es="Descr." fr="Descr." pl="Opis" ptBR="Descr." zh="描述" />
              </th>
              <th className="py-1 px-1 text-right font-semibold">
                <T uk="Варт." en="Cost" ru="Стоим." de="Preis" es="Coste" fr="Coût" pl="Koszt" ptBR="Custo" zh="单价" />
              </th>
              <th className="py-1 px-1 text-right font-semibold">
                <T uk="К-сть" en="Qty" ru="Кол-во" de="Anz." es="Cant." fr="Qté" pl="Ilość" ptBR="Qtd." zh="数量" />
              </th>
              <th className="py-1 pl-1 text-right font-semibold">
                <T uk="Разом" en="Total" ru="Итого" de="Summe" es="Total" fr="Total" pl="Razem" ptBR="Total" zh="小计" />
              </th>
            </tr>
          </thead>
          <tbody>
            {calc.rows.map((r, i) => {
              const unitAmount = typeof r.unitAmount === "number" ? r.unitAmount : 0;
              const quantity = typeof r.quantity === "number" && r.quantity > 0 ? r.quantity : 1;
              return (
                <tr key={i}>
                  <td className="py-1 pr-2 align-top">
                    {i + 1}. {r.description || "—"}
                  </td>
                  <td className="py-1 px-1 text-right align-top tabular-nums">{formatCalcAmount(unitAmount)}</td>
                  <td className="py-1 px-1 text-right align-top tabular-nums">{quantity}</td>
                  <td className="py-1 pl-1 text-right align-top tabular-nums">{formatCalcAmount(unitAmount * quantity)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className={`flex justify-end pt-1 text-[14px] font-semibold tabular-nums ${calc.rows.length > 0 ? `border-t ${dividerClass} mt-1` : ""}`}>
        {formatCalcAmount(total)} {currency}
      </div>
      {calc.note && (
        <div className={`mt-1.5 border-t pt-1.5 text-[15px] whitespace-pre-wrap break-words ${dividerClass}`}>
          {calc.note}
        </div>
      )}
    </div>
  );
}
