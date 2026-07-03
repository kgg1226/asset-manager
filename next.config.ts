import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // 배포 버전 표기 (dev-060) — 빌드 시점에 고정 주입. 헤더 우측 배지가 소비.
  // 버전 체계: 1.<최신 dev 티켓번호>.<핫픽스> — tasks/versioning.md 참조.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
};

export default nextConfig;
