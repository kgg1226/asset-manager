"use client";

import { useState, useEffect } from "react";
import {
  ToggleLeft, ToggleRight, ArrowLeft, Activity,
  Shield, Bell, Package, DollarSign, Monitor, Save, RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface SettingDef {
  key: string;
  category: string;
  type: "boolean" | "number" | "string" | "numberArray";
  defaultValue: string;
  label: string;
  min?: number;
  max?: number;
}

type CategoryMeta = Record<string, { icon: React.ReactNode; label: string; description: string }>;

const CATEGORY_ORDER = ["feature", "security", "notification", "asset", "finance", "display"];

export default function FeatureFlagsPage() {
  const { t } = useTranslation();
  const CATEGORY_META: CategoryMeta = {
    feature: { icon: <Activity className="h-5 w-5" />, label: t.featureFlag.categoryFeatureLabel, description: t.featureFlag.categoryFeatureDesc },
    security: { icon: <Shield className="h-5 w-5" />, label: t.featureFlag.categorySecurityLabel, description: t.featureFlag.categorySecurityDesc },
    notification: { icon: <Bell className="h-5 w-5" />, label: t.featureFlag.categoryNotificationLabel, description: t.featureFlag.categoryNotificationDesc },
    asset: { icon: <Package className="h-5 w-5" />, label: t.featureFlag.categoryAssetLabel, description: t.featureFlag.categoryAssetDesc },
    finance: { icon: <DollarSign className="h-5 w-5" />, label: t.featureFlag.categoryFinanceLabel, description: t.featureFlag.categoryFinanceDesc },
    display: { icon: <Monitor className="h-5 w-5" />, label: t.featureFlag.categoryDisplayLabel, description: t.featureFlag.categoryDisplayDesc },
  };
  const [definitions, setDefinitions] = useState<SettingDef[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/feature-flags")
      .then((r) => r.json())
      .then((data) => {
        setDefinitions(data.definitions || []);
        setSettings(data.settings || {});
        setEdited(data.settings || {});
      })
      .catch(() => toast.error(t.featureFlag.loadFail))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key: string) => {
    const newVal = edited[key] === "true" ? "false" : "true";
    setSaving(key);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newVal }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setSettings(prev => ({ ...prev, [key]: newVal }));
      setEdited(prev => ({ ...prev, [key]: newVal }));
      toast.success(t.toast.saveSuccess);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.toast.saveFail);
    } finally {
      setSaving(null);
    }
  };

  const handleSave = async (key: string) => {
    const val = edited[key];
    if (val === settings[key]) return; // 변경 없음
    setSaving(key);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: val }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setSettings(prev => ({ ...prev, [key]: val }));
      toast.success(t.toast.saveSuccess);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.toast.saveFail);
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (key: string) => {
    const def = definitions.find(d => d.key === key);
    if (def) setEdited(prev => ({ ...prev, [key]: def.defaultValue }));
  };

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    meta: CATEGORY_META[cat],
    items: definitions.filter(d => d.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          {t.common?.back ?? "뒤로"}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t.nav?.featureFlags ?? "기능 설정"}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t.featureFlag.pageDesc}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border p-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ category, meta, items }) => (
            <section key={category}>
              {/* 카테고리 헤더 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-600">{meta.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{meta.label}</h2>
                  <p className="text-xs text-gray-500">{meta.description}</p>
                </div>
              </div>

              {/* 설정 항목 */}
              <div className="space-y-2">
                {items.map((def) => {
                  const isBoolean = def.type === "boolean";
                  const enabled = edited[def.key] === "true";
                  const isModified = edited[def.key] !== settings[def.key];
                  const isSaving = saving === def.key;

                  return (
                    <div
                      key={def.key}
                      className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 transition ${
                        isModified ? "border-blue-300 bg-blue-50/30" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{def.label}</span>
                          {isModified && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                              미저장
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">{def.key}</span>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {isBoolean ? (
                          <button
                            onClick={() => handleToggle(def.key)}
                            disabled={isSaving}
                            className={`flex-shrink-0 transition ${isSaving ? "opacity-50" : ""}`}
                          >
                            {enabled ? (
                              <ToggleRight className="h-7 w-7 text-blue-600" />
                            ) : (
                              <ToggleLeft className="h-7 w-7 text-gray-400" />
                            )}
                          </button>
                        ) : def.type === "numberArray" ? (
                          <>
                            <input
                              type="text"
                              value={(() => {
                                try { return JSON.parse(edited[def.key]).join(", "); } catch { return edited[def.key]; }
                              })()}
                              onChange={(e) => {
                                const nums = e.target.value.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
                                setEdited(prev => ({ ...prev, [def.key]: JSON.stringify(nums) }));
                              }}
                              className="w-36 rounded border px-2 py-1 text-sm text-right"
                              placeholder="70, 30, 15, 7"
                            />
                            <button onClick={() => handleReset(def.key)} className="p-1 text-gray-400 hover:text-gray-600" title={t.featureFlag.resetToDefault}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSave(def.key)}
                              disabled={!isModified || isSaving}
                              className={`p-1 rounded transition ${
                                isModified ? "text-blue-600 hover:bg-blue-50" : "text-gray-300"
                              }`}
                            >
                              <Save className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <input
                              type="number"
                              value={edited[def.key] ?? ""}
                              onChange={(e) => setEdited(prev => ({ ...prev, [def.key]: e.target.value }))}
                              min={def.min}
                              max={def.max}
                              className="w-20 rounded border px-2 py-1 text-sm text-right"
                            />
                            <button onClick={() => handleReset(def.key)} className="p-1 text-gray-400 hover:text-gray-600" title={t.featureFlag.resetToDefault}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSave(def.key)}
                              disabled={!isModified || isSaving}
                              className={`p-1 rounded transition ${
                                isModified ? "text-blue-600 hover:bg-blue-50" : "text-gray-300"
                              }`}
                            >
                              <Save className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
        <strong>{t.featureFlag.noticeTitle}:</strong> {t.featureFlag.noticeBody}
      </div>
    </div>
  );
}
