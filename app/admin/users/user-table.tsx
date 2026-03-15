"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  createUser,
  deleteUser,
  updateUser,
  toggleUserActive,
} from "./actions";

type User = {
  id:        number;
  username:  string;
  role:      "ADMIN" | "USER";
  isActive:  boolean;
  createdAt: Date;
};

type FormState = { error?: string; success?: string };
const empty: FormState = {};

// ── 메인 테이블 ──────────────────────────────────────────────────────────────
export default function UserTable({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: number;
}) {
  const [showAdd, setShowAdd]         = useState(false);
  const [editTarget, setEditTarget]   = useState<User | null>(null);
  const [pwTarget, setPwTarget]       = useState<User | null>(null);
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* action bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{t.common.total} {users.length}</span>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + {t.header.user}
        </button>
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <Th>{t.auth.username}</Th>
              <Th>{t.common.type}</Th>
              <Th>{t.common.status}</Th>
              <Th>{t.common.date}</Th>
              <Th center>{t.common.actions}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-sm text-gray-400"
                >
                  {t.common.noData}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUserId}
                  onEdit={() => setEditTarget(user)}
                  onChangePassword={() => setPwTarget(user)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 모달 */}
      {showAdd    && <AddUserModal    onClose={() => setShowAdd(false)} />}
      {editTarget && <EditUserModal   user={editTarget} currentUserId={currentUserId} onClose={() => setEditTarget(null)} />}
      {pwTarget   && <PasswordModal   user={pwTarget}   onClose={() => setPwTarget(null)} />}
    </div>
  );
}

// ── 행 ───────────────────────────────────────────────────────────────────────
function UserRow({
  user,
  isSelf,
  onEdit,
  onChangePassword,
}: {
  user: User;
  isSelf: boolean;
  onEdit: () => void;
  onChangePassword: () => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { t } = useTranslation();

  async function handleToggle() {
    setToggling(true);
    const res = await toggleUserActive(user.id, user.isActive);
    if (res?.error) alert(res.error);
    setToggling(false);
  }

  async function handleDelete() {
    if (!window.confirm(t.toast.confirmDelete)) return;
    setDeleting(true);
    const res = await deleteUser(user.id);
    if (res?.error) {
      alert(res.error);
      setDeleting(false);
    }
  }

  return (
    <tr className={`hover:bg-gray-50 ${!user.isActive ? "opacity-60" : ""}`}>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {user.username}
        {isSelf && (
          <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
            ME
          </span>
        )}
      </td>

      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            user.role === "ADMIN"
              ? "bg-purple-100 text-purple-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {user.role === "ADMIN" ? t.header.administrator : t.header.user}
        </span>
      </td>

      <td className="px-4 py-3">
        <button
          onClick={handleToggle}
          disabled={isSelf || toggling}
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            user.isActive
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-red-100 text-red-600 hover:bg-red-200"
          }`}
        >
          {toggling ? "..." : user.isActive ? t.dashboard.active : t.employee.inactive}
        </button>
      </td>

      <td className="px-4 py-3 text-sm text-gray-400">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          <IconBtn onClick={onEdit} label={t.common.edit} />
          <IconBtn onClick={onChangePassword} label={t.auth.password} />
          <IconBtn
            onClick={handleDelete}
            label={deleting ? "..." : t.common.delete}
            danger
            disabled={isSelf || deleting}
          />
        </div>
      </td>
    </tr>
  );
}

// ── 사용자 추가 모달 ─────────────────────────────────────────────────────────
function AddUserModal({ onClose }: { onClose: () => void }) {
  const [state, action, isPending] = useActionState(createUser, empty);
  const { t } = useTranslation();

  return (
    <Modal title={`${t.common.add} ${t.header.user}`} onClose={onClose}>
      <form action={action} className="space-y-4">
        <Alert state={state} onSuccess={onClose} />
        <Field label={`${t.auth.username} *`}>
          <input type="text" name="username" required autoFocus className="input" />
        </Field>
        <Field label={`${t.auth.password} * (8+)`}>
          <input type="password" name="password" required minLength={8} className="input" />
        </Field>
        <Field label={t.common.type}>
          <select name="role" className="input">
            <option value="USER">{t.header.user}</option>
            <option value="ADMIN">{t.header.administrator}</option>
          </select>
        </Field>
        <ModalFooter onClose={onClose} isPending={isPending} submitLabel={t.common.create} />
      </form>
    </Modal>
  );
}

// ── 사용자 수정 모달 ─────────────────────────────────────────────────────────
function EditUserModal({
  user,
  currentUserId,
  onClose,
}: {
  user: User;
  currentUserId: number;
  onClose: () => void;
}) {
  const bound = updateUser.bind(null, user.id);
  const [state, action, isPending] = useActionState(bound, empty);
  const isSelf = user.id === currentUserId;

  const { t } = useTranslation();

  return (
    <Modal title={`${t.common.edit} — ${user.username}`} onClose={onClose}>
      <form action={action} className="space-y-4">
        <Alert state={state} onSuccess={onClose} />
        <Field label={t.common.type}>
          <select
            name="role"
            defaultValue={user.role}
            disabled={isSelf}
            className="input disabled:opacity-50"
          >
            <option value="USER">{t.header.user}</option>
            <option value="ADMIN">{t.header.administrator}</option>
          </select>
          {isSelf && <input type="hidden" name="role" value={user.role} />}
        </Field>
        <ModalFooter onClose={onClose} isPending={isPending} submitLabel={t.common.save} />
      </form>
    </Modal>
  );
}

// ── 비밀번호 변경 모달 ───────────────────────────────────────────────────────
// ── 비밀번호 리셋 모달 (임시 비밀번호 자동 발급) ────────────────────────────
function PasswordModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { t } = useTranslation();

  function handleReset() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t.common.error);
        return;
      }
      setTempPassword(data.tempPassword);
    });
  }

  return (
    <Modal title={`${t.auth.changePassword} — ${user.username}`} onClose={onClose}>
      {tempPassword ? (
        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              {t.common.success}
            </p>
            <p className="mt-2 rounded border border-amber-200 bg-white px-3 py-2 font-mono text-base font-bold tracking-wider text-gray-900">
              {tempPassword}
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t.common.confirm} ({t.common.close})
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{user.username}</strong>
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleReset}
              disabled={isPending}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isPending ? t.common.loading : t.common.confirm}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── 공통 UI 헬퍼 ─────────────────────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-5 text-base font-semibold text-gray-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Alert({
  state,
  onSuccess,
}: {
  state: FormState;
  onSuccess?: () => void;
}) {
  if (state.error) {
    return (
      <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    // 성공 메시지를 잠시 보여준 뒤 모달을 닫는다
    if (onSuccess) setTimeout(onSuccess, 600);
    return (
      <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
        {state.success}
      </p>
    );
  }
  return null;
}

function ModalFooter({
  onClose,
  isPending,
  submitLabel,
}: {
  onClose: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
      >
        {t.common.cancel}
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? t.common.loading : submitLabel}
      </button>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  danger,
  disabled,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-blue-600 hover:bg-blue-50"
      }`}
    >
      {label}
    </button>
  );
}

function Th({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 ${
        center ? "text-center" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
