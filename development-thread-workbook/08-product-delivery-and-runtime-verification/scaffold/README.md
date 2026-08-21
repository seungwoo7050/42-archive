# Product delivery and runtime verification

## 범위

재현 가능한 toolchain, production-server 검증, self-contained production build, standalone artifact, release performance gate와 non-root container runtime까지 실제 제품 전달 경로를 다룹니다.

외부 hosting/provider 설정이나 배포 후 운영 절차는 `web/portfolio` branch history에 근거가 없으므로 scaffold를 만들지 않습니다.

## 분류 원칙

- 이 category/thread 구조는 원본 7개 Development Thread를 대체하거나 수정하지 않는 확장 계획입니다.
- Commit SHA, subject, importance와 tags는 branch의 `commit/commit-importance.md`를 따릅니다.
- Thread grouping과 목표는 product delivery 학습 범위를 추가하기 위해 새로 계획했습니다.
- 개발 순서 기준 category 재배치를 반영하여 이 category를 `08`, 기존 cross-cutting 종합 복원 세트를 `09`에 둡니다.
- 같은 commit이 testing/performance 또는 cross-cutting category에 다시 등장할 수 있습니다. 이 category에서는 delivery artifact와 release gate의 관점으로 다시 추적합니다.

## 권장 학습 순서

1. [Reproducible toolchain and production-server verification](01-reproducible-toolchain-and-production-server-verification.md)
2. [Self-contained production build and portability](02-self-contained-production-build-and-portability.md)
3. [Standalone artifact contract and CI verification](03-standalone-artifact-contract-and-ci-verification.md)
4. [Release performance gates](04-release-performance-gates.md)
5. [Container packaging and runtime verification](05-container-packaging-and-runtime-verification.md)

## 문서 사용법

1. Thread 목표와 commit map을 먼저 읽습니다.
2. 각 SHA를 parent와 비교하고 해당 SHA의 resulting tree를 확인합니다.
3. build/test/CI/Docker command는 source inspection과 실제 실행 결과를 구분해 기록합니다.
4. artifact ownership, failure mode, cleanup과 release blocker가 되는 조건을 연결합니다.
5. 마지막에 source → build → artifact → verification → runtime의 최종 전달 흐름을 코드 없이 설명합니다.
