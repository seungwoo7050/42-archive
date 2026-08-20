# Thread: From single allocations to rollback-safe ownership

## Thread 목표

**Source significance**

> The ownership model grows from one returned allocation to nested object graphs. `ft_split` establishes the decisive complete-or-rollback rule; list lifecycle callbacks generalize ownership to opaque caller data; `ft_lstmap` combines both concerns. The final failure harness demonstrates that cleanup holds at every intermediate acquisition point rather than only on successful examples.

### 이 Thread에 직접 연결된 source invariants

> Allocation size arithmetic must be validated before multiplication or addition so wrapped sizes are never passed to `malloc`.

> Multi-allocation constructors either return a complete result or release every resource acquired for the partial result; no partially owned root escapes on failure.

> List nodes and list content have separate lifetimes. A content destructor is invoked exactly according to the caller-supplied policy, and completed cleanup leaves the caller's head `NULL`.

### 이 Thread에 직접 연결된 engineering difficulties

> Rolling back nested allocations in `ft_split` and callback-produced node/content pairs in `ft_lstmap`.

> Reproducing allocation and write failures deterministically without changing the production API.

## 이 Thread를 이해하기 위한 핵심 질문

- single allocation의 size arithmetic 검증이 이후 multi-allocation builder의 전제가 되는가?
- 새 allocation의 ownership은 어느 시점에 caller 또는 container로 이전되는가?
- `ft_split`에서 root와 child field가 부분 생성된 상태는 어떻게 rollback되는가?
- list node와 opaque content의 수명 책임은 어떻게 분리되는가?
- `ft_lstmap`에서 callback 결과와 node allocation 사이 failure가 발생하면 누가 무엇을 해제하는가?
- deterministic allocator failure harness는 각 acquisition position을 어떻게 강제로 실패시키고 무엇을 측정하는가?

## 완료 기준

- multiplication/addition을 `malloc` 전에 검증하는 실제 코드를 찾고 이유를 설명할 수 있습니다.
- `ft_split`의 complete-or-rollback 경로를 allocation 순서대로 추적했습니다.
- `ft_lstclear`의 node/content 책임 분리와 `ft_lstmap` failure cleanup이 연결되는 지점을 확인했습니다.
- `fd3ae063139d`가 `ft_split`과 `ft_lstmap`의 각 allocation failure 위치를 실제로 강제하는 방법을 test code에서 확인했습니다.
- success ownership graph와 failure cleanup graph를 각각 그릴 수 있습니다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags | Source role |
| --- | --- | --- | --- | --- | --- |
| 1 | `3b1b30983876` | `feat(alloc): 0 초기화 메모리와 문자열 복제 추가` | A | SIZE_ARITH, OWNERSHIP, RISK | Establishes overflow-checked allocation sizes and the basic caller-owned allocation contract. |
| 2 | `6d076de7185e` | `feat(string): 부분 문자열 생성을 구현` | B | OWNERSHIP, SIZE_ARITH | Applies that contract to an exactly sized substring result. |
| 3 | `644b1c65444c` | `feat(string): 문자열 결합을 구현` | B | OWNERSHIP, SIZE_ARITH | Extends checked addition to joined strings. |
| 4 | `8c0a35a50878` | `feat(string): 실패 시 정리되는 문자열 분리 구현` | S | OWNERSHIP, CORE, RISK | Introduces a multi-allocation root whose partially built children are all released on failure. |
| 5 | `7a016ad8fd21` | `feat(list): 연결 리스트 순회와 삭제 구현` | A | LIST_LIFECYCLE, OWNERSHIP, RISK | Separates list-node lifetime from callback-defined content lifetime and provides complete clearing. |
| 6 | `6672ea67fae4` | `feat(list): 실패 시 정리되는 리스트 변환 구현` | A | LIST_LIFECYCLE, OWNERSHIP, RISK | Applies all-or-nothing ownership to callback-produced content and newly allocated list nodes. |
| 7 | `fd3ae063139d` | `test(alloc): 할당 실패와 rollback을 검증` | A | OWNERSHIP, TEST, RISK | Injects failure at each allocation position and measures leaks and invalid frees. |

## Commit별 학습 기록

### `3b1b30983876` — `feat(alloc): 0 초기화 메모리와 문자열 복제 추가`

**Source 확정 역할:** overflow-checked allocation size와 caller-owned single allocation contract의 기반을 만듭니다.

**Source 확정 위험:** `count * size` wrap은 논리 요청보다 작은 allocation을 만들 수 있으므로 multiplication 전에 검증해야 합니다.

#### 해당 SHA에서 확인할 코드

- `ft_calloc`에서 multiplication 가능 여부를 판단하는 조건과 그 조건이 `malloc`보다 먼저 실행되는지 확인합니다.
- zero product를 source 설명대로 one-byte allocation으로 처리하는 실제 branch를 찾습니다.
- allocation 성공 후 zeroing이 정확히 어떤 extent에 적용되는지 caller/callee를 추적합니다.
- `ft_strdup`에서 source length, terminator 포함 allocation size, copy, `NULL` failure return 순서를 확인합니다.
- 성공 시 반환 pointer의 ownership이 caller로 넘어가는 지점을 기록합니다.
- 이 commit의 parent와 비교해 public allocation API와 implementation module이 어떻게 추가되었는지 확인합니다.

#### 학습 기록

- 직전 상태:
- size arithmetic 위험:
- pre-allocation 검증 코드:
- zero-size policy:
- `ft_calloc` 성공 ownership:
- `ft_strdup` 성공 ownership:
- allocation failure path:
- 이 commit이 이후 builder에 제공하는 전제:

### `6d076de7185e` — `feat(string): 부분 문자열 생성을 구현`

**Source 확정 역할:** single allocation ownership contract를 exactly sized substring에 적용합니다.

#### 해당 SHA에서 확인할 코드

- null source failure branch를 확인합니다.
- `start >= source length`에서 독립적으로 free 가능한 empty string을 만드는 경로를 확인합니다.
- available suffix를 `text_length - start` 형태로 계산하는 지점을 찾습니다.
- requested length를 available span으로 clamp하는 순서를 확인합니다.
- allocation size와 explicit NUL termination을 확인합니다.
- 반환값이 source 내부 borrowed pointer가 아니라 새 allocation임을 코드에서 확인합니다.

#### 학습 기록

- 입력 범위 계산:
- overflow를 피하는 계산 형태:
- allocation 크기:
- ownership transfer:
- empty result 표현:
- 이 commit이 보장하는 것 / 보장하지 않는 것:

### `644b1c65444c` — `feat(string): 문자열 결합을 구현`

**Source 확정 역할:** joined string construction에 checked addition을 확장합니다.

#### 해당 SHA에서 확인할 코드

- null operand가 allocation 전에 거부되는지 확인합니다.
- left length + right length + terminator 계산이 wrap되지 않도록 검사하는 실제 조건을 기록합니다.
- left payload와 right payload/terminator가 어떤 순서로 copy되는지 확인합니다.
- 입력 두 문자열이 변경되지 않는지 write target을 기준으로 확인합니다.
- 성공 result의 단일 ownership과 failure 시 live allocation 유무를 기록합니다.

#### 학습 기록

- size addition 검증:
- allocation 이후 copy 순서:
- authoritative terminator 위치:
- input ownership / result ownership:
- 다음 multi-allocation commit과 다른 점:

### `8c0a35a50878` — `feat(string): 실패 시 정리되는 문자열 분리 구현`

**Source 확정 역할:** 첫 project-defining multi-allocation transaction을 도입합니다. 성공 시 complete root를 publish하고, 실패 시 이미 획득한 모든 child와 root를 해제합니다.

#### 변경 전 상태 확인

- `3b1b30983876`, `6d076de7185e`, `644b1c65444c`에서 single allocation의 성공/실패 ownership이 어떻게 단순했는지 비교합니다.
- 이 SHA의 parent에서 multi-allocation root를 반환하는 기존 pattern이 있는지 직접 확인하되, source에 없는 결론은 추정하지 않습니다.

#### 해당 SHA에서 확인할 실제 핵심 코드

- field count pass와 pointer-array allocation 순서를 확인합니다.
- root가 null-terminated representation이 되도록 초기화 또는 sentinel이 보장되는 지점을 확인합니다.
- consecutive delimiter를 skip하는 parsing 경로와 field span 계산을 찾습니다.
- 각 field가 언제 allocation되고 root의 어느 slot에 ownership이 연결되는지 추적합니다.
- field allocation 실패 branch에서 이미 생성된 field를 어떤 순서로 free하고 root를 언제 free하는지 확인합니다.
- cleanup helper가 partial result의 어느 상태를 입력으로 받는지 기록합니다.
- 실패 후 caller에게 partial root가 절대 반환되지 않는 return path를 확인합니다.
- 성공 시 caller가 sentinel을 기준으로 전체 graph를 해제할 수 있는 representation을 확인합니다.

#### Ownership transaction 기록

- acquisition 1: root
- acquisition 2..N: fields
- 각 child ownership transfer 시점:
- 성공 publish 조건:
- failure detection 지점:
- rollback 순서:
- rollback 종료 후 live allocation 수:

#### failure scenario 직접 복원

- 첫 field allocation 실패:
- 중간 field allocation 실패:
- 마지막 field 근처 실패:
- 각 경우 root/children의 상태:
- 잘못된 partial publish가 발생할 경우 caller가 겪는 문제:

#### 보장 범위

- 이 commit이 보장하는 complete-or-rollback:
- 성공-path test만으로는 증명되지 않는 부분:
- 후속 `fd3ae063139d`에서 강제로 확인해야 하는 allocation 위치:

### `7a016ad8fd21` — `feat(list): 연결 리스트 순회와 삭제 구현`

**Source 확정 역할:** list node lifetime과 caller-defined content lifetime을 분리하고 complete clearing을 제공합니다.

#### 해당 SHA에서 확인할 코드

- `ft_lstdelone`이 caller destructor와 node free를 어떤 순서로 수행하는지 확인합니다.
- destructor가 null일 때 partial destruction을 피하도록 어떤 guard가 있는지 확인합니다.
- `ft_lstclear`가 current node를 해제하기 전에 successor를 저장하는 지점을 찾습니다.
- caller head가 cleanup 완료 후 `NULL`이 되는 state transition을 추적합니다.
- iteration 함수가 content callback만 수행하고 link/free를 변경하지 않는지 확인합니다.
- node allocation 책임과 opaque content lifetime 정책이 함수별로 어떻게 분리되는지 표로 정리합니다.

#### 학습 기록

- node owner:
- content owner / destructor policy:
- `ft_lstdelone` transition:
- `ft_lstclear` loop state:
- cleanup 완료 invariant:
- missing destructor에서 보장하는 것:
- `ft_lstmap`이 이 lifecycle API에 의존할 이유:

### `6672ea67fae4` — `feat(list): 실패 시 정리되는 리스트 변환 구현`

**Source 확정 역할:** callback-produced content와 새 list node에 all-or-nothing ownership을 적용합니다.

#### 변경 전 상태 확인

- `7a016ad8fd21`에서 list clear가 node/content를 어떤 계약으로 정리하는지 다시 확인합니다.
- `8c0a35a50878`의 partial ownership rollback과 비교하되, array field와 opaque callback content의 차이를 직접 기록합니다.

#### 해당 SHA에서 확인할 실제 핵심 코드

- source list를 순회하면서 callback이 mapped content를 생성하는 지점을 확인합니다.
- callback 결과가 생성된 뒤 node allocation이 발생하는 순서를 확인합니다.
- node allocation 실패 시 **아직 어느 node에도 연결되지 않은 최신 mapped content**를 즉시 destructor로 정리하는 branch를 찾습니다.
- 이미 만든 mapped list를 `ft_lstclear` 또는 동등한 established lifecycle 경로로 정리하는 호출을 확인합니다.
- maintained tail이 append마다 어떻게 갱신되는지 확인합니다.
- source list의 link/content를 변경하지 않는지 write target 기준으로 확인합니다.
- callback이 `NULL` content를 반환하는 경우와 node allocation failure가 코드에서 어떻게 구분되는지 확인합니다.

#### Ownership / lifecycle 기록

- callback 직후 content owner:
- node 생성 성공 후 content owner:
- new node가 partial output에 연결되는 시점:
- node allocation failure 직후 cleanup 대상:
- partial mapped list rollback:
- source list lifetime:

#### failure scenario

- 첫 node allocation 실패:
- 중간 node allocation 실패:
- callback result가 `NULL`인 정상 case와 failure의 구분:
- cleanup 이후 남아야 하는 object:

#### 다음 검증과 연결

- `fd3ae063139d`에서 주입해야 하는 실패 위치:
- leak / invalid free / source mutation 중 각각 확인할 항목:

### `fd3ae063139d` — `test(alloc): 할당 실패와 rollback을 검증`

**Source 확정 역할:** tracked `malloc`/`free`와 선택적 allocation failure를 이용해 split과 list mapping의 각 acquisition position에서 rollback을 재현하고 측정합니다.

#### Test commit 학습

- production invariants 대상:
  - pre-allocation size safety와 single-allocation failure:
  - `ft_split` complete-or-rollback:
  - `ft_lstmap` callback content + node rollback:
- failure injection technique:
  - production API를 바꾸지 않고 `malloc`/`free`를 substitute하는 build 경계를 찾습니다.
  - 몇 번째 allocation attempt를 실패시킬지 설정하는 state를 찾습니다.
  - live object / invalid free를 기록하는 support code를 찾습니다.
- 실제 production path:
  - `ft_split`의 root allocation 및 각 field allocation 실패가 어떤 식으로 순회되는지 기록합니다.
  - `ft_lstmap`의 각 node allocation 실패가 어떤 callback/content 상태에서 발생하는지 기록합니다.
- 측정 항목:
  - live allocation:
  - double/invalid free:
  - source mutation:
  - returned value:
- 테스트가 증명하는 것:
- 테스트가 증명하지 않는 것:
- 테스트 성격:
  - [ ] broad integration
  - [ ] deterministic regression
  - [ ] deterministic failure-injection suite
  - 선택 근거:
- 후속 변경에서 막아야 할 회귀:

## Invariant ledger

| 단계 | Commit | Source에 연결된 invariant | 실제 코드에서 확인한 근거 |
| --- | --- | --- | --- |
| size foundation | `3b1b30983876` | multiplication/addition wrap을 allocation 전에 차단 | |
| single owner | `6d076de7185e` | 성공 시 독립 allocation 하나를 caller가 소유 | |
| checked builder | `644b1c65444c` | terminator 포함 결합 크기를 allocation 전에 검증 | |
| multi-allocation transaction | `8c0a35a50878` | complete result 또는 total rollback | |
| list lifecycle | `7a016ad8fd21` | node/content lifetime 분리, clear 후 head `NULL` | |
| callback-produced graph | `6672ea67fae4` | unlinked content와 partial list를 모두 rollback | |
| deterministic evidence | `fd3ae063139d` | 각 allocation failure 위치에서 leak/invalid free 없이 cleanup | |

## Failure → Fix → Test 연결

### `ft_split`

- 기존 single-allocation 가정:
- multi-allocation에서 새로 생긴 failure 위험:
- root cause:
- `8c0a35a50878`의 complete-or-rollback decision:
- 실제 cleanup 코드:
- `fd3ae063139d`의 failure injection:
- regression으로 고정된 invariant:

### `ft_lstmap`

- `7a016ad8fd21`이 제공한 lifecycle dependency:
- callback content 생성 후 node allocation failure 위험:
- root cause:
- `6672ea67fae4`의 cleanup decision:
- 실제 cleanup 코드:
- `fd3ae063139d`의 failure injection:
- regression으로 고정된 invariant:

## Ownership / state / responsibility 변화

| 단계 | 새 resource | ownership이 확정되는 시점 | failure 시 책임 | 학습자 근거 |
| --- | --- | --- | --- | --- |
| single allocation | | | | |
| substring/join | | | | |
| split root + fields | | | | |
| list node + opaque content | | | | |
| mapped content + mapped node | | | | |

## Thread 최종 상태

- 마지막 commit 시점에 이 thread가 보장하는 것:
  - 기록:
- 이 thread만으로는 보장하지 않는 것:
  - 기록:
- source의 significance와 실제 코드 확인 결과가 연결되는 지점:
  - 기록:

## 최종 architecture 또는 execution flow 정리

해당 thread의 commit history를 근거로 최종 흐름을 직접 작성합니다.

- 시작 조건 / 입력:
- 핵심 분기 또는 책임 경계:
- 상태 또는 ownership 변화:
- failure 처리:
- verification 경로:
- 최종 설명:

## 학습 완료 자가 점검

- [ ] 모든 commit을 문서 순서대로 해당 SHA에서 확인했습니다.
- [ ] 중요도와 tags를 source 그대로 유지했습니다.
- [ ] 실제 코드 근거와 source 확정 설명을 구분했습니다.
- [ ] 변경 전/후 비교가 필요한 commit은 이전 관련 SHA와 비교했습니다.
- [ ] failure → fix → test 연결을 실제 코드와 test code로 확인했습니다.
- [ ] final HEAD를 과거 commit 설명에 소급하지 않았습니다.
- [ ] 이 thread의 최종 invariant와 execution flow를 코드 근거로 설명할 수 있습니다.
