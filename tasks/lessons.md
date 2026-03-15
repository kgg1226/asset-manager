# 교훈 (Lessons Learned)

> 반복되는 패턴이 확인되면 tasks/postmortem/ 에서 승격시켜 여기에 한 줄 규칙으로 기록한다.
> 모든 세션은 작업 시작 전 이 파일을 확인한다.

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

## 보안
