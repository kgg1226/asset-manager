# 인프라 / 배포 에러

### PM-INF-001: 폐쇄망 환경에서 외부 API 호출 실패
- 증상: Google API, 외부 CDN 등 fetch 요청 타임아웃
- 원인: 배포 환경이 폐쇄망으로 외부 인터넷 접근 차단
- 해결: 외부 API 의존성 제거, 라이브러리는 빌드 시 번들링
- 예방: 런타임에 외부 URL 호출 코드 작성 금지

### PM-INF-002: 환경변수 누락으로 런타임 에러
- 증상: 컨테이너 시작 후 `undefined` 관련 에러
- 원인: `docker run` 시 환경변수 미전달 또는 변수명 오타
- 해결: 필수 환경변수 문서화 (DATABASE_URL, NODE_ENV, SECURE_COOKIE)
- 예방: 컨테이너 시작 후 `docker exec license-app env`로 확인
