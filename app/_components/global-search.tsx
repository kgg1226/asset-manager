"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, HardDrive, Users, Cloud, Globe, FileSignature, Package, X, Command, Building2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface SearchResult {
  licenses: { id: number; name: string; licenseType: string; expiryDate: string | null; vendor: string | null; renewalStatus: string | null }[];
  assets: { id: number; name: string; type: string; status: string; vendor: string | null; expiryDate: string | null }[];
  employees: { id: number; name: string; department: string | null; email: string | null; status: string }[];
  orgs: { id: number; name: string; kind: "company" | "unit"; sub: string | null }[];
}

export default function GlobalSearch() {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const ASSET_TYPE_META: Record<string, { label: string; icon: React.ReactNode; path: string }> = {
    HARDWARE: { label: t.hw.title, icon: <HardDrive className="h-3.5 w-3.5" />, path: "/hardware" },
    CLOUD: { label: t.cloud.title, icon: <Cloud className="h-3.5 w-3.5" />, path: "/cloud" },
    DOMAIN_SSL: { label: t.domain.title, icon: <Globe className="h-3.5 w-3.5" />, path: "/domains" },
    CONTRACT: { label: t.contract.title, icon: <FileSignature className="h-3.5 w-3.5" />, path: "/contracts" },
    SOFTWARE: { label: t.license.title, icon: <Package className="h-3.5 w-3.5" />, path: "/hardware" },
    OTHER: { label: t.hw.other, icon: <Package className="h-3.5 w-3.5" />, path: "/hardware" },
  };

  // Close inline dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Ctrl+K / Cmd+K → open modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setModalOpen(true);
      }
      if (e.key === "Escape" && modalOpen) {
        closeModal();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modalOpen]);

  // Focus modal input when modal opens
  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => modalInputRef.current?.focus(), 50);
      setActiveIndex(-1);
    }
  }, [modalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  const closeModal = () => {
    setModalOpen(false);
    setQuery("");
    setResults(null);
    setActiveIndex(-1);
  };

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
      if (res.ok) {
        const data: SearchResult = await res.json();
        setResults(data);
        const hasResults = data.licenses.length > 0 || data.assets.length > 0 || data.employees.length > 0 || (data.orgs?.length ?? 0) > 0;
        setOpen(hasResults || q.length > 0);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 300);
  };

  const navigate = (path: string) => {
    setOpen(false);
    closeModal();
    setQuery("");
    setResults(null);
    router.push(path);
  };

  // Flatten results for keyboard navigation
  const flatResults: { path: string; label: string; sub: string }[] = results
    ? [
        ...results.licenses.map((l) => ({
          path: `/licenses/${l.id}`,
          label: l.name,
          sub: l.licenseType,
        })),
        ...results.assets.map((a) => {
          const meta = ASSET_TYPE_META[a.type] ?? ASSET_TYPE_META.OTHER;
          return { path: `${meta.path}/${a.id}`, label: a.name, sub: meta.label };
        }),
        ...results.employees.map((e) => ({
          path: `/employees/${e.id}`,
          label: e.name,
          sub: e.department || e.email || "—",
        })),
        ...(results.orgs ?? []).map((o) => ({
          path: `/org`,
          label: o.name,
          sub: o.sub ?? "",
        })),
      ]
    : [];

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && flatResults[activeIndex]) {
        navigate(flatResults[activeIndex].path);
      }
    } else if (e.key === "Escape") {
      closeModal();
    }
  };

  const totalCount = results
    ? results.licenses.length + results.assets.length + results.employees.length + (results.orgs?.length ?? 0)
    : 0;

  const ResultDropdown = ({ isModal }: { isModal: boolean }) => {
    if (!results) return null;
    return (
      <div className={isModal ? "max-h-96 overflow-y-auto py-1" : "max-h-80 overflow-y-auto py-1"}>
        {totalCount === 0 ? (
          <p className="px-4 py-3 text-center text-sm text-gray-500">{t.common.noData}</p>
        ) : (
          <>
            {/* Licenses */}
            {results.licenses.length > 0 && (
              <div>
                <p className="px-4 py-1.5 text-xs font-semibold uppercase text-gray-400">{t.license.title}</p>
                {results.licenses.map((l, idx) => {
                  const flatIdx = idx;
                  return (
                    <button
                      key={`l-${l.id}`}
                      onClick={() => navigate(`/licenses/${l.id}`)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${isModal && activeIndex === flatIdx ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{l.name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {l.vendor ? `${l.vendor} · ` : ""}{l.licenseType}
                          {l.renewalStatus ? ` · ${l.renewalStatus}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Assets */}
            {results.assets.length > 0 && (
              <div>
                <p className="px-4 py-1.5 text-xs font-semibold uppercase text-gray-400">{t.dashboard.totalAssets}</p>
                {results.assets.map((a, idx) => {
                  const meta = ASSET_TYPE_META[a.type] ?? ASSET_TYPE_META.OTHER;
                  const flatIdx = results.licenses.length + idx;
                  return (
                    <button
                      key={`a-${a.id}`}
                      onClick={() => navigate(`${meta.path}/${a.id}`)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${isModal && activeIndex === flatIdx ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <span className="shrink-0 text-green-500">{meta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{a.name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {a.vendor ? `${a.vendor} · ` : ""}{meta.label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Employees */}
            {results.employees.length > 0 && (
              <div>
                <p className="px-4 py-1.5 text-xs font-semibold uppercase text-gray-400">{t.employee.title}</p>
                {results.employees.map((e, idx) => {
                  const flatIdx = results.licenses.length + results.assets.length + idx;
                  return (
                    <button
                      key={`e-${e.id}`}
                      onClick={() => navigate(`/employees/${e.id}`)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${isModal && activeIndex === flatIdx ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <Users className="h-4 w-4 shrink-0 text-purple-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{e.name}</p>
                        <p className="truncate text-xs text-gray-500">{e.department || e.email || "—"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Orgs */}
            {(results.orgs?.length ?? 0) > 0 && (
              <div>
                <p className="px-4 py-1.5 text-xs font-semibold uppercase text-gray-400">{t.org?.title ?? "조직"}</p>
                {results.orgs.map((o, idx) => {
                  const flatIdx = results.licenses.length + results.assets.length + results.employees.length + idx;
                  return (
                    <button
                      key={`o-${o.kind}-${o.id}`}
                      onClick={() => navigate(`/org`)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${isModal && activeIndex === flatIdx ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-orange-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{o.name}</p>
                        <p className="truncate text-xs text-gray-500">{o.sub || (o.kind === "company" ? t.org.companyName : t.employee.department)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Inline search bar (top header) */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => { if (results && query) setOpen(true); }}
            placeholder={t.header.searchPlaceholder}
            className="w-48 rounded-md border border-gray-300 py-1.5 pl-8 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 lg:w-64"
          />
          {/* Ctrl+K hint */}
          <button
            onClick={() => setModalOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] text-gray-400 hover:border-gray-300"
            title="Ctrl+K to open search"
          >
            <Command className="h-2.5 w-2.5" />
            <span>K</span>
          </button>
          {loading && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            </div>
          )}
        </div>

        {open && results && (
          <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg lg:w-96">
            <ResultDropdown isModal={false} />
          </div>
        )}
      </div>

      {/* Ctrl+K Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal search input */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-gray-400" />
              <input
                ref={modalInputRef}
                type="text"
                value={query}
                onChange={handleChange}
                onKeyDown={handleModalKeyDown}
                placeholder={t.header.searchPlaceholder}
                className="flex-1 bg-transparent text-base outline-none placeholder:text-gray-400"
              />
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              )}
              <button
                onClick={closeModal}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal results */}
            {query && <ResultDropdown isModal={true} />}

            {/* Footer hint */}
            {flatResults.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
                <span className="text-xs text-gray-400">
                  {t.common.searchKeyboardHint}
                </span>
                <span className="text-xs text-gray-400">{totalCount}{t.common.countSuffix}</span>
              </div>
            )}

            {!query && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                {t.common.searchTypeHint}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
