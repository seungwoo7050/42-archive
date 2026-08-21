# 01-application-foundation-and-content-systems

> Repository: `https://github.com/seungwoo7050/42-archive`  
> Branch: `web/portfolio`

이 category는 실행 가능한 Next application boundary와 portfolio content system의 source → schema → parser → integrity → validated facade → build gate 이력을 복원합니다.

## Category boundary

포함 범위:

- Next/App Router의 최초 실행 경계와 content aggregate를 소비하는 첫 route
- Domain JSON/type/aggregate, presentation contract, selector policy
- Runtime domain/presentation schema, starter catalog migration
- Source-aware parsing, cross-file integrity, validated facade, local asset validation과 content build gate

제외 범위:

- Node/npm pinning, container/production server smoke, release delivery는 category 08에서 다룹니다.
- Content·selector·view-model·asset regression test 구현과 실행은 category 07에서 다룹니다.
- Visual system, responsive behavior, route renderer 구현 자체는 해당 UI/visual category에서 다룹니다.

## Phase 1 audit 결과

- 기존 6개 draft Thread의 범위는 핵심 trust transition을 누락했습니다. Domain schema와 presentation schema를 분리하고 parsing, repository-wide integrity, validated facade/build gate Thread를 추가해 총 10개로 보강했습니다.
- `f66b880a8f97`은 category 08의 reproducible toolchain/production verification story에 이미 속하므로 T1에서 제거했습니다.
- `0a28cb050bc8`은 `globals.css`를 만들고 다음 application integration이 이를 import하므로 T1에 추가했습니다.
- Presentation-only commits `61d1976cde0d`, `a6c72a6b3b34`, `20dfc298375c`는 starter catalog에서 presentation Thread로 이동했습니다. `d55a2017e725`, `9a7d41edfad0`, `8886459d1b0d`, `13c8c52c54d9`도 누락된 중간 계약/완성 단계로 추가했습니다.
- Selector consumers `daa6815a6dfa`, `383a3b86e119`를 추가해 policy 정의와 실제 renderer/route migration을 연결했습니다.
- 모든 commit SHA·subject·importance·tags는 target branch source classification과 exact commit metadata에 대조했습니다. 선택된 SHA는 모두 `web/portfolio` history에 속합니다.

## Thread index

| 순서 | Thread | Commit 수 |
| ---: | --- | ---: |
| 1 | [Runnable Next application boundary](./01-runnable-next-application-boundary.md) | 4 |
| 2 | [Portfolio domain and aggregate model](./02-portfolio-domain-and-aggregate-model.md) | 7 |
| 3 | [Presentation contracts for multi-route UI](./03-presentation-contracts-for-multi-route-ui.md) | 15 |
| 4 | [Selectors, links, and derived content policy](./04-selectors-links-and-derived-content-policy.md) | 9 |
| 5 | [Runtime schema vocabulary](./05-runtime-schema-vocabulary.md) | 12 |
| 6 | [Runtime presentation schema contracts](./06-runtime-presentation-schema-contracts.md) | 13 |
| 7 | [Starter catalog migration](./07-starter-catalog-migration.md) | 7 |
| 8 | [Source-aware schema parsing boundary](./08-source-aware-schema-parsing-boundary.md) | 4 |
| 9 | [Repository-wide content integrity](./09-repository-wide-content-integrity.md) | 9 |
| 10 | [Validated facade, assets, and build gate](./10-validated-facade-assets-and-build-gate.md) | 6 |

## Historical inspection discipline

- 각 commit은 exact SHA의 diff와 resulting tree를 기준으로 설명합니다.
- Later code는 earlier commit의 사실로 소급하지 않습니다.
- Shape validation, cross-file integrity, asset filesystem validation, selector fallback을 서로 다른 failure domain으로 구분합니다.
- 이번 환경에서는 GitHub 도메인 DNS 차단으로 local checkout과 repository test/build command를 실행하지 못했습니다. 실행 결과를 만들지 않았으며, GitHub connector를 통한 branch/commit/file 정적 검토만 기록했습니다.

## Workbook 상태

- `scaffold/`는 Phase 1 종료 시 동결한 authoritative investigation structure입니다.
- `completed/`는 fixed scaffold information을 그대로 보존하고 learner-facing section만 채운 counterpart입니다.
- 두 directory의 filename과 relative path는 정확히 일치합니다.
