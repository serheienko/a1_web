"use client";

// components/shtab-scout-reject.tsx
//
// 15.10.2026: кнопка «Не подходит» под идеей Разведчика. Можно коротко написать почему -- причину
// Разведчик получит и больше похожего не предложит (app/api/shtab/scout/reject).
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScoutRejectButton({ date, what }: { date: string; what: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
        body: JSON.stringify({ date, what, reason }),
      });
      if (!r.ok) throw new Error(String(r.status));
      router.refresh();
    } catch {
      setErr(true);
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="shs-rej" onClick={() => setOpen(true)}>
        Не подходит
      </button>
    );
  }
  return (
    <div className="shs-rej-box">
      <textarea
        className="shs-rej-txt"
        rows={2}
        maxLength={600}
        placeholder="Почему (необязательно): Разведчик учтёт и не будет предлагать похожее"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="shs-rej-row">
        <button type="button" className="shs-rej shs-rej-go" disabled={busy} onClick={send}>
          {busy ? "Убираю…" : "Убрать идею"}
        </button>
        <button type="button" className="shs-rej" disabled={busy} onClick={() => setOpen(false)}>
          Отмена
        </button>
        {err ? <span className="shs-rej-err">Не вышло, попробуй ещё раз</span> : null}
      </div>
    </div>
  );
}
