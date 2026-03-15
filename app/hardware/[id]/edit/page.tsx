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
const BILLING_CYCLE_VALUES = ["ONE_TIME", "MONTHLY", "ANNUAL", "USAGE_BASED"];
const DEVICE_TYPES = ["Laptop", "Desktop", "Server", "Network", "Mobile", "Monitor", "Peripheral", "SecurityDevice", "Storage", "Backup", "Rack", "Component", "Facility", "Other"];

export default function HardwareEditPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  const [form, setForm] = useState({ name: "", description: "", vendor: "", cost: "", currency: "KRW", billingCycle: "ONE_TIME", purchaseDate: "", expiryDate: "" });
  const [hw, setHw] = useState({
    assetTag: "", deviceType: "", manufacturer: "", model: "", serialNumber: "", hostname: "",
    macAddress: "", ipAddress: "", os: "", osVersion: "", location: "", usefulLifeYears: "5",
    cpu: "", ram: "", storage: "", storageType: "SSD", imei: "", phoneNumber: "", portCount: "", connectionType: "", resolution: "",
    warrantyEndDate: "", warrantyProvider: "", purchaseOrderNumber: "", invoiceNumber: "", condition: "", notes: "",
    secondaryIp: "", subnetMask: "", gateway: "", vlanId: "", dnsName: "", firmwareVersion: "",
  });
  const [cia, setCia] = useState<{ ciaC: CiaLevel | null; ciaI: CiaLevel | null; ciaA: CiaLevel | null }>({ ciaC: null, ciaI: null, ciaA: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}`);
        if (!res.ok) { toast.error(t.toast.loadFail); router.push("/hardware"); return; }
        const d = await res.json();
        setForm({ name: d.name || "", description: d.description || "", vendor: d.vendor || "", cost: d.cost != null ? String(d.cost) : "", currency: d.currency || "KRW", billingCycle: d.billingCycle || "ONE_TIME", purchaseDate: d.purchaseDate ? d.purchaseDate.split("T")[0] : "", expiryDate: d.expiryDate ? d.expiryDate.split("T")[0] : "" });
        setCia({ ciaC: (d.ciaC as CiaLevel) ?? null, ciaI: (d.ciaI as CiaLevel) ?? null, ciaA: (d.ciaA as CiaLevel) ?? null });
        if (d.hardwareDetail) {
          const h = d.hardwareDetail;
          setHw({
            assetTag: h.assetTag || "", deviceType: h.deviceType || "", manufacturer: h.manufacturer || "",
            model: h.model || "", serialNumber: h.serialNumber || "", hostname: h.hostname || "",
            macAddress: h.macAddress || "", ipAddress: h.ipAddress || "", os: h.os || "",
            osVersion: h.osVersion || "", location: h.location || "",
            usefulLifeYears: h.usefulLifeYears != null ? String(h.usefulLifeYears) : "5",
            cpu: h.cpu || "", ram: h.ram != null ? String(h.ram) : "",
            storage: h.storage != null ? String(h.storage) : "", storageType: h.storageType || "SSD",
            imei: h.imei || "", phoneNumber: h.phoneNumber || "",
            portCount: h.portCount != null ? String(h.portCount) : "",
            connectionType: h.connectionType || "", resolution: h.resolution || "",
            warrantyEndDate: h.warrantyEndDate ? h.warrantyEndDate.split("T")[0] : "",
            warrantyProvider: h.warrantyProvider || "", purchaseOrderNumber: h.purchaseOrderNumber || "",
            invoiceNumber: h.invoiceNumber || "", condition: h.condition || "", notes: h.notes || "",
            secondaryIp: h.secondaryIp || "", subnetMask: h.subnetMask || "", gateway: h.gateway || "",
            vlanId: h.vlanId || "", dnsName: h.dnsName || "", firmwareVersion: h.firmwareVersion || "",
          });
        }
      } catch { toast.error(t.toast.loadFail); router.push("/hardware"); }
      finally { setIsLoadingData(false); }
    })();
  }, [assetId, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = `${t.asset.assetName} ${t.common.required}`;
    if (form.cost && (isNaN(Number(form.cost)) || Number(form.cost) < 0)) e.cost = t.common.invalidCost;
    setErrors(e); return Object.keys(e).length === 0;
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setForm((p) => ({ ...p, [name]: value })); if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; }); };
  const onHwChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const { name, value } = e.target; setHw((p) => ({ ...p, [name]: value })); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error(t.common.validationCheck); return; }
    setIsLoading(true);
    try {
      const payload = {
        name: form.name, type: "HARDWARE", description: form.description || null, vendor: form.vendor || null,
        cost: form.cost ? Number(form.cost) : null, currency: form.currency, billingCycle: form.billingCycle,
        purchaseDate: form.purchaseDate || null, expiryDate: form.expiryDate || null,
        ciaC: cia.ciaC, ciaI: cia.ciaI, ciaA: cia.ciaA,
        hardwareDetail: {
          assetTag: hw.assetTag || null, deviceType: hw.deviceType || null, manufacturer: hw.manufacturer || null,
          model: hw.model || null, serialNumber: hw.serialNumber || null, hostname: hw.hostname || null,
          macAddress: hw.macAddress || null, ipAddress: hw.ipAddress || null, os: hw.os || null,
          osVersion: hw.osVersion || null, location: hw.location || null,
          usefulLifeYears: hw.usefulLifeYears ? Number(hw.usefulLifeYears) : 5,
          cpu: hw.cpu || null,
          ram: hw.ram ? Number(hw.ram) : null,
          storage: hw.storage ? Number(hw.storage) : null,
          storageType: hw.storageType || null,
          imei: hw.imei || null,
          phoneNumber: hw.phoneNumber || null,
          connectionType: hw.connectionType || null,
          resolution: hw.resolution || null,
          warrantyEndDate: hw.warrantyEndDate || null, warrantyProvider: hw.warrantyProvider || null,
          purchaseOrderNumber: hw.purchaseOrderNumber || null, invoiceNumber: hw.invoiceNumber || null,
          condition: hw.condition || null, notes: hw.notes || null,
          secondaryIp: hw.secondaryIp || null, subnetMask: hw.subnetMask || null,
          gateway: hw.gateway || null, vlanId: hw.vlanId || null, dnsName: hw.dnsName || null,
          portCount: hw.portCount ? Number(hw.portCount) : null, firmwareVersion: hw.firmwareVersion || null,
        },
      };
      const res = await fetch(`/api/assets/${assetId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t.toast.updateFail);
      toast.success(t.toast.updateSuccess); router.push(`/hardware/${assetId}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : t.toast.updateFail); }
    finally { setIsLoading(false); }
  };

  if (authLoading || !user) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-2xl"><p className="text-center text-gray-500">{authLoading ? t.common.loading : t.common.login}</p></div></div>;
  if (isLoadingData) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-2xl"><p className="text-center text-gray-600">{t.common.loading}</p></div></div>;

  const ic = "w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const ec = "w-full rounded-md border border-red-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href={`/hardware/${assetId}`} className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-3xl font-bold text-gray-900">{t.hw.title} {t.common.edit}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.common.detail}</h2>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.assetName} <span className="text-red-500">*</span></label><input type="text" name="name" value={form.name} onChange={onChange} className={errors.name ? ec : ic} />{errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}</div>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.vendor}</label><input type="text" name="vendor" value={form.vendor} onChange={onChange} className={ic} /></div>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">{t.common.description}</label><textarea name="description" value={form.description} onChange={onChange} rows={3} className={ic} /></div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.cost}</label><input type="number" name="cost" value={form.cost} onChange={onChange} min="0" step="0.01" className={errors.cost ? ec : ic} />{errors.cost && <p className="mt-1 text-sm text-red-500">{errors.cost}</p>}</div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.license.currency}</label><select name="currency" value={form.currency} onChange={onChange} className={ic}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.license.paymentCycle}</label><select name="billingCycle" value={form.billingCycle} onChange={onChange} className={ic}>{BILLING_CYCLE_VALUES.map((v) => <option key={v} value={v}>{(t.license as Record<string, string>)[v === "ONE_TIME" ? "oneTime" : v === "MONTHLY" ? "monthly" : v === "ANNUAL" ? "yearly" : "usageBased"] ?? v}</option>)}</select></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.purchaseDate}</label><input type="date" name="purchaseDate" value={form.purchaseDate} onChange={onChange} className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.asset.expiryDate}</label><input type="date" name="expiryDate" value={form.expiryDate} onChange={onChange} className={ic} /></div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.hw.title} {t.common.detail}</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.assetTag}</label><input type="text" name="assetTag" value={hw.assetTag} onChange={onHwChange} className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.deviceType}</label><select name="deviceType" value={hw.deviceType} onChange={onHwChange} className={ic}><option value="">{t.common.search}</option>{DEVICE_TYPES.map((d) => <option key={d} value={d}>{(t.hw as Record<string, string>)[d.charAt(0).toLowerCase() + d.slice(1)] ?? d}</option>)}</select></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.manufacturer}</label><input type="text" name="manufacturer" value={hw.manufacturer} onChange={onHwChange} placeholder="Apple, Dell, Lenovo" className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.model}</label><input type="text" name="model" value={hw.model} onChange={onHwChange} placeholder="MacBook Pro M4" className={ic} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.serialNumber}</label><input type="text" name="serialNumber" value={hw.serialNumber} onChange={onHwChange} className={`${ic} font-mono`} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.hostname}</label><input type="text" name="hostname" value={hw.hostname} onChange={onHwChange} className={`${ic} font-mono`} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">MAC Address</label><input type="text" name="macAddress" value={hw.macAddress} onChange={onHwChange} className={`${ic} font-mono`} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">IP Address</label><input type="text" name="ipAddress" value={hw.ipAddress} onChange={onHwChange} className={`${ic} font-mono`} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.os}</label><select name="os" value={hw.os} onChange={onHwChange} className={ic}><option value="">{t.common.search}</option><option value="macOS">macOS</option><option value="Windows">Windows</option><option value="Linux">Linux</option><option value="Other">{t.hw.other}</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.osVersion}</label><input type="text" name="osVersion" value={hw.osVersion} onChange={onHwChange} className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.usefulLife}</label><input type="number" name="usefulLifeYears" value={hw.usefulLifeYears} onChange={onHwChange} min="1" max="50" className={ic} /><p className="mt-1 text-xs text-gray-500">{t.hw.depreciation}</p></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.location}</label><input type="text" name="location" value={hw.location} onChange={onHwChange} className={ic} /></div>

            {/* 유형별 동적 필드 — 장비 상세 정보 섹션 내부 */}
            {["Laptop", "Desktop", "Server"].includes(hw.deviceType) && (<>
              <div className="mt-6 mb-2 border-t border-gray-200 pt-4"><p className="text-sm font-semibold text-gray-700">{hw.deviceType} {t.common.detail}</p></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">CPU</label><input type="text" name="cpu" value={hw.cpu} onChange={onHwChange} placeholder="Intel i7, Apple M4" className={ic} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">RAM (GB)</label><input type="number" name="ram" value={hw.ram} onChange={onHwChange} min="0" className={ic} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.storageCap}</label><div className="flex gap-2"><input type="number" name="storage" value={hw.storage} onChange={onHwChange} min="0" className={ic} /><select name="storageType" value={hw.storageType} onChange={onHwChange} className="w-24 rounded-md border border-gray-300 px-2 py-2 text-sm"><option value="SSD">SSD</option><option value="HDD">HDD</option></select></div></div>
              </div>
            </>)}

            {hw.deviceType === "Network" && (<>
              <div className="mt-6 mb-2 border-t border-gray-200 pt-4"><p className="text-sm font-semibold text-gray-700">{t.hw.network} {t.common.detail}</p></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.portCount}</label><input type="number" name="portCount" value={hw.portCount} onChange={onHwChange} min="0" className={ic} /></div>
              </div>
            </>)}

            {hw.deviceType === "Mobile" && (<>
              <div className="mt-6 mb-2 border-t border-gray-200 pt-4"><p className="text-sm font-semibold text-gray-700">{t.hw.mobile} {t.common.detail}</p></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">IMEI</label><input type="text" name="imei" value={hw.imei} onChange={onHwChange} placeholder="IMEI" className={`${ic} font-mono`} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.employee.phone}</label><input type="text" name="phoneNumber" value={hw.phoneNumber} onChange={onHwChange} placeholder="010-1234-5678" className={ic} /></div>
              </div>
            </>)}

            {hw.deviceType === "Monitor" && (<>
              <div className="mt-6 mb-2 border-t border-gray-200 pt-4"><p className="text-sm font-semibold text-gray-700">{t.hw.monitor} {t.common.detail}</p></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.resolution}</label><input type="text" name="resolution" value={hw.resolution} onChange={onHwChange} placeholder="2560x1440" className={ic} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.connectionType}</label><select name="connectionType" value={hw.connectionType} onChange={onHwChange} className={ic}><option value="">{t.common.search}</option><option value="HDMI">HDMI</option><option value="DisplayPort">DisplayPort</option><option value="USB-C">USB-C</option><option value="DVI">DVI</option><option value="VGA">VGA</option><option value="Other">{t.hw.other}</option></select></div>
              </div>
            </>)}

            {hw.deviceType === "Peripheral" && (<>
              <div className="mt-6 mb-2 border-t border-gray-200 pt-4"><p className="text-sm font-semibold text-gray-700">{t.hw.peripheral} {t.common.detail}</p></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.connectionType}</label><select name="connectionType" value={hw.connectionType} onChange={onHwChange} className={ic}><option value="">{t.common.search}</option><option value="USB">USB</option><option value="Bluetooth">Bluetooth</option><option value="Wireless">Wireless</option><option value="Other">{t.hw.other}</option></select></div>
              </div>
            </>)}

            {hw.deviceType === "SecurityDevice" && (<>
              <div className="mt-6 mb-2 border-t border-gray-200 pt-4"><p className="text-sm font-semibold text-gray-700">{t.hw.securityDevice} {t.common.detail}</p></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.deviceType}</label><select name="connectionType" value={hw.connectionType} onChange={onHwChange} className={ic}><option value="">{t.common.search}</option><option value="Firewall">{t.hw.firewall}</option><option value="IDS">{t.hw.ids}</option><option value="IPS">{t.hw.ips}</option><option value="VPN">{t.hw.vpn}</option><option value="WAF">{t.hw.waf}</option><option value="Antivirus">{t.hw.antivirus}</option><option value="NAC">{t.hw.nac}</option><option value="DLP">{t.hw.dlp}</option><option value="UTM">UTM</option><option value="Other">{t.hw.other}</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.firmwareVersion}</label><input type="text" name="firmwareVersion" value={hw.firmwareVersion} onChange={onHwChange} placeholder="v2.4.1" className={`${ic} font-mono`} /></div>
              </div>
            </>)}

            {hw.deviceType === "Storage" && (<>
              <div className="mt-6 mb-2 border-t border-gray-200 pt-4"><p className="text-sm font-semibold text-gray-700">{t.hw.storage} {t.common.detail}</p></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.deviceType}</label><select name="connectionType" value={hw.connectionType} onChange={onHwChange} className={ic}><option value="">{t.common.search}</option><option value="StorageDevice">{t.hw.storageDevice}</option><option value="SAN">{t.hw.san}</option><option value="NAS">{t.hw.nas}</option><option value="Other">{t.hw.other}</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.storageCap}</label><input type="number" name="storage" value={hw.storage} onChange={onHwChange} min="0" className={ic} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.firmwareVersion}</label><input type="text" name="firmwareVersion" value={hw.firmwareVersion} onChange={onHwChange} placeholder="v2.4.1" className={`${ic} font-mono`} /></div>
              </div>
            </>)}

            {hw.deviceType === "Backup" && (<>
              <div className="mt-6 mb-2 border-t border-gray-200 pt-4"><p className="text-sm font-semibold text-gray-700">{t.hw.backup} {t.common.detail}</p></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.deviceType}</label><select name="connectionType" value={hw.connectionType} onChange={onHwChange} className={ic}><option value="">{t.common.search}</option><option value="PTL">PTL</option><option value="VTL">VTL</option><option value="External">External</option><option value="Other">{t.hw.other}</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.storageCap}</label><input type="number" name="storage" value={hw.storage} onChange={onHwChange} min="0" className={ic} /></div>
              </div>
            </>)}

            {hw.deviceType === "Rack" && (<>
              <div className="mt-6 mb-2 border-t border-gray-200 pt-4"><p className="text-sm font-semibold text-gray-700">{t.hw.rack} {t.common.detail}</p></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.rackSize}</label><select name="connectionType" value={hw.connectionType} onChange={onHwChange} className={ic}><option value="">{t.common.search}</option><option value="Standard">{t.hw.rackStandard}</option><option value="NonStandard">{t.hw.rackNonStandard}</option></select></div>
              </div>
            </>)}

            {hw.deviceType === "Component" && (<>
              <div className="mt-6 mb-2 border-t border-gray-200 pt-4"><p className="text-sm font-semibold text-gray-700">{t.hw.component} {t.common.detail}</p></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.componentType}</label><select name="connectionType" value={hw.connectionType} onChange={onHwChange} className={ic}><option value="">{t.common.search}</option><option value="Disk">Disk</option><option value="CPU">CPU</option><option value="Memory">Memory</option><option value="NIC">NIC</option><option value="HBA">HBA</option><option value="PSU">PSU</option><option value="Other">{t.hw.other}</option></select></div>
              </div>
            </>)}
          </div>

          {/* 보증/구매 관리 */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.hw.warranty}</h2>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.warrantyExpiry}</label><input type="date" name="warrantyEndDate" value={hw.warrantyEndDate} onChange={onHwChange} className={ic} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.warrantyProvider}</label><input type="text" name="warrantyProvider" value={hw.warrantyProvider} onChange={onHwChange} className={ic} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.poNumber}</label><input type="text" name="purchaseOrderNumber" value={hw.purchaseOrderNumber} onChange={onHwChange} className={`${ic} font-mono`} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.invoiceNumber}</label><input type="text" name="invoiceNumber" value={hw.invoiceNumber} onChange={onHwChange} className={`${ic} font-mono`} /></div>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.condition}</label>
                <select name="condition" value={hw.condition} onChange={onHwChange} className={ic}>
                  <option value="">{t.common.none}</option>
                  <option value="A">{t.hw.conditionA}</option>
                  <option value="B">{t.hw.conditionB}</option>
                  <option value="C">{t.hw.conditionC}</option>
                  <option value="D">{t.hw.conditionD}</option>
                </select>
              </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.notes}</label><textarea name="notes" value={hw.notes} onChange={(e) => setHw((p) => ({ ...p, notes: e.target.value }))} rows={2} className={ic} /></div>
          </div>

          {/* 네트워크/인프라 */}
          {["Server", "Network", "SecurityDevice", "Storage"].includes(hw.deviceType) && (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">{t.hw.networkInfra}</h2>
              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.secondaryIp}</label><input type="text" name="secondaryIp" value={hw.secondaryIp} onChange={onHwChange} placeholder="10.0.0.2" className={`${ic} font-mono`} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.subnetMask}</label><input type="text" name="subnetMask" value={hw.subnetMask} onChange={onHwChange} placeholder="255.255.255.0" className={`${ic} font-mono`} /></div>
              </div>
              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.gateway}</label><input type="text" name="gateway" value={hw.gateway} onChange={onHwChange} placeholder="192.168.1.1" className={`${ic} font-mono`} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.vlanId}</label><input type="text" name="vlanId" value={hw.vlanId} onChange={onHwChange} placeholder="100" className={`${ic} font-mono`} /></div>
              </div>
              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.dnsHostname}</label><input type="text" name="dnsName" value={hw.dnsName} onChange={onHwChange} placeholder="server01.internal.corp" className={`${ic} font-mono`} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.firmwareVersion}</label><input type="text" name="firmwareVersion" value={hw.firmwareVersion} onChange={onHwChange} placeholder="v2.4.1" className={`${ic} font-mono`} /></div>
              </div>
              {hw.deviceType === "Network" && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">{t.hw.portCount}</label><input type="number" name="portCount" value={hw.portCount} onChange={onHwChange} min="0" placeholder="24, 48" className={ic} /></div>
                </div>
              )}
            </div>
          )}

          <CiaScoreInput initialValues={cia} onChange={setCia} />

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isLoading ? t.common.loading : t.common.edit}</button>
            <Link href={`/hardware/${assetId}`} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
