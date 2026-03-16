"use client";

import Link from "next/link";
import EditGroupForm from "./edit-form";
import { useTranslation } from "@/lib/i18n";

type License = { id: number; name: string };
type Group = {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  members: { licenseId: number }[];
};

export default function EditPageClient({
  group,
  licenses,
}: {
  group: Group;
  licenses: License[];
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.license.group} {t.common.edit}</h1>
          <Link href="/settings/groups" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; {t.common.list}
          </Link>
        </div>
        <EditGroupForm group={group} licenses={licenses} />
      </div>
    </div>
  );
}
