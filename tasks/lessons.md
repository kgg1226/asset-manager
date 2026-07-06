# 교훈 (Lessons Learned)

> 반복되는 패턴이 확인되면 tasks/postmortem/ 에서 승격시켜 여기에 한 줄 규칙으로 기록한다.
> 모든 세션은 작업 시작 전 이 파일을 확인한다.

## 보안 (인증)

### [2026-06-02] [dev-027] proxy.ts 는 페이지/GET 을 비로그인에도 통과시킨다 — 서버 페이지가 직접 가드해야
- `proxy.ts` 는 **비로그인 시 API 변경요청(POST/PUT/PATCH/DELETE)만** 401 처리하고,
  **모든 페이지와 GET 요청은 토큰 없이 통과**시킨다(파일 주석에 명시된 의도적 동작).
- 따라서 서버 컴포넌트 페이지가 prisma 로 직접 조회해 렌더하면 **익명 사용자에게도 노출**된다
  (예: 새 /devices 대시보드). "미들웨어가 보호하겠지"라고 가정하지 말 것.
- 규칙: 민감 데이터를 렌더하는 서버 페이지는 `getCurrentUser()` 로 직접 인증·권한을 확인하고
  미충족 시 `redirect()`. 관리 전용 화면은 role 도 함께 검사.
- 새 GET API 라우트도 핸들러에서 `getCurrentUser()`(+필요 시 role)로 직접 가드 — 미들웨어에 의존 금지.

## 공통

### [2026-03-06] CLAUDE.md 병합 충돌 예방

**상황**: 여러 세션이 동시에 CLAUDE.md를 수정할 때 병합 충돌 발생

**원인**:
- 로컬 기획 세션: 폐쇄망/빌드 섹션 수정
- 마스터: 다른 세션이 Supabase 정보 추가
- Git이 어느 버전을 우선할지 판단 못함 → `=======` 충돌 마커 발생

**예방책**:

1. **CLAUDE.md는 기획만 수정** (역할 경계 엄격화)
   - ✅ 기획 세션만 CLAUDE.md 수정 권한
   - ❌ 다른 세션은 반드시 기획에 먼저 알림
   - 규칙: `CLAUDE.md 수정 필요 → 이슈/PR로 제안 → 기획에서 일괄 처리`

2. **마스터 병합 전 충돌 여부 확인**
   ```bash
   # 작업 시작 전
   git merge master  # 충돌 확인
   # 충돌 → 기획에 알림 → 협의 후 진행
   ```

3. **섹션별 담당 명확화** (CLAUDE.md 내)
   ```markdown
   # 섹션별 담당 역할
   - 프로젝트 개요: 기획만 수정
   - 스택/배포 정보: 기획 + DevOps 협의
   - 보안 규칙: 보안만 수정 → 기획에 리뷰 요청
   - 디렉토리 구조: 기획만 수정
   ```

4. **마스터 머지 후 모든 세션 동기화**
   - Phase 1 → Phase 2 진행 시: 반드시 `git merge master` 실행
   - 최신 CLAUDE.md 확인 후 진행

**결과**: 이후 충돌 없음 ✅

---

## 프론트엔드

### [2026-03-15] API limit 검증과 프론트 요청값 불일치

**원인**: 하드웨어/계약 목록 페이지에서 `limit=1000` 요청 → API에서 `max: 100` 검증으로 400 에러 → 빈 목록 표시
**해결**: 프론트 limit을 100으로 변경 (PR #56)
**예방**: API 검증 제한값 변경 시 프론트 호출부도 반드시 확인

### [2026-03-15] deploy.ps1 git tracked 상태로 반복 업로드

**원인**: `.gitignore`에 등록되어 있어도 이미 `git add`로 tracked된 파일은 무시되지 않음
**해결**: `git rm --cached deploy.ps1`로 인덱스에서 제거 (PR #54)
**예방**: 민감 파일은 최초 커밋 전 `.gitignore` 등록. 이미 tracked된 경우 `git rm --cached` 필수

### [2026-03-15] prisma db push 누락으로 column not found

**원인**: 스키마에 cpu 등 새 필드 추가 후 `prisma db push` 미실행 → DB 테이블에 컬럼 없음
**해결**: `npx prisma db push`로 동기화
**예방**: schema.prisma 변경 후 반드시 `npx prisma db push` 실행

## 백엔드

### [2026-03-15] prisma import는 반드시 named import 사용

`lib/prisma.ts`는 `export const prisma`(named export)만 제공.
→ `import { prisma } from "@/lib/prisma"` ✅
→ `import prisma from "@/lib/prisma"` ❌ (default export 없음 → 빌드 에러)

머지 시 새로 추가된 API 라우트가 default import를 사용하면 빌드 실패함. 머지 후 반드시 빌드 확인.

## DevOps

### [2026-03-10] node:alpine 비root 사용자는 `node`

`node:*-alpine` 이미지의 내장 비root 사용자는 `node` (UID 1000). `nodejs`는 존재하지 않음.
→ dockerfile에서 항상 `USER node`, `chown node:node` 사용. (PM-D-002)

### [2026-03-10] 반복 배포 표준: `down → up --build`

컨테이너 이름 충돌 방지를 위해 배포 시 항상 `docker compose down` 선행 필수.
`down -v`는 볼륨(DB 데이터) 삭제 → **절대 사용 금지**. (PM-D-003)

### [2026-03-10] prisma.config.ts에 dotenv import 금지

Docker 프로덕션 이미지는 devDependency 미포함 → dotenv 로딩 실패.
환경변수는 docker-compose `environment` 블록으로만 주입. (PM-INF-003)

### [2026-03-23] 기존 시스템을 버그 수정 명목으로 제거하지 말 것

**상황**: 자산 지도의 동적 핸들 분배 시스템(`-pN`)에 타이밍 버그가 있어 엣지가 사라지는 문제 발생. 버그를 고치기 위해 분배 시스템 자체를 제거 → 엣지가 겹치는 새로운 문제 발생.

**원인**: 근본 원인은 "노드 핸들 DOM 렌더링 전에 엣지가 해당 핸들을 참조하는 타이밍 문제"였으나, 시스템 전체를 삭제하는 과잉 수정을 함.

**예방책**:
1. **기존 시스템은 먼저 보존** — 버그의 근본 원인만 정확히 수정할 것
2. 시스템 제거는 최후의 수단 — 제거하면 그 시스템이 해결하던 다른 문제가 재발함
3. 타이밍 문제 해결 패턴: `setNodes` → `requestAnimationFrame` → `setEdges` (DOM 렌더링 보장)

### [2026-06-02] [dev-023] React 규칙 위반은 빌드는 통과해도 런타임 크래시
- **조기 return 뒤 useState**: `if (...) return null` 다음에 Hook 을 호출하면 렌더마다 Hook 수가 달라져
  로딩→로딩완료 전환 시 "Rendered more hooks" 크래시. 모든 Hook 은 조기 반환 위에 둔다.
- **렌더 중 Math.random()/Date.now()**: key 나 계산에 직접 쓰면 행 리마운트·불안정 결과.
  key fallback 은 map index, 시각 기준은 `useState(() => Date.now())` 로 마운트 시 1회 고정.
- `npm run build` 는 이런 react-hooks 규칙 위반을 막지 못한다 → `npm run lint` 의 error 도 게이트로 본다.

## 보안

### [2026-06-02] [dev-025] 라이프사이클 마스킹 — 공유 필드(cost/날짜)는 전면 strip 금지

**상황**: 내용연수·감가상각 노출 정책을 서버에서 강제하라는 요청에 cost/purchaseDate/expiryDate 까지
필드 목록에 포함돼 있었음. 그대로 GET /api/assets 에서 제거하면 무관한 기능이 광범위하게 깨짐.

**원인**: cost/purchaseDate/expiryDate 는 라이프사이클 전용이 아니라 여러 비-라이프사이클 표면이 공유 —
도메인 SSL 만료 D-day(핵심 기능), 하드웨어 cost 열·보증 만료 배너(dev-024가 의도적으로 노출 유지),
클라우드/계약 비용, 그리고 4종 편집 폼(GET 으로 폼을 채운 뒤 PUT 으로 되돌려 보냄).

**예방책**:
1. 마스킹 대상은 **순수 라이프사이클 전용 필드만** — 여기선 `usefulLifeYears` + 감가상각 파생
   `monthlyCost`(billingCycle=DEPRECIATION 한정). 구독형 monthlyCost(MONTHLY 등)는 보존.
2. 같은 GET 이 **편집 폼**도 채우면, 마스킹은 PUT 데이터 손실로 직결 → 비권한 사용자의 PUT 에서
   마스킹 필드를 **DB 기존값으로 heal**(덮어쓰기 차단). "못 보는 값은 못 덮어쓴다"가 올바른 모델.
3. 필드 목록을 문자 그대로 적용하기 전 **소비자 전체(목록/상세/편집/타 자산유형)를 먼저 매핑**하고,
   파손/데이터 손실이 걸리면 범위를 사용자에게 확인(기능 삭제 = 물어보는 예외에 해당).

### [2026-06-02] [dev-025] tsx 의 .ts named export ESM interop 한계

세션 내 빠른 검증에서 `npx tsx`가 `.ts` 모듈의 named export 를 못 읽는 경우가 있음
("does not provide an export named ..."). `next build` 가 동일 export 를 정상 import 해 통과했다면
export·타입은 정상 — 순수 로직은 함수 본문을 복제해 알고리즘만 단위 검증하면 충분.

- [dev-040] git stash 로 lint 기준선 비교 시 `git stash -q && npx eslint ... && git stash pop -q`
  한 줄 체인에서 pop 이 실행/완료되지 않아 변경이 stash 에 갇히는 사고 발생(워킹트리가 커밋
  상태로 되돌아감). 다행히 git status·stash list 로 즉시 발견해 `git stash pop` 으로 복구.
  → 교훈: 기준선 비교는 stash 대신 `git show HEAD:<path>` 로 원본을 떠서 비교할 것
  (워킹트리를 건드리지 않음). stash 가 불가피하면 별도 명령으로 pop 하고 결과를 확인.

- [dev-049] zsh 에서 `git add app/api/asset-links/[id]/route.ts` 의 `[id]` 가 glob 으로
  해석돼 "no matches found" 로 명령 전체가 중단 → 의도한 커밋이 비어서 생성 누락. 후속 커밋만
  만들어져 순서가 꼬였다. → 교훈: 대괄호가 든 Next 동적 라우트 경로는 항상 작은따옴표로 감쌀 것
  (`'app/api/.../[id]/route.ts'`). 커밋 후 `git log --oneline` 으로 의도대로 들어갔는지 확인.

- [dev-061] ① "setNodes → requestAnimationFrame → setEdges" 처방(2026-03-23 교훈)은 **엣지를 주입하는
  모든 경로**(fetchGraph·handleSaveLink 등)에 적용해야 한다 — fetchGraph 에 미적용이라 동적 핸들(-pN)
  등록 전에 엣지가 참조돼 연결선이 깜빡이며 드랍됐다(네트워크 뷰 병렬 엣지에서 두드러짐).
  ② 병합(merge) 저장은 "키 부재=삭제"를 표현하지 못한다 — 병합 저장 도입 시 모든 제거 UI 경로
  (팔레트 ✕ 등)에서 저장본(ref+state)의 해당 키를 **명시 제거**해야 한다. 누락 시 재조회에 부활.

- [dev-049] 후속 작업을 직전 PR 의 feature 브랜치에 커밋했는데 그 PR(#113)이 이미 **squash 머지**된
  상태였다. squash 는 머지 후 브랜치에 푸시해도 master 에 반영되지 않고, 브랜치엔 이미 master 에
  squash 로 들어간 옛 커밋들이 남아 PR diff 가 지저분해진다. → 교훈: 작업 시작 전 `gh pr view <n>`
  로 머지 여부를 확인하고, 머지됐으면 `git checkout -b <new> origin/master` 후 후속 커밋만
  `git cherry-pick` 해 깨끗한 새 PR 을 연다. 머지된 브랜치를 재사용하지 말 것.
