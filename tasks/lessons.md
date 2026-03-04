# 교훈 (Lessons Learned)

> 반복되는 패턴이 확인되면 tasks/postmortem/ 에서 승격시켜 여기에 한 줄 규칙으로 기록한다.
> 모든 세션은 작업 시작 전 이 파일을 확인한다.

## 공통

## 프론트엔드

## 백엔드
- 프로덕션 컨테이너에서 prisma CLI 실행 금지 — DB 스키마 변경은 호스트에서 sqlite3로 직접
- Prisma 7에서 datasource url은 schema.prisma가 아닌 prisma.config.ts에서 설정

## DevOps
- 빌드 전 free -h로 스왑 확인 — EC2 t4g.small에서 OOM 방지
- 런타임에 외부 URL 호출 코드 작성 금지 — 폐쇄망 제약

## 보안
