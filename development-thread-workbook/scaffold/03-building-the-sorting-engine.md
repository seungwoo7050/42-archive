# Thread: Building the sorting engine

## 1. Thread 목표
- **Source significance:** The thread separates bounded small-state optimization from the scalable general mechanism. Tiny sorting minimizes avoidable setup for at most five elements, while radix sorting supplies deterministic `Θ(n log n)` command behavior for larger inputs. The final integration commit is important operationally but does not duplicate the algorithmic significance of the radix decision.
- **학습 목표:** 작은 입력의 bounded case analysis와 큰 입력의 stable LSD binary radix가 어떻게 분리되고, 최종 `push_swap` 실행 흐름에서 하나의 command-generation 경로로 연결되는지 복원합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문
- 2~3개 입력의 각 unsorted rank pattern이 어떤 최소 command sequence로 매핑되는가?
- 4~5개 입력에서 최소 rank를 B로 옮기는 순서와 짧은 회전 방향 선택은 어떻게 구현되는가?
- radix pass에서 one-bit group과 zero-bit group의 상대 순서가 왜 보존되는가?
- 각 bit round의 시작 A size를 고정해서 정확히 그 수만큼 검사하는 이유는 무엇인가?
- `push_swap` main이 A/B ownership, sort invocation, command emission, cleanup을 어떤 순서로 조합하는가?

## 3. 완료 기준
- 2~5개 입력의 대표 state를 실제 명령과 stack 변화로 손으로 추적했습니다.
- 1463a193a4f9에서 bit count, per-round loop, `ra`/`pb` partition, `pa` restore를 코드로 확인했습니다.
- stable partition을 operation sequence와 연결해 설명할 수 있습니다.
- command complexity와 array-backed physical movement cost를 혼동하지 않고 설명할 수 있습니다.
- cf07495c97f7의 success/failure cleanup 경로와 이 시점의 I/O 한계를 확인했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source-confirmed role |
| --- | --- | --- | --- | --- | --- |
| 1 | `caa54cb306ad` | feat(sort): 세 개 이하의 스택을 정렬 | B | CORE, SORT | Handles the complete two- and three-element state space directly. |
| 2 | `160d1fb8d824` | feat(sort): 네다섯 개의 스택을 정렬 | B | CORE, SORT | Reduces four and five elements to the verified three-element case through B. |
| 3 | `1463a193a4f9` | feat(sort): 큰 입력을 기수 정렬로 처리 | S | CORE, SORT, HARD | Introduces stable LSD binary radix sorting for the general case. |
| 4 | `cf07495c97f7` | feat(push_swap): 정렬 명령 생성 흐름을 연결 | B | CORE, INTEGRATION | Integrates parsing, B allocation, sorting, emission, and cleanup into `push_swap`. |

### Source에서 직접 연결된 invariant / engineering difficulty
- **Major engineering difficulties**
  - Designing a stable radix partition using only the permitted stack operations and proving that lower-bit order survives later passes.

## 5. Commit별 학습 기록

> 모든 코드 확인은 반드시 해당 commit SHA 시점에서 수행합니다. final HEAD의 구현을 소급해 해석하지 않습니다.

### `caa54cb306ad` — feat(sort): 세 개 이하의 스택을 정렬
- **Importance:** B
- **Tags:** CORE, SORT
- **Source-confirmed role:** Handles the complete two- and three-element state space directly.
- **Classification summary:** Implements direct two- and three-element sorting by relative-rank case analysis.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only caa54cb306ad`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `caa54cb306ad` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- size < 2 / already sorted early return을 확인합니다.
- 2-element case의 rank 비교와 최대 1회 swap 조건을 확인합니다.
- 3-element의 5개 unsorted relative-order case를 실제 조건식과 emitted command sequence로 표로 복원합니다.
- 모든 state change가 emitting operation wrapper를 통과하는지 확인합니다.
- 이 SHA에서 size > 3에 대한 동작이 의도적으로 아직 없는 경계를 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `160d1fb8d824`와 비교할 질문을 한 문장으로 작성합니다.

### `160d1fb8d824` — feat(sort): 네다섯 개의 스택을 정렬
- **Importance:** B
- **Tags:** CORE, SORT
- **Source-confirmed role:** Reduces four and five elements to the verified three-element case through B.
- **Classification summary:** Reduces four- and five-element inputs by moving successive minima to B before sorting three.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 160d1fb8d824`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `160d1fb8d824` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- 현재 stack에서 next smallest rank 위치를 찾는 함수/loop를 확인합니다.
- target index에 따라 forward/reverse rotation 중 짧은 방향을 선택하는 조건을 확인합니다.
- A가 3개 남을 때까지 minimum을 B로 보내는 횟수와 rank 0/1의 순서를 추적합니다.
- 3-element sorter 호출 후 B의 요소를 `pa`로 복원했을 때 최종 rank 순서가 되는 이유를 실제 stack trace로 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `1463a193a4f9`와 비교할 질문을 한 문장으로 작성합니다.

### `1463a193a4f9` — feat(sort): 큰 입력을 기수 정렬로 처리
- **Importance:** S
- **Tags:** CORE, SORT, HARD
- **Source-confirmed role:** Introduces stable LSD binary radix sorting for the general case.
- **Classification summary:** Implements stable least-significant-bit binary radix sorting for inputs larger than five.

#### Source-confirmed context
- **Problem:** Direct case analysis is practical only for a bounded tiny state space. The general case needs a legal command sequence with predictable growth while preserving ordering established by previously processed bits.
- **Decision:** Apply stable LSD binary radix passes to dense ranks: rotate one-bit elements in A, push zero-bit elements to B, then push all of B back before advancing to the next bit.
- **Why it mattered:** Rotation preserves the one group, and the two reversals experienced by the zero group preserve its order. Each round therefore performs a stable partition, so later bits do not destroy lower-bit ordering. B returns to empty after every round, simplifying the next pass and the final correctness condition.
- **What changed:** The commit derives the necessary bit count from `size - 1`, scans exactly the round's starting A size, partitions by each bit with `ra` and `pb`, restores zeros with `pa`, and routes inputs above five to this strategy.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 1463a193a4f9`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `1463a193a4f9` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- `size - 1`에서 필요한 bit count를 계산하는 코드를 확인합니다.
- 각 bit pass 시작 시 검사할 A의 원래 size를 고정하고 정확히 그 횟수만 loop하는지 확인합니다.
- bit=1이면 `ra`, bit=0이면 `pb`로 partition하는 branch를 확인합니다.
- B의 모든 요소를 `pa`로 복원하는 loop와 각 pass 종료 시 B-empty 상태를 확인합니다.
- one group의 rotation 안정성과 zero group의 two reversals를 구체적 rank 예제로 코드 실행 순서와 연결합니다.
- logical command count와 array `memmove` physical cost가 다른 레이어에서 발생함을 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 핵심 기록 — S
- **이 commit 직전 상태:** [직전 관련 SHA에서 representation/API/algorithm이 어디까지 존재했는지 코드로 작성]
- **해결하려던 문제:** [Source-confirmed Problem과 실제 이전 코드의 한계를 연결해 작성]
- **기존 설계가 충분하지 않았던 이유:** [구체적 state/protocol/algorithm gap 기록]
- **핵심 결정:** [Source-confirmed Decision이 실제 코드 구조로 어떻게 나타나는지 작성]
- **state / invariant / ownership / lifecycle 변화:** [변경 전 → 변경 후를 실제 필드·소유자·호출 순서로 작성]
- **failure scenario:** [이 결정이 없거나 잘못 구현됐을 때 깨지는 구체적 경로를 작성]
- **이 commit이 보장하는 것:** [이 SHA의 code+tests 범위에서만 작성]
- **아직 보장하지 않는 것:** [후속 commit이 필요했던 부분을 source와 history에 근거해 작성]
- **후속 fix/test:** [source에서 연결되는 후속 commit과 무엇을 강화/검증하는지 기록]
- **Thread의 다음 관련 commit:** `cf07495c97f7`와 비교할 질문을 한 문장으로 작성합니다.

### `cf07495c97f7` — feat(push_swap): 정렬 명령 생성 흐름을 연결
- **Importance:** B
- **Tags:** CORE, INTEGRATION
- **Source-confirmed role:** Integrates parsing, B allocation, sorting, emission, and cleanup into `push_swap`.
- **Classification summary:** Links parsing, auxiliary-stack allocation, sorting, cleanup, and the `push_swap` executable.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only cf07495c97f7`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `cf07495c97f7` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- `main`의 parse A → allocate B → `sort_stack` → free A/B 순서를 success path에서 추적합니다.
- parse failure와 B allocation failure에서 canonical error, exit status, 이미 소유한 A cleanup을 확인합니다.
- empty/already-sorted input도 동일한 stack lifetime cleanup을 거치는지 확인합니다.
- common objects와 generator-specific control flow가 Makefile에서 어떻게 링크되는지 확인합니다.
- 이 SHA의 output helper가 write failure를 아직 반환하지 않는다는 한계를 실제 API signature/caller에서 확인하고, 후속 `315f4b91779b`와 연결합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread 내 다음 commit:** 없음. Thread 최종 상태에서 이 commit의 남은 역할을 정리합니다.

## 6. Invariant ledger

| Invariant / contract | 처음 도입 | 강화 | 부족함이 드러난 지점 | fix | regression / evidence | 학습자 확인 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| tiny sort 후 A 정렬 / B 최종 비움 | caa54cb306ad | 160d1fb8d824 | - | - | Thread 4의 5b7559278909에서 exhaustive small-state 검증 | [해당 SHA 코드 근거 작성] |
| radix pass의 stable partition | 1463a193a4f9 | - | - | - | 5b7559278909 및 후속 deterministic sort tests | [해당 SHA 코드 근거 작성] |
| 각 radix bit 종료 시 B empty | 1463a193a4f9 | - | - | - | 독립 replay에서 final B empty를 확인 | [해당 SHA 코드 근거 작성] |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| tiny direct case로 일반 입력을 처리할 수 없음 | 1463a193a4f9의 general radix mechanism | - | Thread 4의 independent replay | [실제 branch와 연결] |
| zero-bit group의 상대 순서가 깨져 lower-bit ordering 손실 | push-to-B 후 전체 `pa`로 두 번 reverse되는 stable partition | - | 5b7559278909 | [실제 branch와 연결] |
| B allocation 또는 parse 실패 | cf07495c97f7의 main cleanup flow | - | 후속 fault-injection Thread 6 | [실제 branch와 연결] |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| stack A | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| auxiliary stack B | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| sort dispatcher | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| operation wrapper / stdout command stream | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** [이 Thread의 마지막 commit까지 source가 확정한 상태를 commit map과 invariant ledger를 이용해 학습자가 한 문단으로 재구성]
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** [source가 명시한 후속 hardening 또는 verification만 연결하고 임의의 개선안을 정답처럼 추가하지 않음]

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: `ranked A → size 기반 tiny/radix 선택 → shared operations로 state mutation + emission → B empty / A sorted → main cleanup`
- **학습자 최종 flow:** [각 화살표마다 실제 `SHA:path:symbol`을 붙여 호출·state mutation·ownership·failure 경로를 다시 작성]
- **실제 코드 삽입:** [핵심 decision을 설명하는 최소 코드만 해당 SHA에서 인용. full function 또는 final HEAD 코드 복사는 피함]

## 11. 학습 완료 자가 점검
- [ ] Thread commit 순서를 source와 동일하게 유지했습니다.
- [ ] 모든 commit에서 지정된 SHA의 코드를 직접 확인했습니다.
- [ ] final HEAD를 과거 commit 설명에 소급 사용하지 않았습니다.
- [ ] Source-confirmed fact와 직접 코드 확인 결과를 구분했습니다.
- [ ] S/A commit은 decision, invariant, ownership/failure, 후속 evidence까지 추적했습니다.
- [ ] B commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/boundary만 충분히 확인했습니다.
- [ ] test commit마다 production invariant, failure/boundary, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] fix commit은 기존 가정 → failure/risk → root cause → 수정 invariant → 실제 코드 → regression evidence 순서로 연결했습니다.
- [ ] Invariant ledger와 Failure → Fix → Test 표를 실제 코드 근거로 채웠습니다.
- [ ] 별도 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 실패/위험 → 수정/검증 흐름을 commit history에 근거해 설명할 수 있습니다.
