"use client";

import dynamic from "next/dynamic";

const AssetMapCanvas = dynamic(
  () => import("./_components/asset-map-canvas"),
  { ssr: false }
);

export default function AssetMapPage() {
  return (
    <div className="space-y-4">
      <AssetMapCanvas />
    </div>
  );
}
