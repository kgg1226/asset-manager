"use client";

import ImportForm from "./import-form";
import { useTranslation } from "@/lib/i18n";
import { TourGuide } from "@/app/_components/tour-guide";
import { IMPORT_TOUR_KEY, getImportSteps } from "@/app/_components/tours/import-tour";

export default function ImportPageClient() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.nav.dataImport}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t.nav.dataImport} - CSV
            </p>
          </div>
          <TourGuide tourKey={IMPORT_TOUR_KEY} steps={getImportSteps(t)} />
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200" data-tour="import-form">
          <ImportForm />
        </div>
      </div>
    </div>
  );
}
