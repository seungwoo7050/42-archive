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
- **직전 관련 상태:** parser가 dense ranks를 만들고 11개 operation이 존재하지만, 정렬 command를 선택하는 함수는 없었습니다.
- **이 commit의 구현 역할:** `caa54cb306ad:src/sort.c:sort_two`는 두 rank가 역순일 때 `sa` 한 번을 호출합니다. `sort_three`는 3개 rank의 다섯 unsorted permutation을 직접 분기해 모두 emitting wrapper로 바꿉니다.
- **핵심 state transition 또는 boundary:** 세 rank를 `(top,middle,bottom)`으로 쓰면 `1 0 2 → sa`, `2 1 0 → sa,rra`, `2 0 1 → ra`, `0 2 1 → sa,ra`, `1 2 0 → rra`입니다. size 0/1 또는 이미 정렬이면 command가 없습니다.
- **failure/no-op/edge:** 이 SHA의 sorter는 size가 3을 넘으면 아무 일반 알고리즘도 수행하지 않습니다. operation/output API도 아직 실패를 반환하지 않습니다.
- **이후 연결:** `160d1fb8d824`가 4~5개를 3개 문제로 축소하고, Thread 4의 `5b7559278909`가 size 2~5의 모든 152개 permutation을 독립 replay합니다.
- **Thread의 다음 관련 commit:** `160d1fb8d824`는 최소 rank를 어떤 회전 방향으로 top에 올리고 B에 쌓아 3개 정렬을 재사용하는가?

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
- **직전 관련 상태:** 직접 case analysis는 최대 3개만 처리했습니다.
- **이 commit의 구현 역할:** `160d1fb8d824:src/sort.c:find_rank_index`로 다음 최소 rank의 위치를 찾고, `move_index_to_top`이 `index <= size / 2`이면 `ra`를 index회, 아니면 `rra`를 `size-index`회 호출합니다. A가 3개가 될 때까지 target rank를 증가시키며 `pb`합니다.
- **핵심 state transition 또는 boundary:** size 4는 rank 0 하나를 B로 보내고, size 5는 rank 0 뒤 rank 1을 B로 보냅니다. 두 번째 push 뒤 B top은 1, 그 아래는 0입니다. 남은 3개를 정렬한 뒤 `pa`를 반복하면 1이 먼저, 0이 나중에 top에 올라 최종 A의 prefix가 `0,1`이 됩니다.
- **failure/no-op/edge:** target은 dense rank라 반드시 A에서 발견된다는 parser invariant를 사용합니다. 이 SHA에서도 operation failure를 표현하지 않습니다.
- **이후 연결:** `1463a193a4f9`가 bounded case를 넘어서는 general mechanism을 추가하며, exhaustive tiny test가 이 축소 논리를 검증합니다.
- **Thread의 다음 관련 commit:** `1463a193a4f9`는 각 bit round에서 zero/one group의 상대 순서를 어떤 두 stack operation 조합으로 안정적으로 유지하는가?

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
- **이 commit 직전 상태:** `160d1fb8d824`까지 size 0~5는 처리하지만 size 6 이상은 정렬되지 않았습니다. parser는 이미 ranks를 `0..n-1`로 제한하고 있었습니다.
- **해결하려던 문제:** 허용 operation만으로 임의 크기 input을 결정적으로 정렬하면서, 이미 처리한 낮은 bit 순서를 다음 높은 bit pass가 파괴하지 않아야 했습니다.
- **기존 설계가 충분하지 않았던 이유:** tiny permutation 분기를 일반 크기로 확장하면 상태 수가 factorial로 증가합니다. 단순히 bit가 0인 원소를 B에 push한 뒤 임의로 복원하면 group 내부 순서가 깨져 LSD radix의 귀납 조건이 성립하지 않습니다.
- **핵심 결정:** `1463a193a4f9:src/sort.c:radix_sort`는 `size - 1`에서 필요한 bit 수만 계산하고, 각 pass 시작의 `a->size`를 `round_size`에 고정합니다. 매 iteration의 현재 top bit가 1이면 `ra`, 0이면 `pb`하고, 정확히 `round_size`개를 처리한 뒤 B가 빌 때까지 `pa`합니다.

```c
/* 1463a193a4f9:src/sort.c:radix_sort의 핵심 분기 */
round_size = a->size;
while (index < round_size)
{
    if (((a->ranks[0] >> bit) & 1) != 0)
        op_ra(a, 1);
    else
        op_pb(a, b, 1);
    index++;
}
while (b->size > 0)
    op_pa(a, b, 1);
```

- **state / invariant / ownership / lifecycle 변화:** 새로운 allocation이나 ownership은 없습니다. 한 pass에서 bit 1 원소는 A 내부 rotate 순서로 유지됩니다. bit 0 원소는 `pb`로 B에 들어갈 때 한 번 역순이 되고, B 전체를 `pa`할 때 다시 역순이 되어 원래 상대 순서를 회복합니다. pass 종료마다 B는 empty이고 A는 해당 bit까지 stable-sorted 상태입니다.
- **failure scenario:** loop 조건을 현재 `a->size`로 두면 `pb` 때 size가 줄어 일부 시작 원소를 검사하지 못합니다. zero group을 한 번만 reverse하거나 B를 완전히 비우지 않으면 낮은 bit 정렬이 무너집니다. bit 수를 값의 32비트로 잡으면 불필요한 pass가 생기고, 너무 적게 잡으면 최대 rank를 구분하지 못합니다.
- **이 commit이 보장하는 것:** 유효한 dense unique ranks와 정상 operation을 전제로 size>5에서 bit별 stable partition을 수행하고, 마지막에 B empty/A rank ascending 상태에 도달하는 algorithm을 제공합니다. command 수는 각 bit마다 A 검사 `n`회와 zero 복원 최대 `n`회이므로 `Θ(n log n)`입니다.
- **아직 보장하지 않는 것:** 이 SHA 자체에는 독립 correctness, command budget, resource movement, I/O failure 증거가 없습니다. 배열 기반 `pb`/`pa`/rotate는 각 command 내부에서 `memmove`하므로 logical command complexity가 곧 CPU memory movement complexity는 아닙니다.
- **후속 fix/test:** `5b7559278909`가 Python list replay와 product checker로 tiny/radix 결과를 검증하고, `a16dde75d935`·`23198a9cdd55`가 deterministic command budget을, `6569949742eb`가 physical pair movement를 별도 계측합니다. write failure propagation은 `315f4b91779b`에서 sorter return path 전체에 추가됩니다.
- **Thread의 다음 관련 commit:** `cf07495c97f7`은 parser가 만든 ranked A와 auxiliary B를 어떤 ownership/cleanup 순서로 이 sorter에 연결하는가?

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
- **직전 관련 상태:** model, parser, operation, sorter는 개별 모듈로 존재하지만 generator executable의 top-level lifetime이 없었습니다.
- **이 commit의 구현 역할:** `cf07495c97f7:src/push_swap.c:main`이 A를 parse하고 A capacity와 같은 empty B를 할당한 뒤 `sort_stack(&a,&b)`을 호출하고 두 stack을 해제합니다. Makefile은 common objects와 generator main을 `push_swap`으로 링크합니다.
- **핵심 state transition 또는 boundary:** parse 실패는 아직 stack ownership이 caller에 확정되지 않은 오류이고, B allocation 실패는 이미 소유한 A를 해제한 뒤 `Error\n`과 status 1로 종료합니다. 정상·empty·already-sorted 모두 최종적으로 A/B를 free합니다.
- **failure/no-op/edge:** 이 SHA의 `sort_stack`과 `ps_putstr_fd`는 `void`입니다. 따라서 private stack이 정렬됐더라도 stdout write가 실패한 사실을 main이 알 수 없고 status 0을 반환할 수 있습니다.
- **이후 연결:** Thread 4가 executable output의 correctness/cost를 검증하고, `315f4b91779b`가 output failure를 operation→sorter→main 끝까지 전파합니다.
- **Thread 내 다음 commit:** 없음. Thread 최종 상태에서 이 commit의 남은 역할을 정리합니다.

## 6. Invariant ledger

| Invariant / contract | 처음 도입 | 강화 | 부족함이 드러난 지점 | fix | regression / evidence | 학습자 확인 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| tiny sort 후 A 정렬 / B 최종 비움 | caa54cb306ad | 160d1fb8d824 | - | - | Thread 4의 5b7559278909에서 exhaustive small-state 검증 | 2~3개는 direct cases, 4~5개는 successive minima를 B에 격리한 뒤 3개 정렬과 역순 `pa` 복원으로 완료됩니다. |
| radix pass의 stable partition | 1463a193a4f9 | - | - | - | 5b7559278909 및 후속 deterministic sort tests | one group은 `ra` 순서를 유지하고 zero group은 `pb`/전체 `pa`의 두 번 reverse로 순서를 회복합니다. |
| 각 radix bit 종료 시 B empty | 1463a193a4f9 | - | - | - | 독립 replay에서 final B empty를 확인 | 매 round가 `while (b->size > 0) pa`로 끝나므로 다음 bit는 전체 원소가 A에 있는 동일한 시작 형태를 사용합니다. |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| tiny direct case로 일반 입력을 처리할 수 없음 | 1463a193a4f9의 general radix mechanism | - | Thread 4의 independent replay | factorial case expansion 대신 dense rank의 유한 bit를 순서대로 stable partition합니다. |
| zero-bit group의 상대 순서가 깨져 lower-bit ordering 손실 | push-to-B 후 전체 `pa`로 두 번 reverse되는 stable partition | - | 5b7559278909 | `pb`만 보면 zero group이 역순이지만, 모두 `pa`하면 두 번째 reverse로 원순서가 복원됩니다. |
| B allocation 또는 parse 실패 | cf07495c97f7의 main cleanup flow | - | 후속 fault-injection Thread 6 | parse 실패는 error 종료, B 실패는 이미 소유한 A를 먼저 free합니다. Nth-allocation sweep이 후속 검증합니다. |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| stack A | ranked input은 존재하지만 executable owner 없음 | cf07495c97f7 | main이 parse 성공 후 소유하고 sort 뒤 항상 해제 | `cf07495c97f7:src/push_swap.c:main` |
| auxiliary stack B | tiny extension의 caller가 전달할 대상으로만 존재 | cf07495c97f7 | main이 A capacity로 할당하고 sorter가 임시 원소를 보관하며 종료 시 해제 | `cf07495c97f7:src/push_swap.c:main` |
| sort dispatcher | size<=3 범위부터 시작 | 160d1fb8d824, 1463a193a4f9 | size<=5 tiny, 그 이상 radix로 선택 | `1463a193a4f9:src/sort.c:sort_stack` |
| operation wrapper / stdout command stream | operation은 emit 가능하지만 top-level consumer 없음 | cf07495c97f7 | sorter가 `emit=1` wrapper로 state mutation과 command stream을 동시에 생성 | `cf07495c97f7:src/sort.c`, `src/operations.c` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** ranked A가 size에 따라 direct tiny 또는 stable LSD radix 경로로 들어갑니다. tiny는 최대 두 최소 rank를 B에 격리해 3개 정렬을 재사용하고, radix는 bit마다 시작 A size를 고정해 `ra`/`pb`로 stable partition한 뒤 B를 모두 `pa`합니다. `push_swap` main은 A/B를 소유하고 sorter가 emitting wrappers로 명령을 생성한 뒤 두 stack을 정리합니다.
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** `cf07495c97f7` 시점에는 write 결과가 무시되어 완전한 external stream 전달을 성공 조건으로 삼지 못합니다. correctness independence, deterministic cost, memory movement, sanitizer는 Thread 4, write failure는 Thread 6이 담당합니다. 이 환경에서는 tests를 실행하지 않았으며 해당 SHA의 코드와 test 설계만 확인했습니다.

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: `ranked A → size 기반 tiny/radix 선택 → shared operations로 state mutation + emission → B empty / A sorted → main cleanup`
- **학습자 최종 flow:** `e09cf45e21cd`가 만든 dense-ranked A → `1463a193a4f9:sort_stack`이 size<=5면 `sort_tiny`, 그 이상이면 `radix_sort` 선택 → sorter가 `op_*`를 `emit=1`로 호출해 A/B state와 stdout stream을 함께 진행 → tiny 복원 또는 각 radix pass 종료에서 B를 비우고 최종 A를 정렬 → `cf07495c97f7:main`이 A/B를 해제합니다.
- **실제 코드 삽입:** general decision은 위 `round_size` 고정, top bit에 따른 `ra`/`pb`, B 전체 `pa` 구문입니다. 이는 현재 size가 줄어도 round 시작 원소를 정확히 한 번씩 처리하고 zero group을 두 번 reverse합니다.

## 11. 학습 완료 자가 점검
- [x] Thread commit 순서를 source와 동일하게 유지했습니다.
- [x] 모든 commit에서 지정된 SHA의 코드를 직접 확인했습니다.
- [x] final HEAD를 과거 commit 설명에 소급 사용하지 않았습니다.
- [x] Source-confirmed fact와 직접 코드 확인 결과를 구분했습니다.
- [x] S/A commit은 decision, invariant, ownership/failure, 후속 evidence까지 추적했습니다.
- [x] B commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/boundary만 충분히 확인했습니다.
- [x] test commit마다 production invariant, failure/boundary, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] fix commit은 기존 가정 → failure/risk → root cause → 수정 invariant → 실제 코드 → regression evidence 순서로 연결했습니다.
- [x] Invariant ledger와 Failure → Fix → Test 표를 실제 코드 근거로 채웠습니다.
- [x] 별도 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 실패/위험 → 수정/검증 흐름을 commit history에 근거해 설명할 수 있습니다.
