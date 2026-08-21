# Product delivery and runtime verification

## 범위

재현 가능한 toolchain, production-server 검증, self-contained production build, standalone artifact, release performance gate와 non-root container runtime까지 실제 제품 전달 경로를 다룹니다.

외부 hosting/provider 설정, registry publication, orchestrator와 배포 후 운영 절차는 `web/portfolio` branch history에 근거가 없으므로 Thread를 만들지 않습니다.

## Phase 1 category audit 결과

- Branch scope는 `web/portfolio`만 사용했습니다. `commit/commit-importance.md`가 이 branch의 독립 선형 history를 선언하고, 이 category의 24개 SHA는 모두 해당 분류에 존재합니다.
- 가장 이른 `f66b880a8f97`과 가장 늦은 `b94fa6dd0118`은 모두 `web/portfolio`의 ancestor로 확인했습니다. 각 SHA는 exact commit object와 diff를 별도로 검사했습니다.
- Category boundary와 5개 Thread는 유지했습니다. Commit 추가·삭제·이동·중복은 하지 않았습니다.
- 원래 scaffold의 generic investigation 문구는 exact file, function, script, workflow, artifact, failure와 non-guarantee를 묻는 commit-specific 과제로 교체했습니다.
- `5d903132306a`는 단순히 font/CSS fix에 끼워 넣지 않았습니다. Next/ESLint/SWC patch-line 정렬과 GNU·musl lockfile 조건을 다루는 framework/native portability 단계로 역할을 좁혀 Thread 2에 유지했습니다.
- Tailwind fix 뒤의 broad visual regression은 결과를 간접 보호하지만 PostCSS config를 직접 격리한 test는 아닙니다. 따라서 이 category commit map에 중복 추가하지 않고 completed record에서 test gap으로 명시합니다.
- Thread 2·3·4의 실제 commits는 history에서 일부 교차합니다. 문서 순서는 source → artifact → release gate → runtime이라는 학습 dependency 순서이며, 각 Thread 내부 commit 순서는 실제 branch 순서를 유지합니다.

## Thread 경계

1. [Reproducible toolchain and production-server verification](01-reproducible-toolchain-and-production-server-verification.md) — runtime pin, production E2E와 최초 CI gate
2. [Self-contained production build and portability](02-self-contained-production-build-and-portability.md) — local fonts, compiler, framework/native dependency와 CSS transform
3. [Standalone artifact contract and CI verification](03-standalone-artifact-contract-and-ci-verification.md) — standalone generation, minimum layout와 CI handoff
4. [Release performance gates](04-release-performance-gates.md) — webpack manifest measurement, reviewable bundle baseline, desktop Lighthouse와 CI enforcement
5. [Container packaging and runtime verification](05-container-packaging-and-runtime-verification.md) — multi-stage non-root image와 actual HTTP/public-asset verification

## Cross-thread handoff

- Thread 1의 pinned toolchain과 production E2E가 이후 모든 build/CI path의 실행 기반입니다.
- Thread 2의 webpack/CSS/font portability가 Thread 4의 measured artifact가 의미 있는 production output이 되게 합니다.
- Thread 3의 standalone contract가 Thread 5 Docker builder의 입력이며, Thread 5가 Thread 3에서 검증하지 않은 `public`과 actual runtime을 확인합니다.
- Thread 4의 CI activation 뒤 Thread 5가 container gate를 workflow 마지막 단계에 추가합니다.

## 문서 사용법

1. Thread 목표와 commit map을 먼저 읽습니다.
2. 각 SHA를 parent와 비교하고 해당 SHA의 resulting tree를 확인합니다.
3. build/test/CI/Docker command는 source inspection과 실제 실행 결과를 구분해 기록합니다.
4. artifact ownership, failure mode, cleanup과 release blocker가 되는 조건을 연결합니다.
5. 마지막에 source → build → artifact → verification → runtime의 최종 전달 흐름을 코드 없이 설명합니다.
