/**
 * Google Drive 업로드 라이브러리 (Phase 4)
 *
 * DB SystemConfig에 저장된 값 우선 사용, 없으면 환경변수 폴백:
 *   GOOGLE_CLIENT_EMAIL  — Service Account 이메일
 *   GOOGLE_PRIVATE_KEY   — Service Account 개인 키 (PEM 형식)
 *   GOOGLE_DRIVE_ROOT    — 루트 폴더 ID (선택)
 *
 * 설정이 없으면 Google Drive 업로드를 건너뜁니다.
 */

import { getGDriveConfig } from "@/lib/system-config";

/** 캐시된 설정 (요청당 1회만 조회) */
let _cachedConfig: Awaited<ReturnType<typeof getGDriveConfig>> | null = null;

async function resolveConfig() {
  if (!_cachedConfig) {
    _cachedConfig = await getGDriveConfig();
  }
  return _cachedConfig;
}

/** 설정 캐시 초기화 (테스트용 등) */
export function resetConfigCache() {
  _cachedConfig = null;
}

export function isGoogleDriveConfigured(): boolean {
  // 동기 검사: env만 확인 (UI 표시용)
  return !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

/** 비동기 검사: DB + env */
export async function isGoogleDriveConfiguredAsync(): Promise<boolean> {
  const cfg = await resolveConfig();
  return !!(cfg.GOOGLE_CLIENT_EMAIL && cfg.GOOGLE_PRIVATE_KEY);
}

/** JWT 서명 (RSA-SHA256) — Node.js crypto 사용 */
async function signJWT(payload: object, privateKey: string): Promise<string> {
  const { createSign } = await import("crypto");
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${header}.${body}`;
  const sign = createSign("SHA256");
  sign.update(data);
  sign.end();
  const signature = sign.sign(privateKey.replace(/\\n/g, "\n"), "base64url");
  return `${data}.${signature}`;
}

/** Service Account Access Token 발급 */
async function getAccessToken(): Promise<string> {
  const cfg = await resolveConfig();
  const clientEmail = cfg.GOOGLE_CLIENT_EMAIL!;
  const privateKey = cfg.GOOGLE_PRIVATE_KEY!;
  const now = Math.floor(Date.now() / 1000);

  const jwt = await signJWT(
    {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    },
    privateKey
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Google OAuth 실패: ${data.error_description ?? data.error}`);
  return data.access_token as string;
}

/** 구글드라이브에서 폴더를 찾거나 생성 */
async function getOrCreateFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  // 폴더 검색
  const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ""}`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files?.length > 0) return searchData.files[0].id;

  // 폴더 생성
  const createBody: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) createBody.parents = [parentId];

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(createBody),
  });
  const createData = await createRes.json();
  return createData.id;
}

/**
 * 파일을 구글드라이브에 업로드
 * 폴더 구조: GOOGLE_DRIVE_ROOT / YYYY / YYYY-MM / filename
 */
export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  yearMonth: string // YYYY-MM
): Promise<string> {
  const configured = await isGoogleDriveConfiguredAsync();
  if (!configured) {
    throw new Error("Google Drive 설정이 되어있지 않습니다.");
  }

  resetConfigCache(); // 최신 설정 사용
  const accessToken = await getAccessToken();
  const [year] = yearMonth.split("-");
  const cfg = await resolveConfig();
  const rootFolderId = cfg.GOOGLE_DRIVE_ROOT;

  // 폴더 생성: root / YYYY / YYYY-MM
  const yearFolderId = await getOrCreateFolder(accessToken, year, rootFolderId);
  const monthFolderId = await getOrCreateFolder(accessToken, yearMonth, yearFolderId);

  // 파일 업로드 (multipart)
  const boundary = "boundary_" + Math.random().toString(36).slice(2);
  const metadata = JSON.stringify({ name: fileName, parents: [monthFolderId] });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(`업로드 실패: ${uploadData.error?.message ?? "unknown"}`);

  return uploadData.webViewLink as string;
}
