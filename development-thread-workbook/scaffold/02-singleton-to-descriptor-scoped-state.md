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
| 변경 전 implicit singleton access |  |  |
| 변경 후 helper signature |  |  |
| 상위 caller가 전달하는 state instance |  |  |
| cleanup helper의 대상 state |  |  |
| 여전히 남은 singleton ownership |  |  |

- 이 refactor가 직접 해결한 coupling과 아직 해결하지 않은 multi-descriptor 문제를 구분합니다.
- 다음 commit이 새 node type/list를 추가할 때 어떤 helper를 그대로 재사용하는지 표시합니다.
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
| list head/link |  |  |  |  |  |
| descriptor number |  |  | immutable인지 확인 |  |  |
| byte allocation |  |  |  | EOF/error |  |
| unread indices |  |  |  | node lifetime 종료 |  |
| node allocation |  |  | list insertion/removal | EOF/error |  |

#### Lookup → create → use → remove 흐름

```text
get_next_line(fd)
    → [lookup helper]
        → found: [existing node]
        → not found: [node/state allocation 및 insertion]
    → [reader operation on exactly one node]
        → line: node retained
        → EOF: [unlink/release affected node]
        → unrecoverable error: [unlink/release affected node]
```

각 대괄호를 해당 SHA의 symbol과 코드 근거로 채웁니다.

#### Failure와 descriptor reuse 분석

- node가 EOF/error 뒤 남아 있을 경우 동일 integer fd가 새로운 file에 재사용될 때 어떤 unread bytes가 섞일 수 있는지 단계별 scenario를 작성합니다.
- descriptor number를 key로 사용한다는 것과 open file description identity가 같다는 것을 혼동하지 않습니다. 이 SHA가 실제로 비교하는 값만 기록합니다.
- 한 node의 cleanup이 다른 node의 link와 allocation을 유지하는지 unlink code로 입증합니다.

#### 이 commit의 보장과 한계

- **보장:** interleaved active descriptors의 independent state와 local cleanup을 작성합니다.
- **한계:** explicit caller-controlled lifetime, reset, richer result status는 이후 Thread에서 도입됨을 코드로 확인합니다.
- **후속 검증:** `61f8b9858672`, `d3e2b37fca03`, `fd03a831686b`가 각각 정상 interleaving, stale cleanup, injected failure를 어떻게 나누어 검증하는지 연결합니다.
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
| **Production invariant** | lookup, mutation, disposal은 descriptor node 하나에 scoped되며 한 stream의 unread suffix가 다른 stream으로 이동하지 않는다는 invariant를 연결합니다. |
| **Failure / boundary** | interleaved partial reads와 unrelated invalid descriptor call을 구분합니다. |
| **Test technique** | real file descriptors를 교차 호출하는 deterministic state-isolation regression인지 기록합니다. |
| **Production path** | public call → list lookup → selected node parser → result/cleanup 경로를 각 call마다 적습니다. |
| **증명하는 것** | line order, unread suffix, invalid-call isolation을 assertion별로 작성합니다. |
| **증명하지 않는 것** | fd reuse cleanup, every allocation failure, same-context thread synchronization은 이 test가 증명하지 않음을 기록합니다. |
| **분류** | core architecture boundary를 고정하는 focused deterministic regression으로 분류합니다. |
| **막는 회귀** | global cursor, shared buffer, invalid descriptor의 broad reset을 각각 어떤 expected sequence가 검출하는지 적습니다. |

#### Interleaving state trace

| 호출 순서 | fd | 예상 선택 node | 호출 전 unread bytes | 반환 | 호출 후 node 유지/제거 |
| ---: | ---: | --- | --- | --- | --- |
| 1 |  |  |  |  |  |
| 2 |  |  |  |  |  |
| 3 |  |  |  |  |  |
| invalid call |  |  |  |  |  |
| 이후 valid call |  |  |  |  |  |
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
| **Production invariant** | unusable descriptor의 persistent node는 제거되고, cleanup은 affected node 하나에만 적용되어야 한다는 invariant를 연결합니다. |
| **Failure / boundary** | write-only, already-closed, state creation 후 failure, descriptor-number reuse를 각각 구분합니다. |
| **Test technique** | 실제 descriptor lifecycle을 이용하는 regression인지, 내부 hook도 사용하는지 해당 SHA 기준으로 기록합니다. |
| **Production path** | lookup/create → probe/read failure → unlink/release → later fd reuse lookup 경로를 적습니다. |
| **증명하는 것** | stale bytes가 reused number에 전달되지 않고 다른 node가 유지된다는 근거를 작성합니다. |
| **증명하지 않는 것** | 모든 allocation point rollback과 ordered `EINTR`/`EAGAIN` semantics는 이 commit만으로 증명되지 않음을 기록합니다. |
| **분류** | descriptor lifecycle correctness를 고정하는 focused regression으로 분류합니다. |
| **막는 회귀** | failed node retained, global list clear, double release를 각각 어떤 observation이 검출하는지 적습니다. |

#### 기존 가정 → 실제 위험 → 검증 연결

- **기존 가정:** fd integer가 active stream을 계속 같은 identity로 가리킨다고 암묵적으로 가정한 코드가 있는지 확인합니다.
- **실제 위험:** close 후 같은 integer가 재사용될 때 stale unread bytes가 새 stream으로 전달되는 sequence를 작성합니다.
- **필요한 cleanup decision:** error/EOF에서 unlink와 allocation release가 완료되어야 하는 순서를 production code로 확인합니다.
- **regression evidence:** 새 fd의 첫 result와 다른 valid fd의 next result를 확인하는 assertion을 기록합니다.
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
| **Production invariant** | partial construction과 read failure의 rollback/cleanup은 affected descriptor node에만 적용되고 다른 node의 unread state는 유지되어야 합니다. |
| **Failure / boundary** | node allocation, internal buffer growth, result allocation, partial read 뒤 error 중 이 SHA에서 실제 주입하는 지점을 분류합니다. |
| **Test technique** | deterministic fault injection과 allocation ownership tracking을 설명합니다. |
| **Production path** | fault scheduler → replacement function → production failure branch → node unlink/retention → survivor descriptor call을 적습니다. |
| **증명하는 것** | single owner, safe rollback, no invalid/duplicate free, cross-descriptor survival을 assertion별로 작성합니다. |
| **증명하지 않는 것** | `BLR_AGAIN`이나 ordered `EINTR` recovery는 후속 Thread의 fix/test 없이는 증명되지 않음을 기록합니다. |
| **분류** | 정확한 failure transition을 반복하는 deterministic regression harness로 분류합니다. |
| **막는 회귀** | partially inserted node, broad cleanup, double free, survivor unread-byte loss를 어떤 scenario가 막는지 적습니다. |

#### Fault point별 ownership 기록

| 주입 지점 | 실패 직전 owner/resource | production return | affected node 상태 | 다른 node 상태 | leak/free 검사 |
| --- | --- | --- | --- | --- | --- |
| node allocation |  |  |  |  |  |
| buffer allocation/growth |  |  |  |  |  |
| caller result allocation |  |  |  |  |  |
| read before progress |  |  |  |  |  |
| read after partial progress |  |  |  |  |  |

## 6. Invariant ledger

| Invariant | 도입/준비 commit | 위험이 드러나는 commit | 검증/강화 commit | 학습자가 남길 코드 근거 |
| --- | --- | --- | --- | --- |
| helper mutation은 전달받은 reader state에만 적용됩니다. | `fc01012e8521` | singleton이 multi-fd를 지원하지 못하는 한계 | `a4f41cbf2cf0` |  |
| active descriptor마다 독립 unread buffer와 cursor를 소유합니다. | `a4f41cbf2cf0` | global buffer/cursor가 interleaving을 오염시킬 위험 | `61f8b9858672` |  |
| EOF/error cleanup은 affected descriptor node 하나만 제거합니다. | `a4f41cbf2cf0` | invalid fd가 다른 node까지 지우는 위험 | `61f8b9858672`, `d3e2b37fca03` |  |
| failed/completed fd의 stale state는 reused integer에 붙지 않습니다. | `a4f41cbf2cf0`의 timely disposal decision | descriptor-number reuse hazard | `d3e2b37fca03` |  |
| allocation/read failure가 다른 node의 unread bytes를 지우지 않습니다. | node-local ownership model | exact fault transition | `fd03a831686b` |  |
| acquired allocation마다 owner가 하나이며 invalid/duplicate free가 없습니다. | production ownership paths | partial construction/failure | `fd03a831686b` |  |

## 7. Failure → Fix → Test 연결

이 Thread에는 subject가 `fix`인 commit이 없습니다. architecture change와 regression test가 failure risk를 닫는 구조입니다.

| 기존 가정 | 실제 failure 또는 위험 | root cause | 수정된 decision/architecture | 검증 commit | 학습자 근거 |
| --- | --- | --- | --- | --- | --- |
| 하나의 persistent state면 충분함 | interleaved descriptor의 suffix/cursor contamination | hidden singleton ownership | explicit state parameter 후 descriptor별 node | `61f8b9858672` |  |
| 한 fd failure 때 전체 state를 정리해도 됨 | unrelated valid stream의 unread data 손실 | cleanup scope가 global | affected node만 unlink/release | `61f8b9858672`, `d3e2b37fca03` |  |
| failed fd number는 다시 쓰이지 않음 | 새 stream이 stale bytes를 상속 | integer fd를 state key로 사용하면서 timely disposal 누락 | EOF/error 즉시 node disposal | `d3e2b37fca03` |  |
| normal path test면 ownership이 충분히 검증됨 | partial construction, double free, cross-node corruption | failure transition이 비결정적 | deterministic allocation/read replacement | `fd03a831686b` |  |

## 8. Ownership / state / responsibility 변화

| 단계 | persistent state owner | state 선택 방식 | cleanup 범위 | 다른 descriptor와의 관계 |
| --- | --- | --- | --- | --- |
| refactor 전 | file-scope singleton | implicit | global 또는 singleton | 독립성 없음 |
| `fc01012e8521` | 여전히 상위 singleton owner | caller가 state를 helper에 전달 | 전달된 state | multi-fd는 아직 없음 |
| `a4f41cbf2cf0` | linked list의 각 node | descriptor number lookup | affected node | 각 node가 독립 state 소유 |
| `61f8b9858672` 이후 검증 | production 변화 없음 | interleaved lookup 관찰 | invalid call의 local effect | expected sequence로 isolation 고정 |
| `fd03a831686b` 이후 검증 | production 변화 없음 | fault 시 선택 node 관찰 | partial construction까지 검사 | survivor node state 확인 |

### 실제 코드로 채울 responsibility map

- **List head owner와 storage duration:**
- **Node creation 책임 함수:**
- **Parser mutation 책임 함수:**
- **Node unlink 책임 함수:**
- **Node/internal buffer release 책임 함수:**
- **Public compatibility adapter의 책임:**

## 9. Thread 최종 상태

Source 기준으로 이 Thread가 끝났을 때 compatibility reader는 descriptor number로 persistent state를 분리하며, 각 node는 자신의 unread interval, scan cursor, allocation, cleanup path를 가집니다. interleaving, invalid descriptor, fd reuse hazard, allocation/read fault에서 state와 cleanup의 scope가 검증됩니다.

### 학습자가 작성할 최종 상태 설명

- **list와 node의 실제 자료구조:**
- **lookup/create/remove의 정확한 call graph:**
- **line result 뒤 node가 유지되는 이유:**
- **EOF/error 뒤 node가 제거되는 조건:**
- **fd reuse contamination을 막는 실제 코드:**
- **explicit context API가 아직 필요한 이유:**

## 10. 최종 architecture 또는 execution flow 정리

```text
get_next_line(fd)
    → [descriptor validation/probe 시점]
    → [file-scope list lookup]
        → existing node: reuse its unread state
        → missing node: [allocate/init/insert]
    → [parser operation with selected node]
        → line: keep node for suffix/read-ahead
        → EOF: unlink selected node → release owned buffer/node
        → unrecoverable error: unlink selected node → release owned buffer/node
    → map result to compatibility return
```

### 실제 symbol과 mutation을 넣어 완성

1. **List traversal:**
2. **Node allocation과 insertion commit point:**
3. **Helper state parameter 전달:**
4. **Line 뒤 retained state:**
5. **EOF/error unlink 순서:**
6. **Head/middle/tail removal 처리:**
7. **다른 node를 보존하는 근거:**

## 11. 학습 완료 자가 점검

- [ ] `fc01012e8521`이 multi-descriptor feature 자체가 아니라 준비 refactor인 이유를 설명할 수 있습니다.
- [ ] node가 소유하는 resource와 단순히 보관하는 fd integer를 구분했습니다.
- [ ] list lookup/create/insert의 failure rollback을 실제 코드로 확인했습니다.
- [ ] interleaved call마다 선택되는 node와 unread suffix를 추적했습니다.
- [ ] invalid descriptor가 다른 node를 reset하지 않는 근거가 있습니다.
- [ ] stale node와 fd number reuse의 관계를 concrete scenario로 설명할 수 있습니다.
- [ ] write-only/closed descriptor의 cleanup path를 확인했습니다.
- [ ] fault harness가 invalid/duplicate free를 검출하는 방법을 확인했습니다.
- [ ] `fd03a831686b`를 POSIX Thread와 중복 학습하되 여기서는 node isolation 관점으로 기록했습니다.
- [ ] final HEAD의 context object를 이 시점 node 구현에 소급하지 않았습니다.
