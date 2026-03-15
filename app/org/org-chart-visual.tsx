"use client";

import { useState, useEffect } from "react";
import { Building2, Users, User, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Member = { id: number; name: string; title: string | null };
type OrgUnit = {
  id: number;
  name: string;
  parentId: number | null;
  members?: Member[];
  _count?: { members: number };
};
type Company = { id: number; name: string; orgs: OrgUnit[] };

function buildTree(orgs: OrgUnit[], parentId: number | null): OrgUnit[] {
  return orgs
    .filter((o) => o.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

function OrgNodeCard({
  unit,
  allOrgs,
  depth,
}: {
  unit: OrgUnit;
  allOrgs: OrgUnit[];
  depth: number;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(depth < 2);
  const [showMembers, setShowMembers] = useState(false);
  const children = buildTree(allOrgs, unit.id);
  const members = unit.members ?? [];
  const memberCount = unit._count?.members ?? members.length;
  const hasContent = children.length > 0 || memberCount > 0;

  return (
    <li className="flex flex-col items-center">
      {/* Node box */}
      <div
        className={`relative flex min-w-[140px] max-w-[240px] flex-col items-center rounded-lg border-2 px-4 py-3 shadow-sm transition-all ${
          depth === 0
            ? "border-blue-400 bg-blue-50"
            : depth === 1
              ? "border-sky-300 bg-sky-50"
              : "border-gray-200 bg-white"
        }`}
      >
        <div
          className={`flex items-center gap-1.5 ${hasContent ? "cursor-pointer" : ""}`}
          onClick={() => hasContent && setExpanded(!expanded)}
        >
          <Users className={`h-4 w-4 ${depth === 0 ? "text-blue-600" : "text-gray-500"}`} />
          <span className={`text-sm font-semibold ${depth === 0 ? "text-blue-800" : "text-gray-800"}`}>
            {unit.name}
          </span>
        </div>
        {memberCount > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMembers(!showMembers); }}
            className="mt-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <User className="h-3 w-3" />
            {memberCount}{t.org.members}
            {showMembers ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
          </button>
        )}

        {/* Member list dropdown */}
        {showMembers && members.length > 0 && (
          <div className="mt-2 w-full space-y-1 border-t border-gray-200 pt-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-white/60">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
                  {m.name.charAt(0)}
                </div>
                <span className="font-medium text-gray-700">{m.name}</span>
                {m.title && (
                  <span className="text-gray-400">{m.title}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {hasContent && (
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-white p-0.5 ring-1 ring-gray-200">
            {expanded ? (
              <ChevronDown className="h-3 w-3 text-gray-400" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && children.length > 0 && (
        <ul className="org-chart-children mt-6 flex gap-4">
          {children.map((child) => (
            <OrgNodeCard key={child.id} unit={child} allOrgs={allOrgs} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function CompanyChart({ company }: { company: Company }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const topOrgs = buildTree(company.orgs, null);

  return (
    <div className="org-chart mb-8 overflow-x-auto">
      <ul className="flex flex-col items-center">
        <li className="flex flex-col items-center">
          {/* Company root node */}
          <div
            onClick={() => setExpanded(!expanded)}
            className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-indigo-400 bg-indigo-50 px-6 py-4 shadow-md transition-all hover:shadow-lg"
          >
            <Building2 className="h-5 w-5 text-indigo-600" />
            <span className="text-base font-bold text-indigo-800">{company.name}</span>
            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">
              {company.orgs.length}{t.org.orgs}
            </span>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-indigo-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-indigo-400" />
            )}
          </div>

          {expanded && topOrgs.length > 0 && (
            <ul className="org-chart-children mt-6 flex gap-4">
              {topOrgs.map((org) => (
                <OrgNodeCard key={org.id} unit={org} allOrgs={company.orgs} depth={0} />
              ))}
            </ul>
          )}
        </li>
      </ul>
    </div>
  );
}

export default function OrgChartVisual() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/org/companies")
      .then((r) => r.json())
      .then((data) => setCompanies(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-10 text-center text-gray-500">{t.common.loading}</p>;
  if (companies.length === 0)
    return <p className="py-10 text-center text-gray-500">{t.common.noData}</p>;

  return (
    <div className="py-6">
      {companies.map((c) => (
        <CompanyChart key={c.id} company={c} />
      ))}

      {/* CSS for connecting lines */}
      <style jsx>{`
        .org-chart ul {
          position: relative;
          padding: 0;
          margin: 0;
          list-style: none;
        }
        .org-chart-children {
          position: relative;
        }
        .org-chart-children::before {
          content: "";
          position: absolute;
          top: -24px;
          left: 50%;
          width: 0;
          height: 24px;
          border-left: 2px solid #d1d5db;
        }
        .org-chart-children > li {
          position: relative;
        }
        .org-chart-children > li::before {
          content: "";
          position: absolute;
          top: -24px;
          left: 50%;
          width: 0;
          height: 24px;
          border-left: 2px solid #d1d5db;
        }
        /* Horizontal connector line between siblings */
        .org-chart-children > li:not(:first-child):not(:last-child)::after {
          content: "";
          position: absolute;
          top: -24px;
          left: 0;
          right: 0;
          height: 0;
          border-top: 2px solid #d1d5db;
        }
        .org-chart-children > li:first-child:not(:only-child)::after {
          content: "";
          position: absolute;
          top: -24px;
          left: 50%;
          right: 0;
          height: 0;
          border-top: 2px solid #d1d5db;
        }
        .org-chart-children > li:last-child:not(:only-child)::after {
          content: "";
          position: absolute;
          top: -24px;
          left: 0;
          right: 50%;
          height: 0;
          border-top: 2px solid #d1d5db;
        }
      `}</style>
    </div>
  );
}
