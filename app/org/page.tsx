"use client";

import { useState, useEffect } from "react";
import { Plus, List, GitBranch, Shield } from "lucide-react";
import OrgTree from "./org-tree";
import OrgChartVisual from "./org-chart-visual";
import SecurityOrgChart from "./security-org-chart";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { TourGuide } from "@/app/_components/tour-guide";
import { ORG_TOUR_KEY, getOrgSteps } from "@/app/_components/tours/org-tour";

type OrgUnit = { id: number; name: string; parentId: number | null };
type Company = { id: number; name: string; orgs: OrgUnit[] };

type Tab = "manage" | "visual" | "security";

export default function OrgPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [activeTab, setActiveTab] = useState<Tab>("manage");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/org/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleRefresh = async () => {
    await fetchCompanies();
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error(`${t.org.companyName} ${t.common.required}`);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/org/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompanyName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t.toast.createFail);
        return;
      }
      toast.success(t.toast.createSuccess);
      setShowCreateCompany(false);
      setNewCompanyName("");
      await fetchCompanies();
    } catch {
      toast.error(t.toast.createFail);
    } finally {
      setCreating(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof List }[] = [
    { key: "manage", label: t.org.manage, icon: List },
    { key: "visual", label: t.org.visual, icon: GitBranch },
    { key: "security", label: t.org.securityOrgChart, icon: Shield },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-center text-gray-500">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{t.org.title}</h1>
            <TourGuide tourKey={ORG_TOUR_KEY} steps={getOrgSteps(t)} />
          </div>
          <div className="flex gap-2">
            {user && activeTab === "manage" && (
              <button
                data-tour="org-new-company"
                onClick={() => { setShowCreateCompany(true); setNewCompanyName(""); }}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                {t.org.newCompany}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200" data-tour="org-tabs">
          <div className="-mb-px flex gap-6">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 회사 생성 모달 */}
        {showCreateCompany && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t.org.newCompany}</h3>
              <div className="mb-4">
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">{t.org.companyName}</label>
                <input
                  autoFocus
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="예: (주)트리플콤마"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCompany();
                    if (e.key === "Escape") setShowCreateCompany(false);
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateCompany(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >{t.common.cancel}</button>
                <button
                  onClick={handleCreateCompany}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >{creating ? t.common.loading : t.common.create}</button>
              </div>
            </div>
          </div>
        )}

        {/* Tab content */}
        <div data-tour="org-tree">
        {activeTab === "manage" && (
          companies.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
              <p className="text-sm text-gray-500">{t.common.noData}</p>
            </div>
          ) : (
            <OrgTree companies={companies} onRefresh={handleRefresh} isAuthenticated={!!user} />
          )
        )}

        {activeTab === "visual" && (
          <OrgChartVisual />
        )}

        {activeTab === "security" && (
          <SecurityOrgChart />
        )}
        </div>
      </div>
    </div>
  );
}
