"use client";

// components/shtab-scout-reject.tsx
//
// 15.10.2026: кнопка «Не подходит» под идеей Разведчика. Можно коротко написать почему -- причину
// Разведчик получит и больше похожего не предложит (app/api/shtab/scout/reject).
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScoutRejectButton({ date, what }: { date: string; what: string }) {
  const [mode, setMode] = useState<"rejected" | "done" | null>(null);
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  async function send() {
    setBusy(true);
    setErr(false);
    try {
      const r = await fetch("/api/shtab/scout/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, what, reason, status: mode }),
      });
      if (!r.ok) throw new Error(String(r.status));
      router.refresh();
    } catch {
      setErr(true);
      setBusy(false);
    }
  }

  if (!mode) {
    return (
      <div className="shs-rej-row">
        <button type="button" className="shs-rej shs-done" onClick={() => setMode("done")}>
          Сделано
        </button>
        <button type="button" className="shs-rej shs-no" onClick={() => setMode("rejected")}>
          Не подходит
        </button>
      </div>
    );
  }
  return (
    <div className="shs-rej-box">
      <textarea
        className="shs-rej-txt"
        rows={2}
        maxLength={600}
        placeholder={mode === "done" ? "Комментарий (необязательно): как сделали. Разведчик не предложит это снова" : "Почему не подходит (необязательно): Разведчик не предложит похожее"}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="shs-rej-row">
        <button type="button" className={mode === "done" ? "shs-rej shs-done" : "shs-rej shs-no"} disabled={busy} onClick={send}>
          {busy ? "Убираю…" : mode === "done" ? "Отметить сделанным" : "Убрать идею"}
        </button>
        <button type="button" className="shs-rej" disabled={busy} onClick={() => setMode(null)}>
          Отмена
        </button>
        {err ? <span className="shs-rej-err">Не вышло, попробуй ещё раз</span> : null}
      </div>
    </div>
  );
}
