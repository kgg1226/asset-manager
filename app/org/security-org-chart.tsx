"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Plus, Edit2, Trash2, User, ChevronDown, ChevronRight, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";

type Employee = { id: number; name: string; department: string | null; title: string | null };
type SecurityNode = {
  id: number;
  title: string;
  employeeId: number | null;
  parentId: number | null;
  sortOrder: number;
  employee: Employee | null;
};

function buildTree(nodes: SecurityNode[], parentId: number | null): SecurityNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

function SecurityNodeCard({
  node,
  allNodes,
  employees,
  depth,
  isAdmin,
  onRefresh,
}: {
  node: SecurityNode;
  allNodes: SecurityNode[];
  employees: Employee[];
  depth: number;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editEmployeeId, setEditEmployeeId] = useState<number | null>(node.employeeId);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const children = buildTree(allNodes, node.id);

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/org/security-chart/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), employeeId: editEmployeeId }),
      });
      if (!res.ok) { toast.error(t.toast.updateFail); return; }
      toast.success(t.toast.updateSuccess);
      setEditing(false);
      onRefresh();
    } catch { toast.error(t.toast.updateFail); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`"${node.title}" ${t.classification.confirmDeleteNode}`)) return;
    try {
      const res = await fetch(`/api/org/security-chart/${node.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error(t.toast.deleteFail); return; }
      toast.success(t.toast.deleteSuccess);
      onRefresh();
    } catch { toast.error(t.toast.deleteFail); }
  };

  const handleAddChild = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/org/security-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), parentId: node.id }),
      });
      if (!res.ok) { toast.error(t.toast.createFail); return; }
      toast.success(t.toast.createSuccess);
      setShowAddChild(false);
      setNewTitle("");
      onRefresh();
    } catch { toast.error(t.toast.createFail); }
    finally { setSaving(false); }
  };

  const borderColor =
    depth === 0 ? "border-red-400 bg-red-50" :
    depth === 1 ? "border-orange-300 bg-orange-50" :
    "border-gray-200 bg-white";

  const iconColor =
    depth === 0 ? "text-red-600" :
    depth === 1 ? "text-orange-600" :
    "text-gray-500";

  return (
    <li className="flex flex-col items-center">
      <div className={`relative flex min-w-[180px] max-w-[240px] flex-col items-center rounded-lg border-2 px-4 py-3 shadow-sm ${borderColor}`}>
        {editing ? (
          <div className="w-full space-y-2">
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <select
              value={editEmployeeId ?? ""}
              onChange={(e) => setEditEmployeeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            >
              <option value="">{t.org.unassignedPerson}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.department ?? t.classification.noDept})
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <button onClick={handleSave} disabled={saving} className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
                {t.common.save}
              </button>
              <button onClick={() => setEditing(false)} className="flex-1 rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300">
                {t.common.cancel}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`flex items-center gap-1.5 ${children.length > 0 ? "cursor-pointer" : ""}`}
              onClick={() => children.length > 0 && setExpanded(!expanded)}
            >
              <Shield className={`h-4 w-4 ${iconColor}`} />
              <span className={`text-sm font-semibold ${depth === 0 ? "text-red-800" : depth === 1 ? "text-orange-800" : "text-gray-800"}`}>
                {node.title}
              </span>
            </div>
            {node.employee && (
              <div className="mt-1.5 flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-xs ring-1 ring-gray-200">
                <User className="h-3 w-3 text-gray-400" />
                <span className="font-medium text-gray-700">{node.employee.name}</span>
                {node.employee.department && (
                  <span className="text-gray-400">({node.employee.department})</span>
                )}
              </div>
            )}
            {!node.employee && (
              <span className="mt-1 text-xs italic text-gray-400">{t.org.unassignedPerson}</span>
            )}
            {isAdmin && (
              <div className="mt-2 flex gap-1">
                <button onClick={() => { setEditTitle(node.title); setEditEmployeeId(node.employeeId); setEditing(true); }} className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title={t.common.edit}>
                  <Edit2 className="h-3 w-3" />
                </button>
                <button onClick={handleDelete} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" title={t.common.delete}>
                  <Trash2 className="h-3 w-3" />
                </button>
                <button onClick={() => setShowAddChild(true)} className="rounded p-1 text-gray-400 hover:bg-green-50 hover:text-green-600" title={t.org.addPosition}>
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            )}
            {children.length > 0 && (
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-white p-0.5 ring-1 ring-gray-200">
                {expanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add child inline */}
      {showAddChild && (
        <div className="mt-2 flex items-center gap-1 rounded-md bg-green-50 p-2 ring-1 ring-green-200">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t.classification.positionRoleName}
            className="rounded border border-green-300 px-2 py-1 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleAddChild(); if (e.key === "Escape") { setShowAddChild(false); setNewTitle(""); } }}
          />
          <button onClick={handleAddChild} disabled={saving} className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50">
            {t.common.add}
          </button>
          <button onClick={() => { setShowAddChild(false); setNewTitle(""); }} className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300">
            {t.common.cancel}
          </button>
        </div>
      )}

      {/* Children */}
      {expanded && children.length > 0 && (
        <ul className="sec-chart-children mt-6 flex gap-4">
          {children.map((child) => (
            <SecurityNodeCard
              key={child.id}
              node={child}
              allNodes={allNodes}
              employees={employees}
              depth={depth + 1}
              isAdmin={isAdmin}
              onRefresh={onRefresh}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function SecurityOrgChart() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [nodes, setNodes] = useState<SecurityNode[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRoot, setShowCreateRoot] = useState(false);
  const [newRootTitle, setNewRootTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [nodesRes, empRes] = await Promise.all([
        fetch("/api/org/security-chart"),
        fetch("/api/employees?limit=500&status=ACTIVE"),
      ]);
      if (nodesRes.ok) setNodes(await nodesRes.json());
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.data ?? empData.employees ?? empData);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateRoot = async () => {
    if (!newRootTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/org/security-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newRootTitle.trim() }),
      });
      if (!res.ok) { toast.error(t.toast.createFail); return; }
      toast.success(t.toast.createSuccess);
      setShowCreateRoot(false);
      setNewRootTitle("");
      fetchData();
    } catch { toast.error(t.toast.createFail); }
    finally { setCreating(false); }
  };

  const roots = buildTree(nodes, null);

  if (loading) return <p className="py-10 text-center text-gray-500">{t.common.loading}</p>;

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-bold text-gray-900">{t.org.securityOrgChart}</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateRoot(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            <UserPlus className="h-4 w-4" />
            {t.org.topPosition}
          </button>
        )}
      </div>

      {/* Create root modal inline */}
      {showCreateRoot && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 ring-1 ring-red-200">
          <input
            autoFocus
            value={newRootTitle}
            onChange={(e) => setNewRootTitle(e.target.value)}
            placeholder="e.g. CISO, Security Manager"
            className="flex-1 rounded border border-red-300 px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateRoot();
              if (e.key === "Escape") { setShowCreateRoot(false); setNewRootTitle(""); }
            }}
          />
          <button onClick={handleCreateRoot} disabled={creating} className="rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
            {creating ? t.common.loading : t.common.create}
          </button>
          <button onClick={() => { setShowCreateRoot(false); setNewRootTitle(""); }} className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300">
            {t.common.cancel}
          </button>
        </div>
      )}

      {roots.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
          <Shield className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">{t.common.noData}</p>
          {isAdmin && (
            <p className="mt-1 text-xs text-gray-400">{`"${t.org.topPosition}"`}</p>
          )}
        </div>
      ) : (
        <div className="sec-chart overflow-x-auto">
          <ul className="flex flex-col items-center">
            {roots.map((root) => (
              <SecurityNodeCard
                key={root.id}
                node={root}
                allNodes={nodes}
                employees={employees}
                depth={0}
                isAdmin={isAdmin}
                onRefresh={fetchData}
              />
            ))}
          </ul>
        </div>
      )}

      {/* CSS for connecting lines */}
      <style jsx>{`
        .sec-chart ul {
          position: relative;
          padding: 0;
          margin: 0;
          list-style: none;
        }
        .sec-chart-children {
          position: relative;
        }
        .sec-chart-children::before {
          content: "";
          position: absolute;
          top: -24px;
          left: 50%;
          width: 0;
          height: 24px;
          border-left: 2px solid #fca5a5;
        }
        .sec-chart-children > li {
          position: relative;
        }
        .sec-chart-children > li::before {
          content: "";
          position: absolute;
          top: -24px;
          left: 50%;
          width: 0;
          height: 24px;
          border-left: 2px solid #fca5a5;
        }
        .sec-chart-children > li:not(:first-child):not(:last-child)::after {
          content: "";
          position: absolute;
          top: -24px;
          left: 0;
          right: 0;
          height: 0;
          border-top: 2px solid #fca5a5;
        }
        .sec-chart-children > li:first-child:not(:only-child)::after {
          content: "";
          position: absolute;
          top: -24px;
          left: 50%;
          right: 0;
          height: 0;
          border-top: 2px solid #fca5a5;
        }
        .sec-chart-children > li:last-child:not(:only-child)::after {
          content: "";
          position: absolute;
          top: -24px;
          left: 0;
          right: 50%;
          height: 0;
          border-top: 2px solid #fca5a5;
        }
      `}</style>
    </div>
  );
}
