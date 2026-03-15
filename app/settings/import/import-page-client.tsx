"use client";

import ImportForm from "./import-form";
import { useTranslation } from "@/lib/i18n";

export default function ImportPageClient() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t.nav.dataImport}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.nav.dataImport} - CSV
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <ImportForm />
        </div>
      </div>
    </div>
  );
}
