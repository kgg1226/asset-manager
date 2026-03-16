"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import CiaScoreInput from "@/app/_components/cia-score-input";
import type { CiaLevel } from "@/lib/cia";

const CURRENCIES = ["USD", "KRW", "EUR", "JPY", "GBP", "CNY"];
const BILLING_CYCLE_VALUES = ["MONTHLY", "ANNUAL", "ONE_TIME"] as const;
const BILLING_CYCLE_KEY_MAP: Record<string, string> = {
  MONTHLY: "monthly",
  ANNUAL: "yearly",
  ONE_TIME: "oneTime",
};
const CONTRACT_TYPE_KEYS = ["typeMaintenance", "typeLicense", "typeSubscription", "typeService", "typeLease", "typeOther"] as const;

type OrgOption = { id: number; name: string; companyName: string };

export default function ContractNewPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const [form, setForm] = useState({
    name: "", description: "", vendor: "", cost: "", currency: "KRW",
    billingCycle: "ANNUAL", purchaseDate: "", expiryDate: "",
  });
  const [contract, setContract] = useState({ contractNumber: "", counterparty: "", contractType: "", autoRenew: false });
  const [cia, setCia] = useState<{ ciaC: CiaLevel | null; ciaI: CiaLevel | null; ciaA: CiaLevel | null }>({ ciaC: null, ciaI: null, ciaA: null });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orgUnits, setOrgUnits] = useState<OrgOption[]>([]);
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState("");

  // 조직 목록 조회
  useEffect(() => {
    fetch("/api/org/companies")
      .then((res) => res.ok ? res.json() : { companies: [] })
      .then((data) => {
        const opts: OrgOption[] = [];
        for (const company of data.companies ?? []) {
          const flattenOrg = (unit: { id: number; name: string; children?: unknown[] }, depth = 0) => {
            opts.push({
              id: unit.id,
              name: `${"  ".repeat(depth)}${unit.name}`,
              companyName: company.name,
            });
            if (Array.isArray((unit as Record<string, unknown>).children)) {
              for (const child of (unit as { children: { id: number; name: string; children?: unknown[] }[] }).children) {
                flattenOrg(child, depth + 1);
              }
            }
          };
          for (const org of company.orgs ?? []) {
            flattenOrg(org);
          }
        }
        setOrgUnits(opts);
      })
      .catch(() => {});
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = `${t.asset.assetName} ${t.common.required}`;
    if (!form.cost) e.cost = `${t.asset.cost} ${t.common.required}`;
    else if (isNaN(Number(form.cost)) || Number(form.cost) < 0) e.cost = t.common.invalidCost;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };

  const onContractChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setContract((p) => ({ ...p, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-2xl"><p className="text-center text-gray-500">{loading ? t.common.loading : t.common.login}</p></div></div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error(t.common.validationCheck); return; }
    setIsLoading(true);
    try {
      const payload = {
        name: form.name, type: "CONTRACT", description: form.description || null,
        vendor: form.vendor || null, cost: Number(form.cost), currency: form.currency,
        billingCycle: form.billingCycle, purchaseDate: form.purchaseDate || null,
        expiryDate: form.expiryDate || null,
        orgUnitId: selectedOrgUnitId ? Number(selectedOrgUnitId) : null,
        contractDetail: {
          contractNumber: contract.contractNumber || null,
          counterparty: contract.counterparty || null,
          contractType: contract.contractType || null,
          autoRenew: contract.autoRenew,
        },
        ciaC: cia.ciaC, ciaI: cia.ciaI, ciaA: cia.ciaA,
      };
      const res = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t.common.registerFail);
      toast.success(t.toast.createSuccess);
      router.push(`/contracts/${json.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.toast.createFail);
    } finally { setIsLoading(false); }
  };

  const inputCls = "w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const errCls = "w-full rounded-md border border-red-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/contracts" className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-3xl font-bold text-gray-900">{t.contract.newContract}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.common.detail}</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.assetName} <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={form.name} onChange={onChange} placeholder={t.asset.assetName} className={errors.name ? errCls : inputCls} />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.vendor}</label>
              <input type="text" name="vendor" value={form.vendor} onChange={onChange} placeholder={`${t.asset.vendor} (${t.common.optional})`} className={inputCls} />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.common.description}</label>
              <textarea name="description" value={form.description} onChange={onChange} rows={3} placeholder={`${t.common.description} (${t.common.optional})`} className={inputCls} />
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.cost} <span className="text-red-500">*</span></label>
                <input type="number" name="cost" value={form.cost} onChange={onChange} placeholder="0" min="0" step="0.01" className={errors.cost ? errCls : inputCls} />
                {errors.cost && <p className="mt-1 text-sm text-red-500">{errors.cost}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.license.currency}</label>
                <select name="currency" value={form.currency} onChange={onChange} className={inputCls}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.license.paymentCycle}</label>
                <select name="billingCycle" value={form.billingCycle} onChange={onChange} className={inputCls}>
                  {BILLING_CYCLE_VALUES.map((v) => <option key={v} value={v}>{(t.license as Record<string, string>)[BILLING_CYCLE_KEY_MAP[v]] ?? v}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.purchaseDate}</label>
                <input type="date" name="purchaseDate" value={form.purchaseDate} onChange={onChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.expiryDate}</label>
                <input type="date" name="expiryDate" value={form.expiryDate} onChange={onChange} className={inputCls} />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.license.managingOrg}</label>
              <select value={selectedOrgUnitId} onChange={(e) => setSelectedOrgUnitId(e.target.value)} className={inputCls}>
                <option value="">{t.common.none}</option>
                {orgUnits.map((org) => (
                  <option key={org.id} value={org.id}>[{org.companyName}] {org.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.contract.title} {t.common.detail}</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.contract.title} #</label>
                <input type="text" name="contractNumber" value={contract.contractNumber} onChange={onContractChange} placeholder={`${t.contract.title} #`} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.contract.counterparty}</label>
                <input type="text" name="counterparty" value={contract.counterparty} onChange={onContractChange} placeholder={t.contract.counterparty} className={inputCls} />
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.contract.contractType}</label>
                <select name="contractType" value={contract.contractType} onChange={onContractChange} className={inputCls}>
                  <option value="">{t.common.none}</option>
                  {CONTRACT_TYPE_KEYS.map((key) => {
                    const label = (t.contract as Record<string, string>)[key] ?? key;
                    return <option key={key} value={label}>{label}</option>;
                  })}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="autoRenew" checked={contract.autoRenew} onChange={onContractChange} className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">{t.contract.autoRenewal}</span>
                </label>
              </div>
            </div>
          </div>

          <CiaScoreInput initialValues={cia} onChange={setCia} />

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? t.common.loading : t.contract.newContract}
            </button>
            <Link href="/contracts" className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
