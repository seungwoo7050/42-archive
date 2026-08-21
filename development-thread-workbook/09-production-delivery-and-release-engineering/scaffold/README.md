# 제품 전달과 릴리스 엔지니어링

이 카테고리는 애플리케이션 기능이 완성된 뒤 그것을 **재현 가능한 production artifact와 실행 가능한 서비스 조합으로 전달하는 과정**을 학습합니다.

기존 카테고리와의 경계는 다음과 같습니다.

- `07-runtime-observability-and-service-health`는 실행 중인 애플리케이션의 readiness, metrics, drain, failure containment를 다룹니다.
- `08-verification-and-test-architecture`는 unit/integration/process/browser/load/fault 검증의 **테스트 설계**를 다룹니다.
- 이 `09` 카테고리는 source를 production artifact로 만들고, image/runtime을 조립하고, CI에서 그 **전달 가능한 결과물**을 검증하는 과정을 다룹니다.

## 권장 학습 순서

1. [런타임 조립과 reverse proxy의 발전](01-runtime-composition-and-reverse-proxy-evolution.md)
2. [Production build와 package artifact](02-production-build-and-package-artifacts.md)
3. [Container image와 production runtime lifecycle](03-container-images-and-production-runtime-lifecycle.md)
4. [CI production process와 browser delivery 검증](04-ci-production-process-and-browser-delivery-verification.md)
5. [Runtime version·security·release contract](05-runtime-version-security-and-release-contracts.md)

번호는 이 영역의 실제 개발사에서 처음 등장하는 흐름을 우선해 배치했습니다. 초기 Compose/Caddy runtime이 먼저 등장하고, 이후 compiled package artifact, production image/lifecycle, CI delivery verification, release/security contract 강화가 이어집니다.

## 공통 학습 원칙

- 각 SHA의 실제 historical file과 parent diff를 확인합니다.
- `Dockerfile`, Compose, Caddy, workflow, package script는 단순 설정 파일이 아니라 실행 순서와 resource ownership을 결정하는 코드로 취급합니다.
- build가 성공했다는 사실과 production process가 실제로 실행 가능하다는 사실을 구분합니다.
- runtime evidence는 실제로 실행한 command에 한해서만 기록합니다.
- 같은 SHA가 07/08에도 등장하면 이 카테고리에서는 **제품 전달 관점**만 기록합니다.
