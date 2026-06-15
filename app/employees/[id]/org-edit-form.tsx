// [2026-03-04] orgId/subOrgId → orgUnitId 단일 필드로 통합

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

type OrgUnit = { id: number; name: string; parentId: number | null };
type Company = { id: number; name: string; orgs: OrgUnit[] };

export default function OrgEditForm({
  employeeId,
  initialTitle,
  initialCompanyId,
  initialOrgUnitId,
  initialDepartment,
  companies,
  titleOptions,
  readOnly = false,
}: {
  employeeId: number;
  initialTitle: string | null;
  initialCompanyId: number | null;
  initialOrgUnitId: number | null;
  // 레거시 free-text 부서 — orgUnit 미설정 직원의 부서 표시 폴백
  initialDepartment?: string | null;
  companies: Company[];
  titleOptions: string[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const [title, setTitle] = useState(initialTitle ?? "");
  const [companyId, setCompanyId] = useState<number | "">(initialCompanyId ?? "");
  const [orgUnitId, setOrgUnitId] = useState<number | "">(initialOrgUnitId ?? "");

  const selectedCompany = companies.find((c) => c.id === companyId);
  const orgUnits = selectedCompany?.orgs ?? [];

  function handleCompanyChange(val: string) {
    setCompanyId(val ? Number(val) : "");
    setOrgUnitId("");
  }

  async function handleSave() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          companyId: companyId || null,
          orgUnitId: orgUnitId || null,
        }),
      });
      // 응답 체크 (dev-042) — 기존엔 실패해도 조용히 닫혀 "반영 안 됨"으로 보였다
      if (!res.ok) { toast.error(t.toast.updateFail); return; }
      toast.success(t.toast.updateSuccess);
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error(t.toast.updateFail);
    } finally {
      setIsPending(false);
    }
  }

  function handleCancel() {
    setTitle(initialTitle ?? "");
    setCompanyId(initialCompanyId ?? "");
    setOrgUnitId(initialOrgUnitId ?? "");
    setIsEditing(false);
  }

  // 비편집 카드는 로컬 state 기반 표시 (dev-042) — 저장 성공 시 router.refresh 를
  // 기다리지 않고 즉시 최신 값을 보여준다. 취소 시 handleCancel 이 state 를 initial 로 복원.
  const displayCompany = companies.find((c) => c.id === companyId);
  const displayOrgUnit = displayCompany?.orgs.find((o) => o.id === orgUnitId);

  if (!isEditing) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">{t.org.title}</h3>
          {!readOnly && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
            >
              {t.common.edit}
            </button>
          )}
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">{t.employee.jobTitle}</dt>
            <dd className="mt-1 text-sm text-gray-900">{title || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">{t.org.companyName}</dt>
            <dd className="mt-1 text-sm text-gray-900">{displayCompany?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">{t.employee.department}</dt>
            <dd className="mt-1 text-sm text-gray-900">{displayOrgUnit?.name ?? (initialDepartment && initialDepartment !== "-" ? initialDepartment : "—")}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{`${t.org.title} ${t.common.edit}`}</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">{t.employee.jobTitle}</label>
          <select
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input text-sm"
          >
            <option value="">{t.common.none}</option>
            {/* 기존 입력 값이 마스터 목록에 없으면 비활성화로 함께 노출 (마이그레이션 안전망) */}
            {title && !titleOptions.includes(title) && (
              <option value={title} disabled>{title} (legacy)</option>
            )}
            {titleOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">{t.org.companyName}</label>
          <select
            value={companyId}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="input text-sm"
          >
            <option value="">{t.common.none}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">{t.employee.department}</label>
          <select
            value={orgUnitId}
            onChange={(e) => setOrgUnitId(e.target.value ? Number(e.target.value) : "")}
            className="input text-sm"
            disabled={!companyId || orgUnits.length === 0}
          >
            <option value="">{t.common.none}</option>
            {orgUnits.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? t.common.processing : t.common.save}
        </button>
        <button
          onClick={handleCancel}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
        >
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}
