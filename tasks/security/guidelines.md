# 보안 개발 가이드라인

> 보안 세션(/project:security)이 관리한다.
> 모든 세션은 코드 작성 전 이 파일을 확인한다.
> 업데이트 시 날짜와 사유를 변경 이력에 기록한다.

## 변경 이력

| 날짜 | 변경 내용 | 근거 |
|------|----------|------|
| (초기) | 가이드라인 생성 | - |

---

## 공통

### 입력 검증
- 모든 사용자 입력은 서버 사이드에서 검증한다
- 화이트리스트 방식 선호 (허용 패턴 정의)
- 에러 응답에 스택 트레이스, 내부 경로, DB 쿼리를 포함하지 않는다
- 로그에 비밀번호, 토큰, 개인정보를 출력하지 않는다

### Zero Trust 원칙
- Verify Explicitly: 모든 요청을 명시적으로 검증
- Least Privilege: 최소 권한만 부여
- Assume Breach: 침해를 가정하고 설계

---

## 프론트엔드
- XSS 방지: innerHTML, dangerouslySetInnerHTML 사용 금지, 사용자 입력 이스케이프
- 민감정보: localStorage/sessionStorage에 토큰/비밀번호 저장 금지
- 인증 판단: 클라이언트에서 권한 판단 금지 (서버 검증 필수)
- 세션 만료 시 적절한 리다이렉션 처리

## 백엔드
- 인증: 모든 API 라우트에 인증 미들웨어 적용 (getCurrentUser / requireAdmin)
- 비밀번호: bcryptjs 해싱 (cost factor >= 10)
- SQL Injection: Prisma 파라미터 바인딩 사용, raw query 지양
- IDOR: 리소스 접근 시 소유자/권한 검증 필수
- 개인정보: Employee 데이터 최소 수집, 불필요 필드 응답 제외
- 로깅: 인증 이벤트, 관리자 행위 기록. 비밀번호/토큰은 절대 로그에 포함하지 않는다

## DevOps
- 시크릿: 환경변수 하드코딩 금지, .env.infra 또는 시크릿 매니저 사용
- 컨테이너: .dockerignore 설정, 비root 실행 권장
- 포트: 필요한 포트만 외부 노출 (80 → 3000)
- DB 파일 접근 권한 최소화 (chmod 600)
