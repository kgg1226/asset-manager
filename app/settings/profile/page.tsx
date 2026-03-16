"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { User, Lock, Save } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { TourGuide } from "@/app/_components/tour-guide";
import { PROFILE_TOUR_KEY, getProfileSteps } from "@/app/_components/tours/profile-tour";

interface UserProfile {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Username edit
  const [username, setUsername] = useState("");
  const [usernameEditing, setUsernameEditing] = useState(false);
  const [usernameSaving, setUsernameSaving] = useState(false);

  // Password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          setProfile(data);
          setUsername(data.username);
        })
        .catch(() => toast.error("프로필 정보를 불러올 수 없습니다."))
        .finally(() => setProfileLoading(false));
    }
  }, [user]);

  const handleUsernameSave = async () => {
    if (!username.trim() || username.length < 2) {
      toast.error("사용자명은 2자 이상이어야 합니다.");
      return;
    }
    setUsernameSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data);
      setUsernameEditing(false);
      toast.success("사용자명이 변경되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "변경 실패");
    } finally {
      setUsernameSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword) {
      toast.error("현재 비밀번호를 입력하세요.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("비밀번호가 변경되었습니다.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "변경 실패");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading || profileLoading || !user) {
    return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-2xl"><p className="text-center text-gray-500">{t.common.loading}</p></div></div>;
  }

  const isAdmin = user.role === "ADMIN";
  const ic = "w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4 space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">{t.nav.profile}</h2>
          <TourGuide tourKey={PROFILE_TOUR_KEY} steps={getProfileSteps(t)} />
        </div>

        {/* 기본 정보 */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200" data-tour="profile-info">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">{t.nav.profile}</h2>
          </div>

          <div className="space-y-4">
            {/* 사용자명 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.auth.username}
              </label>
              {usernameEditing && isAdmin ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={ic}
                    autoFocus
                  />
                  <button
                    onClick={handleUsernameSave}
                    disabled={usernameSaving}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setUsernameEditing(false);
                      setUsername(profile?.username ?? "");
                    }}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-gray-900">{profile?.username}</span>
                  {isAdmin && (
                    <button
                      onClick={() => setUsernameEditing(true)}
                      className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                    >
                      {t.common.edit}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 역할 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.common.type}</label>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  profile?.role === "ADMIN"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {profile?.role === "ADMIN" ? t.header.administrator : t.header.user}
              </span>
            </div>

            {/* 계정 생성일 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                계정 생성일
              </label>
              <span className="text-gray-600">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* 비밀번호 변경 */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200" data-tour="profile-password">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">{t.auth.changePassword}</h2>
            </div>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                {t.auth.changePassword}
              </button>
            )}
          </div>

          {showPasswordForm ? (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.auth.currentPassword}
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                  }
                  className={ic}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.auth.newPassword}
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                  }
                  className={ic}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">8자 이상</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.auth.confirmPassword}
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  className={ic}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {passwordSaving ? t.common.loading : t.auth.changePassword}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-500">
              비밀번호를 변경하려면 위 버튼을 클릭하세요.
            </p>
          )}
        </div>

        {/* 권한 안내 */}
        {!isAdmin && (
          <div className="rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="text-sm text-amber-800">
              일반 사용자는 비밀번호만 변경할 수 있습니다. 다른 정보 변경이 필요하면
              관리자에게 문의하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
