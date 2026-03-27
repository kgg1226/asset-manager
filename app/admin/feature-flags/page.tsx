"use client";

import { useState, useEffect } from "react";
import { ToggleLeft, ToggleRight, ArrowLeft, Activity } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface FeatureFlags {
  LIFECYCLE_VISIBLE_TO_USER: boolean;
}

export default function FeatureFlagsPage() {
  const { t } = useTranslation();
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/feature-flags")
      .then((r) => r.json())
      .then((data) => setFlags(data))
      .catch(() => toast.error("기능 플래그를 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, []);

  const toggleFlag = async (key: keyof FeatureFlags) => {
    if (!flags) return;
    setUpdating(key);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: !flags[key] }),
      });
      if (!res.ok) throw new Error();
      setFlags({ ...flags, [key]: !flags[key] });
      toast.success(!flags[key] ? t.common.enabled ?? "활성화됨" : t.common.disabled ?? "비활성화됨");
    } catch {
      toast.error("설정 변경에 실패했습니다.");
    } finally {
      setUpdating(null);
    }
  };

  const FLAG_INFO: Array<{
    key: keyof FeatureFlags;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      key: "LIFECYCLE_VISIBLE_TO_USER",
      label: t.assetMap?.lifecycle?.title ?? "자산 수명 게이지",
      description:
        "일반 사용자(USER 역할)에게 자산 목록·상세 페이지의 수명 게이지를 표시합니다. 비활성화 시 관리자에게만 표시됩니다.",
      icon: <Activity className="h-5 w-5 text-blue-600" />,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <Link href="/settings/notifications" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          {t.common.back ?? "뒤로"}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {t.nav?.featureFlags ?? "기능 설정"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          일반 사용자에게 표시할 기능을 제어합니다.
        </p>
      </div>

      {/* 플래그 목록 */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-lg border p-12 text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : (
          FLAG_INFO.map(({ key, label, description, icon }) => {
            const enabled = flags?.[key] ?? false;
            const isUpdating = updating === key;
            return (
              <div
                key={key}
                className="flex items-start justify-between rounded-lg border bg-white p-5 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="mt-0.5">{icon}</div>
                  <div>
                    <h3 className="font-medium text-gray-900">{label}</h3>
                    <p className="mt-1 text-sm text-gray-500">{description}</p>
                    <span
                      className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        enabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {enabled ? "공개" : "관리자만"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleFlag(key)}
                  disabled={isUpdating}
                  className={`flex-shrink-0 transition-colors ${
                    isUpdating ? "opacity-50" : ""
                  }`}
                  aria-label={`${label} ${enabled ? "비활성화" : "활성화"}`}
                >
                  {enabled ? (
                    <ToggleRight className="h-8 w-8 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-gray-400" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 안내 */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
        <strong>안내:</strong> 관리자(ADMIN)에게는 기능 플래그와 관계없이 항상 모든 기능이 표시됩니다.
        일반 사용자(USER)에게만 표시 여부가 적용됩니다.
      </div>
    </div>
  );
}
