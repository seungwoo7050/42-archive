# ft_transcendence Development Thread Workbook

## 목적

이 workbook은 433개 커밋으로 구성된 full-stack realtime web project를 한 종류의 Thread로 압축하지 않고,
웹 개발 영역별 카테고리 아래에서 학습하도록 재구성합니다.

- 기존 8개 Development Thread의 scaffold/completed 세트는 `05-core-realtime-architecture`에 그대로 보존합니다.
- 추가 카테고리는 scaffold만 포함합니다.
- 카테고리 번호는 가능한 범위에서 실제 개발 순서와 선행 의존성을 반영합니다.
- 제품 전달도 독립 영역으로 포함하며 production build, container/runtime composition, reverse proxy, CI delivery verification, runtime/security release contract를 `09`에서 다룹니다.
- 같은 SHA가 여러 카테고리에 등장할 수 있으나 각 문서는 서로 다른 ownership·failure·verification 질문을 가집니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- Source history: 433 commits
- Categories: 9
- Development Threads: 43

## 구조

```text
development-thread-workbook/
├── README.md
├── COVERAGE.md
├── 01-foundations-and-api-boundaries/scaffold/
├── 02-persistence-and-data-integrity/scaffold/
├── 03-identity-authorization-and-account-lifecycle/scaffold/
├── 04-domain-workflows-and-realtime-features/scaffold/
├── 05-core-realtime-architecture/
│   ├── scaffold/
│   └── completed/
├── 06-browser-application-architecture/scaffold/
├── 07-runtime-observability-and-service-health/scaffold/
├── 08-verification-and-test-architecture/scaffold/
└── 09-production-delivery-and-release-engineering/scaffold/
```

## 카테고리

| 순서 | 카테고리 | Thread | 상태 | 역할 |
| --- | --- | ---: | --- | --- |
| 01 | 애플리케이션 기반과 API 경계 | 4 | scaffold only | 모노레포 package ownership, shared contract, Fastify API, typed failure, strict request validation, runtime mode/CORS를 다룹니다. |
| 02 | 영속성·데이터 무결성 | 5 | scaffold only | AppRepository, memory/PostgreSQL parity, migration/seed lifecycle, row mapping, friendship/tournament concurrency를 다룹니다. |
| 03 | 신원·권한·계정 수명주기 | 3 | scaffold only | session, logout/revocation, role, administrator authorization, suspension audit, live connection 회수를 다룹니다. |
| 04 | 도메인 워크플로와 실시간 기능 | 7 | scaffold only | tournament, profile/friend/dashboard, lobby/chat, chat authorization, pause/resume, NPC·AI workflow를 다룹니다. |
| 05 | 핵심 실시간 아키텍처 | 8 | scaffold + completed | 기존 8개 authoritative simulation/auth/protocol/finalization/room/matchmaking/guest/runtime Thread를 보존합니다. |
| 06 | 브라우저 애플리케이션 아키텍처 | 6 | scaffold only | Next.js shell, API adapter, game reducer/transport, hook migration, React Query cache, rendering/input, guest presentation을 다룹니다. |
| 07 | 런타임 관측성과 서비스 상태 | 3 | scaffold only | startup/readiness, metrics, event-loop/realtime 측정, runtime limiter와 failure containment를 다룹니다. |
| 08 | 검증·테스트 아키텍처 | 2 | scaffold only | deterministic/contract/PostgreSQL/browser/process/load/fault 검증의 테스트 구조를 다룹니다. |
| 09 | 제품 전달과 릴리스 엔지니어링 | 5 | scaffold only | production artifact, multi-stage image, Compose/Caddy runtime, CI delivery verification, runtime/security release contract를 다룹니다. |

## 학습 순서

카테고리 번호는 프로젝트 전체의 strict chronological partition이 아닙니다. 한 영역이 시작된 뒤 다른 영역과 병행 발전하기 때문입니다.
번호는 **처음 본격적으로 형성된 시점과 선행 의존성**을 함께 고려한 읽기 순서입니다.

- 01~04에서 HTTP·DB·identity·service workflow의 기반을 복원합니다.
- 05에서 기존 completed Core Track을 사용해 핵심 realtime architecture를 깊게 복습합니다.
- 06~08에서 browser ownership, runtime health, verification architecture를 확장합니다.
- 09에서 source를 production artifact와 실행 가능한 delivery unit으로 만드는 과정을 복원합니다.

모든 구현 주장은 exact SHA의 코드와 parent 상태에 근거해야 하며 실행하지 않은 test/build/CI 결과는 기록하지 않습니다.
