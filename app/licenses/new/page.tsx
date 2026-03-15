"use client";

import { useActionState, useState } from "react";
import { createLicense, type FormState } from "./actions";
import Link from "next/link";
import CostCalculatorSection from "@/app/licenses/_components/cost-calculator-section";
import {
  VALID_CURRENCIES,
  CURRENCY_LABELS,
  CURRENCY_SYMBOLS,
  calcRenewalDate,
  type Currency,
  type PaymentCycle,
} from "@/lib/cost-calculator";
import { useTranslation } from "@/lib/i18n";

const initialState: FormState = {};

type LicenseType = "NO_KEY" | "KEY_BASED" | "VOLUME";

export default function NewLicensePage() {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState(createLicense, initialState);
  const [licenseType, setLicenseType] = useState<LicenseType>("KEY_BASED");
  const [noticePeriodType, setNoticePeriodType] = useState("");
  const [quantityStr, setQuantityStr] = useState("");
  const [unitPriceStr, setUnitPriceStr] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [paymentCycle, setPaymentCycle] = useState<PaymentCycle>("YEARLY");
  const [purchaseDateStr, setPurchaseDateStr] = useState("");

  const qty = parseFloat(quantityStr);
  const quantity = isFinite(qty) && qty > 0 ? qty : null;
  const up = parseFloat(unitPriceStr);
  const unitPrice = isFinite(up) && up >= 0 ? up : null;

  // Auto-compute renewal date whenever purchase date or payment cycle changes
  const renewalDateStr = calcRenewalDate(purchaseDateStr, paymentCycle);

  const NOTICE_OPTIONS = [
    { value: "", label: t.license.noNotice },
    { value: "30", label: t.license.days30 },
    { value: "90", label: t.license.days90 },
    { value: "custom", label: t.license.custom },
  ] as const;

  const LICENSE_TYPE_OPTIONS: { value: LicenseType; label: string; description: string }[] = [
    { value: "KEY_BASED", label: t.license.keyBased, description: t.license.seatAssignment },
    { value: "VOLUME", label: t.license.volume, description: t.license.key },
    { value: "NO_KEY", label: t.license.noKey, description: t.license.noKey },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.license.newLicense}</h1>
          <Link
            href="/licenses"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; {t.common.list}
          </Link>
        </div>

        {state.message && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          {/* 기본 정보 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              {t.common.detail}
            </legend>

            <Field label={t.license.licenseName} required error={state.errors?.name}>
              <input
                type="text"
                name="name"
                required
                placeholder="예: Microsoft 365 Business"
                className="input"
              />
            </Field>

            <Field label={t.license.licenseType} required error={state.errors?.licenseType}>
              <div className="flex flex-wrap gap-2">
                {LICENSE_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium ring-1 transition-colors ${
                      licenseType === opt.value
                        ? "bg-blue-600 text-white ring-blue-600"
                        : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="licenseType"
                      value={opt.value}
                      checked={licenseType === opt.value}
                      onChange={() => setLicenseType(opt.value)}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {LICENSE_TYPE_OPTIONS.find((o) => o.value === licenseType)?.description}
              </p>
            </Field>

            {licenseType === "VOLUME" && (
              <Field label={t.license.key}>
                <input
                  type="text"
                  name="key"
                  placeholder="예: XXXXX-XXXXX-XXXXX-XXXXX"
                  className="input"
                />
              </Field>
            )}

            {licenseType === "KEY_BASED" && (
              <p className="text-xs text-gray-500">
                {t.license.seatAssignment}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={t.license.quantity} required error={state.errors?.totalQuantity}>
                <input
                  type="number"
                  name="totalQuantity"
                  min={1}
                  required
                  value={quantityStr}
                  onChange={(e) => setQuantityStr(e.target.value)}
                  placeholder="1"
                  className="input"
                />
              </Field>

              <Field label={`${t.license.unitPrice} (${CURRENCY_SYMBOLS[currency]})`} error={state.errors?.unitPrice}>
                <input
                  type="number"
                  name="unitPrice"
                  min={0}
                  step="any"
                  value={unitPriceStr}
                  onChange={(e) => setUnitPriceStr(e.target.value)}
                  placeholder="0"
                  className="input"
                />
              </Field>

              <Field label={t.license.currency}>
                <select
                  name="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="input"
                >
                  {VALID_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label={t.license.adminName}>
              <input
                type="text"
                name="adminName"
                className="input"
              />
            </Field>
          </fieldset>

          {/* 비용 계산 */}
          <CostCalculatorSection
            paymentCycle={paymentCycle}
            onPaymentCycleChange={setPaymentCycle}
            quantity={quantity}
            unitPrice={unitPrice}
            currency={currency}
            errors={state.errors}
          />

          {/* 날짜 정보 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              {t.common.date}
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t.license.purchaseDate} required error={state.errors?.purchaseDate}>
                <input
                  type="date"
                  name="purchaseDate"
                  required
                  value={purchaseDateStr}
                  onChange={(e) => setPurchaseDateStr(e.target.value)}
                  className="input"
                />
              </Field>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.license.expiryDate}
                </label>
                <div className="input flex cursor-not-allowed items-center bg-gray-50 text-gray-500">
                  {renewalDateStr || "—"}
                </div>
                {/* Submit the computed renewal date as expiryDate */}
                <input type="hidden" name="expiryDate" value={renewalDateStr} />
              </div>
            </div>
          </fieldset>

          {/* 해지 통보 기한 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              {t.license.noticePeriod}
            </legend>

            <div className="flex flex-wrap gap-3">
              {NOTICE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium ring-1 transition-colors ${
                    noticePeriodType === opt.value
                      ? "bg-blue-600 text-white ring-blue-600"
                      : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="noticePeriodType"
                    value={opt.value}
                    checked={noticePeriodType === opt.value}
                    onChange={(e) => setNoticePeriodType(e.target.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {noticePeriodType === "custom" && (
              <Field label={`${t.license.noticePeriod} (${t.license.customDays})`} error={state.errors?.noticePeriodCustom}>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="noticePeriodCustom"
                    min={1}
                    className="input max-w-32"
                  />
                  <span className="text-sm text-gray-500">{t.license.customDays}</span>
                </div>
              </Field>
            )}
          </fieldset>

          {/* 비고 */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 w-full">
              {t.common.description}
            </legend>

            <Field label={t.common.description}>
              <textarea
                name="description"
                rows={3}
                className="input resize-y"
              />
            </Field>
          </fieldset>

          {/* 제출 */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <Link
              href="/licenses"
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              {t.common.cancel}
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? `${t.common.loading}` : t.common.new}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
