# Full-site visual systems

> Repository: `seungwoo7050/42-archive`
>
> Branch: `web/portfolio`
>
> Category: `05-full-site-visual-systems`
>
> Audited branch span: `cce7dd020563` → `aff0acdd4cf9`

## Category boundary

이 category는 다섯 full-site visual system의 독립 renderer 구축과 그 renderer들을 공통 route/shell/input/test 계약에 연결하는 history를 다룹니다.

- 포함: cross-design registry·delegation·prepared renderer input·token/shell boundary·activation·regression, Editorial/Brutalist/Cinematic full construction, Design/Classic route-module extraction.
- 제외: content schema 자체의 최초 설계, 일반 App Router lifecycle, shared interaction primitive의 독립 history, deployment/CI, formatting-only C commit.
- 예외적으로 `8a48460df4c3`와 `aef265b9bd01`은 content view-model construction이 아니라 **모든 renderer에 적용되는 ownership transfer**이므로 Thread 1에 포함했습니다.

## Phase 1 audit result

- Thread 수는 5개로 유지했습니다. 각 visual system의 독립 engineering story가 분명해 split/merge가 필요하지 않았습니다.
- 기존 scaffold의 generic investigation prompt를 exact file·function·selector group·failure/empty/reference/test task로 교체했습니다.
- Editorial과 Brutalist의 누락된 desktop→tablet→mobile construction 및 route composition commit을 복구했습니다.
- Cinematic의 `1f4c35853502`, `52f13fcc5a12`처럼 detail/resume/journey/interview 지면을 실제로 연결하는 중간 commit을 복구했습니다.
- `dc2cf72a768d`, `8a48460df4c3`, `aef265b9bd01`, `f8b0ab7b08aa`, `380b2a025070`처럼 architecture closure에 필요한 S/A commit을 cross-design Thread에 추가했습니다.
- activation commit `c6acfe562694`, `dd71d28143a8`, `b8de57f130eb`은 renderer 내부 construction Thread에서 제거하고 공통 registry ownership을 다루는 Thread 1로 이동했습니다.
- formatting-only C commit `ea073db5f785`, `4e54f8fef892`, `6fe74d2dd94d`, `87ac2ce7b285`은 material history를 바꾸지 않아 포함하지 않았습니다.
- frozen commit 수: **158개 고유 SHA** (1: 16, 2: 55, 3: 50, 4: 19, 5: 18).

## Frozen thread order

1. [Cross-design token, shell, and regression contracts](./01-cross-design-token-shell-and-regression-contracts.md)
2. [Editorial design system construction](./02-editorial-design-system-construction.md)
3. [Brutalist design system construction](./03-brutalist-design-system-construction.md)
4. [Cinematic design system construction](./04-cinematic-design-system-construction.md)
5. [Design and Classic renderer extraction](./05-design-and-classic-renderer-extraction.md)

## Study discipline

- 각 commit은 exact SHA의 parent diff와 resulting tree를 기준으로 읽습니다.
- final HEAD의 helper·file layout·test를 earlier SHA에 소급하지 않습니다.
- static inspection과 실제 command execution을 분리합니다.
- route별 missing/empty/unsupported/reference failure와 **보장하지 않는 것**을 반드시 남깁니다.
- S/A/B depth를 동일하게 만들지 않습니다.

## Phase 2 completion and validation

<!-- LEARNER-ANSWER:readme:completion:BEGIN -->
_Phase 2에서 completion·immutability·packaging 검증 결과를 기록합니다._
<!-- LEARNER-ANSWER:readme:completion:END -->
