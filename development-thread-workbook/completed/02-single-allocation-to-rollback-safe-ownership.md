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

- 직전 상태: parent에는 character, memory, string search/bounds, `ft_atoi` 구현이 있었지만 allocation API와 `src/alloc/ft_allocate.c`는 없었습니다. 이 commit이 Makefile, `libft.h`, 새 module을 함께 추가했습니다.
- size arithmetic 위험: `count * size`가 `size_t` 최대값을 넘어 wrap되면 caller가 요구한 논리 크기보다 작은 block을 할당한 뒤 더 큰 범위로 사용할 위험이 있습니다. `ft_strdup`의 `length + 1`도 terminator 공간을 포함하므로 addition overflow를 피해야 합니다.
- pre-allocation 검증 코드: `ft_calloc`은 `count != 0 && size > (size_t)-1 / count`를 `count * size`보다 먼저 평가해 multiplication 가능 여부를 나눗셈으로 검사합니다. `ft_strdup`은 `ft_strlen` 결과가 `(size_t)-1`이면 `length + 1`을 계산하기 전에 `NULL`을 반환합니다.
- zero-size policy: product가 0이면 `allocation_size`를 1로 바꾸고 한 byte를 실제로 할당합니다. 이후 `ft_bzero(allocation, allocation_size)`가 그 한 byte를 0으로 만듭니다. 성공한 zero-size 호출도 caller가 `free`할 수 있는 non-`NULL` allocation을 받을 수 있습니다.
- `ft_calloc` 성공 ownership: `malloc`과 zeroing이 끝난 pointer를 반환하는 순간 해당 block의 해제 책임이 caller로 이전됩니다. 함수 내부에는 성공 후 retained reference가 없습니다.
- `ft_strdup` 성공 ownership: source는 `const`로 읽기만 하고 `length + 1` bytes의 새 block에 terminator까지 복사합니다. 반환된 duplicate는 source와 독립된 caller-owned allocation입니다.
- allocation failure path: 두 함수 모두 `malloc`이 `NULL`이면 추가 write나 cleanup 없이 `NULL`을 반환합니다. 이 시점에는 함수가 이전에 획득한 다른 resource가 없으므로 rollback 대상도 없습니다.
- 이 commit이 이후 builder에 제공하는 전제: allocation 전에 크기를 확정하고, 성공 전에는 ownership을 publish하지 않으며, 실패 시 live allocation을 남기지 않는 single-resource pattern을 제공합니다. 이후 builder는 이 규칙을 root와 여러 child에 확장해야 합니다.

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

- 입력 범위 계산: source가 `NULL`이면 즉시 실패합니다. 그 밖에는 `text_length = ft_strlen(text)`를 구하고, `(size_t)start >= text_length`이면 empty result 경로로 이동합니다. 유효한 start에서는 available suffix를 `text_length - (size_t)start`로 계산합니다.
- overflow를 피하는 계산 형태: requested `length`가 available suffix보다 크면 먼저 suffix 길이로 clamp합니다. start를 더해 end index를 만드는 대신 전체 길이에서 start를 빼므로 end addition wrap을 피합니다. 이 SHA에는 `length + 1`의 별도 명시적 guard는 없지만, clamp된 length는 실제 유효 C string suffix보다 크지 않습니다.
- allocation 크기: 유효 범위는 `length + 1` bytes를 할당하고 payload `length` bytes를 복사한 뒤 `substring[length] = '\0'`로 종료합니다.
- ownership transfer: allocation과 terminator 작성이 완료된 pointer를 반환할 때 caller가 단독 소유합니다. source 내부 pointer를 반환하거나 source ownership을 변경하지 않습니다.
- empty result 표현: start가 문자열 끝 이상이면 `ft_strdup("")`를 호출합니다. 따라서 empty string literal을 빌려주는 것이 아니라 caller가 자유롭게 `free`할 수 있는 one-byte NUL allocation을 반환합니다. 그 allocation이 실패하면 `NULL`입니다.
- 이 commit이 보장하는 것 / 보장하지 않는 것: valid source에서 start와 requested length를 suffix 안으로 제한한 독립 NUL-terminated 결과 또는 `NULL`을 보장합니다. invalid source pointer, 실제 object bounds를 벗어난 비정상 C string, allocation 성공을 보장하지 않습니다.

### `644b1c65444c` — `feat(string): 문자열 결합을 구현`

**Source 확정 역할:** joined string construction에 checked addition을 확장합니다.

#### 해당 SHA에서 확인할 코드

- null operand가 allocation 전에 거부되는지 확인합니다.
- left length + right length + terminator 계산이 wrap되지 않도록 검사하는 실제 조건을 기록합니다.
- left payload와 right payload/terminator가 어떤 순서로 copy되는지 확인합니다.
- 입력 두 문자열이 변경되지 않는지 write target을 기준으로 확인합니다.
- 성공 result의 단일 ownership과 failure 시 live allocation 유무를 기록합니다.

#### 학습 기록

- size addition 검증: 두 operand 중 하나가 `NULL`이면 길이를 읽기 전에 실패합니다. 길이를 구한 뒤 `right_length == (size_t)-1 || left_length > (size_t)-2 - right_length`이면 반환합니다. `(size_t)-2`는 `SIZE_MAX - 1`이므로 이 조건은 `left_length + right_length + 1`이 `SIZE_MAX`를 넘지 않는지 addition 전에 확인합니다.
- allocation 이후 copy 순서: 정확히 `left_length + right_length + 1` bytes를 할당한 뒤 left payload만 `left_length`만큼 복사하고, `joined + left_length`에 right의 `right_length + 1` bytes를 복사합니다.
- authoritative terminator 위치: 두 번째 copy가 right의 기존 NUL까지 포함하므로 최종 terminator는 `joined[left_length + right_length]`에 놓입니다. 별도 terminator write는 없습니다.
- input ownership / result ownership: `left`와 `right`는 `const` input이며 write target은 새 `joined` block뿐입니다. 성공 시 caller가 하나의 result allocation을 소유하고, `malloc` 실패 전후에 함수가 보유한 다른 resource는 없습니다.
- 다음 multi-allocation commit과 다른 점: join은 하나의 size 검증과 하나의 allocation만 수행하므로 실패 시 partial child graph가 없습니다. `ft_split`은 root가 성공한 뒤 여러 field allocation이 이어져 중간 rollback이 필요합니다.

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

- acquisition 1: root: `count_fields(text, delimiter) + 1`개의 pointer slot을 `ft_calloc`으로 확보합니다. 모든 slot이 0으로 초기화되므로 마지막 미사용 slot이 sentinel `NULL`입니다.
- acquisition 2..N: fields: parsing loop가 delimiter를 건너뛴 뒤 `[start, text_index)` span을 만들고, nonempty span마다 `copy_field`가 `length + 1` bytes를 할당해 복사·종료합니다.
- 각 child ownership transfer 시점: `copy_field`가 성공한 pointer를 `fields[field_index]`에 대입하는 순간 partial root가 그 field를 보유합니다. 그 뒤 `field_index`가 증가합니다.
- 성공 publish 조건: 입력 끝까지 처리해 모든 nonempty field가 연결되고, `ft_calloc`이 남겨 둔 다음 slot의 `NULL` sentinel이 유지된 상태에서만 `fields`를 반환합니다.
- failure detection 지점: root `ft_calloc`이 `NULL`인 경우와 각 `copy_field`가 `NULL`인 경우입니다. child failure는 slot 대입 직후 검사하지만 `field_index` 증가 전이므로 실패 slot은 cleanup count에 포함되지 않습니다.
- rollback 순서: `free_fields(fields, field_index)`가 성공해 연결된 child 수를 받아 높은 index부터 0까지 역순으로 free한 뒤 root pointer array를 free합니다. 이후 `ft_split`은 comma expression으로 `NULL`을 반환합니다.
- rollback 종료 후 live allocation 수: 해당 호출이 획득한 root와 모든 성공 child가 해제되므로 0입니다. caller에게 partial root가 전달되지 않습니다.

#### failure scenario 직접 복원

- 첫 field allocation 실패: root만 살아 있고 `field_index == 0`입니다. `free_fields`의 child loop는 실행되지 않고 root만 free한 뒤 `NULL`을 반환합니다.
- 중간 field allocation 실패: 앞선 slots에는 완성된 field들이 연결돼 있고 실패 slot에는 `NULL`이 대입됩니다. helper는 `field_index`개의 이전 child를 역순으로 해제하고 마지막에 root를 해제합니다.
- 마지막 field 근처 실패: 이전의 거의 모든 child가 root에 연결돼 있어도 동일한 count 기반 cleanup이 전부 회수합니다. sentinel 영역과 실패 slot을 free 대상으로 잘못 취급하지 않습니다.
- 각 경우 root/children의 상태: rollback 중에만 local `fields`가 partial graph를 가리킵니다. 함수 밖으로 나갈 때는 그 graph가 모두 해제되고 반환값은 `NULL`입니다.
- 잘못된 partial publish가 발생할 경우 caller가 겪는 문제: caller가 어느 slot까지 유효한지, 실패 slot 뒤 sentinel이 신뢰 가능한지 알 수 없고, 성공으로 오인해 불완전 데이터를 사용하거나 child/root를 누락·중복 해제할 수 있습니다. 현재 구현은 publish 자체를 금지합니다.

#### 보장 범위

- 이 commit이 보장하는 complete-or-rollback: valid input에서 모든 field와 `NULL` sentinel을 가진 complete array를 반환하거나, root/child acquisition 중 하나라도 실패하면 그 호출이 확보한 모든 allocation을 해제하고 `NULL`만 반환합니다. consecutive delimiter는 empty field를 만들지 않습니다.
- 성공-path test만으로는 증명되지 않는 부분: 두 번째 이후 field allocation 실패 시 이전 child가 실제로 모두 free되는지, root가 남지 않는지, untracked pointer를 free하지 않는지는 정상 실행만으로 확인되지 않습니다.
- 후속 `fd3ae063139d`에서 강제로 확인해야 하는 allocation 위치: 네 field 입력 기준 root 1회와 field 4회의 총 5개 위치 각각을 실패시켜야 합니다. 각 경우 반환 `NULL`, live allocation 0, invalid free 0을 확인해야 합니다.

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

- node owner: list를 만든 caller 또는 해당 list를 구축 중인 함수가 node allocation을 소유합니다. `ft_lstdelone`과 `ft_lstclear`는 전달받은 node를 `free`하는 lifecycle 연산입니다.
- content owner / destructor policy: library는 `void *content`의 실제 타입과 해제 방식을 알지 못합니다. caller가 전달한 `del` callback이 content lifetime policy를 정의하며, library는 이를 호출한 뒤 node를 해제합니다.
- `ft_lstdelone` transition: `node == NULL || del == NULL`이면 아무것도 하지 않습니다. 정상 경로에서는 먼저 `del(node->content)`로 opaque content를 정리하고 그 다음 `free(node)`로 node storage를 정리합니다.
- `ft_lstclear` loop state: `list == NULL || del == NULL`이면 반환합니다. 각 iteration에서 `next = (*list)->next`를 node free 전에 저장하고 `ft_lstdelone(*list, del)`을 호출한 뒤 `*list = next`로 caller head를 전진시킵니다.
- cleanup 완료 invariant: loop가 종료되면 `*list == NULL`입니다. successor를 먼저 보존하므로 freed node의 `next`를 읽지 않습니다.
- missing destructor에서 보장하는 것: content 정리 없이 node만 free하는 partial destruction을 수행하지 않고 list/head를 그대로 둡니다. 대신 cleanup을 대신해 주지 않으므로 ownership은 caller에게 남습니다.
- `ft_lstmap`이 이 lifecycle API에 의존할 이유: mapping 중 여러 node가 이미 연결된 뒤 새 node allocation이 실패할 수 있습니다. established `ft_lstclear`를 사용하면 각 mapped content에 같은 destructor policy를 적용하면서 partial node chain과 head를 한 번에 정리할 수 있습니다.

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

- callback 직후 content owner: `mapped_content = function(list->content)`가 반환된 직후에는 아직 node에 연결되지 않았으므로 `ft_lstmap` local transaction이 그 content의 cleanup 책임을 가집니다.
- node 생성 성공 후 content owner: `ft_lstnew(mapped_content)`가 성공하면 새 node가 pointer를 보유합니다. 이후 cleanup은 node chain에 적용되는 `del` callback을 통해 수행됩니다.
- new node가 partial output에 연결되는 시점: 첫 node는 `mapped = node`, 이후 node는 `tail->next = node`로 연결합니다. 그 뒤 `tail = node`로 append cursor를 갱신합니다.
- node allocation failure 직후 cleanup 대상: node에 연결되지 않은 최신 `mapped_content`를 `del(mapped_content)`로 즉시 정리해야 합니다. 이어서 이전 iteration에서 연결된 `mapped` chain 전체를 `ft_lstclear(&mapped, del)`로 정리합니다.
- partial mapped list rollback: `ft_lstclear`가 각 기존 mapped content와 node를 정리하고 local head를 `NULL`로 만든 뒤 함수가 `NULL`을 반환합니다.
- source list lifetime: loop는 local `list = list->next`만 수행합니다. source node의 content나 `next`에 write하지 않고 source allocation을 해제하지 않습니다.

#### failure scenario

- 첫 node allocation 실패: callback이 만든 첫 content는 아직 연결되지 않았으므로 `del(mapped_content)` 한 번만 호출됩니다. `mapped == NULL`이므로 `ft_lstclear`는 node를 해제하지 않고 결과는 `NULL`입니다.
- 중간 node allocation 실패: 최신 unlinked content를 먼저 `del`하고, 이전 성공 iteration의 mapped contents와 nodes를 `ft_lstclear`로 전부 정리합니다. source list는 그대로 남습니다.
- callback result가 `NULL`인 정상 case와 failure의 구분: 구현은 callback의 `NULL`을 별도 실패로 해석하지 않습니다. `ft_lstnew(NULL)`이 성공하면 `NULL` content를 가진 node가 정상 결과에 포함됩니다. failure 판단은 오직 `node == NULL`입니다. 따라서 callback 자체의 실패를 `NULL`로 전달하고 싶다면 이 API 구현만으로는 구분할 수 없습니다.
- cleanup 이후 남아야 하는 object: source list와 source contents만 남고, 해당 호출이 만든 mapped content 및 mapped nodes는 남지 않아야 합니다.

#### 다음 검증과 연결

- `fd3ae063139d`에서 주입해야 하는 실패 위치: 세 source node 각각에 대응하는 `ft_lstnew` production allocation 1·2·3번째를 실패시켜야 합니다. callback content 생성 직후 node failure path가 매 iteration에서 실행됩니다.
- leak / invalid free / source mutation 중 각각 확인할 항목: tracked node live count가 0인지, tracked node에 invalid free가 없는지, destructor 호출 수가 실패 index와 같은지, source content 값이 유지되는지 확인해야 합니다. source `next` pointer 자체는 해당 harness에서 명시적으로 비교하지 않는 한 코드 inspection 근거와 구분해야 합니다.

### `fd3ae063139d` — `test(alloc): 할당 실패와 rollback을 검증`

**Source 확정 역할:** tracked `malloc`/`free`와 선택적 allocation failure를 이용해 split과 list mapping의 각 acquisition position에서 rollback을 재현하고 측정합니다.

#### Test commit 학습

- production invariants 대상:
  - pre-allocation size safety와 single-allocation failure: production source 전체를 substituted allocator로 다시 compile하고 첫 allocation을 실패시켜 `ft_calloc`, `ft_strdup`, `ft_substr`, `ft_strjoin`, `ft_strtrim`, `ft_itoa`, `ft_strmapi`, `ft_lstnew`가 `NULL`과 live count 0을 남기는지 검사합니다. overflow branch 자체를 이 failure suite가 직접 주입하는 것은 아닙니다.
  - `ft_split` complete-or-rollback: 네 field 입력의 정상 allocation count가 root 1 + fields 4 = 5인지 먼저 측정하고, failure index 1부터 5까지 각각 실패시켜 result `NULL`, live 0, invalid free 0을 검사합니다.
  - `ft_lstmap` callback content + node rollback: 세 source node에서 production `ft_lstnew` allocation 1·2·3번째를 각각 실패시키고, 최신 unlinked callback content와 이전 mapped chain에 대한 destructor 호출 수가 failure index와 같은지 검사합니다.
- failure injection technique:
  - production API를 바꾸지 않고 `malloc`/`free`를 substitute하는 build 경계를 찾습니다. Makefile은 모든 `SRC`를 `build/failure` 아래 별도 object로 만들 때 `-Dmalloc=test_malloc -Dfree=test_free`를 적용합니다. test/support source와 test driver는 이 macro 없이 link되어 실제 allocator를 구현·사용합니다.
  - 몇 번째 allocation attempt를 실패시킬지 설정하는 state를 찾습니다. `test_allocator_reset(failure_index)`가 attempt, selected index, live, invalid-free counters와 tracking slots를 초기화하고, `test_malloc`이 attempt를 증가시킨 뒤 정확히 같은 index에서 `NULL`을 반환합니다. 0은 failure 비활성화입니다.
  - live object / invalid free를 기록하는 support code를 찾습니다. 최대 4096개 pointer slot을 기록하고 successful allocation마다 `g_live`를 증가시킵니다. `test_free`가 tracked pointer를 찾으면 slot을 비우고 live를 줄이며, 찾지 못하면 실제 free 대신 `g_invalid_frees`를 증가시킵니다.
- 실제 production path:
  - `ft_split`의 root allocation 및 각 field allocation 실패가 어떤 식으로 순회되는지 기록합니다. 정상 호출로 5 attempts를 확인한 뒤 index 1은 root, 2~5는 각 field acquisition을 실패시킵니다. 각 호출은 `ft_split`의 실제 `free_fields` 경로를 통과합니다.
  - `ft_lstmap`의 각 node allocation 실패가 어떤 callback/content 상태에서 발생하는지 기록합니다. test driver의 `map_integer`는 macro 없이 compile되어 callback content를 실제 `malloc`으로 만듭니다. 주입 대상은 production `ft_lstnew`의 node allocation뿐이며, 그 실패 직전에 callback content는 이미 생성된 상태입니다. 이는 node-failure rollback을 결정적으로 검사하지만 callback allocator failure 자체는 주입하지 않습니다.
- 측정 항목:
  - live allocation: substituted production allocation의 현재 개수입니다. split root/fields와 list nodes가 rollback 후 0인지 확인합니다.
  - double/invalid free: tracked set에 없는 pointer를 `test_free`에 넘겼는지 측정합니다. callback content는 실제 `malloc/free` 경로라 이 counter의 추적 대상이 아니며 destructor 호출 수와 프로세스 동작으로만 간접 관찰됩니다.
  - source mutation: list-map failure마다 source integer 값 `1, 2, 3`이 유지되는지 검사합니다. source `next` links는 별도로 assertion하지 않으므로 link 불변은 production write-target inspection에 근거합니다. split input mutation도 별도 buffer comparison은 없습니다.
  - returned value: 각 forced failure에서 `ft_split`과 `ft_lstmap`이 `NULL`인지 검사합니다. 정상 control run은 non-`NULL`과 예상 allocation/deletion count를 확인합니다.
- 테스트가 증명하는 것: 지정 input에서 single-allocation 첫 실패, split의 다섯 acquisition 위치, list node의 세 acquisition 위치를 deterministic하게 재현하며, tracked production allocation이 남지 않고 tracked invalid free가 없으며 list callback destructor 수와 source values가 예상과 같음을 검사합니다.
- 테스트가 증명하지 않는 것: 모든 input 크기, allocator가 실제로 반환하는 모든 failure timing, callback 내부 allocation failure, callback content의 double free를 tracking counter로 검출하는 것, source link 불변, arithmetic overflow branch, thread safety는 증명하지 않습니다.
- 테스트 성격:
  - [ ] broad integration
  - [x] deterministic regression
  - [x] deterministic failure-injection suite
  - 선택 근거: production allocator 호출을 compile-time substitution하고 선택한 N번째 acquisition을 정확히 실패시키며 rollback counters를 고정 assertion합니다. 여러 subsystem의 외부 통합보다 failure branch를 반복 가능하게 재현하는 regression suite입니다.
- 후속 변경에서 막아야 할 회귀: split partial child/root leak, 실패 slot까지 잘못 free, mapped latest content 누락, partial mapped list leak, tracked node invalid/double free, failure 후 non-`NULL` partial publish, source content 변조를 막습니다.
- 실행 근거: 저장소 checkout을 만들 수 없는 현재 환경에서는 `make failure-test`를 실행하지 않았습니다. 이 절의 수치와 경로는 `fd3ae063139d`의 Makefile, `tests/failure/test_failure.c`, `tests/support/fail_alloc.c`를 직접 검사한 결과이며 실행 성공을 기록하지 않습니다.

## Invariant ledger

| 단계 | Commit | Source에 연결된 invariant | 실제 코드에서 확인한 근거 |
| --- | --- | --- | --- |
| size foundation | `3b1b30983876` | multiplication/addition wrap을 allocation 전에 차단 | `ft_calloc`이 division guard 후에만 product를 계산하고, `ft_strdup`이 `length == SIZE_MAX`를 `length + 1` 전에 거부합니다. |
| single owner | `6d076de7185e` | 성공 시 독립 allocation 하나를 caller가 소유 | `ft_substr`이 suffix를 clamp한 뒤 새 block을 만들고 명시적으로 NUL을 써서 반환하며 out-of-range start도 `ft_strdup("")`로 독립 allocation을 만듭니다. |
| checked builder | `644b1c65444c` | terminator 포함 결합 크기를 allocation 전에 검증 | `right_length == SIZE_MAX` guard와 `left_length > SIZE_MAX - 1 - right_length` guard를 평가한 뒤 한 번만 `malloc`합니다. |
| multi-allocation transaction | `8c0a35a50878` | complete result 또는 total rollback | zeroed root에 field를 하나씩 연결하고 failure 시 `free_fields(fields, field_index)`가 연결된 child를 역순 해제한 뒤 root를 해제합니다. |
| list lifecycle | `7a016ad8fd21` | node/content lifetime 분리, clear 후 head `NULL` | `ft_lstdelone`이 `del(content)` 후 node를 free하고, `ft_lstclear`가 successor 저장·삭제·head 전진을 반복해 `*list == NULL`로 끝납니다. |
| callback-produced graph | `6672ea67fae4` | unlinked content와 partial list를 모두 rollback | node failure branch가 `del(mapped_content)` 후 `ft_lstclear(&mapped, del)`을 호출하며 source에는 write하지 않습니다. |
| deterministic evidence | `fd3ae063139d` | 각 allocation failure 위치에서 leak/invalid free 없이 cleanup | substituted allocator가 exact attempt를 실패시키고 split 1~5, map node 1~3에서 `NULL`, live 0, invalid 0, 예상 destructor count를 assertion합니다. |

## Failure → Fix → Test 연결

### `ft_split`

- 기존 single-allocation 가정: allocation이 하나이므로 `malloc` 실패 시 `NULL`만 반환하면 함수가 회수할 이전 resource가 없었습니다.
- multi-allocation에서 새로 생긴 failure 위험: root가 성공한 뒤 여러 field 중 하나가 실패하면 이전 field와 root가 동시에 live 상태로 남습니다.
- root cause: acquisition이 여러 단계로 나뉘는데 partial ownership 범위와 cleanup count를 추적하지 않으면 caller에게 incomplete graph가 새거나 함수 내부에서 leak됩니다.
- `8c0a35a50878`의 complete-or-rollback decision: root를 먼저 zero-initialize하고 성공 child 수를 `field_index`로 유지하며, 모든 field가 끝난 경우에만 root를 publish합니다.
- 실제 cleanup 코드: `copy_field` 실패 시 `free_fields(fields, field_index)`가 이미 연결된 fields를 역순 free하고 root를 free한 뒤 `NULL`을 반환합니다.
- `fd3ae063139d`의 failure injection: 정상 control run으로 allocation count 5를 얻고 1~5번째를 각각 실패시켜 모든 acquisition branch를 통과합니다.
- regression으로 고정된 invariant: 어떤 acquisition이 실패해도 partial root가 반환되지 않고 tracked live allocation과 invalid free가 0입니다.

### `ft_lstmap`

- `7a016ad8fd21`이 제공한 lifecycle dependency: opaque content는 caller destructor로, node는 library free로 정리하고 partial list head를 `NULL`로 만드는 `ft_lstclear`입니다.
- callback content 생성 후 node allocation failure 위험: callback이 이미 새 content를 반환했지만 node가 없으므로 그 content는 아직 partial list에 연결되지 않아 list clear만으로 회수되지 않습니다.
- root cause: 최신 content와 이전에 연결된 node chain이 서로 다른 ownership 상태에 있습니다.
- `6672ea67fae4`의 cleanup decision: 최신 unlinked content를 직접 `del`하고, 이미 연결된 chain은 `ft_lstclear`에 맡깁니다.
- 실제 cleanup 코드: `if (node == NULL) { del(mapped_content); ft_lstclear(&mapped, del); return (NULL); }` 순서입니다.
- `fd3ae063139d`의 failure injection: production node allocator 1~3번째를 실패시키고 destructor 호출 수가 각각 1~3인지, tracked node live/invalid count가 0인지 검사합니다.
- regression으로 고정된 invariant: 최신 unlinked content와 이전 linked contents/nodes가 모두 한 번씩 정리되고 source content 값은 유지됩니다. callback allocation failure 자체는 이 harness의 주입 범위가 아닙니다.

## Ownership / state / responsibility 변화

| 단계 | 새 resource | ownership이 확정되는 시점 | failure 시 책임 | 학습자 근거 |
| --- | --- | --- | --- | --- |
| single allocation | `ft_calloc` block, duplicate string | 완성된 pointer를 함수가 반환할 때 caller로 이전 | allocation 전/실패에는 live resource가 없고 `NULL` 반환 | `src/alloc/ft_allocate.c`의 guard → malloc → initialize/copy → return 순서 |
| substring/join | 독립 substring 또는 joined string 한 개 | NUL-terminated result를 반환할 때 caller로 이전 | `malloc` 실패 시 `NULL`; 입력은 계속 caller 소유 | `ft_substr`, `ft_strjoin`이 input에 write하지 않고 result만 할당 |
| split root + fields | pointer-array root와 각 field string | child는 slot 대입 시 partial root가 소유하고, 완성 root 반환 시 graph 전체가 caller로 이전 | builder가 성공 child와 root를 모두 rollback | `field_index`, `free_fields`, zeroed sentinel |
| list node + opaque content | node storage와 caller-defined content | node는 list owner, content policy는 `del` callback이 결정 | `ft_lstdelone`/`ft_lstclear`가 content 후 node를 정리; `del == NULL`이면 ownership 유지 | `src/list/ft_list_lifecycle.c` guard와 successor-before-free loop |
| mapped content + mapped node | callback result와 새 node chain | callback 직후 builder가 content 소유; node 성공·link 후 partial mapped list가 소유; 전체 성공 시 caller로 이전 | 최신 unlinked content는 직접 `del`, linked chain은 `ft_lstclear` | `src/list/ft_list_map.c` failure branch와 tail append |

## Thread 최종 상태

- 마지막 commit 시점에 이 thread가 보장하는 것:
  - 기록: single allocation은 size를 먼저 검증하고 완성된 pointer만 반환합니다. `ft_split`과 `ft_lstmap`은 partial ownership 상태를 내부에 유지하다 성공 시에만 complete graph를 반환하고, inspected failure paths는 확보한 resource를 전부 회수합니다. list cleanup은 caller destructor와 node free를 분리합니다. deterministic harness는 지정 acquisition 위치의 rollback을 검사합니다.
- 이 thread만으로는 보장하지 않는 것:
  - 기록: 임의 callback의 의미·thread safety·모든 input 규모·callback 내부 allocation failure·source link 불변을 test assertion으로 증명하지 않습니다. 실행 환경에서 failure suite를 실제 실행한 결과도 없습니다.
- source의 significance와 실제 코드 확인 결과가 연결되는 지점:
  - 기록: ownership이 단일 반환값에서 root/children 및 callback content/node graph로 확장되고, `ft_split`의 count 기반 rollback과 `ft_lstmap`의 두 단계 cleanup을 exact failure injection이 보호한다는 점에서 source significance와 일치합니다. 단, map harness의 macro substitution은 production node allocation에만 적용되어 callback allocator 자체는 주입하지 않습니다.

## 최종 architecture 또는 execution flow 정리

해당 thread의 commit history를 근거로 최종 흐름을 직접 작성합니다.

- 시작 조건 / 입력: valid string 또는 source list와, list content를 변환·삭제할 caller callbacks를 받습니다. allocation size를 계산하는 함수는 먼저 wrap 가능성을 제거합니다.
- 핵심 분기 또는 책임 경계: single-resource 함수는 allocation 성공/실패만 나뉩니다. multi-resource builder는 root/partial children을 local transaction으로 관리하고 complete 여부에 따라 publish 또는 rollback합니다. opaque content cleanup은 `del` callback 경계에 둡니다.
- 상태 또는 ownership 변화: 새 allocation은 처음에는 생성 함수가 소유합니다. split child는 root slot 연결 시 partial graph로, mapped content는 node 성공·link 시 partial list로 이전됩니다. complete return에서 graph 전체가 caller에게 이전됩니다.
- failure 처리: split은 성공 child count로 child와 root를 회수합니다. list map은 최신 unlinked content를 직접 지우고 기존 linked chain은 `ft_lstclear`에 넘깁니다. 어떤 경우에도 partial root를 반환하지 않습니다.
- verification 경로: failure build가 production `malloc/free`를 tracked functions로 치환해 exact attempt를 실패시키고 live/invalid counters, 반환값, destructor count, 일부 source 값을 검사합니다.
- 최종 설명: 이 Thread의 핵심은 `malloc` 성공 여부만 확인하는 것이 아니라 ownership이 어느 statement에서 어느 container로 이동했는지를 추적하는 것입니다. complete graph가 되기 전에는 builder가 모든 cleanup 책임을 유지하며, list의 opaque content는 caller가 제공한 destructor policy에 따라 node와 별도로 정리됩니다. failure harness는 이 규칙을 선택한 acquisition마다 반복 가능하게 통과시킵니다.

## 학습 완료 자가 점검

- [x] 모든 commit을 문서 순서대로 해당 SHA에서 확인했습니다.
- [x] 중요도와 tags를 source 그대로 유지했습니다.
- [x] 실제 코드 근거와 source 확정 설명을 구분했습니다.
- [x] 변경 전/후 비교가 필요한 commit은 이전 관련 SHA와 비교했습니다.
- [x] failure → fix → test 연결을 실제 코드와 test code로 확인했습니다.
- [x] final HEAD를 과거 commit 설명에 소급하지 않았습니다.
- [x] 이 thread의 최종 invariant와 execution flow를 코드 근거로 설명할 수 있습니다.
