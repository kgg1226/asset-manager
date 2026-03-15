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
const BILLING_CYCLE_VALUES = ["MONTHLY", "ANNUAL", "ONE_TIME", "USAGE_BASED"] as const;

const PLATFORMS = ["AWS", "GCP", "Azure", "Slack", "Notion", "Jira", "GitHub", "GitLab", "Figma", "Vercel", "Datadog", "Other"];
const SERVICE_CATEGORIES = ["IaaS", "PaaS", "SaaS", "Security", "Database", "Storage", "Network", "Other"];
const RESOURCE_TYPES: Record<string, string[]> = {
  AWS: ["EC2", "S3", "RDS", "Lambda", "ECS", "ELB", "CloudFront", "Route53", "VPC", "SecurityGroup", "IAM", "EBS", "SQS", "SNS", "DynamoDB", "ElastiCache", "Redshift", "Other"],
  GCP: ["Compute Engine", "Cloud Storage", "Cloud SQL", "Cloud Functions", "GKE", "BigQuery", "Cloud CDN", "VPC", "IAM", "Other"],
  Azure: ["VM", "Blob Storage", "SQL Database", "Functions", "AKS", "CDN", "VNet", "Active Directory", "Other"],
  _default: ["Web/App", "Database", "Storage", "API", "Auth", "Monitoring", "CI/CD", "Other"],
};

const BILLING_CYCLE_KEY_MAP: Record<string, string> = {
  MONTHLY: "monthly",
  ANNUAL: "yearly",
  ONE_TIME: "oneTime",
  USAGE_BASED: "usageBased",
};

export default function CloudNewPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const [form, setForm] = useState({
    name: "", description: "", vendor: "", cost: "", currency: "KRW",
    billingCycle: "MONTHLY", purchaseDate: "", expiryDate: "",
  });
  const [cloud, setCloud] = useState({
    platform: "", accountId: "", region: "", seatCount: "",
    serviceCategory: "", resourceType: "", resourceId: "",
    instanceSpec: "", storageSize: "", endpoint: "", vpcId: "", availabilityZone: "",
    contractStartDate: "", contractTermMonths: "", renewalDate: "", cancellationNoticeDate: "",
    cancellationNoticeDays: "", paymentMethod: "", contractNumber: "",
    adminEmail: "", adminSlackId: "", notifyChannels: "EMAIL", autoRenew: "", notes: "",
  });
  const [ciaValues, setCiaValues] = useState<{ ciaC: CiaLevel | null; ciaI: CiaLevel | null; ciaA: CiaLevel | null }>({ ciaC: null, ciaI: null, ciaA: null });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const onCloudChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCloud((p) => ({ ...p, [name]: value }));
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
        name: form.name, type: "CLOUD", description: form.description || null,
        vendor: form.vendor || null, cost: Number(form.cost), currency: form.currency,
        billingCycle: form.billingCycle, purchaseDate: form.purchaseDate || null,
        expiryDate: form.expiryDate || null,
        ciaC: ciaValues.ciaC, ciaI: ciaValues.ciaI, ciaA: ciaValues.ciaA,
        cloudDetail: {
          platform: cloud.platform || null, accountId: cloud.accountId || null,
          region: cloud.region || null, seatCount: cloud.seatCount ? Number(cloud.seatCount) : null,
          serviceCategory: cloud.serviceCategory || null, resourceType: cloud.resourceType || null,
          resourceId: cloud.resourceId || null, instanceSpec: cloud.instanceSpec || null,
          storageSize: cloud.storageSize || null, endpoint: cloud.endpoint || null,
          vpcId: cloud.vpcId || null, availabilityZone: cloud.availabilityZone || null,
          contractStartDate: cloud.contractStartDate || null,
          contractTermMonths: cloud.contractTermMonths ? Number(cloud.contractTermMonths) : null,
          renewalDate: cloud.renewalDate || null,
          cancellationNoticeDate: cloud.cancellationNoticeDate || null,
          cancellationNoticeDays: cloud.cancellationNoticeDays ? Number(cloud.cancellationNoticeDays) : null,
          paymentMethod: cloud.paymentMethod || null,
          contractNumber: cloud.contractNumber || null,
          adminEmail: cloud.adminEmail || null,
          adminSlackId: cloud.adminSlackId || null,
          notifyChannels: cloud.notifyChannels || "EMAIL",
          autoRenew: cloud.autoRenew === "true" ? true : cloud.autoRenew === "false" ? false : null,
          notes: cloud.notes || null,
        },
      };
      const res = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t.common.registerFail);
      toast.success(t.toast.createSuccess);
      router.push(`/cloud/${json.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.registerFail);
    } finally { setIsLoading(false); }
  };

  const inputCls = "w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const errCls = "w-full rounded-md border border-red-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/cloud" className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-3xl font-bold text-gray-900">{t.cloud.newCloud}</h1>
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
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.cloud.title} {t.common.detail}</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.platform}</label>
                <select name="platform" value={cloud.platform} onChange={onCloudChange} className={inputCls}>
                  <option value="">{t.common.select}</option>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.accountId}</label>
                <input type="text" name="accountId" value={cloud.accountId} onChange={onCloudChange} placeholder={t.cloud.accountIdPlaceholder} className={inputCls} />
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.region}</label>
                <input type="text" name="region" value={cloud.region} onChange={onCloudChange} placeholder={t.cloud.regionPlaceholder} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.seatCount}</label>
                <input type="number" name="seatCount" value={cloud.seatCount} onChange={onCloudChange} placeholder="0" min="0" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Service Category */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.cloud.serviceCategory}</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.serviceCategory}</label>
                <select name="serviceCategory" value={cloud.serviceCategory} onChange={onCloudChange} className={inputCls}>
                  <option value="">{t.common.select}</option>
                  {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.resourceType}</label>
                <select name="resourceType" value={cloud.resourceType} onChange={onCloudChange} className={inputCls}>
                  <option value="">{t.common.select}</option>
                  {(RESOURCE_TYPES[cloud.platform] || RESOURCE_TYPES._default).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.resourceId}</label>
              <input type="text" name="resourceId" value={cloud.resourceId} onChange={onCloudChange} placeholder={t.cloud.resourceIdPlaceholder} className={`${inputCls} font-mono`} />
            </div>
          </div>

          {/* Infrastructure Details */}
          {(["IaaS", "Database", "Storage", "Security", "Network", ""].includes(cloud.serviceCategory) || ["AWS", "GCP", "Azure"].includes(cloud.platform)) && (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">{t.cloud.infraDetail}</h2>
              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.instanceSpec}</label>
                  <input type="text" name="instanceSpec" value={cloud.instanceSpec} onChange={onCloudChange} placeholder="t4g.small, db.r6g.large" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.storageSize}</label>
                  <input type="text" name="storageSize" value={cloud.storageSize} onChange={onCloudChange} placeholder="100GB, 1TB" className={inputCls} />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.endpoint}</label>
                <input type="text" name="endpoint" value={cloud.endpoint} onChange={onCloudChange} placeholder={t.cloud.endpoint} className={`${inputCls} font-mono`} />
              </div>
              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.vpcId}</label>
                  <input type="text" name="vpcId" value={cloud.vpcId} onChange={onCloudChange} placeholder="vpc-xxx" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.availabilityZone}</label>
                  <input type="text" name="availabilityZone" value={cloud.availabilityZone} onChange={onCloudChange} placeholder="ap-northeast-2a" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.autoRenew}</label>
                  <select name="autoRenew" value={cloud.autoRenew} onChange={onCloudChange} className={inputCls}>
                    <option value="">{t.common.unspecified}</option>
                    <option value="true">{t.cloud.autoRenewYes}</option>
                    <option value="false">{t.cloud.autoRenewNo}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Contract/Subscription */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.cloud.contractPeriod}</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.contractStartDate}</label>
                <input type="date" name="contractStartDate" value={cloud.contractStartDate} onChange={onCloudChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.contractTermMonths}</label>
                <input type="number" name="contractTermMonths" value={cloud.contractTermMonths} onChange={onCloudChange} min="1" max="120" placeholder="12" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.renewalDate}</label>
                <input type="date" name="renewalDate" value={cloud.renewalDate} onChange={onCloudChange} className={inputCls} />
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.cancellationDeadline}</label>
                <input type="date" name="cancellationNoticeDate" value={cloud.cancellationNoticeDate} onChange={onCloudChange} className={inputCls} />
                <p className="mt-1 text-xs text-gray-500">{t.cloud.cancellationNotice}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.cancellationNoticeDays}</label>
                <input type="number" name="cancellationNoticeDays" value={cloud.cancellationNoticeDays} onChange={onCloudChange} min="1" max="365" placeholder="30" className={inputCls} />
                <p className="mt-1 text-xs text-gray-500">{t.cloud.cancellationNoticeHelper}</p>
              </div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.paymentMethod}</label>
                <select name="paymentMethod" value={cloud.paymentMethod} onChange={onCloudChange} className={inputCls}>
                  <option value="">{t.common.select}</option>
                  <option value="CARD">{t.cloud.paymentCard}</option>
                  <option value="TRANSFER">{t.cloud.paymentTransfer}</option>
                  <option value="INVOICE">{t.cloud.paymentInvoice}</option>
                  <option value="OTHER">{t.cloud.paymentOther}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.contractSubscriptionNumber}</label>
                <input type="text" name="contractNumber" value={cloud.contractNumber} onChange={onCloudChange} placeholder={t.cloud.contractSubscriptionNumber} className={`${inputCls} font-mono`} />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.cloud.notifySettings}</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.notifyChannel}</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: "EMAIL", label: t.cloud.emailOnly },
                  { value: "SLACK", label: t.cloud.slackOnly },
                  { value: "BOTH", label: t.cloud.emailAndSlack },
                  { value: "NONE", label: t.cloud.notifyOff },
                ].map((opt) => (
                  <label key={opt.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition ${cloud.notifyChannels === opt.value ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 hover:bg-gray-50"}`}>
                    <input type="radio" name="notifyChannels" value={opt.value} checked={cloud.notifyChannels === opt.value} onChange={onCloudChange} className="sr-only" />
                    {opt.label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">{t.cloud.notifyHelper}</p>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {(cloud.notifyChannels === "EMAIL" || cloud.notifyChannels === "BOTH") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.adminEmail}</label>
                  <input type="email" name="adminEmail" value={cloud.adminEmail} onChange={onCloudChange} placeholder="admin@example.com" className={inputCls} />
                  <p className="mt-1 text-xs text-gray-500">{t.cloud.adminEmailHelper}</p>
                </div>
              )}
              {(cloud.notifyChannels === "SLACK" || cloud.notifyChannels === "BOTH") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.slackMemberId}</label>
                  <input type="text" name="adminSlackId" value={cloud.adminSlackId} onChange={onCloudChange} placeholder="U01AB23CD" className={`${inputCls} font-mono`} />
                  <p className="mt-1 text-xs text-gray-500">{t.cloud.slackIdHelper}</p>
                </div>
              )}
            </div>
          </div>

          {/* Management Info */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.cloud.managementInfo}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.cloud.notes}</label>
              <textarea name="notes" value={cloud.notes} onChange={(e) => setCloud((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder={t.cloud.additionalMemo} className={inputCls} />
            </div>
          </div>

          {/* CIA Score */}
          <CiaScoreInput initialValues={ciaValues} onChange={setCiaValues} />

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? t.common.loading : t.cloud.newCloud}
            </button>
            <Link href="/cloud" className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
