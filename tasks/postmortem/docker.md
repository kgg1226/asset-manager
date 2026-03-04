# 빌드 / 컨테이너 에러

### PM-D-001: Docker 빌드 시 OOM Kill
- 증상: `docker build` 도중 프로세스 강제 종료, `dmesg`에 OOM killer 로그
- 원인: EC2 t4g.small (RAM 2GB)에서 Next.js 빌드 메모리 초과
- 해결: 빌드 전 2GB 스왑 파일 생성 (`sudo dd if=/dev/zero of=/swapfile bs=128M count=16`)
- 예방: 빌드 전 `free -h`로 스왑 확인 습관화
