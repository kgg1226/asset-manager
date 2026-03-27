"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Eye, Edit, Trash2, Building2, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { toast } from "sonner";

interface ExternalEntity {
  id: number;
  name: string;
  type: string;
  description: string | null;
  contactInfo: string | null;
  createdAt: string;
  _count: { outgoingLinks: number; incomingLinks: number };
}

const TYPE_COLORS: Record<string, string> = {
  TRUSTEE: "bg-blue-100 text-blue-700",
  PARTNER: "bg-green-100 text-green-700",
  GOVERNMENT: "bg-purple-100 text-purple-700",
  OTHER: "bg-gray-100 text-gray-700",
};

export default function ExternalEntityListPage() {
  const { t } = useTranslation();
  const { isAdmin } = useCurrentUser();
  const router = useRouter();
  const [entities, setEntities] = useState<ExternalEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  const loadEntities = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/external-entities");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntities(data.entities || []);
    } catch {
      toast.error(t.toast.loadFail);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadEntities(); }, [loadEntities]);

  const filtered = entities.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && e.type !== filterType) return false;
    return true;
  });

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      TRUSTEE: t.externalEntity.typeTrustee,
      PARTNER: t.externalEntity.typePartner,
      GOVERNMENT: t.externalEntity.typeGovernment,
      OTHER: t.externalEntity.typeOther,
    };
    return map[type] || type;
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`${t.externalEntity.deleteConfirm}\n\n${name}`)) return;
    try {
      const res = await fetch(`/api/external-entities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t.toast.deleteSuccess);
      loadEntities();
    } catch {
      toast.error(t.toast.deleteFail);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.externalEntity.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {filtered.length}건
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadEntities} className="rounded-md border border-gray-300 bg-white p-2 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4 text-gray-500" />
            </button>
            {isAdmin && (
              <Link
                href="/external/new"
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> {t.externalEntity.create}
              </Link>
            )}
          </div>
        </div>

        {/* Search + Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t.externalEntity.name}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1">
            {["", "TRUSTEE", "PARTNER", "GOVERNMENT", "OTHER"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterType === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type === "" ? t.common.all : getTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg bg-white py-20 shadow-sm">
            <Building2 className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">{t.externalEntity.noEntities}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">{t.externalEntity.name}</th>
                  <th className="px-4 py-3 font-medium text-gray-600">{t.externalEntity.type}</th>
                  <th className="px-4 py-3 font-medium text-gray-600">{t.externalEntity.description}</th>
                  <th className="px-4 py-3 font-medium text-gray-600">{t.externalEntity.connectedAssets}</th>
                  <th className="px-4 py-3 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((entity) => (
                  <tr
                    key={entity.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/external/${entity.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{entity.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[entity.type] || TYPE_COLORS.OTHER}`}>
                        {getTypeLabel(entity.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{entity.description || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {entity._count.outgoingLinks + entity._count.incomingLinks}건
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/external/${entity.id}`} className="rounded p-1 hover:bg-gray-100">
                          <Eye className="h-4 w-4 text-gray-500" />
                        </Link>
                        {isAdmin && (
                          <>
                            <Link href={`/external/${entity.id}/edit`} className="rounded p-1 hover:bg-gray-100">
                              <Edit className="h-4 w-4 text-gray-500" />
                            </Link>
                            <button onClick={() => handleDelete(entity.id, entity.name)} className="rounded p-1 hover:bg-red-50">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
