"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import UserTable from "./user-table";
import { TourGuide } from "@/app/_components/tour-guide";
import { ADMIN_USERS_TOUR_KEY, getAdminUsersSteps } from "@/app/_components/tours/admin-users-tour";

type UserData = {
  id: number;
  username: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  createdAt: Date;
};

export default function UsersPageClient({
  users,
  currentUserId,
  q,
  role,
}: {
  users: UserData[];
  currentUserId: number;
  q?: string;
  role?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        {/* header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.header.userManagement}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t.admin.adminOnly}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TourGuide tourKey={ADMIN_USERS_TOUR_KEY} steps={getAdminUsersSteps(t)} />
            <Link
              href="/licenses"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              &larr; {t.common.list}
            </Link>
          </div>
        </div>

        {/* search / filter */}
        <form
          method="get"
          action="/admin/users"
          className="mb-4 flex flex-wrap gap-2"
          data-tour="admin-users-search"
        >
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t.header.searchPlaceholder}
            className="input flex-1 min-w-48"
          />
          <select
            name="role"
            defaultValue={role ?? ""}
            className="input w-32"
          >
            <option value="">{t.common.all}</option>
            <option value="ADMIN">{t.header.administrator}</option>
            <option value="USER">{t.header.user}</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
          >
            {t.common.search}
          </button>
          {(q || role) && (
            <Link
              href="/admin/users"
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              {t.common.reset}
            </Link>
          )}
        </form>

        <div data-tour="admin-users-table">
          <UserTable
            users={users as Parameters<typeof UserTable>[0]["users"]}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </div>
  );
}
