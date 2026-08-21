# Browser application architecture Development Thread workbook

- 카테고리: `06-browser-application-architecture` — 브라우저 애플리케이션 아키텍처
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- 동결 Thread: 8개
- Commit mapping: 83개, 고유 SHA 82개

## 1. 카테고리 경계

이 카테고리는 browser application이 직접 소유하는 Next.js runtime과 shell, navigation identity, HTTP adapter, resource screen, realtime transport/reducer/hook, React Query cache, authoritative snapshot projection, user input, guest presentation policy를 다룹니다.

다음은 이 카테고리의 주된 소유 범위가 아닙니다.

- server simulation, `GameHub` room lifecycle, persistence transaction과 database migration
- shared protocol 생산자 자체의 전체 발전사
- container orchestration, database readiness, metrics, drain 등 운영 subsystem 전체
- guest identity·ticket·result 보존의 server 구현 전체

browser가 이들을 소비하거나 표현하는 경계는 포함하지만 server-side 구현은 upstream dependency 또는 다른 카테고리의 근거로 구분합니다.

## 2. Phase 1 audit 결과

초기 category scaffold는 6개 Thread와 62개 commit mapping으로 구성되어 있었습니다. 실제 브랜치 역사를 대조한 뒤 8개 Thread와 83개 mapping으로 보정했습니다.

- 기존 `Application shell·resource screen·API adapter` Thread는 runtime/navigation, HTTP trust boundary, server-backed screen이라는 독립된 소유권 이야기를 한 문서에 묶고 있어 3개 Thread로 분리했습니다.
- 초기 play route는 generic screen 목록에서 authoritative rendering/input Thread로 이동했습니다.
- production web start, lobby writer/live metrics/socket, match-chat writer, cookie-only credential 전환, API/query regression, reconnect, room-scoped chat, guest browser E2E 등 실제 fix·test가 전제로 삼는 누락 commit을 추가했습니다.
- generic investigation 문구를 각 SHA의 실제 파일·함수·state·cleanup·negative branch를 지목하는 작업으로 교체했습니다.
- source classification의 subject, importance, tags와 commit 순서를 유지했습니다.
- 선택된 browser history에는 A/B importance만 존재하므로 학습 깊이를 인위적으로 S/C로 재분류하지 않았습니다.

### 의도적 중복 SHA

`4f5199097284`는 이 category의 유일한 의도적 중복입니다.

- Thread 04는 `GameSocketClient`, reducer, hook, play control의 fresh-ticket reconnect와 duplicate match intent 차단만 다룹니다.
- Thread 08은 `HomePage`와 `demoPolicy`의 active-room route recovery와 transient result notice만 다룹니다.
- 같은 SHA를 사용하지만 조사 파일과 책임이 겹치지 않으며 한 commit이 실제로 두 browser subsystem을 함께 수정한 사실을 보존합니다.

## 3. 동결 Thread 목록

| 순서 | 파일 | Thread | Commit 수 |
| ---: | --- | --- | ---: |
| 1 | [`01-application-shell-auth-entry-and-navigation-identity.md`](01-application-shell-auth-entry-and-navigation-identity.md) | Application shell·auth entry·navigation identity | 11 |
| 2 | [`02-browser-http-adapter-runtime-validation-and-cookie-credentials.md`](02-browser-http-adapter-runtime-validation-and-cookie-credentials.md) | Browser HTTP adapter·runtime validation·cookie credentials | 6 |
| 3 | [`03-resource-screens-actions-and-truthful-server-state.md`](03-resource-screens-actions-and-truthful-server-state.md) | Resource screens·actions·truthful server state | 14 |
| 4 | [`04-game-connection-reducer-and-transport-client.md`](04-game-connection-reducer-and-transport-client.md) | Game connection reducer와 transport client | 9 |
| 5 | [`05-game-connection-hook-migration-and-legacy-removal.md`](05-game-connection-hook-migration-and-legacy-removal.md) | Game connection hook 전환과 legacy 제거 | 11 |
| 6 | [`06-react-query-cache-ownership-and-invalidation.md`](06-react-query-cache-ownership-and-invalidation.md) | React Query cache ownership과 invalidation | 10 |
| 7 | [`07-authoritative-snapshot-rendering-and-input.md`](07-authoritative-snapshot-rendering-and-input.md) | Authoritative snapshot rendering과 입력 | 10 |
| 8 | [`08-guest-browser-policy-and-transient-results.md`](08-guest-browser-policy-and-transient-results.md) | Guest browser policy와 transient results | 12 |

## 4. 역사 및 근거 규율

- 지정 브랜치의 `commit/commit-importance.md`는 이 branch가 root `72ac4c1870f`부터 HEAD `71c5c13480f0`까지 433개인 독립 선형 역사라고 명시합니다.
- 모든 선택 SHA는 해당 branch source classification에 존재하고 GitHub exact-SHA commit inspection으로 resolve됨을 확인했습니다.
- 각 구현 설명은 해당 SHA의 diff와 당시 파일만 사용합니다. final HEAD 코드를 이전 commit의 동작으로 사용하지 않습니다.
- server-side upstream commit은 browser consumer가 의존하는 contract를 설명할 때만 명시적으로 구분해 언급합니다.
- 실제로 실행하지 않은 test, build, browser command에는 성공 결과를 기록하지 않습니다.

## 5. Phase 2 실행 환경

이 작업 환경에서는 외부 DNS 제한으로 repository를 로컬 checkout할 수 없었습니다. 따라서 project source의 build/test/E2E command는 실행하지 않았고, GitHub connector를 사용한 exact-SHA 정적 inspection만 수행했습니다.

실제로 실행한 검증은 생성된 workbook 자체의 파일 대응, commit metadata 보존, placeholder 제거, scaffold freeze hash, Markdown 기본 형식, ZIP member와 CRC 검사입니다.

## 6. Phase 2 완료 기록

- [x] frozen scaffold 8개 Thread와 completed 8개 Thread가 1:1로 대응합니다.
- [x] README를 포함한 상대 경로와 파일명이 동일합니다.
- [x] commit SHA, subject, importance, tags, role, commit order를 frozen scaffold와 동일하게 유지했습니다.
- [x] 각 SHA의 concrete investigation task를 보존하고 learner-facing 기록을 exact-SHA evidence로 채웠습니다.
- [x] fix/test는 이전 가정·failure·root cause·corrected invariant·증명/비증명 범위에 연결했습니다.
- [x] unfinished placeholder가 completed에 남지 않았습니다.
- [x] project command를 실행하지 않았다는 제한을 명시하고 runtime pass evidence를 만들지 않았습니다.
- [x] local structural/hash/archive validation을 실행해 통과한 경우에만 이 파일과 ZIP을 산출했습니다.
