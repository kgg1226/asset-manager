"use client";

import Link from "next/link";
import DeleteGroupButton from "./delete-button";
import ToggleDefaultButton from "./toggle-default-button";
import { useTranslation } from "@/lib/i18n";
import { TourGuide } from "@/app/_components/tour-guide";
import { GROUPS_TOUR_KEY, getGroupsSteps } from "@/app/_components/tours/groups-tour";

type GroupData = {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  members: { licenseId: number }[];
};

export default function GroupsListClient({
  groups,
  hasUser,
}: {
  groups: GroupData[];
  hasUser: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{t.license.groupSettings}</h1>
            <TourGuide tourKey={GROUPS_TOUR_KEY} steps={getGroupsSteps(t)} />
          </div>
          {hasUser && (
            <Link
              href="/settings/groups/new"
              data-tour="group-new-btn"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + {t.license.createGroup}
            </Link>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">{t.common.noData}</p>
            {hasUser && (
              <Link
                href="/settings/groups/new"
                className="mt-3 inline-block text-sm text-blue-600 hover:underline"
              >
                {t.license.createGroup} &rarr;
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200" data-tour="group-table">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.license.groupName}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.description}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">{t.license.licenseCount}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">{t.license.defaultGroup}</th>
                  {hasUser && <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">{t.common.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{group.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{group.description ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{group.members.length}</td>
                    <td className="px-4 py-3 text-center">
                      {hasUser ? (
                        <ToggleDefaultButton id={group.id} isDefault={group.isDefault} />
                      ) : (
                        <span className="text-xs text-gray-500">{group.isDefault ? t.license.defaultGroup : "\u2014"}</span>
                      )}
                    </td>
                    {hasUser && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/settings/groups/${group.id}`}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            {t.common.edit}
                          </Link>
                          <DeleteGroupButton id={group.id} name={group.name} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
