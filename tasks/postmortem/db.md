# DB / ORM 에러

### PM-DB-001: 컨테이너 내부에서 prisma db push 실패
- 증상: `npx prisma db push` 실행 시 `dotenv` 모듈 에러
- 원인: `dotenv`가 devDependencies → 프로덕션 이미지에 미포함
- 해결: DB 스키마 변경은 호스트에서 sqlite3로 직접 SQL 실행
- 예방: 프로덕션 컨테이너에서 prisma CLI 실행 금지

### PM-DB-002: DB 테이블 없음 에러
- 증상: API 호출 시 `no such table: User`
- 원인: 새 DB 파일에 스키마 미적용 상태로 컨테이너 실행
- 해결: `references/init.sql`로 수동 스키마 적용
- 예방: 컨테이너 시작 전 `.tables`로 DB 상태 확인

### PM-DB-003: Prisma 7 datasource url 에러
- 증상: `prisma generate` 실행 시 P1012 에러
- 원인: Prisma 7에서 `url = env("DATABASE_URL")`을 schema.prisma에 넣으면 거부
- 해결: datasource URL은 prisma.config.ts에서만 설정
- 예방: schema.prisma의 datasource 블록에 url 넣지 않음
