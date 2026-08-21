# Thread: Singleton state to descriptor-scoped compatibility state

## 1. Thread 목표

한 개의 hidden singleton reader가 explicit state parameter를 거쳐 descriptor number별 linked state로 바뀌는 과정을 복원합니다. interleaved call, invalid descriptor, fd number reuse, allocation/read failure에서 lookup·mutation·cleanup이 정확히 한 node에만 적용되는지 실제 코드와 테스트로 확인합니다.

### Source에서 연결된 프로젝트 항목

- **Project profile:** compatibility API의 hidden descriptor-indexed state와 stream별 ownership/isolation을 담당하는 Thread입니다.
- **Core architecture:** finished compatibility layer는 descriptor number를 key로 하는 file-scope linked list에 reader context를 보관합니다.
- **Critical invariants:** state와 cleanup은 한 descriptor 또는 context에만 scoped되어야 하며, 한 stream의 failure가 다른 stream의 unread bytes를 지우면 안 됩니다.
- **Critical invariants:** failed/completed descriptor의 stale hidden state가 나중에 재사용된 같은 integer fd에 붙으면 안 됩니다.
- **Major engineering difficulty:** interleaved descriptors를 지원하면서 broad cleanup, stale integer-fd state, shared scan/buffer를 방지하는 문제입니다.
- **Practical engineering area:** deterministic replacement of allocation, release, read를 통해 partial construction과 cross-descriptor failure를 재현하는 문제입니다.

### Source가 확정한 significance

helper에 state를 명시적으로 전달하는 변화는 준비 단계입니다. 결정적인 변화는 active descriptor마다 독립 buffer, cursor, disposal path를 소유하게 하는 것입니다. 이후 테스트는 global cursor, broad reset, retained failed node가 stream contamination 또는 fd reuse contamination을 일으킬 수 있음을 검증하며, fault harness는 이 isolation invariant를 partial construction과 I/O failure까지 확장합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- singleton state는 어느 helper에서 암묵적으로 읽고 수정되었으며 explicit parameter가 이를 어떻게 드러내는가?
- descriptor node는 어떤 필드를 소유하고, list와 node의 allocation/cleanup 책임은 어디에 있는가?
- lookup, create, mutation, EOF removal, error removal은 어떤 caller chain으로 한 fd에만 적용되는가?
- invalid descriptor call이 이미 buffer를 가진 valid descriptor를 건드리지 않는 이유는 무엇인가?
- closed/write-only fd의 stale node가 남으면 같은 integer fd가 재사용될 때 어떤 data contamination이 가능한가?
- allocation/read fault가 node 생성 전, 생성 중, unread bytes 보유 후에 발생할 때 각각 어떤 owner가 cleanup하는가?

## 3. 완료 기준

- singleton helper와 explicit state helper의 signature/call graph 차이를 설명할 수 있습니다.
- descriptor-indexed linked collection의 node fields, lookup/create/remove 경로를 실제 코드로 복원했습니다.
- EOF/error cleanup이 affected node 하나만 제거한다는 근거가 있습니다.
- interleaved test의 call sequence와 각 node의 unread state를 단계별로 추적했습니다.
- fd reuse hazard가 단순 leak 문제가 아니라 correctness 문제인 이유를 test fixture로 설명할 수 있습니다.
- deterministic fault injection이 cross-node ownership과 cleanup을 어떻게 검사하는지 확인했습니다.

## 4. Commit map
| 순서 | Commit | Subject | Importance | Tags | Source에서 확정된 Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `fc01012e8521` | `refactor(state): reader 상태를 helper 인자로 전달` | **B** | `REFACTOR`, `READER_LIFECYCLE` | helper mutation이 hidden singleton field가 아니라 explicit reader object를 대상으로 하게 합니다. |
| 2 | `a4f41cbf2cf0` | `feat(state): 디스크립터별 읽기 상태 분리` | **S** | `ARCH`, `READER_LIFECYCLE`, `RISK` | file descriptor를 key로 하는 독립 linked reader node를 생성합니다. |
| 3 | `61f8b9858672` | `test(state): 교차 디스크립터 상태 격리 검증` | **A** | `TEST`, `READER_LIFECYCLE`, `RISK` | interleaved stream과 unrelated invalid descriptor에서 state isolation을 검증합니다. |
| 4 | `d3e2b37fca03` | `test(error): 오류 발생 시 디스크립터 상태 정리 검증` | **A** | `TEST`, `READER_LIFECYCLE`, `RISK` | unusable descriptor cleanup과 descriptor-number reuse hazard를 고정합니다. |
| 5 | `fd03a831686b` | `test(failure): 메모리 할당과 읽기 실패 처리 검증` | **A** | `TEST`, `POSIX_IO`, `RISK` | 정확한 allocation/read transition에 fault를 주입하고 다른 reader node가 생존하는지 검증합니다. |

## 5. Commit별 학습 기록
### 5.1 `fc01012e8521` — `refactor(state): reader 상태를 helper 인자로 전달`

- **Commit:** `fc01012e8521`
- **Subject:** `refactor(state): reader 상태를 helper 인자로 전달`
- **Importance:** **B**
- **Tags:** `REFACTOR`, `READER_LIFECYCLE`

#### Source에서 확정된 역할

buffering과 extraction helper가 hidden singleton storage를 직접 참조하지 않고 explicit reader-state object를 인자로 받도록 바꿉니다. observable behavior는 유지하지만 모든 mutation이 어느 state instance에 속하는지 signature에 드러납니다. reserve, scan, extraction, cleanup helper를 독립 state에 재사용할 준비 단계입니다.

#### 해당 SHA에서 확인할 코드

1. 직전 commit에서 file-scope singleton을 직접 참조하던 helper 목록을 찾습니다.
2. 이 SHA에서 state pointer/reference가 추가된 helper signature와 모든 call site를 비교합니다.
3. reserve, scan, extraction, cleanup 중 어떤 helper가 state를 mutate하고 어떤 helper가 read-only인지 기록합니다.
4. explicit state object를 생성하거나 보유하는 상위 caller를 찾고, 아직 singleton lifetime이 남아 있는지 확인합니다.
5. behavior-preserving refactor임을 test 결과와 return/state transition의 동일성으로 확인합니다.

#### 간결한 학습 기록

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| 변경 전 implicit singleton access | 직전 `get_next_line.c`의 `reset_reader`, `unread_length`, `compact_bytes`, `reserve_bytes`, `append_bytes`, `find_line_end`, `extract_line`, `release_final_line`이 `g_reader`를 직접 사용 | helper가 어떤 reader instance를 변경하는지 signature에 드러나지 않았습니다. |
| 변경 후 helper signature | `t_reader *reader` 또는 `const t_reader *reader`가 각 helper 인자로 추가됨 | mutation 대상이 caller가 넘긴 object로 한정됩니다. `unread_length(const t_reader *)`는 read-only이고 나머지 reserve/scan/extract/cleanup은 state를 변경합니다. |
| 상위 caller가 전달하는 state instance | `get_next_line`이 `reader = &g_reader`로 singleton address를 얻어 각 helper에 전달 | helper는 instance-agnostic해졌지만 public entry는 여전히 하나의 process-wide state만 선택합니다. |
| cleanup helper의 대상 state | `reset_reader(reader)` 또는 extraction failure에서 전달받은 `reader` | cleanup scope가 함수 인자로 표현되지만 실제 호출 대상은 아직 `g_reader` 하나입니다. |
| 여전히 남은 singleton ownership | file-scope `static t_reader g_reader` | persistent allocation과 indices의 owner는 여전히 singleton이며 multi-descriptor isolation은 아직 없습니다. |

- 이 refactor가 직접 해결한 coupling은 helper 내부의 전역 이름 의존입니다. 테스트 가능한 behavior와 state transition은 그대로 두면서 여러 reader instance에 재사용할 수 있는 함수 형태를 만듭니다.
- 해결하지 않은 문제는 state selection입니다. `get_next_line`이 계속 `&g_reader` 하나만 전달하므로 fd를 바꾸면 기존 bytes를 버리고, 교차 호출은 서로의 state를 유지할 수 없습니다.
- 다음 `a4f41cbf2cf0`은 같은 helper들을 `find_reader(fd)` 또는 `create_reader(fd)`로 선택한 node에 전달합니다. 이 때문에 refactor 자체를 multi-fd feature로 과대평가하면 안 됩니다.
- 해당 SHA의 runtime test는 이 환경에서 실행하지 못했습니다. behavior-preserving 여부는 commit diff의 return branch와 helper body/call-site 대응으로 확인했습니다.

### 5.2 `a4f41cbf2cf0` — `feat(state): 디스크립터별 읽기 상태 분리`

- **Commit:** `a4f41cbf2cf0`
- **Subject:** `feat(state): 디스크립터별 읽기 상태 분리`
- **Importance:** **S**
- **Tags:** `ARCH`, `READER_LIFECYCLE`, `RISK`

#### Source가 확정한 Problem

persistent read-ahead state를 unrelated descriptor가 공유할 수 없습니다. interleaved calls에서는 각 stream이 자신의 unread bytes, cursor positions, cleanup state를 유지해야 하며, 한 descriptor의 EOF/error가 다른 descriptor를 reset하면 안 됩니다.

#### Source가 확정한 Decision

compatibility layer가 descriptor number를 key로 하는 linked collection of reader nodes를 보관합니다. lookup, creation, mutation, EOF disposal, error cleanup은 한 node를 대상으로 수행합니다.

#### Source가 확정한 중요성

이 commit은 hidden legacy state의 authoritative ownership boundary를 확립합니다. multi-descriptor 사용을 가능하게 하고 cross-stream data leakage를 막지만, integer fd reuse가 lifecycle hazard가 된다는 점도 함께 만듭니다.

#### 해당 SHA에서 확인할 실제 핵심 코드

1. linked node type과 list head의 storage duration을 찾습니다.
2. 각 node가 descriptor number, unread interval, scan cursor, allocation 중 무엇을 직접 소유하는지 필드별로 기록합니다.
3. fd lookup helper의 traversal 조건과 found/not-found return을 확인합니다.
4. 새 node allocation, reader state initialization, list insertion 순서를 추적합니다.
5. partial construction 중 allocation failure가 발생할 때 아직 list에 삽입되지 않은 object를 누가 해제하는지 확인합니다.
6. public `get_next_line(fd)` call이 lookup/create된 node를 parser helper에 전달하는 caller chain을 작성합니다.
7. EOF에서 affected node를 unlink하고 release하는 순서와 head/middle/tail removal을 확인합니다.
8. unrecoverable descriptor error가 broad list reset이 아니라 one-node removal을 호출하는지 확인합니다.
9. 다른 node의 `begin/scan/end/allocation`에 접근할 수 있는 global mutation이 남아 있는지 검색합니다.

#### Node ownership map

| Resource / state | 생성 지점 | owner | mutation 지점 | release 조건 | release 함수 |
| --- | --- | --- | --- | --- | --- |
| list head/link | `create_reader`: `reader->next = g_readers; g_readers = reader` | file-scope `g_readers`가 head를 보관하고 각 node가 자신의 `next` link를 보관 | head insertion, `discard_reader`의 pointer-to-pointer unlink | selected node의 EOF/error/consumed-buffer cleanup | `discard_reader`가 link를 우회시킴 |
| descriptor number | `create_reader(fd)`의 `reader->fd = fd` | node가 key 값을 보관하지만 OS descriptor 자체는 caller 소유 | 생성 후 변경하지 않음 | node lifetime 종료 | 별도 release 없음; `close`하지 않음 |
| byte allocation | `reserve_bytes`의 lazy `malloc` | 해당 node | append, compact, growth, scan/extract | error/EOF/node 제거; EOF tail transfer 시 caller로 이전 | 보통 `discard_reader`의 `free(reader->bytes)`; transfer 전 `bytes=NULL` |
| unread indices | node 생성 시 0 | 해당 node | `reserve_bytes`, `compact_bytes`, `find_line_end`, `extract_line` | node lifetime 종료 | 메모리와 함께 소멸 |
| node allocation | `create_reader`의 `malloc(sizeof(*reader))` | insertion 전 local `reader`, insertion 뒤 linked list | insertion/removal | EOF, selected error, buffer fully consumed policy | `discard_reader`의 `free(reader)` |

`create_reader`는 node 한 번만 allocation하고 internal buffer는 `NULL`로 시작합니다. node allocation 실패 시 insertion 전에 `NULL`을 반환하므로 해제할 부분 구성물도 없습니다. internal buffer allocation은 이후 `reserve_bytes`가 수행하며 실패 시 public caller가 selected node를 `discard_reader`로 정리합니다.

#### Lookup → create → use → remove 흐름

```text
get_next_line(fd)
    → find_reader(fd)
        → found: existing t_reader node
        → not found: create_reader(fd)로 malloc/init 후 head insertion
    → find_line_end / reserve_bytes / read / extract_line on exactly one node
        → line: unread suffix가 있으면 node retained
        → EOF: discard_reader 또는 release_final_line 후 selected node 제거
        → unrecoverable error: discard_reader(selected node)
```

`find_reader`는 `reader != NULL && reader->fd != fd` 동안 `next`를 따라갑니다. `discard_reader`는 `t_reader **link = &g_readers`로 시작해 `*link = reader->next`를 수행하므로 head, middle, tail을 같은 코드로 처리합니다.

**최소 코드 근거**

`a4f41cbf2cf0`, `get_next_line.c`, `discard_reader`:

```c
link = &g_readers;
while (*link != NULL && *link != reader)
    link = &(*link)->next;
if (*link == NULL)
    return ;
*link = reader->next;
free(reader->bytes);
free(reader);
```

이 함수는 selected node의 predecessor link만 바꾸며 다른 node의 buffer나 indices를 순회·초기화하지 않습니다.

#### Failure와 descriptor reuse 분석

- stale node가 남은 위험 sequence는 다음과 같습니다. old fd가 첫 line을 반환한 뒤 read-ahead suffix를 node에 보유하고, caller가 fd를 close하며, OS가 새 file을 같은 integer로 열고, `find_reader(new_fd)`가 old node를 찾으면 새 file의 첫 read 전에 old suffix를 반환할 수 있습니다. 이는 leak이 아니라 새 stream에 old data가 섞이는 correctness violation입니다.
- 실제 key는 `reader->fd == fd`라는 integer 비교뿐입니다. open file description identity, inode, offset identity는 확인하지 않습니다. 따라서 timely disposal과 caller lifecycle discipline가 필요합니다.
- probe/read 오류와 EOF branch는 `find_reader(fd)`가 선택한 node만 `discard_reader`에 전달합니다. unlink code는 다른 link를 보존하고 다른 node의 allocation에 접근하지 않습니다.
- `extract_line` allocation 실패도 이 시점에는 selected node 전체를 폐기합니다. 비파괴 retry는 후속 context engine의 변화이며 이 SHA에 소급하지 않습니다.

#### 이 commit의 보장과 한계

- **보장:** 동시에 active한 여러 integer fd가 각각 독립 `bytes`, `begin`, `scan`, `end`, `capacity`를 소유하고 public call은 하나의 node만 mutate·remove합니다.
- **한계:** state lifetime은 hidden list와 EOF/error에 묶여 있습니다. caller가 명시적으로 reset/cancel/destroy하거나 EOF/error/AGAIN을 구분할 API는 없습니다. integer reuse 자체를 감지하는 identity check도 없습니다.
- **후속 검증:** `61f8b9858672`는 정상 interleaving과 invalid call isolation, `d3e2b37fca03`은 write-only/closed descriptor의 local cleanup, `fd03a831686b`은 exact allocation/read failure와 cross-node survival을 나누어 확인합니다.

### 5.3 `61f8b9858672` — `test(state): 교차 디스크립터 상태 격리 검증`

- **Commit:** `61f8b9858672`
- **Subject:** `test(state): 교차 디스크립터 상태 격리 검증`
- **Importance:** **A**
- **Tags:** `TEST`, `READER_LIFECYCLE`, `RISK`

#### Source에서 확정된 역할

여러 descriptor를 각각 끝까지 읽은 뒤 비교하는 대신 call을 교차시킵니다. 각 descriptor가 자신의 unread suffix와 line order를 유지하는지, invalid descriptor call이 이미 buffered data를 가진 valid reader를 방해하지 않는지 검증합니다.

#### 해당 SHA에서 확인할 테스트 코드

1. 두 개 이상 descriptor의 input fixture와 expected line sequence를 찾습니다.
2. call order가 A1 → B1 → A2 → invalid → B2처럼 실제로 interleave되는지 순서를 기록합니다.
3. 각 call 직전 production list에 어떤 node/state가 존재할 것으로 기대하는지 test setup으로 추론한 뒤 코드로 확인합니다.
4. invalid descriptor call의 expected result와 그 뒤 valid descriptor의 다음 expected line을 연결합니다.
5. shared buffer, global scan cursor, broad cleanup이 있었다면 어느 assertion이 처음 실패하는지 기록합니다.
6. descriptor와 returned line의 cleanup이 test 자체에서 정확히 수행되는지 확인합니다.

#### Test commit 학습 기록

| 구분 | 해당 SHA에서 기록할 내용 |
| --- | --- |
| **Production invariant** | `find_reader`가 fd별 node를 선택하고 line success 뒤 selected node의 suffix만 유지하며, invalid call은 matching node가 없으면 다른 node를 건드리지 않아야 합니다. |
| **Failure / boundary** | `test_alternating_descriptors`의 서로 다른 길이·line 수를 가진 두 pipe와 `test_invalid_fd_preserves_other_state`의 `-1` call을 구분합니다. |
| **Test technique** | real pipe descriptors를 A/B/A/B 순서로 호출하고 exact result 문자열을 비교하는 deterministic state-isolation regression입니다. |
| **Production path** | 각 `get_next_line(fd)` → list lookup → selected node의 buffered scan/read/extract → result free; EOF에서 selected node removal 순입니다. |
| **증명하는 것** | left/right line order, 각 suffix의 보존, unrelated `-1` call 뒤 valid fd의 `"second"` 반환을 증명합니다. |
| **증명하지 않는 것** | forced integer fd reuse, every allocation failure, same-context thread synchronization은 다루지 않습니다. |
| **분류** | descriptor-indexed architecture의 핵심 isolation을 좁게 고정하는 focused deterministic regression입니다. |
| **막는 회귀** | singleton/global cursor면 left 첫 call 뒤 right state로 교체되어 다음 left assertion이 실패합니다. broad invalid cleanup이면 `"second"` assertion이 실패합니다. shared buffer면 expected stream 문자열이 교차 오염됩니다. |

#### Interleaving state trace

실제 commit에는 alternating case와 invalid-fd case가 별도 test 함수로 존재합니다. 스캐폴드의 A1 → B1 → A2 → invalid → B2 예시는 하나의 함수에 그대로 구현된 순서가 아닙니다.

| 호출 순서 | fd | 예상 선택 node | 호출 전 unread bytes | 반환 | 호출 후 node 유지/제거 |
| ---: | ---: | --- | --- | --- | --- |
| 1 | `left` | 새 left node | 없음 | `"left one\n"` | read-ahead `"left two"`가 있어 유지 |
| 2 | `right` | 새 right node | 없음 | `"right one\n"` | `"right two\nright three"` suffix로 유지 |
| 3 | `left` | 기존 left node | `"left two"` | EOF tail `"left two"` | node 제거 |
| 4 | `right` | 기존 right node | `"right two\nright three"` | `"right two\n"` | `"right three"`로 유지 |
| 5 | `right` | 기존 right node | `"right three"` | EOF tail `"right three"` | node 제거 |
| invalid call | `-1` | matching node 없음 | 별도 valid fd는 `"second"` 보유 | `NULL` | valid node 유지 |
| 이후 valid call | valid fd | 기존 valid node | `"second"` | `"second"` | EOF tail 반환 후 제거 |

모든 returned line은 test에서 `free`하며 pipe read descriptor는 마지막에 `close`합니다. 이 환경에서는 해당 test binary를 실행하지 않았고 source assertion만 확인했습니다.

### 5.4 `d3e2b37fca03` — `test(error): 오류 발생 시 디스크립터 상태 정리 검증`

- **Commit:** `d3e2b37fca03`
- **Subject:** `test(error): 오류 발생 시 디스크립터 상태 정리 검증`
- **Importance:** **A**
- **Tags:** `TEST`, `READER_LIFECYCLE`, `RISK`

#### Source에서 확정된 역할

write-only descriptor, closed descriptor, state creation 이후 발생한 failure가 affected buffer와 metadata를 제거하는지 검증합니다. 동시에 한 descriptor의 error가 다른 descriptor의 unread bytes를 보존하는지 확인합니다. stale node가 같은 integer fd에 붙는 위험을 cleanup correctness로 다룹니다.

#### 해당 SHA에서 확인할 테스트 코드

1. write-only descriptor를 생성하고 reader가 unusable state를 판정하게 만드는 setup을 찾습니다.
2. closed descriptor의 integer value를 보관한 뒤 call하는 순서를 확인합니다.
3. state가 먼저 생성된 뒤 descriptor가 unusable해지는 scenario가 있는지 찾고, failure가 발생하는 production transition을 기록합니다.
4. error call 전후 list/node 존재 여부를 직접 검사하는 hook, allocation count, behavior-based indirect assertion 중 어떤 방식을 쓰는지 확인합니다.
5. affected fd number가 실제로 재사용되도록 새 descriptor를 여는 test가 있는지 확인하고 expected first line을 기록합니다.
6. 다른 valid descriptor가 보유한 unread suffix를 error 전후로 확인하는 call sequence를 추적합니다.

#### Test commit 학습 기록

| 구분 | 해당 SHA에서 기록할 내용 |
| --- | --- |
| **Production invariant** | unusable descriptor의 matching hidden node만 제거하고 borrowed fd는 library가 닫지 않으며 unrelated node suffix는 남아야 합니다. |
| **Failure / boundary** | write-only pipe end, 첫 line 뒤 외부에서 close된 fd, 동시에 read-ahead를 가진 다른 valid fd를 다룹니다. |
| **Test technique** | 내부 hook 없이 실제 descriptor lifecycle과 result behavior만 관찰하는 focused regression입니다. |
| **Production path** | write-only는 zero-length probe 실패 전에/중 matching lookup·cleanup, closed-state case는 기존 node lookup → probe failure → `discard_reader` → survivor node lookup/extract입니다. |
| **증명하는 것** | write-only fd call이 `NULL`이고 그 write end가 여전히 `write` 가능함, closed selected node의 실패 뒤 다른 fd가 `"survive"`를 반환함을 증명합니다. |
| **증명하지 않는 것** | 모든 allocation rollback, ordered `EINTR`/`EAGAIN`, 실제 동일 integer fd 강제 재사용은 이 commit의 test에 없습니다. |
| **분류** | descriptor ownership과 local cleanup을 고정하는 real-descriptor focused regression입니다. |
| **막는 회귀** | library가 borrowed fd를 close하면 후속 `write` assertion이 실패하고, global list clear이면 survivor의 `"survive"` assertion이 실패합니다. double free는 이 test가 직접 계측하지 않습니다. |

#### 기존 가정 → 실제 위험 → 검증 연결

- **기존 가정:** node key가 integer fd이므로 그 integer가 같은 active stream을 계속 나타낸다는 암묵적 가정이 생길 수 있습니다. production `find_reader`는 숫자만 비교합니다.
- **실제 위험:** old node가 suffix를 보유한 채 fd가 close되고 같은 숫자가 새 file에 재사용되면 새 stream이 old suffix를 먼저 받을 수 있습니다.
- **필요한 cleanup decision:** probe/read 오류와 EOF에서 selected node를 즉시 unlink하고 owned buffer/node를 해제해야 합니다. `discard_reader`의 link commit 뒤 free 순서가 이를 수행합니다.
- **regression evidence:** 이 SHA의 실제 evidence는 closed selected fd의 `NULL`과 survivor의 `"survive"`, write-only fd의 후속 `write` 성공입니다.

**관찰된 범위 차이**

고정된 Source 역할은 descriptor-number reuse hazard를 포함하지만, `d3e2b37fca03`의 실제 `tests/test_reader.c`는 새 descriptor가 같은 integer를 쓰도록 `dup2`하거나 반복 open하지 않습니다. 따라서 이 commit은 **stale node를 제거해야 하는 전제와 local cleanup을 간접 검증하지만, integer reuse 후 새 stream 첫 line을 직접 검증하지는 않습니다.** 강제 reuse fixture는 후속 `249093ba477a`의 explicit-context test에서 확인됩니다. 고정 역할은 변경하지 않고 실제 test 범위를 이곳에 기록했습니다.

### 5.5 `fd03a831686b` — `test(failure): 메모리 할당과 읽기 실패 처리 검증`

- **Commit:** `fd03a831686b`
- **Subject:** `test(failure): 메모리 할당과 읽기 실패 처리 검증`
- **Importance:** **A**
- **Tags:** `TEST`, `POSIX_IO`, `RISK`

#### Source에서 확정된 역할

테스트 build에서 allocation, release, read를 deterministic replacement로 바꿉니다. 각 allocation point를 실패시키고, short read, partial input 전후 error, invalid/duplicate free를 제어·기록합니다. 이 Thread에서는 특히 한 descriptor의 partial construction 또는 read failure가 다른 descriptor node를 손상시키지 않는지 확인합니다.

#### 해당 SHA에서 확인할 harness 코드

1. `malloc`, `free`, `read` replacement가 production code에 연결되는 compile definition, macro, link substitution 방식을 찾습니다.
2. allocation call index를 세고 특정 n번째 call을 실패시키는 control state를 확인합니다.
3. read script가 positive short read, zero, negative/error를 어떤 entry로 표현하는지 기록합니다.
4. invalid free와 duplicate free를 판단하기 위해 allocation ownership을 어떤 table/list로 추적하는지 확인합니다.
5. 한 descriptor node가 unread bytes를 가진 상태에서 다른 descriptor에 fault를 주입하는 fixture를 찾습니다.
6. fault 뒤 valid descriptor를 다시 호출해 기존 unread bytes가 남아 있음을 확인하는 assertion을 기록합니다.
7. 각 scenario 종료 시 outstanding allocation, release count, node cleanup을 확인하는 공통 검사를 찾습니다.

#### Test commit 학습 기록 — descriptor isolation 관점

| 구분 | 해당 SHA에서 기록할 내용 |
| --- | --- |
| **Production invariant** | selected descriptor의 construction/read failure cleanup이 다른 node의 unread state에 영향을 주지 않고, 모든 allocation에 단일 owner가 있어야 합니다. |
| **Failure / boundary** | exhaustive n번째 allocation 실패, `read_limit(3)` short reads, first read EIO, third read EIO after prior progress, right fd failure while left node has suffix를 구분합니다. |
| **Test technique** | Makefile의 `-Dmalloc=test_malloc -Dfree=test_free -Dread=test_read`로 production object를 대체 runtime에 연결하고 allocation table·call-index failure·read limit/fail index를 사용합니다. |
| **Production path** | control 설정 → replacement call → production node/buffer/result failure branch → selected node cleanup → `check_clean_runtime`; cross-fd case는 survivor node를 다시 호출합니다. |
| **증명하는 것** | tested allocation indices에서 no leak, no invalid/double free, short-read progress, selected read failure cleanup, right failure 뒤 left `"left two"` suffix 생존을 증명합니다. |
| **증명하지 않는 것** | `BLR_AGAIN`, ordered errno sequence, same-context retry는 아직 구현·테스트되지 않았습니다. middle EIO case는 이 SHA에서 accepted prefix를 보존하지 않고 selected node를 폐기합니다. |
| **분류** | exact acquisition/failure transition을 반복하는 deterministic failure-injection regression harness입니다. |
| **막는 회귀** | partially retained failed node, broad list cleanup, leaked buffer/node, invalid/duplicate free, survivor suffix loss를 각각 counter와 expected line으로 검출합니다. |

**Harness 실제 구조**

- `test_malloc`은 allocation attempt를 증가시키고 configured n번째 call에서 `NULL`을 반환합니다. 성공 pointer는 최대 4096-entry table에 `live` 상태로 기록됩니다.
- `test_free`는 live pointer면 해제·dead 표시, 이미 dead인 known pointer면 double-free counter, table에 없는 pointer면 invalid-free counter를 증가시킵니다.
- `test_read`는 target fd의 positive-count call을 세며 `fault_read_limit`으로 실제 read 요청량을 줄이고 `fault_read_fail_on(fd,index)`에서 `errno=EIO`, `-1`을 반환합니다. zero-length descriptor probe는 fault 대상에서 제외됩니다.
- 이 SHA에는 errno/return/bytes를 임의 entry 배열로 공급하는 일반 ordered “read script”가 없습니다. 그 기능은 `11033bd85c59`에서 `fault_read_script`로 추가됩니다. 고정된 scaffold 표현은 유지하고 실제 mechanism 차이를 기록합니다.
- `check_clean_runtime`은 live allocation 0, invalid free 0, double free 0을 확인합니다. harness 자체가 duplicate/invalid pointer를 일부러 free하는 guard test도 있어 detector가 실제로 증가하는지 검증합니다.

#### Fault point별 ownership 기록

| 주입 지점 | 실패 직전 owner/resource | production return | affected node 상태 | 다른 node 상태 | leak/free 검사 |
| --- | --- | --- | --- | --- | --- |
| node allocation | local `create_reader`가 아직 node를 얻지 못함 | `NULL` | list insertion 없음 | 기존 nodes 무변경 | live 0, invalid/double 0 |
| buffer allocation/growth | selected node가 node와 old buffer/unread를 소유 | legacy `NULL` | reserve 실패 후 selected node를 `discard_reader`; old owned resources 해제 | fault가 해당 node에만 적용되므로 기존 other node link 유지 | exhaustive allocation loop 뒤 clean runtime |
| caller result allocation | selected node가 delimiter와 buffer를 보유 | legacy `NULL` | 이 SHA의 `extract_line` failure가 selected node 전체를 폐기 | 다른 node는 직접 건드리지 않음 | allocation index sweep과 clean runtime |
| read before progress | selected node가 빈/초기 buffer를 소유 | `NULL` | EIO branch에서 selected node 제거 | cross-fd case에서 left node 유지 | `fault_read_calls()==1`, clean runtime |
| read after partial progress | selected node가 이미 읽은 bytes를 소유 | `NULL` | third read EIO에서 accepted bytes와 함께 selected node 제거 | 별도 survivor case는 other fd에 first-read fault를 주어 left suffix를 확인 | exact call count와 clean runtime |

실행 명령은 Makefile상 `make failure-test`이며 sizes 1, 2, 42, 1024를 순회합니다. 이 환경에서는 checkout을 만들지 못해 실행하지 않았고, 테스트 통과를 주장하지 않습니다.

## 6. Invariant ledger

| Invariant | 도입/준비 commit | 위험이 드러나는 commit | 검증/강화 commit | 학습자가 남길 코드 근거 |
| --- | --- | --- | --- | --- |
| helper mutation은 전달받은 reader state에만 적용됩니다. | `fc01012e8521` | singleton이 multi-fd를 지원하지 못하는 한계 | `a4f41cbf2cf0` | pointer-parameter helper signatures와 `get_next_line`의 selected node 전달. |
| active descriptor마다 독립 unread buffer와 cursor를 소유합니다. | `a4f41cbf2cf0` | global buffer/cursor가 interleaving을 오염시킬 위험 | `61f8b9858672` | node fields, `find_reader(fd)`, alternating expected sequence. |
| EOF/error cleanup은 affected descriptor node 하나만 제거합니다. | `a4f41cbf2cf0` | invalid fd가 다른 node까지 지우는 위험 | `61f8b9858672`, `d3e2b37fca03` | pointer-to-pointer `discard_reader`; invalid/closed call 뒤 survivor result. |
| failed/completed fd의 stale state는 reused integer에 붙지 않습니다. | `a4f41cbf2cf0`의 timely disposal decision | descriptor-number reuse hazard | `d3e2b37fca03` | production error/EOF unlink는 확인되지만 이 SHA test는 forced reuse가 없다는 한계를 함께 기록했습니다. |
| allocation/read failure가 다른 node의 unread bytes를 지우지 않습니다. | node-local ownership model | exact fault transition | `fd03a831686b` | right fd read fault 뒤 left node의 `"left two"` 반환. |
| acquired allocation마다 owner가 하나이며 invalid/duplicate free가 없습니다. | production ownership paths | partial construction/failure | `fd03a831686b` | live allocation table, `test_free` classification, scenario별 `check_clean_runtime`. |

## 7. Failure → Fix → Test 연결

이 Thread에는 subject가 `fix`인 commit이 없습니다. architecture change와 regression test가 failure risk를 닫는 구조입니다.

| 기존 가정 | 실제 failure 또는 위험 | root cause | 수정된 decision/architecture | 검증 commit | 학습자 근거 |
| --- | --- | --- | --- | --- | --- |
| 하나의 persistent state면 충분함 | interleaved descriptor의 suffix/cursor contamination | hidden singleton ownership | explicit state parameter 후 descriptor별 node | `61f8b9858672` | `fc010` helper parameter와 `a4f` list; left/right alternating exact lines. |
| 한 fd failure 때 전체 state를 정리해도 됨 | unrelated valid stream의 unread data 손실 | cleanup scope가 global | affected node만 unlink/release | `61f8b9858672`, `d3e2b37fca03` | invalid `-1`/closed fd 뒤 valid suffix 반환. |
| failed fd number는 다시 쓰이지 않음 | 새 stream이 stale bytes를 상속 | integer fd를 state key로 사용하면서 timely disposal 누락 | EOF/error 즉시 node disposal | `d3e2b37fca03` | production unlink는 직접 확인; actual test는 forced reuse를 하지 않는다는 범위 제한 포함. |
| normal path test면 ownership이 충분히 검증됨 | partial construction, double free, cross-node corruption | failure transition이 비결정적 | deterministic allocation/read replacement | `fd03a831686b` | n번째 allocation sweep, EIO call index, live/invalid/double counters, survivor call. |

## 8. Ownership / state / responsibility 변화

| 단계 | persistent state owner | state 선택 방식 | cleanup 범위 | 다른 descriptor와의 관계 |
| --- | --- | --- | --- | --- |
| refactor 전 | file-scope singleton | implicit | global 또는 singleton | 독립성 없음 |
| `fc01012e8521` | 여전히 상위 singleton owner | caller가 `&g_reader`를 helper에 전달 | 전달된 state | multi-fd는 아직 없음 |
| `a4f41cbf2cf0` | linked list의 각 node | descriptor number lookup | affected node | 각 node가 독립 state 소유 |
| `61f8b9858672` 이후 검증 | production 변화 없음 | interleaved lookup 관찰 | invalid call의 local effect | expected sequence로 isolation 고정 |
| `fd03a831686b` 이후 검증 | production 변화 없음 | fault 시 selected node 관찰 | partial construction까지 검사 | survivor node state 확인 |

### 실제 코드로 채울 responsibility map

- **List head owner와 storage duration:** `static t_reader *g_readers`가 process lifetime 동안 hidden list head를 보관합니다.
- **Node creation 책임 함수:** `create_reader(fd)`가 node를 allocation·초기화하고 head insertion을 commit합니다.
- **Parser mutation 책임 함수:** `find_line_end`, `reserve_bytes`, `compact_bytes`, `extract_line`과 public `get_next_line` read loop가 selected node만 변경합니다.
- **Node unlink 책임 함수:** `discard_reader(t_reader *reader)`가 pointer-to-pointer traversal로 정확한 link를 우회합니다.
- **Node/internal buffer release 책임 함수:** `discard_reader`가 `free(reader->bytes)` 뒤 `free(reader)`합니다. EOF tail ownership transfer에서는 먼저 `reader->bytes=NULL`로 분리합니다.
- **Public compatibility adapter의 책임:** descriptor를 검증하고 node를 lookup/create하며 parser result를 `char *` 또는 `NULL`로 반환하고, 이 시점에는 EOF/error에서 hidden node cleanup policy를 적용합니다.

## 9. Thread 최종 상태

Source 기준으로 이 Thread가 끝났을 때 compatibility reader는 descriptor number로 persistent state를 분리하며, 각 node는 자신의 unread interval, scan cursor, allocation, cleanup path를 가집니다. interleaving, invalid descriptor, fd reuse hazard, allocation/read fault에서 state와 cleanup의 scope가 검증됩니다.

### 학습자가 작성할 최종 상태 설명

- **list와 node의 실제 자료구조:** file-scope singly linked list이며 각 node는 `fd`, `bytes`, `begin`, `scan`, `end`, `capacity`, `next`를 갖습니다.
- **lookup/create/remove의 정확한 call graph:** `get_next_line` → zero-read validation → `find_reader` → missing이면 `create_reader` → selected parser helpers; terminal/error 또는 buffer fully consumed policy에서 `discard_reader`.
- **line result 뒤 node가 유지되는 이유:** `[begin,end)`에 read-ahead suffix가 있으면 다음 call에서 같은 fd가 `find_reader`로 같은 cursor/buffer를 이어 써야 합니다. 모든 bytes를 소비한 경우 해당 historical implementation은 node를 제거할 수 있습니다.
- **EOF/error 뒤 node가 제거되는 조건:** read 0에 unread가 없거나 EOF tail ownership을 넘긴 뒤, probe/read/reserve/result-allocation의 unrecoverable legacy failure에서 selected node를 unlink/free합니다.
- **fd reuse contamination을 막는 실제 코드:** 정상적으로 오류/EOF를 관찰한 경로의 `discard_reader`가 old numeric key를 list에서 제거합니다. 외부 close 뒤 library를 다시 호출하지 않으면 hidden node를 자동 감지할 수 없으므로 caller discipline와 후속 explicit context가 필요합니다.
- **explicit context API가 아직 필요한 이유:** hidden list는 caller가 EOF 전에 buffered state를 취소·reset·destroy할 수 없고, `NULL`이 EOF/error/wait를 구분하지 못하며 integer fd identity 변화도 handle과 분리할 수 없습니다.

## 10. 최종 architecture 또는 execution flow 정리

```text
get_next_line(fd)
    → [read(fd, ..., 0) descriptor validation/probe]
    → [find_reader(fd) on file-scope g_readers]
        → existing node: reuse its unread state
        → missing node: [create_reader allocation/init/head insertion]
    → [find_line_end/reserve_bytes/read/extract_line with selected node]
        → line: keep node for suffix/read-ahead
        → EOF: unlink selected node → release owned buffer/node
        → unrecoverable error: unlink selected node → release owned buffer/node
    → map result to compatibility return
```

### 실제 symbol과 mutation을 넣어 완성

1. **List traversal:** `find_reader`가 `reader = g_readers`부터 `reader->fd == fd`를 찾을 때까지 `next`를 이동합니다.
2. **Node allocation과 insertion commit point:** `create_reader`가 모든 scalar/pointer field를 초기화한 뒤 `reader->next=g_readers; g_readers=reader`로 list ownership을 넘깁니다.
3. **Helper state parameter 전달:** public caller가 lookup/create한 `reader`를 `find_line_end`, `reserve_bytes`, `extract_line`, `unread_length`에 넘깁니다.
4. **Line 뒤 retained state:** result copy 성공 뒤 `begin=line_end`, `scan=begin`; `begin<end`이면 node와 suffix가 남습니다.
5. **EOF/error unlink 순서:** `discard_reader`가 먼저 predecessor link를 `reader->next`로 바꾸고 그 다음 buffer와 node를 free합니다. EOF transfer는 buffer pointer를 caller에게 분리한 뒤 discard합니다.
6. **Head/middle/tail removal 처리:** pointer-to-pointer traversal이 head에는 `&g_readers`, 이후에는 `&previous->next`를 사용하므로 별도 special case가 없습니다.
7. **다른 node를 보존하는 근거:** unlink는 selected pointer를 찾은 한 link만 갱신하고 다른 node의 fields를 읽거나 초기화하지 않습니다. interleaving/closed/fault tests가 survivor result를 확인합니다.

## 11. 학습 완료 자가 점검

- [x] `fc01012e8521`이 multi-descriptor feature 자체가 아니라 준비 refactor인 이유를 설명할 수 있습니다.
- [x] node가 소유하는 resource와 단순히 보관하는 fd integer를 구분했습니다.
- [x] list lookup/create/insert의 failure rollback을 실제 코드로 확인했습니다.
- [x] interleaved call마다 선택되는 node와 unread suffix를 추적했습니다.
- [x] invalid descriptor가 다른 node를 reset하지 않는 근거가 있습니다.
- [x] stale node와 fd number reuse의 관계를 concrete scenario로 설명할 수 있습니다.
- [x] write-only/closed descriptor의 cleanup path를 확인했습니다.
- [x] fault harness가 invalid/duplicate free를 검출하는 방법을 확인했습니다.
- [x] `fd03a831686b`를 POSIX Thread와 중복 학습하되 여기서는 node isolation 관점으로 기록했습니다.
- [x] final HEAD의 context object를 이 시점 node 구현에 소급하지 않았습니다.
