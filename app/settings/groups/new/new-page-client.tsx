"use client";

import Link from "next/link";
import NewGroupForm from "./new-form";
import { useTranslation } from "@/lib/i18n";

type License = { id: number; name: string };

export default function NewPageClient({ licenses }: { licenses: License[] }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.license.group} {t.common.create}</h1>
          <Link href="/settings/groups" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; {t.common.list}
          </Link>
        </div>
        <NewGroupForm licenses={licenses} />
      </div>
    </div>
  );
}
