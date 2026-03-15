"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export default function HwUnassignButton({
  assetId,
  assetName,
  assigneeName,
  onDone,
}: {
  assetId: number;
  assetName: string;
  assigneeName: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [isPending, setIsPending] = useState(false);

  async function handleUnassign() {
    if (!confirm(`${t.toast.confirmUnassign}\n\n${assetName} — ${assigneeName}`)) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/unassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const e = await res.json();
        toast.error(e.error || t.toast.saveFail);
        return;
      }
      toast.success(t.toast.saveSuccess);
      onDone();
    } catch {
      toast.error(t.toast.saveFail);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      onClick={handleUnassign}
      disabled={isPending}
      className="rounded px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
      title={t.license.unassign}
    >
      {isPending ? "..." : t.license.unassign}
    </button>
  );
}
