"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  HardDrive,
  Cloud,
  FileText,
  Globe,
  FileSignature,
  Bell,
  Settings,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  Upload,
  Users,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { TourGuide } from "@/app/_components/tour-guide";
import { GUIDE_TOUR_KEY, getGuideSteps } from "@/app/_components/tours/guide-tour";

interface Step {
  id: string;
  title: string;
  description: string;
  details: string[];
  link?: { href: string; label: string };
}

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  steps: Step[];
}

export default function GuidePage() {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ start: true });
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const GUIDE_SECTIONS: GuideSection[] = useMemo(() => [
    {
      id: "start",
      icon: <Settings className="h-5 w-5" />,
      title: t.guide.gettingStarted,
      subtitle: t.guide.systemSetup,
      steps: [
        {
          id: "s1",
          title: t.guide.orgSetup,
          description: t.guide.orgSetupDesc,
          details: [
            t.guide.orgSetupDetail1,
            t.guide.orgSetupDetail2,
            t.guide.orgSetupDetail3,
          ],
          link: { href: "/org", label: t.guide.orgChartSetup },
        },
        {
          id: "s2",
          title: t.guide.employeeRegister,
          description: t.guide.employeeRegisterDesc,
          details: [
            t.guide.empRegisterDetail1,
            t.guide.empRegisterDetail2,
            t.guide.empRegisterDetail3,
          ],
          link: { href: "/employees", label: t.guide.employeeMgmt },
        },
        {
          id: "s3",
          title: t.guide.envSetup,
          description: t.guide.envSetupDesc,
          details: [
            "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM",
            "SLACK_WEBHOOK_URL — Slack Incoming Webhook URL",
            `${t.notification.configTitle} — ${t.notification.configDescription}`,
          ],
          link: { href: "/settings/notifications", label: t.guide.notifyTest },
        },
      ],
    },
    {
      id: "hardware",
      icon: <HardDrive className="h-5 w-5" />,
      title: t.hw.title,
      subtitle: t.guide.hwAssetsDesc,
      steps: [
        {
          id: "h1",
          title: t.guide.hwRegister,
          description: t.guide.hwRegisterDesc,
          details: [
            "Laptop / Desktop / Server / Network / Mobile / Other",
            `${t.asset.assetName}, ${t.hw.manufacturer}, ${t.hw.model}, ${t.hw.serialNumber}`,
            `Server/Network: ${t.hw.ipAddress}, ${t.hw.subnetMask}, ${t.hw.vlanId}`,
            `${t.hw.condition} (A~D)`,
          ],
          link: { href: "/hardware/new", label: t.hw.newHardware },
        },
        {
          id: "h2",
          title: t.guide.warrantyMgmt,
          description: t.guide.warrantyMgmtDesc,
          details: [
            `${t.hw.warrantyExpiry}, ${t.hw.warrantyProvider}`,
            `${t.hw.poNumber}, ${t.hw.invoiceNumber}`,
          ],
        },
        {
          id: "h3",
          title: t.guide.assetAssign,
          description: t.guide.assetAssignDesc,
          details: [
            t.hw.assignAsset,
            t.hw.unassignAsset,
            t.history.title,
            `CIA ${t.cia.confidentiality}/${t.cia.integrity}/${t.cia.availability} — ${t.admin.autoApplied}`,
          ],
        },
      ],
    },
    {
      id: "cloud",
      icon: <Cloud className="h-5 w-5" />,
      title: t.cloud.title,
      subtitle: t.guide.cloudAssetsDesc,
      steps: [
        {
          id: "c1",
          title: t.guide.cloudRegister,
          description: t.guide.cloudRegisterDesc,
          details: [
            `${t.cloud.platform}: AWS / GCP / Azure / Slack / GitHub`,
            `${t.cloud.serviceCategory}: IaaS / PaaS / SaaS / Security`,
            `${t.cloud.resourceType} & ${t.cloud.resourceId}`,
          ],
          link: { href: "/cloud/new", label: t.cloud.newCloud },
        },
        {
          id: "c2",
          title: t.guide.contractMgmt,
          description: t.guide.contractMgmtDesc,
          details: [
            `${t.cloud.contractStartDate} + ${t.cloud.contractTermMonths}`,
            t.cloud.renewalDate,
            t.cloud.cancellationDeadline,
            `${t.cloud.paymentMethod}, ${t.cloud.contractSubscriptionNumber}`,
          ],
        },
        {
          id: "c3",
          title: t.guide.notifySetup,
          description: t.guide.notifySetupDesc,
          details: [
            `${t.cloud.notifyChannel}: ${t.cloud.emailOnly} / ${t.cloud.slackOnly} / ${t.cloud.emailAndSlack} / ${t.cloud.notifyOff}`,
            `${t.cloud.adminEmail} & ${t.cloud.slackMemberId}`,
            "D-70, D-30, D-15, D-7",
          ],
          link: { href: "/settings/notifications", label: t.guide.notifyTest },
        },
      ],
    },
    {
      id: "license",
      icon: <FileText className="h-5 w-5" />,
      title: t.license.title,
      subtitle: t.guide.swLicensesDesc,
      steps: [
        {
          id: "l1",
          title: t.guide.licenseRegister,
          description: t.guide.licenseRegisterDesc,
          details: [
            `${t.license.licenseType}: ${t.license.keyBased} / ${t.license.volume} / ${t.license.noKey}`,
            `${t.license.quantity}, ${t.license.unitPrice}, ${t.license.paymentCycle} (${t.license.monthly}/${t.license.yearly})`,
            `${t.license.expiryDate} → D-day`,
          ],
          link: { href: "/licenses/new", label: t.license.newLicense },
        },
        {
          id: "l2",
          title: t.guide.seatAssignGuide,
          description: t.guide.seatAssignGuideDesc,
          details: [
            t.license.seatAssignment,
            t.license.key,
            `${t.license.usageRate} = ${t.license.seat} / ${t.license.quantity}`,
          ],
        },
        {
          id: "l3",
          title: t.guide.groupSetup,
          description: t.guide.groupSetupDesc,
          details: [
            `${t.license.groupSettings} (e.g. 'Office 365')`,
            t.license.group,
            t.license.defaultGroup,
            t.license.licenseCount,
          ],
          link: { href: "/settings/groups", label: t.license.groupSettings },
        },
      ],
    },
    {
      id: "domain",
      icon: <Globe className="h-5 w-5" />,
      title: t.domain.title,
      subtitle: t.guide.domainSslDesc,
      steps: [
        {
          id: "d1",
          title: t.guide.domainRegister,
          description: t.guide.domainRegisterDesc,
          details: [
            `${t.asset.expiryDate} → D-day`,
            t.domain.registrar,
          ],
          link: { href: "/domains/new", label: t.guide.domainRegisterLink },
        },
      ],
    },
    {
      id: "contract",
      icon: <FileSignature className="h-5 w-5" />,
      title: t.contract.title,
      subtitle: t.guide.contractsDesc,
      steps: [
        {
          id: "ct1",
          title: t.guide.contractRegister,
          description: t.guide.contractRegisterDesc,
          details: [
            `${t.contract.contractType}: ${t.contract.typeMaintenance} / ${t.contract.sla} / ${t.contract.outsourcing} / ${t.contract.typeOther}`,
            `${t.contract.counterparty}, ${t.contract.autoRenewal}`,
            `${t.asset.expiryDate} → D-day`,
          ],
          link: { href: "/contracts/new", label: t.guide.contractRegisterLink },
        },
      ],
    },
    {
      id: "notification",
      icon: <Bell className="h-5 w-5" />,
      title: t.notification.title,
      subtitle: t.guide.notifySystemDesc,
      steps: [
        {
          id: "n1",
          title: t.guide.envSetupNotify,
          description: t.guide.envSetupNotifyDesc,
          details: [
            "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM",
            "SLACK_WEBHOOK_URL (Incoming Webhook)",
            `${t.notification.configTitle} — ${t.notification.sourceDb} > ${t.notification.sourceEnv}`,
          ],
          link: { href: "/settings/notifications", label: t.guide.notifyTestPage },
        },
        {
          id: "n2",
          title: t.guide.testNotify,
          description: t.guide.testNotifyDesc,
          details: [
            t.notification.testSend,
            `${t.notification.emailChannel} / ${t.notification.slackChannel}`,
          ],
          link: { href: "/settings/notifications", label: t.guide.notifyTestPage },
        },
        {
          id: "n3",
          title: t.guide.historyCheck,
          description: t.guide.historyCheckDesc,
          details: [
            t.notification.sendHistory,
            `${t.common.success} / ${t.common.failure}`,
          ],
          link: { href: "/settings/notifications", label: t.guide.sendHistoryView },
        },
      ],
    },
    {
      id: "dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      title: t.nav.dashboard,
      subtitle: t.guide.dashboardDesc,
      steps: [
        {
          id: "db1",
          title: t.guide.dashboardOverview,
          description: t.guide.dashboardOverviewDesc,
          details: [
            t.guide.dashboardOverviewDetail1,
            t.guide.dashboardOverviewDetail2,
            t.guide.dashboardOverviewDetail3,
          ],
          link: { href: "/dashboard", label: t.guide.dashboardLink },
        },
        {
          id: "db2",
          title: t.guide.dashboardCharts,
          description: t.guide.dashboardChartsDesc,
          details: [
            t.guide.dashboardChartsDetail1,
            t.guide.dashboardChartsDetail2,
            t.guide.dashboardChartsDetail3,
          ],
        },
      ],
    },
    {
      id: "reports",
      icon: <BarChart3 className="h-5 w-5" />,
      title: t.report.title,
      subtitle: t.guide.reportsDesc,
      steps: [
        {
          id: "r1",
          title: t.guide.reportGenerate,
          description: t.guide.reportGenerateDesc,
          details: [
            t.guide.reportGenerateDetail1,
            t.guide.reportGenerateDetail2,
            t.guide.reportGenerateDetail3,
          ],
          link: { href: "/reports", label: t.guide.reportLink },
        },
        {
          id: "r2",
          title: t.guide.reportExport,
          description: t.guide.reportExportDesc,
          details: [
            t.guide.reportExportDetail1,
            t.guide.reportExportDetail2,
            t.guide.reportExportDetail3,
          ],
        },
      ],
    },
    {
      id: "history",
      icon: <ClipboardList className="h-5 w-5" />,
      title: t.history.title,
      subtitle: t.guide.historyDesc,
      steps: [
        {
          id: "hi1",
          title: t.guide.historySearch,
          description: t.guide.historySearchDesc,
          details: [
            t.guide.historySearchDetail1,
            t.guide.historySearchDetail2,
            t.guide.historySearchDetail3,
            t.guide.historySearchDetail4,
          ],
          link: { href: "/history", label: t.guide.historyLink },
        },
      ],
    },
    {
      id: "settings",
      icon: <Upload className="h-5 w-5" />,
      title: t.guide.settingsTitle,
      subtitle: t.guide.settingsDesc,
      steps: [
        {
          id: "st1",
          title: t.guide.profileSetup,
          description: t.guide.profileSetupDesc,
          details: [
            t.guide.profileSetupDetail1,
            t.guide.profileSetupDetail2,
            t.guide.profileSetupDetail3,
          ],
          link: { href: "/settings/profile", label: t.guide.profileLink },
        },
        {
          id: "st2",
          title: t.guide.csvImport,
          description: t.guide.csvImportDesc,
          details: [
            t.guide.csvImportDetail1,
            t.guide.csvImportDetail2,
            t.guide.csvImportDetail3,
            t.guide.csvImportDetail4,
          ],
          link: { href: "/settings/import", label: t.guide.importLink },
        },
      ],
    },
    {
      id: "admin",
      icon: <ShieldCheck className="h-5 w-5" />,
      title: t.guide.adminFeaturesTitle,
      subtitle: t.guide.adminFeaturesDesc,
      steps: [
        {
          id: "a1",
          title: t.guide.titleCiaMappingGuide,
          description: t.guide.titleCiaMappingGuideDesc,
          details: [
            t.guide.titleCiaMappingDetail1,
            t.guide.titleCiaMappingDetail2,
            t.guide.titleCiaMappingDetail3,
          ],
          link: { href: "/admin/title-cia", label: t.guide.titleCiaLink },
        },
        {
          id: "a2",
          title: t.guide.gdriveConfigGuide,
          description: t.guide.gdriveConfigGuideDesc,
          details: [
            t.guide.gdriveConfigDetail1,
            t.guide.gdriveConfigDetail2,
            t.guide.gdriveConfigDetail3,
          ],
          link: { href: "/admin/archives", label: t.guide.archiveLink },
        },
        {
          id: "a3",
          title: t.guide.archiveExportGuide,
          description: t.guide.archiveExportGuideDesc,
          details: [
            t.guide.archiveExportDetail1,
            t.guide.archiveExportDetail2,
          ],
          link: { href: "/admin/archives", label: t.guide.archiveLink },
        },
        {
          id: "a4",
          title: t.guide.userMgmtGuide,
          description: t.guide.userMgmtGuideDesc,
          details: [
            t.guide.userMgmtDetail1,
            t.guide.userMgmtDetail2,
            t.guide.userMgmtDetail3,
          ],
          link: { href: "/admin/users", label: t.guide.userMgmtLink },
        },
        {
          id: "a5",
          title: t.guide.exchangeRateGuide,
          description: t.guide.exchangeRateGuideDesc,
          details: [
            t.guide.exchangeRateDetail1,
            t.guide.exchangeRateDetail2,
          ],
          link: { href: "/admin/exchange-rates", label: t.guide.exchangeRateLink },
        },
        {
          id: "a6",
          title: t.nav?.featureFlags ?? "기능 설정",
          description: "시스템 전체 동작을 좌우하는 설정을 한 곳에서 관리합니다.",
          details: [
            "기능 공개: 수명 게이지 표시 여부 (일반 사용자 대상 ON/OFF)",
            "보안: 세션 유효기간, 로그인 잠금 횟수/지속시간, 비밀번호 최소 길이",
            "알림: 만료 알림 D-day (D-70/30/15/7), 수명 임계치 알림 (50%/80%/95%)",
            "자산: 폐기 자동 전환 기준일 (기본 365일)",
            "재무: 부가세율 (기본 10%)",
            "표시: 목록 페이지당 항목 수 (기본 50개)",
            "변경 사항은 저장 즉시 적용됩니다",
          ],
          link: { href: "/admin/feature-flags", label: t.nav?.featureFlags ?? "기능 설정" },
        },
      ],
    },
  ], [t]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalSteps = GUIDE_SECTIONS.reduce((sum, s) => sum + s.steps.length, 0);
  const doneSteps = Object.values(completedSteps).filter(Boolean).length;
  const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-7 w-7 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{t.guide.title}</h1>
            <TourGuide tourKey={GUIDE_TOUR_KEY} steps={getGuideSteps(t)} />
          </div>
          <p className="text-gray-600">{t.guide.subtitle}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 rounded-lg bg-white p-5 shadow-sm" data-tour="guide-progress">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{t.guide.progress}</span>
            <span className="text-sm font-bold text-blue-600">{doneSteps}/{totalSteps} {t.guide.completed} ({progress}%)</span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4" data-tour="guide-sections">
          {GUIDE_SECTIONS.map((section) => {
            const isExpanded = expandedSections[section.id];
            const sectionDone = section.steps.filter((s) => completedSteps[s.id]).length;
            const allDone = sectionDone === section.steps.length;

            return (
              <div key={section.id} className="rounded-lg bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${allDone ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                    {section.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-gray-900">{section.title}</h2>
                    <p className="text-xs text-gray-500">{section.subtitle}</p>
                  </div>
                  <span className="text-xs text-gray-400 mr-2">{sectionDone}/{section.steps.length}</span>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-4">
                    {section.steps.map((step) => {
                      const isDone = completedSteps[step.id];
                      return (
                        <div key={step.id} className="mt-4">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleStep(step.id)}
                              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isDone ? "border-green-500 bg-green-500 text-white" : "border-gray-300 hover:border-blue-400"}`}
                            >
                              {isDone && <CheckCircle2 className="h-4 w-4" />}
                            </button>
                            <div className="flex-1">
                              <h3 className={`text-sm font-semibold ${isDone ? "text-gray-400 line-through" : "text-gray-900"}`}>{step.title}</h3>
                              <p className="mt-0.5 text-sm text-gray-600">{step.description}</p>
                              <ul className="mt-2 space-y-1">
                                {step.details.map((d, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                                    <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
                                    {d}
                                  </li>
                                ))}
                              </ul>
                              {step.link && (
                                <Link
                                  href={step.link.href}
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                                >
                                  {step.link.label}
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="mt-8 rounded-lg bg-blue-50 p-5" data-tour="guide-quick-links">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">{t.guide.quickLinks}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {[
              { href: "/dashboard", label: t.guide.dashboardLink },
              { href: "/hardware/new", label: t.hw.newHardware },
              { href: "/cloud/new", label: t.cloud.newCloud },
              { href: "/licenses/new", label: t.license.newLicense },
              { href: "/domains/new", label: t.guide.domainRegisterLink },
              { href: "/contracts/new", label: t.guide.contractRegisterLink },
              { href: "/employees", label: t.employee.title },
              { href: "/reports", label: t.guide.reportLink },
              { href: "/history", label: t.history.title },
              { href: "/settings/groups", label: t.license.groupSettings },
              { href: "/settings/import", label: t.guide.importLink },
              { href: "/settings/notifications", label: t.notification.title },
              { href: "/settings/profile", label: t.guide.profileLink },
              { href: "/admin/users", label: t.guide.userMgmtLink },
              { href: "/admin/title-cia", label: t.guide.titleCiaLink },
              { href: "/admin/archives", label: t.guide.archiveLink },
              { href: "/admin/exchange-rates", label: t.guide.exchangeRateLink },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md bg-white px-3 py-2 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-100 transition-colors text-center">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
