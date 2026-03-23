"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

const TYPES = ["TRUSTEE", "PARTNER", "GOVERNMENT", "OTHER"] as const;

export default function ExternalEntityNewPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "PARTNER" as string,
    description: "",
    contactInfo: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      TRUSTEE: t.externalEntity.typeTrustee,
      PARTNER: t.externalEntity.typePartner,
      GOVERNMENT: t.externalEntity.typeGovernment,
      OTHER: t.externalEntity.typeOther,
    };
    return map[type] || type;
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t.common.required;
    if (!form.type) errs.type = t.common.required;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/external-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim() || undefined,
          contactInfo: form.contactInfo.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t.toast.createFail);
      }
      const data = await res.json();
      toast.success(t.toast.createSuccess);
      router.push(`/external/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.toast.createFail);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const errCls = "w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/external" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> {t.externalEntity.title}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t.externalEntity.create}</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">{t.externalEntity.detail}</h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.externalEntity.name} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={errors.name ? errCls : inputCls}
                  placeholder="e.g. AWS Korea, Vendor SOC"
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              {/* Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.externalEntity.type} <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className={errors.type ? errCls : inputCls}
                >
                  {TYPES.map((type) => (
                    <option key={type} value={type}>{getTypeLabel(type)}</option>
                  ))}
                </select>
                {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.externalEntity.description}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputCls}
                  rows={3}
                  placeholder={t.common.description}
                />
              </div>

              {/* Contact Info */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.externalEntity.contactInfo}
                </label>
                <input
                  type="text"
                  value={form.contactInfo}
                  onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
                  className={inputCls}
                  placeholder={t.externalEntity.contactInfo}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {submitting ? t.common.processing : t.externalEntity.create}
            </button>
            <Link
              href="/external"
              className="flex flex-1 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t.common.cancel}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
