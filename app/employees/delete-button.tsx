"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

export default function DeleteEmployeeButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!confirm(t.toast.confirmDelete)) return;

    setIsPending(true);
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {t.common.delete}
    </button>
  );
}
