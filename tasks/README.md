# 📚 프로젝트 문서 안내

> 이 폴더(`tasks/`)에는 프로젝트의 모든 기획·운영 문서가 있습니다.
>
> 최종 업데이트: 2026-03-15

---

## 📂 폴더 구조

```
tasks/
│
├── 📌 핵심 문서 (모든 세션 필독)
│   ├── current-state.md    ← 현재 프로젝트 상태 (가장 먼저 읽기)
│   ├── VISION.md           ← 프로젝트 비전·로드맵
│   ├── TICKETS.md          ← 활성 작업 티켓
│   ├── todo.md             ← 작업 체크리스트
│   └── lessons.md          ← 에러·교훈 기록 (에러 해결 후 반드시 기록)
│
├── 📋 기술 명세
│   ├── api-spec.md         ← API 엔드포인트 명세
│   └── db-changes.md       ← DB 스키마 변경 이력
│
├── 📁 features/            ← 기능별 상세 설계서
│   ├── asset-management.md
│   ├── asset-archiving.md
│   ├── hardware-lifecycle.md
│   ├── license-hierarchy.md
│   ├── monthly-report.md
│   ├── org-and-dashboard-improvements.md
│   ├── phase5-ux-improvements.md
│   ├── information-asset-platform-evolution.md
│   └── roadmap.md
│
├── 📁 security/            ← 보안 정책·감사 (Security Role 전담)
│   ├── guidelines.md       ← 보안 규칙 (모든 세션 참조)
│   ├── threat-model.md
│   ├── asset-management-policy.md
│   ├── asset-inventory.md
│   ├── asset-expansion-roadmap.md
│   ├── reporting-schedule.md
│   └── review-*.md         ← 보안 감사 기록
│
├── 📁 guide/               ← 사용자·운영 가이드
│   ├── user-guide.md       ← 사용자 매뉴얼
│   ├── WORKFLOW.md         ← 협력 워크플로우
│   └── troubleshooting.md  ← 문제 해결 가이드
│
├── 📁 archive/             ← 완료된 Phase 문서 (참고용)
│   ├── PHASE2-COMPLETION.md
│   ├── PHASE3-TICKETS.md
│   ├── phase2-db-design.md
│   ├── frontend-next.md
│   └── supabase-migration.md
│
├── 📁 postmortem/          ← 장애·에러 사후 분석
│   ├── README.md
│   ├── db.md
│   ├── docker.md
│   ├── frontend.md
│   ├── infra.md
│   └── OPS-010-completed.md
│
└── 📁 feedback/            ← 사용자 피드백
```

---

## 🚀 처음 읽는 순서

1. **`current-state.md`** — 지금 뭐가 완료되었고 뭐가 남았는지
2. **`VISION.md`** — 프로젝트가 뭘 하려는 건지
3. **`TICKETS.md`** — 구체적으로 어떤 작업이 있는지
4. **`todo.md`** — 체크리스트 형태의 진행 현황

---

## ❓ 자주 묻는 질문

| 질문 | 답변 |
|---|---|
| 지금 프로젝트 상태는? | `current-state.md` 확인 |
| 내가 할 작업은? | `TICKETS.md`에서 역할별 티켓 확인 |
| API 스펙은? | `api-spec.md` 참조 |
| 에러가 발생했다면? | 해결 후 `lessons.md`에 기록 |
| 과거 Phase 문서는? | `archive/` 폴더 참조 |
| 보안 규칙은? | `security/guidelines.md` 확인 |
