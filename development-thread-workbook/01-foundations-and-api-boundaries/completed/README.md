# 애플리케이션 기반과 API 경계

모노레포 package ownership, shared executable contract, Fastify resource API, typed failure, strict JSON request validation, WebSocket client-facing error containment, runtime mode와 CORS 같은 애플리케이션 기반을 다룹니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- 상태: Phase 1 category audit 완료·동결
- 포함: workspace/package ownership, shared contract, DB import/lifecycle, API composition, resource HTTP boundary, strict request parsing, client-facing error redaction, mode/CORS/proxy trust
- 제외: repository domain integrity·migration evolution, session/logout·role·account lifecycle, core WebSocket admission/room/simulation, browser state architecture, readiness/metrics/drain, production delivery artifact

## Phase 1 audit 결과

- 기존 4개 Thread를 실제 역사와 category boundary에 맞춰 5개로 재구성했습니다.
- workspace Thread는 shared DTO/game contract가 DB/API/web package보다 먼저 도입된 실제 순서로 정렬했습니다.
- DB package의 import 가능 경계 `1140fb868714`과 repository lifecycle `9277572765e7`을 composition story에 추가했습니다.
- Resource API Thread는 초기 route 구현과 baseline integration tests가 runtime schema보다 먼저 존재한 실제 순서로 정렬했습니다.
- 초기 API 통합 증거 `fb1c287d9e79`, `1395d45a3665`, `5088099d1e7d`와 typed boundary 후속 test `50caaf5c7c49`을 추가했습니다.
- HTTP strict request validation과 WebSocket internal-error redaction은 변경 파일·실패 원인·검증 방식이 독립적이므로 별도 Thread로 분리했습니다.
- `2b274686e6d4`는 이 카테고리에서 runtime-mode single owner와 invalid-value fail-closed만 다루며 guest resource-limit 변경은 별도 category 책임으로 남깁니다.

## Frozen Thread

1. [Workspace·package·composition 경계](01-workspace-package-and-composition-boundaries.md)
2. [Resource API와 실행 가능한 HTTP contract](02-executable-http-contracts-and-resource-api.md)
3. [Strict JSON request validation](03-strict-json-request-validation.md)
4. [WebSocket client error boundary와 내부 오류 격리](04-websocket-internal-error-containment.md)
5. [Runtime mode·CORS·network trust](05-runtime-mode-cors-and-network-trust.md)

## 사용 원칙

- 각 문서의 Commit map은 해당 Thread 안에서 실제 commit 시간 순서를 따릅니다.
- exact SHA의 diff와 해당 SHA 파일을 기준으로 설명하며 final HEAD를 과거 상태에 투영하지 않습니다.
- 같은 SHA가 다른 category에 있어도 이 문서는 위 category boundary에 해당하는 역할만 다룹니다.
- Phase 2 completed 문서는 이 frozen scaffold의 filename, structure, SHA, subject, importance, tags, role을 그대로 보존합니다.
