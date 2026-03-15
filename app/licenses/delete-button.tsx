"use client";

import { useState } from "react";
import { deleteLicense } from "./[id]/edit/actions";
import { useTranslation } from "@/lib/i18n";

export default function DeleteButton({ id, name }: { id: number; name: string }) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleClick() {
    if (!window.confirm(t.toast.confirmDelete)) {
      return;
    }
    setIsDeleting(true);
    const result = await deleteLicense(id);

    if (result?.message) {
      setIsDeleting(false);
      window.alert(result.message);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDeleting}
      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {isDeleting ? "..." : t.common.delete}
    </button>
  );
}
