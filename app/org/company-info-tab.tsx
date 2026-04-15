"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

type Company = { id: number; name: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompanyDetail = Record<string, any>;

export default function CompanyInfoTab({ companies }: { companies: Company[] }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [selectedId, setSelectedId] = useState<number | null>(
    companies.length > 0 ? companies[0].id : null,
  );
  const [data, setData] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/companies/${id}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error(t.common.error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  const handleSave = async () => {
    if (!selectedId || !data) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/org/companies/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t.common.error);
        return;
      }
      setData(await res.json());
      toast.success(t.common.success);
    } catch {
      toast.error(t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: unknown) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const numVal = (key: string): string => {
    const v = data?.[key];
    return v == null ? "" : String(v);
  };

  const strVal = (key: string): string => data?.[key] ?? "";
  const boolVal = (key: string): boolean => !!data?.[key];

  if (companies.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <p className="text-sm text-gray-500">{t.common.noData}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company selector */}
      {companies.length > 1 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t.org.selectCompany}
          </label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm text-gray-500">{t.common.loading}</p>
      ) : data ? (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">{t.org.companyInfoDesc}</p>

          {/* 인력 현황 */}
          <Section title={t.org.staffSection}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumField label={t.org.totalEmployees} value={numVal("totalEmployees")} unit={t.org.persons}
                onChange={(v) => set("totalEmployees", v === "" ? null : Number(v))} disabled={!isAdmin} />
              <NumField label={t.org.itEmployees} value={numVal("itEmployees")} unit={t.org.persons}
                onChange={(v) => set("itEmployees", v === "" ? null : Number(v))} disabled={!isAdmin} />
              <NumField label={t.org.securityEmployees} value={numVal("securityEmployees")} unit={t.org.persons}
                onChange={(v) => set("securityEmployees", v === "" ? null : Number(v))} disabled={!isAdmin} />
              <NumField label={t.org.privacyEmployees} value={numVal("privacyEmployees")} unit={t.org.persons}
                onChange={(v) => set("privacyEmployees", v === "" ? null : Number(v))} disabled={!isAdmin} />
            </div>
          </Section>

          {/* Q5: 예산 비율 */}
          <Section title={t.org.budgetSection}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumField label={t.org.budgetItPercent} value={numVal("budgetItPercent")} unit="%"
                onChange={(v) => set("budgetItPercent", v === "" ? null : Number(v))} disabled={!isAdmin} />
              <NumField label={t.org.budgetSecurityPercent} value={numVal("budgetSecurityPercent")} unit="%"
                onChange={(v) => set("budgetSecurityPercent", v === "" ? null : Number(v))} disabled={!isAdmin} />
              <NumField label={t.org.budgetPrivacyPercent} value={numVal("budgetPrivacyPercent")} unit="%"
                onChange={(v) => set("budgetPrivacyPercent", v === "" ? null : Number(v))} disabled={!isAdmin} />
            </div>
          </Section>

          {/* Q6: 인증 소요 */}
          <Section title={t.org.certSection}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumField label={t.org.certStaffCount} value={numVal("certStaffCount")} unit={t.org.persons}
                onChange={(v) => set("certStaffCount", v === "" ? null : Number(v))} disabled={!isAdmin} />
              <NumField label={t.org.certDurationDays} value={numVal("certDurationDays")} unit={t.org.days}
                onChange={(v) => set("certDurationDays", v === "" ? null : Number(v))} disabled={!isAdmin} />
            </div>
          </Section>

          {/* Q7: 인력구성 */}
          <Section title={t.org.ismsStaffTypeSection}>
            <RadioGroup
              name="ismsStaffType"
              value={strVal("ismsStaffType")}
              options={[
                { value: "INTERNAL_ONLY", label: t.org.ismsStaffTypeInternalOnly },
                { value: "EXTERNAL_ONLY", label: t.org.ismsStaffTypeExternalOnly },
                { value: "MIXED", label: t.org.ismsStaffTypeMixed },
              ]}
              onChange={(v) => set("ismsStaffType", v || null)}
              disabled={!isAdmin}
            />
          </Section>

          {/* Q8: 구축 비용 */}
          <Section title={t.org.costSection}>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.org.consultingCostRange}
                </label>
                <select
                  value={strVal("consultingCostRange")}
                  onChange={(e) => set("consultingCostRange", e.target.value || null)}
                  disabled={!isAdmin}
                  className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                >
                  <option value="">{t.common.select}</option>
                  <option value="NONE">{t.org.consultingCostNone}</option>
                  <option value="UNDER_30M">{t.org.consultingCostUnder30M}</option>
                  <option value="30M_50M">{t.org.consultingCost30M50M}</option>
                  <option value="50M_100M">{t.org.consultingCost50M100M}</option>
                  <option value="100M_200M">{t.org.consultingCost100M200M}</option>
                  <option value="OVER_200M">{t.org.consultingCostOver200M}</option>
                </select>
              </div>
              <NumField
                label={t.org.systemPurchaseCost}
                value={numVal("systemPurchaseCost")}
                unit={t.org.systemPurchaseCostUnit}
                onChange={(v) => set("systemPurchaseCost", v === "" ? null : Number(v))}
                disabled={!isAdmin}
              />
            </div>
          </Section>

          {/* Q9: 활동 공개 */}
          <Section title={t.org.disclosureSection}>
            <RadioGroup
              name="disclosesSecurityActivity"
              value={data.disclosesSecurityActivity == null ? "" : data.disclosesSecurityActivity ? "yes" : "no"}
              options={[
                { value: "yes", label: t.common.yes },
                { value: "no", label: t.common.no },
              ]}
              onChange={(v) => set("disclosesSecurityActivity", v === "" ? null : v === "yes")}
              disabled={!isAdmin}
            />
          </Section>

          {/* Q10: 타 인증 */}
          <Section title={t.org.otherCertsSection}>
            <div className="space-y-2">
              <CheckField label={t.org.hasPiaDiagnosis} checked={boolVal("hasPiaDiagnosis")}
                onChange={(v) => set("hasPiaDiagnosis", v)} disabled={!isAdmin} />
              <CheckField label={t.org.hasPia} checked={boolVal("hasPia")}
                onChange={(v) => set("hasPia", v)} disabled={!isAdmin} />
              <CheckField label={t.org.hasIso27001} checked={boolVal("hasIso27001")}
                onChange={(v) => set("hasIso27001", v)} disabled={!isAdmin} />
              <CheckField label={t.org.hasCriticalInfra} checked={boolVal("hasCriticalInfra")}
                onChange={(v) => set("hasCriticalInfra", v)} disabled={!isAdmin} />
              <div className="mt-2">
                <label className="mb-1 block text-sm text-gray-600">{t.org.otherCertifications}</label>
                <input
                  type="text"
                  value={strVal("otherCertifications")}
                  onChange={(e) => set("otherCertifications", e.target.value || null)}
                  disabled={!isAdmin}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                />
              </div>
            </div>
          </Section>

          {/* Q11: 최대 개선사항 */}
          <Section title={t.org.improvementSection}>
            <RadioGroup
              name="ismsBiggestImprovement"
              value={strVal("ismsBiggestImprovement")}
              options={[
                { value: "BUDGET", label: t.org.improvementBudget },
                { value: "EXEC_AWARENESS", label: t.org.improvementExecAwareness },
                { value: "NEW_ORG", label: t.org.improvementNewOrg },
                { value: "EMPLOYEE_AWARENESS", label: t.org.improvementEmployeeAwareness },
                { value: "LOWER_RISK", label: t.org.improvementLowerRisk },
                { value: "CUSTOMER_TRUST", label: t.org.improvementCustomerTrust },
                { value: "OTHER", label: t.org.other },
              ]}
              onChange={(v) => set("ismsBiggestImprovement", v || null)}
              disabled={!isAdmin}
            />
            {strVal("ismsBiggestImprovement") === "OTHER" && (
              <input
                type="text"
                value={strVal("ismsBiggestImprovementOther")}
                onChange={(e) => set("ismsBiggestImprovementOther", e.target.value || null)}
                disabled={!isAdmin}
                placeholder={t.org.other}
                className="mt-2 w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
              />
            )}
          </Section>

          {/* Q12: 기대효과 */}
          <Section title={t.org.benefitSection}>
            <RadioGroup
              name="ismsExpectedBenefit"
              value={strVal("ismsExpectedBenefit")}
              options={[
                { value: "COMPLIANCE", label: t.org.benefitCompliance },
                { value: "SECURITY_LEVEL", label: t.org.benefitSecurityLevel },
                { value: "ORG_AUTHORITY", label: t.org.benefitOrgAuthority },
                { value: "CUSTOMER_TRUST", label: t.org.benefitCustomerTrust },
                { value: "OTHER", label: t.org.other },
              ]}
              onChange={(v) => set("ismsExpectedBenefit", v || null)}
              disabled={!isAdmin}
            />
            {strVal("ismsExpectedBenefit") === "OTHER" && (
              <input
                type="text"
                value={strVal("ismsExpectedBenefitOther")}
                onChange={(e) => set("ismsExpectedBenefitOther", e.target.value || null)}
                disabled={!isAdmin}
                placeholder={t.org.other}
                className="mt-2 w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
              />
            )}
          </Section>

          {/* Q13: 의견 */}
          <Section title={t.org.opinionSection}>
            <textarea
              value={strVal("ismsOpinion")}
              onChange={(e) => set("ismsOpinion", e.target.value || null)}
              disabled={!isAdmin}
              rows={4}
              placeholder={t.org.ismsOpinion}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100 resize-y"
            />
          </Section>

          {/* 저장 */}
          {isAdmin && (
            <div className="flex justify-end border-t border-gray-200 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? t.common.loading : t.common.save}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Sub-components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <legend className="text-sm font-semibold text-gray-900">{title}</legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function NumField({
  label, value, unit, onChange, disabled,
}: {
  label: string; value: string; unit: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          min={0}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
        />
        <span className="shrink-0 text-sm text-gray-500">{unit}</span>
      </div>
    </div>
  );
}

function RadioGroup({
  name, value, options, onChange, disabled,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function CheckField({
  label, checked, onChange, disabled,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
