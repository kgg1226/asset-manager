"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, Building2, Link2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

interface ExternalEntityDetail {
  id: number;
  name: string;
  type: string;
  description: string | null;
  contactInfo: string | null;
  createdAt: string;
  updatedAt: string;
  outgoingLinks: Array<{
    id: number;
    linkType: string;
    label: string | null;
    targetAsset: { id: number; name: string; type: string } | null;
  }>;
  incomingLinks: Array<{
    id: number;
    linkType: string;
    label: string | null;
    sourceAsset: { id: number; name: string; type: string } | null;
  }>;
}

const TYPE_COLORS: Record<string, string> = {
  TRUSTEE: "bg-blue-100 text-blue-700",
  PARTNER: "bg-green-100 text-green-700",
  GOVERNMENT: "bg-purple-100 text-purple-700",
  OTHER: "bg-gray-100 text-gray-700",
};

export default function ExternalEntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const [entity, setEntity] = useState<ExternalEntityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      TRUSTEE: t.externalEntity.typeTrustee,
      PARTNER: t.externalEntity.typePartner,
      GOVERNMENT: t.externalEntity.typeGovernment,
      OTHER: t.externalEntity.typeOther,
    };
    return map[type] || type;
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/external-entities/${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setEntity(data);
      } catch {
        toast.error(t.toast.loadFail);
        router.push("/external");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, router]);

  const handleDelete = async () => {
    if (!entity) return;
    if (!confirm(`${t.externalEntity.deleteConfirm}\n\n${entity.name}`)) return;
    try {
      const res = await fetch(`/api/external-entities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t.toast.deleteSuccess);
      router.push("/external");
    } catch {
      toast.error(t.toast.deleteFail);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!entity) return null;

  const allLinks = [
    ...entity.outgoingLinks.map((l) => ({
      id: l.id, type: l.linkType, label: l.label,
      assetName: l.targetAsset?.name || "-",
      assetType: l.targetAsset?.type || "",
      assetId: l.targetAsset?.id,
      direction: "outgoing" as const,
    })),
    ...entity.incomingLinks.map((l) => ({
      id: l.id, type: l.linkType, label: l.label,
      assetName: l.sourceAsset?.name || "-",
      assetType: l.sourceAsset?.type || "",
      assetId: l.sourceAsset?.id,
      direction: "incoming" as const,
    })),
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/external" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> {t.externalEntity.title}
          </Link>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-gray-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[entity.type] || TYPE_COLORS.OTHER}`}>
                  {getTypeLabel(entity.type)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/external/${id}/edit`}
                className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" /> {t.externalEntity.edit}
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Detail Card */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{t.externalEntity.detail}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-600">{t.externalEntity.name}</p>
              <p className="mt-1 text-gray-900">{entity.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t.externalEntity.type}</p>
              <p className="mt-1 text-gray-900">{getTypeLabel(entity.type)}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600">{t.externalEntity.description}</p>
              <p className="mt-1 text-gray-900">{entity.description || "-"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600">{t.externalEntity.contactInfo}</p>
              <p className="mt-1 text-gray-900">{entity.contactInfo || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t.common.createdAt}</p>
              <p className="mt-1 text-gray-900">{new Date(entity.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t.common.updatedAt}</p>
              <p className="mt-1 text-gray-900">{new Date(entity.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Connected Assets */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Link2 className="h-5 w-5" />
            {t.externalEntity.connectedAssets}
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-sm font-normal text-gray-600">
              {allLinks.length}
            </span>
          </h2>
          {allLinks.length === 0 ? (
            <p className="py-8 text-center text-gray-500">{t.assetMap.noLinks}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 font-medium text-gray-600">{t.asset.assetName}</th>
                    <th className="px-4 py-2 font-medium text-gray-600">{t.assetMap.linkType}</th>
                    <th className="px-4 py-2 font-medium text-gray-600">{t.assetMap.direction}</th>
                    <th className="px-4 py-2 font-medium text-gray-600">{t.assetMap.label}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allLinks.map((link) => (
                    <tr key={`${link.direction}-${link.id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-blue-600">
                        {link.assetId ? (
                          <Link href={`/${link.assetType === "HARDWARE" ? "hardware" : link.assetType === "CLOUD" ? "cloud" : link.assetType === "DOMAIN_SSL" ? "domains" : "contracts"}/${link.assetId}`}>
                            {link.assetName}
                          </Link>
                        ) : link.assetName}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{link.type}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {link.direction === "outgoing" ? "→ 대상" : "← 소스"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{link.label || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
