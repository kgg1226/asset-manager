# 프론트엔드 에러

### PM-FE-001: 로그인 후 /login으로 튕기는 현상
- 증상: 로그인 API 200 반환 후 다시 `/login`으로 리다이렉트
- 원인: `secure: true` 쿠키가 HTTP 환경에서 브라우저에 저장되지 않음
- 해결: `SECURE_COOKIE=false` 환경변수 추가
- 예방: HTTP 환경에서는 반드시 `SECURE_COOKIE=false` 설정

### PM-FE-002: 템플릿 다운로드 버튼 미동작
- 증상: CSV 템플릿 다운로드 클릭 시 아무 반응 없음
- 원인: `document.createElement('a')` 후 DOM append 없이 `a.click()` 호출
- 해결: click-only 패턴으로 변경 (append 없이도 동작)
- 예방: 프로그래밍 방식 다운로드 시 `a.click()` 직접 호출
