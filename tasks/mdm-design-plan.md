# MDM-lite 데이터 수집·제어 아키텍처 계획 (dev-027 후속)

> 작성: 2026-06-10. 멀티에이전트 설계 검토(코드베이스 분석 4 → 독립 설계 3안 → 3렌즈 심사 → 적대적 완결성 검증) 종합.
> 심사 결과 "실용 최소형" 안의 채널·단계 구조를 골격으로, "허브" 안의 ingest 코어 정규화·신선도 가드와
> "에이전트" 안의 기기별 토큰·멱등키를 이식한 합성안.

## 0. 원칙

1. **단일 ingest 코어**: 모든 수집 채널(수동/CSV/셀프 체크인/에이전트/외부 MDM)이 `lib/device-compliance.ts`의
   `applyCheckin(tx, {assetId, checks, osVersion, source, reportedAt, actor})` 하나를 거친다.
   기존 checkin 라우트의 트랜잭션(upsert+이력+lastCheckinAt)을 일반화하고 `source: "MANUAL"` 하드코딩을 파라미터화.
2. **실기기 제어(원격 잠금/와이프/정책 푸시)는 자체 구현 금지** — 쓰기 경로가 자사 DB뿐이라는 구조가 원칙을 보장.
   외부 MDM 콘솔 딥링크/위임 훅만 둔다.
3. **채널별 인증 분리**: 관리자=세션, 기기=기기별 토큰(해시 저장), 시스템 크론=CRON_SECRET.
   단일 공유 시크릿을 기기 인증에 재사용하지 않는다(1대 유출=전 기기 위조 차단).
4. **필드 소유권**: 자동 소스(CSV/SELF/AGENT)는 `checks·osVersion·lastCheckinAt`만 갱신.
   `notes·managed·enrollmentStatus·externalSource`는 수동(MANUAL) 전용 — applyCheckin 타입 시그니처로 강제.

## 1. 데이터 수집 채널

| 채널 | 단계 | 인증 | 비고 |
|------|------|------|------|
| 수동 입력·체크인 (현행) | 운영 중 | ADMIN 세션 | 무변경, source=MANUAL |
| **CSV 일괄 업로드** | **1단계(주력)** | ADMIN 세션 | 기존 import 인프라(ImportType "compliance"+템플릿) 재사용. 스키마 무변경 |
| **셀프 체크인 링크** | **2단계** | 기기별 토큰 | 패널에서 링크 발급 → 임직원이 공개 폼으로 자기 기기 상태 제출 |
| 에이전트 push | 선택(4단계) | 기기별 토큰 재사용 | macOS/Windows 수집 스크립트. 셀프 체크인 데이터 품질이 부족할 때만 |
| 외부 MDM pull (Jamf/Intune/GWS) | 예약(5단계, 미구현) | 아웃바운드 API 키(SystemConfig AES-256-GCM) | `externalSource`/`externalDeviceId` 매핑 키만 예약. exchange-rate cron 패턴 |

**기기↔자산 매칭** (CSV·에이전트 공통): `assetTag`(@unique, dev-030) 1순위 → `serialNumber` 보조(복수 매칭 시 **모호 거부**)
→ 외부 MDM은 `externalDeviceId`. 미매칭/모호 보고는 **영속 큐로 저장**해 /devices에 "조치 필요"로 노출(1회성 요약만으로는 유실).

## 2. 인증 설계

- **기기별 체크인 토큰**: `crypto.randomBytes(32)` → 원문 1회 표시, DB에는 **SHA-256 해시만**(`checkinTokenHash @unique`)
  + `checkinTokenExpiresAt`. 발급 시 PENDING, 첫 유효 체크인 시 ENROLLED 전이. 재발급=기존 무효화, 자산 폐기 시 자동 회수.
- **크론 잡**: `isCronAuthorized()` 재사용하되 **`timingSafeEqual`로 시정**(기존 backlog #5와 함께).
- **아웃바운드 키**(외부 MDM 도입 시): SystemConfig 암호화 저장. **전제: 운영 환경에 `CONFIG_ENCRYPTION_KEY` 64-hex 명시 설정**
  (현재 DATABASE_URL 파생 폴백 — DB URL 보유자가 복호화 가능하므로 5단계 전 필수 시정).
- **proxy.ts 주의**: 페이지/GET은 비인증 통과 정책 → 신규 GET 라우트·공개 폼 라우트는 핸들러 자체 가드 필수(lessons 기록 준수).
- ingest 류 공개 엔드포인트에 rate-limit 일반화 적용 + 인증 실패 감사 로그.

## 3. 무결성·충돌 규칙 (ingest 코어에 내장)

1. **신선도 가드**: `reportedAt`이 기존 `lastCheckinAt`보다 과거면 현재 상태는 덮지 않고 DeviceCheckin 이력에만 append
   (늦게 올린 CSV가 최신 셀프 체크인을 되감는 사고 차단).
2. **멱등키**: `DeviceCheckin.reportId @unique` — CSV 재업로드·에이전트 재전송 중복을 DB 레벨 차단.
3. **complianceStatus 파생 규칙**: 점검 6종에서 rollup. **`jailbrokenRooted`는 역방향(true=위반)** — 위반 1개 이상
   NON_COMPLIANT, 전부 정상 COMPLIANT, 미점검 잔존+위반 없음 UNKNOWN. 관리자 수동 PUT 명시값은 파생값보다 우선.
4. **ipAddress는 클라이언트 바디 금지** — 서버에서 소켓/x-forwarded-for 도출(현행 checkin :38 시정).
5. **source/externalSource 화이트리스트**: `DEVICE_SOURCES as const` 단일 출처(자유 문자열 오염·우선순위 사칭 차단).
6. 체크인 osVersion ↔ HardwareDetail.osVersion 동기화 규칙 명시(자동 소스 보고 시 HardwareDetail 갱신).

## 4. 제어 평면 (4층)

| 층 | 내용 | 구현 |
|----|------|------|
| ① 상태 전이 | 등록 수명주기(UNENROLLED→PENDING→ENROLLED→RETIRED), stale 강등(무체크인 N일→UNKNOWN), 자산 폐기/PENDING_DISPOSAL 시 RETIRED+managed=false 연동 | cron `device-stale-check` (asset-disposal-check 골격 복제), `DEVICE_STALE_DAYS` APP_SETTINGS 승격(현재 클라이언트 표시 전용 30일과 단일 출처화) |
| ② 알림 워크플로 | 미준수·장기 미체크인 알림(7일 dedup), 체크인 링크 동봉 | cron `device-compliance-notify` — renewal-notify의 수신자·채널(Slack/Email) 패턴 재사용, NotificationLog entityType "DEVICE" |
| ③ 사람 개입 큐 | 미매칭 보고 영속 큐, 소스별 신선도 표시 | /devices 대시보드 확장 |
| ④ 실기기 제어 | **외부 MDM 위임만** — 콘솔 딥링크, (미래) 서명된 아웃바운드 액션 웹훅+REQUESTED 감사 | 자체 구현 금지 |

## 5. 스키마 승인 목록 (1회 마이그레이션, 전부 additive — 2a 게이트)

1. **필수**: `DeviceCompliance.checkinTokenHash String? @unique`, `checkinTokenExpiresAt DateTime?`
2. **권장(동승)**: `@@unique([externalSource, externalDeviceId])` — 외부 기기 이중 바인딩 차단(지금 데이터 없어 안전)
3. **권장(동승)**: `DeviceCheckin.reportId String? @unique` — 멱등키
4. **선택**: `DeviceCheckin.checksSnapshot Json?` — 점검값 시점 스냅샷(현재 이력에 status만 있어 복구 불가 지적 반영)
5. **선택**: `HardwareDetail.serialNumber @@index` — 보조 매칭 조회

## 6. 단계 로드맵 (각 단계 = 독립 배포 단위)

| 단계 | 내용 | 스키마 | DEPLOY |
|------|------|--------|--------|
| 0 | ingest 코어 추출(applyCheckin·파서 공유·source 파라미터화) — 동작 불변 리팩터링 | 무 | false |
| 1 | **CSV 컴플라이언스 일괄 수집**(템플릿·매칭 캐스케이드·결과 리포트) | 무 | false |
| 2a | 스키마 승인 게이트(위 목록 일괄) | **승인** | true |
| 2b | **셀프 체크인 링크**(토큰 발급 UI·공개 폼·rate-limit) | — | true |
| 3 | **제어 평면 크론 2종**(stale 강등 + 미준수 알림) + timingSafeEqual 시정 + retention 잡 | 무 | true |
| 4 | (선택) 에이전트 push + 수집 스크립트 가이드 | 무 | true |
| 5 | (예약·미구현) 외부 MDM pull 어댑터 — 확장점만 | — | — |

## 7. 운영 수명주기 보완 (완결성 검증 반영 — 구현 시 필수 포함)

- **재할당**: 자산 unassign/재배정 시 점검값 리셋(또는 이력 단절 마킹) — 현재 이전 사용자의 컴플라이언스가 승계되는 공백.
- **폐기**: PENDING_DISPOSAL/DISPOSED 전이 시 enrollmentStatus=RETIRED + managed=false + 토큰 회수
  (알림 노이즈 차단). Cascade 삭제 전 개인정보(IP) 보존/소거 방침 결정 필요.
- **retention**: DeviceCheckin 무한 증가 방지 잡(예: 기기당 최근 N건 또는 M개월) — 주기 수집 도입(3단계) 전 동승.
- 테스트 부재(npm test no-op) — ingest 코어 추출(0단계) 시 코어 함수 단위 테스트 신설 권장.

## 8. "Jamf/Intune급 관리" 도입 경로 리서치 (2026-06-10, 웹 검증 완료)

> 자체 MDM 프로토콜 구현은 기각 — Apple MDM(벤더 서명 CSR+APNs+SCEP+연간 인증서 수명주기)·Windows OMA-DM 을
> 자가 구현해 성숙시킨 오픈소스가 사실상 Fleet 하나뿐이라는 것이 난이도의 증거. 본 앱에 넣는 것은 제2의 제품 개발이다.
> 실기기 제어는 "도입 + 5단계 어댑터 연동"으로 달성한다.

### 경로 비교 (검증된 사실)

| 경로 | 비용 | 잠금/와이프 | 디스크암호화 에스크로 | macOS | Windows | API(허브 연동) |
|------|------|------------|---------------------|-------|---------|----------------|
| **Fleet 자가호스팅** (오픈코어) | 무료 티어 / Premium $7/host/월 | **Premium** | **Premium** | ✓ | ✓ (자가호스팅 중 유일 성숙) | ✓ REST |
| **Apple Business 내장 MDM** (2026-04 개편, Blueprints) | **무료** (한국 제공) | ✓ | — | ✓ | ✗ | (확인 필요) |
| **Intune** | Plan1 단독 ₩10,800/인/월, M365 Business Premium(₩29,700)에 포함 | ✓ | ✓ (FileVault/BitLocker) | ✓ | ✓ | ✓ Graph |
| Hexnode / Scalefusion | $3.2~4.7 / $2~ per 기기/월 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mosyle | $1/기기/월, 30대까지 무료 | ✓ | ✓ | ✓ | **✗ Apple 전용** | ✓ JWT |
| Jamf Now | 3대 무료, $4/기기 | ✓ | ✓ | ✓ | ✗ | **✗ API 없음 → 연동 불가, 제외** |

핵심 사실(적대적 검증 통과):
- Fleet 무료 티어: 멀티플랫폼 MDM 등록·프로파일·DDM·스크립트·인벤토리·정책 포함.
  **원격 잠금/와이프·디스크암호화 강제+에스크로·OS업데이트 강제·제로터치·앱배포·teams 그룹핑은 전부 Premium.**
  → "무료 MDM"으로는 분실 대응 시나리오를 못 만든다.
- Fleet 의존성: MySQL 8.0.44+/Redis 7.x/TLS — EC2 1대 docker compose 로 수십~수백 대 충분. 월 단위 릴리스 추적 부담.
- Fleet 의 APNs 인증서: Fleet 이 자사 벤더 인증서로 CSR 서명 → identity.apple.com 에서 무료 발급(연 1회, 같은 Apple 계정 갱신 필수).
- ABM 은 'Apple Business' 로 개편(2026-04-14): 내장 무료 MDM(Blueprints)·zero-touch 한국 제공, D-U-N-S 가 유일 검증수단 아님(사업자등록증 가능).
- Intune: macOS 도 잠금·와이프·FileVault 에스크로까지 공식 지원. Business Standard 사용 조직이면 Premium 업그레이드 증분 ₩12,800/인/월 ≈ Intune 단독(₩10,800)과 ₩2,000 차이에 Entra P1+Defender 동봉.
- 2026-07-01 M365 가격 개편: E3/E5 인상 + Intune Plan 2 번들, Business Premium $22 동결.

### 결정 트리
1. **M365 Business Standard 이상 사용 중** → Business Premium 업그레이드로 **Intune** (mac+win 풀 제어, 인프라 운영 0)
2. **비용 0 우선** → Mac: Apple Business 내장 MDM(무료) + Windows: Fleet 무료 티어 — 단 Windows 분실 대응 불가 한계 명시
3. **단일 콘솔 + 자가호스팅 선호** → **Fleet** (무료로 시작 → 분실 대응 필요 시 Premium $7/host/월)

어느 경로든 본 앱은 5단계 어댑터(pull 동기화, externalSource/externalDeviceId)로 통합 — 화면 "제어"는 MDM 콘솔 딥링크 위임.
