"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import CiaScoreInput from "@/app/_components/cia-score-input";
import type { CiaLevel } from "@/lib/cia";

const CURRENCIES = ["USD", "KRW", "EUR", "JPY", "GBP", "CNY"];
const BILLING_CYCLES = [{ value: "ANNUAL", label: "연간" }, { value: "MONTHLY", label: "월간" }, { value: "ONE_TIME", label: "일회성" }, { value: "USAGE_BASED", label: "사용량 기반" }];

export default function DomainEditPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  const [form, setForm] = useState({ name: "", description: "", vendor: "", cost: "", currency: "KRW", billingCycle: "ANNUAL", purchaseDate: "", expiryDate: "" });
  const [domain, setDomain] = useState({ domainName: "", registrar: "", sslType: "", issuer: "", billingCycleMonths: "12", autoRenew: true });
  const [cia, setCia] = useState<{ ciaC: CiaLevel | null; ciaI: CiaLevel | null; ciaA: CiaLevel | null }>({ ciaC: null, ciaI: null, ciaA: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}`);
        if (!res.ok) { toast.error(t.common.error); router.push("/domains"); return; }
        const d = await res.json();
        setForm({ name: d.name || "", description: d.description || "", vendor: d.vendor || "", cost: d.cost != null ? String(d.cost) : "", currency: d.currency || "KRW", billingCycle: d.billingCycle || "ANNUAL", purchaseDate: d.purchaseDate ? d.purchaseDate.split("T")[0] : "", expiryDate: d.expiryDate ? d.expiryDate.split("T")[0] : "" });
        setCia({ ciaC: d.ciaC ?? null, ciaI: d.ciaI ?? null, ciaA: d.ciaA ?? null });
        if (d.domainDetail) {
          const dd = d.domainDetail;
          setDomain({
            domainName: dd.domainName || "",
            registrar: dd.registrar || "",
            sslType: dd.sslType || "",
            issuer: dd.issuer || "",
            billingCycleMonths: dd.billingCycleMonths != null ? String(dd.billingCycleMonths) : "12",
            autoRenew: dd.autoRenew !== false,
          });
        }
      } catch { toast.error(t.common.error); router.push("/domains"); }
      finally { setIsLoadingData(false); }
    })();
  }, [assetId, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = `${t.asset.assetName} ${t.common.required}`;
    if (form.cost && (isNaN(Number(form.cost)) || Number(form.cost) < 0)) e.cost = `${t.asset.cost} ${t.common.error}`;
    setErrors(e); return Object.keys(e).length === 0;
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target; setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };
  const onDomainChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const { name, value } = e.target; setDomain((p) => ({ ...p, [name]: value })); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error(t.common.error); return; }
    setIsLoading(true);
    try {
      const payload = {
        name: form.name, type: "DOMAIN_SSL", description: form.description || null,
        vendor: form.vendor || null, cost: form.cost ? Number(form.cost) : null,
        currency: form.currency, billingCycle: form.billingCycle,
        purchaseDate: form.purchaseDate || null, expiryDate: form.expiryDate || null,
        ciaC: cia.ciaC, ciaI: cia.ciaI, ciaA: cia.ciaA,
        domainDetail: {
          domainName: domain.domainName || null,
          registrar: domain.registrar || null,
          sslType: domain.sslType || null,
          issuer: domain.issuer || null,
          billingCycleMonths: domain.billingCycleMonths ? Number(domain.billingCycleMonths) : 12,
          autoRenew: domain.autoRenew,
        },
      };
      const res = await fetch(`/api/assets/${assetId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "수정 실패");
      toast.success(t.toast.updateSuccess); router.push(`/domains/${assetId}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : t.toast.updateFail); }
    finally { setIsLoading(false); }
  };

  if (authLoading || !user) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-2xl"><p className="text-center text-gray-500">{authLoading ? t.common.loading : `${t.common.login} ${t.common.required}`}</p></div></div>;
  if (isLoadingData) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-2xl"><p className="text-center text-gray-600">{t.common.loading}</p></div></div>;

  const ic = "w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const ec = "w-full rounded-md border border-red-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href={`/domains/${assetId}`} className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-3xl font-bold text-gray-900">{t.domain.title} {t.common.edit}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.common.detail}</h2>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.assetName} <span className="text-red-500">*</span></label><input type="text" name="name" value={form.name} onChange={onChange} placeholder="example.com" className={errors.name ? ec : ic} />{errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}</div>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.vendor}</label><input type="text" name="vendor" value={form.vendor} onChange={onChange} placeholder="GoDaddy, AWS Route53, Let's Encrypt" className={ic} /></div>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">{t.common.description}</label><textarea name="description" value={form.description} onChange={onChange} rows={3} placeholder={`${t.common.description} (${t.common.optional})`} className={ic} /></div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.cost}</label><input type="number" name="cost" value={form.cost} onChange={onChange} placeholder="0" min="0" step="0.01" className={errors.cost ? ec : ic} />{errors.cost && <p className="mt-1 text-sm text-red-500">{errors.cost}</p>}</div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.license.currency}</label><select name="currency" value={form.currency} onChange={onChange} className={ic}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.license.paymentCycle}</label><select name="billingCycle" value={form.billingCycle} onChange={onChange} className={ic}>{BILLING_CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.purchaseDate}</label><input type="date" name="purchaseDate" value={form.purchaseDate} onChange={onChange} className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.expiryDate}</label><input type="date" name="expiryDate" value={form.expiryDate} onChange={onChange} className={ic} /></div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.domain.title} {t.common.detail}</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.assetName}</label><input type="text" name="domainName" value={domain.domainName} onChange={onDomainChange} placeholder="example.com" className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.domain.registrar}</label><input type="text" name="registrar" value={domain.registrar} onChange={onDomainChange} placeholder="Route53" className={ic} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">SSL {t.common.type}</label><select name="sslType" value={domain.sslType} onChange={onDomainChange} className={ic}><option value="">{t.common.none}</option><option value="DV">DV (Domain Validation)</option><option value="OV">OV (Organization Validation)</option><option value="EV">EV (Extended Validation)</option><option value="WILDCARD">Wildcard</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">CA</label><input type="text" name="issuer" value={domain.issuer} onChange={onDomainChange} placeholder="Let's Encrypt, DigiCert" className={ic} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.license.paymentCycle}</label>
                <select name="billingCycleMonths" value={domain.billingCycleMonths} onChange={onDomainChange} className={ic}>
                  <option value="1">1개월</option><option value="6">6개월</option><option value="12">1년</option><option value="24">2년</option><option value="36">3년</option><option value="60">5년</option><option value="120">10년</option>
                </select>
                {form.cost && domain.billingCycleMonths && (
                  <p className="mt-1 text-xs text-blue-600">월 환산 비용: {(Number(form.cost) / Number(domain.billingCycleMonths)).toLocaleString("ko-KR", { maximumFractionDigits: 0 })} {form.currency}/월</p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-7">
                <input type="checkbox" id="autoRenew" checked={domain.autoRenew} onChange={(e) => setDomain((p) => ({ ...p, autoRenew: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
                <label htmlFor="autoRenew" className="text-sm font-medium text-gray-700">{t.contract.autoRenewal}</label>
              </div>
            </div>
          </div>

          <CiaScoreInput initialValues={cia} onChange={setCia} />

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isLoading ? t.common.loading : t.common.edit}</button>
            <Link href={`/domains/${assetId}`} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
