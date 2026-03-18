"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      toast.error(t.auth.passwordRequired);
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t.auth.passwordMinLength);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t.auth.passwordMismatch);
      return;
    }

    const hasNumber = /\d/.test(newPassword);
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*]/.test(newPassword);

    if (!hasNumber || !hasUpperCase || !hasSpecialChar) {
      toast.warning(t.auth.passwordStrengthWarning);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t.auth.passwordChangeFail);
        return;
      }

      toast.success(t.auth.passwordChanged);

      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (error) {
      console.error("Failed to change password:", error);
      toast.error(t.auth.passwordChangeFail);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-lg bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t.auth.changePassword}
          </h1>
          <p className="mb-6 whitespace-pre-line text-sm text-gray-600">
            {t.auth.tempPasswordNotice}
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t.auth.newPassword} *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.auth.passwordHint}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t.auth.passwordStrengthWarning}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t.auth.confirmPassword} *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.auth.reenterPassword}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleChangePassword();
                }}
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={isLoading || !newPassword || !confirmPassword}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? t.common.loading : t.auth.changePassword}
            </button>
          </div>

          <div className="mt-6 space-y-3 rounded-lg bg-blue-50 p-4 text-xs text-blue-800">
            <p className="font-medium">{t.auth.securityTips}</p>
            <ul className="list-inside list-disc space-y-1">
              <li>{t.auth.securityTip1}</li>
              <li>{t.auth.securityTip2}</li>
              <li>{t.auth.securityTip3}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
