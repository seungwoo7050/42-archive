# Thread: Explicit reader lifetime and one authoritative engine

## 1. Thread 목표

EOF/error에 묶인 hidden lifetime에서 벗어나 caller가 생성·reset·destroy하는 opaque reader context와 명시적 result state를 도입하는 과정을 복원합니다. 이후 `get_next_line`이 별도 parser를 유지하지 않고 같은 engine을 사용하는지, line allocation failure가 input consumption을 commit하지 않는지, descriptor borrowing과 kernel offset coupling이 API 사용 규칙으로 어떻게 검증되는지 확인합니다.

### Source에서 연결된 프로젝트 항목

- **Core architecture:** `t_blr_reader`는 heap object와 internal buffer를 소유하고 supplied descriptor는 빌립니다.
- **Core architecture:** `blr_reader_create`, `blr_reader_next`, `blr_reader_reset`, `blr_reader_destroy`가 explicit lifetime/result semantics를 제공합니다.
- **Core architecture:** `blr_reader_next`는 authoritative state-transition engine이고 `get_next_line(fd)`는 그 위의 compatibility adapter입니다.
- **Critical invariants:** successful line은 caller-owned independent allocation이며, non-line result는 valid output pointer를 `NULL`로 둡니다.
- **Critical invariants:** reset/destroy는 owned memory를 해제하지만 borrowed descriptor를 닫지 않습니다.
- **Critical invariants:** allocation/read failure가 explicit context의 unread input을 부분 소비하면 안 되며, line extraction은 caller-visible allocation 성공 뒤에만 cursor movement를 commit합니다.
- **Major engineering difficulty:** explicit context를 추가하면서 compatibility API와 parsing implementation이 중복되거나 diverge하지 않도록 하는 문제입니다.
- **Practical engineering area:** descriptor borrowing, offset coupling, fd reuse, dup aliases, reset requirement를 테스트로 명시하는 문제입니다.

### Source가 확정한 significance

프로젝트는 hidden lifetime을 explicit state object로 바꾸고 caller가 cancel, reset, destroy할 수 있게 합니다. result enumeration은 data와 status를 분리하고, adapter는 compatibility function과 explicit API가 다른 parser로 갈라지는 것을 막습니다. 테스트는 borrowed descriptor의 read-ahead가 kernel offset에 결합되고, integer reuse에는 새 context가 필요하며, output allocation failure가 input consumption을 commit하면 안 된다는 비자명한 결과를 확립합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- context는 어떤 resource를 소유하고 descriptor는 왜 borrowed resource인가?
- create/reset/destroy는 buffer, indices, EOF flag, descriptor에 각각 어떤 mutation을 수행하는가?
- `blr_reader_next`의 result enum과 output pointer rule은 `char *`/`NULL` ambiguity를 어떻게 제거하는가?
- repeated EOF가 new read 없이 stable terminal이 되는 상태는 어디에 저장되는가?
- legacy adapter는 context를 어떻게 lookup하고 result taxonomy를 어떻게 축소해 반환하는가?
- allocation failure에서 delimiter 또는 EOF tail을 소비하지 않으려면 cursor commit은 어느 시점 이후여야 하는가?
- external seek, close/reuse, `dup` aliases가 context의 buffered read-ahead와 어떤 관계를 갖는가?

## 3. 완료 기준

- public opaque type과 lifecycle functions의 선언·구현·ownership을 확인했습니다.
- create/reset/destroy가 descriptor를 닫지 않는다는 코드와 test 근거가 있습니다.
- `blr_reader_next`의 every result branch와 output pointer mutation을 추적했습니다.
- stable EOF flag와 repeated call behavior를 실제 코드로 설명할 수 있습니다.
- `get_next_line`이 authoritative engine을 호출하고 return을 map하는 call graph를 복원했습니다.
- newline result와 EOF-tail result의 allocation failure가 non-consuming이라는 근거가 있습니다.
- seek/fd reuse/dup alias test의 의미와 API 사용자가 지켜야 할 lifecycle rule을 구분했습니다.

## 4. Commit map
| 순서 | Commit | Subject | Importance | Tags | Source에서 확정된 Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `903768a43bf4` | `feat(context): 명시적 reader 수명 API 추가` | **A** | `ARCH`, `READER_LIFECYCLE`, `API_CONTRACT` | opaque create/reset/destroy를 공개하고 descriptor ownership은 caller에게 남깁니다. |
| 2 | `2e681112b304` | `feat(reader): 명시적 결과 상태 API 추가` | **S** | `ARCH`, `API_CONTRACT`, `CORE` | explicit line/EOF/error result-state API를 정의합니다. |
| 3 | `9bd6ebf429e2` | `refactor(reader): legacy API를 context reader에 연결` | **A** | `REFACTOR`, `INTEGRATION`, `API_CONTRACT` | legacy function을 context engine에 연결하고 allocation failure의 non-consuming extraction을 확립합니다. |
| 4 | `249093ba477a` | `test(context): 결과 상태와 컨텍스트 수명 검증` | **A** | `TEST`, `READER_LIFECYCLE`, `API_CONTRACT` | descriptor borrowing, seek 후 reset, fd reuse, dup alias, stable result를 검증합니다. |
| 5 | `a24ad4e49cc4` | `test(failure): 컨텍스트의 line 할당 재시도 검증` | **A** | `TEST`, `READER_LIFECYCLE`, `RISK` | newline-delimited line과 EOF-tail allocation failure가 input loss 없이 재시도됨을 증명합니다. |

## 5. Commit별 학습 기록
### 5.1 `903768a43bf4` — `feat(context): 명시적 reader 수명 API 추가`

- **Commit:** `903768a43bf4`
- **Subject:** `feat(context): 명시적 reader 수명 API 추가`
- **Importance:** **A**
- **Tags:** `ARCH`, `READER_LIFECYCLE`, `API_CONTRACT`

#### Source에서 확정된 역할

opaque `t_blr_reader`와 create, reset, destroy operation을 공개해 reader lifetime을 caller가 관리하게 합니다. context는 heap object와 internal buffer를 소유하지만 supplied descriptor는 빌립니다. reset/destroy는 buffered state를 버리지만 descriptor를 닫지 않으며, legacy descriptor list도 같은 lifecycle primitive를 사용하도록 적응합니다.

#### 해당 SHA에서 확인할 실제 코드

1. public header에서 opaque type declaration과 create/reset/destroy signature를 찾습니다.
2. context implementation type의 fields를 찾되 public header에 layout이 노출되지 않는지 확인합니다.
3. create가 context object와 internal buffer를 언제 allocation하는지, descriptor와 indices를 어떻게 초기화하는지 추적합니다.
4. create 중 partial allocation failure의 rollback owner와 return rule을 기록합니다.
5. reset이 buffer capacity를 release하는지 또는 재사용하는지 해당 SHA 코드로 확인하고, indices/EOF state를 어떤 값으로 되돌리는지 적습니다.
6. destroy가 NULL-safe인지, internal buffer와 object release 순서가 무엇인지 확인합니다.
7. reset/destroy path에 `close` call이 없는지 symbol search와 test로 확인합니다.
8. legacy descriptor-list node가 새 lifecycle primitive를 어디서 호출하는지 caller/callee를 기록합니다.

#### Ownership ledger

| Resource | 획득 지점 | owner | reset 시 | destroy 시 | descriptor close 여부 |
| --- | --- | --- | --- | --- | --- |
| context heap object |  |  |  |  | 해당 없음 |
| internal byte buffer |  |  |  |  | 해당 없음 |
| supplied file descriptor | caller | caller |  |  |  |
| legacy list node/context |  |  |  |  |  |

#### 학습자가 복원할 API decision

- hidden list lifetime만으로는 partial read stream을 EOF 전에 abandon하거나 external seek 뒤 state를 다시 맞추기 어려웠던 이유를 작성합니다.
- opacity가 caller에게 감추는 invariant와 public API가 명시하는 ownership을 구분합니다.
- reset과 destroy를 “descriptor lifecycle”로 오해하지 않도록, borrowed fd와 owned state의 release를 분리해 설명합니다.
- 다음 commit에서 reading outcome이 아직 어떤 방식으로 표현되는지 확인하고 `2e681112b304`의 result enum 필요성을 연결합니다.
### 5.2 `2e681112b304` — `feat(reader): 명시적 결과 상태 API 추가`

- **Commit:** `2e681112b304`
- **Subject:** `feat(reader): 명시적 결과 상태 API 추가`
- **Importance:** **S**
- **Tags:** `ARCH`, `API_CONTRACT`, `CORE`

#### Source가 확정한 Problem

historical `char *` interface는 clean EOF, allocation/I/O error, temporary incompleteness를 `NULL` 하나로 겹치며, persistent stream state와 repeated terminal result를 명시적으로 다룰 handle이 없습니다.

#### Source가 확정한 Decision

`blr_reader_next`가 explicit result enumeration을 반환하고 successful line은 output pointer를 통해 전달합니다. context가 EOF state를 기록해 repeated call이 new read 없이 terminal로 유지되며, non-line result는 supplied output pointer를 null로 둡니다.

#### Source가 확정한 중요성

이 commit은 finished library의 richer state-machine contract를 만듭니다. caller는 data ownership과 control status를 분리하고, null data pointer를 서로 다른 outcome으로 추측하지 않아도 됩니다. 이 engine은 이후 `get_next_line`의 authoritative implementation이 됩니다.

#### 해당 SHA에서 확인할 실제 핵심 코드

1. public header의 result enum 정의와 이 SHA에 실제 존재하는 enumerator를 정확히 기록합니다. 후속 `BLR_AGAIN`을 소급하지 않습니다.
2. `blr_reader_next` signature에서 context, output line pointer, return type의 역할을 구분합니다.
3. 함수 entry에서 invalid argument를 검사하고 output pointer를 `NULL`로 초기화하는 순서를 확인합니다.
4. buffered newline, need-more-read, EOF-tail, clean EOF, error branch가 각각 어떤 enum을 반환하는지 control flow를 작성합니다.
5. successful line에서 output pointer ownership이 caller로 넘어가는 지점을 확인합니다.
6. context의 EOF flag가 최초 EOF에서 설정되는 위치와 repeated call에서 read를 건너뛰는 조건을 찾습니다.
7. empty input이 `LINE`이 아니라 EOF로 가는 조건과 nonempty EOF tail이 먼저 `LINE`이 되는 조건을 비교합니다.
8. error branch가 output pointer를 stale caller value로 남기지 않는지 entry/exit mutation을 확인합니다.

#### Result-state table

| 상황 | 해당 SHA enum | `*line` 값 | context unread state | EOF flag | 다음 call behavior |
| --- | --- | --- | --- | --- | --- |
| buffered newline 발견 |  |  |  |  |  |
| EOF + nonempty tail |  |  |  |  |  |
| clean EOF / repeated EOF |  |  |  |  |  |
| invalid argument |  |  |  |  |  |
| allocation 또는 I/O error |  |  |  |  |  |

#### 코드 근거 기록

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| public enum과 function declaration |  |  |
| output pointer 초기화 rule |  |  |
| successful line ownership transfer |  |  |
| EOF flag set/check |  |  |
| repeated EOF fast path |  |  |
| error return과 state 처리 |  |  |

#### 이 commit이 보장하는 것과 이후 변화

- `LINE`, `EOF`, `ERROR`를 구분하는 실제 enumerator와 return path를 작성합니다.
- non-line outcomes가 output pointer를 null로 두는 API contract를 code/test evidence로 입증합니다.
- `EAGAIN`/`EWOULDBLOCK`을 별도 status로 다루는 final behavior는 `f0055ae5cf19`에서 도입되므로 이 SHA에 기록하지 않습니다.
- legacy adapter가 아직 separate parser인지 또는 일부만 공유하는지 확인하고 다음 commit의 integration 필요성을 설명합니다.
### 5.3 `9bd6ebf429e2` — `refactor(reader): legacy API를 context reader에 연결`

- **Commit:** `9bd6ebf429e2`
- **Subject:** `refactor(reader): legacy API를 context reader에 연결`
- **Importance:** **A**
- **Tags:** `REFACTOR`, `INTEGRATION`, `API_CONTRACT`

#### Source에서 확정된 역할

`get_next_line`을 context reader 위의 adapter로 줄입니다. descriptor lookup이 context를 제공하고, `blr_reader_next`가 buffering, extraction, EOF, failure state transition을 수행하며, adapter는 richer result를 historical `char *`/`NULL`로 mapping합니다. line extraction은 allocation/copy가 성공하기 전까지 consuming하지 않도록 바뀝니다.

#### 변경 전후 authoritative engine 확인

1. 직전 SHA에서 legacy function과 context API가 각각 어떤 parsing path를 사용했는지 call graph를 그립니다.
2. 이 SHA에서 duplicated scan/read/extract code가 제거되고 `blr_reader_next` 호출로 대체된 diff를 찾습니다.
3. descriptor-indexed compatibility state가 raw reader state인지 `t_blr_reader` context인지 확인합니다.
4. adapter가 `LINE`, `EOF`, `ERROR`를 각각 `char *` 또는 `NULL`로 mapping하는 switch/branch를 발췌합니다.
5. EOF/error에서 hidden context/node를 retain 또는 remove하는 정책을 해당 SHA 기준으로 기록합니다.
6. newline-delimited extraction에서 result allocation/copy 성공 전 `begin`이 움직이지 않는지 mutation 순서를 확인합니다.
7. allocation failure 뒤 `scan` cursor가 same delimiter를 다시 찾을 수 있도록 어떤 값으로 복구되는지 확인합니다.
8. EOF tail을 internal buffer 자체로 transfer하지 않고 caller-owned storage로 copy하는 지점을 확인합니다.

#### Transactional extraction trace

| 단계 | result allocation 상태 | `begin` | `scan` | `end` | caller output | retry 시 기대 |
| --- | --- | ---: | ---: | ---: | --- | --- |
| delimiter 발견 직후 | 미시도 |  |  |  | NULL | same line available |
| allocation 실패 | 실패 |  |  |  | NULL | exact retry 가능 |
| allocation/copy 성공 직전 | 성공 |  |  |  | temp/result | 아직 commit 여부 확인 |
| cursor commit 후 | 성공 |  |  |  | caller-owned line | next record |

EOF tail에 대해서도 같은 표를 별도로 작성합니다.

#### 코드 근거 기록

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| legacy adapter entry |  |  |
| descriptor → context lookup |  |  |
| `blr_reader_next` authoritative call |  |  |
| result enum → `char *`/`NULL` mapping |  |  |
| newline result allocation failure rollback |  |  |
| `scan` restoration |  |  |
| EOF tail copy-out |  |  |
| context/node cleanup policy |  |  |

#### 기존 가정 → 실제 위험 → 수정된 decision

- **기존 가정:** result interval을 먼저 소비한 뒤 allocation해도 된다는 코드가 있었는지 직전 SHA에서 확인합니다.
- **실제 failure:** allocation 실패 시 delimiter 또는 EOF tail이 skip되거나 EOF로 잘못 이동할 수 있는 sequence를 작성합니다.
- **root cause:** caller-visible result가 아직 만들어지지 않았는데 internal cursor movement를 commit한 지점이 있는지 확인합니다.
- **수정된 invariant:** allocation과 copy 성공 이후에만 input consumption을 commit합니다.
- **후속 regression:** `a24ad4e49cc4`가 newline case와 EOF-tail case를 각각 어떻게 재시도하는지 연결합니다.
### 5.4 `249093ba477a` — `test(context): 결과 상태와 컨텍스트 수명 검증`

- **Commit:** `249093ba477a`
- **Subject:** `test(context): 결과 상태와 컨텍스트 수명 검증`
- **Importance:** **A**
- **Tags:** `TEST`, `READER_LIFECYCLE`, `API_CONTRACT`

#### Source에서 확정된 역할

ordered `LINE`, repeated `EOF`, empty input, invalid arguments, descriptor reposition 뒤 reset, destroy without close를 검증합니다. descriptor-number reuse, 같은 open file description을 공유하는 duplicated descriptors, context가 buffer한 read-ahead와 kernel offset의 결합도 다룹니다.

#### 해당 SHA에서 확인할 테스트 코드

1. context create → multiple `blr_reader_next` → destroy의 기본 sequence와 expected enum/output을 찾습니다.
2. repeated EOF에서 read call count 또는 behavior가 stable terminal임을 어떻게 확인하는지 기록합니다.
3. invalid context/output argument마다 expected enum과 output pointer 값이 무엇인지 확인합니다.
4. descriptor를 seek/reposition한 뒤 reset 전후 result 차이를 만드는 fixture를 찾습니다.
5. destroy 이후 같은 descriptor를 계속 사용할 수 있음을 read/lseek/close 중 어떤 operation으로 검증하는지 확인합니다.
6. close 후 같은 integer fd가 재사용되는 scenario에서 old context를 버려야 하는 test를 찾습니다.
7. `dup` 또는 equivalent로 같은 open file description을 공유하는 descriptors를 만들고 offset/read-ahead 관계를 어떻게 검증하는지 확인합니다.
8. returned lines가 independent caller-owned allocations임을 release/lifetime assertion으로 확인합니다.

#### Test commit 학습 기록

| 구분 | 해당 SHA에서 기록할 내용 |
| --- | --- |
| **Production invariant** | context가 state를 소유하고 descriptor를 빌리며, result status/output ownership/stable EOF가 public contract대로 동작해야 합니다. |
| **Failure / boundary** | invalid arguments, external seek, close/reuse, dup alias, destroy-before-EOF를 구분합니다. |
| **Test technique** | real descriptor lifecycle과 public context API를 사용하는 contract/integration tests로 기록합니다. |
| **Production path** | create/reset/next/destroy와 underlying descriptor operations가 어떤 순서로 호출되는지 적습니다. |
| **증명하는 것** | borrowed descriptor, reset requirement, stable EOF, output ownership, context-stream-position association을 assertion별로 작성합니다. |
| **증명하지 않는 것** | same-context concurrent calls의 synchronization, nonblocking `AGAIN`, every allocation failure는 이 suite 전체만으로 증명되지 않음을 기록합니다. |
| **분류** | 여러 lifecycle boundary를 포괄하는 broad contract regression으로 분류합니다. |
| **막는 회귀** | destroy가 fd를 close, external seek 뒤 stale read-ahead 반환, reused fd에 old context 사용, stale output pointer를 각각 어떤 case가 막는지 적습니다. |

#### Descriptor / context 관계 기록

| Scenario | kernel offset 변화 주체 | context buffer 상태 | reset 필요 여부 | 기대 result | 근거 test |
| --- | --- | --- | --- | --- | --- |
| normal sequential read |  |  |  |  |  |
| external seek |  |  |  |  |  |
| close 후 fd number reuse |  |  |  |  |  |
| duplicated descriptor alias |  |  |  |  |  |
| destroy before EOF |  |  |  |  |  |
### 5.5 `a24ad4e49cc4` — `test(failure): 컨텍스트의 line 할당 재시도 검증`

- **Commit:** `a24ad4e49cc4`
- **Subject:** `test(failure): 컨텍스트의 line 할당 재시도 검증`
- **Importance:** **A**
- **Tags:** `TEST`, `READER_LIFECYCLE`, `RISK`

#### Source에서 확정된 역할

caller-visible line allocation을 newline이 이미 buffered된 경우와 EOF가 unterminated tail을 남긴 경우에 각각 강제로 실패시킵니다. 같은 context를 다시 호출했을 때 original line이 skip, truncate, EOF 전환 없이 정확히 반환되어야 하며 temporary storage leak도 없어야 합니다.

#### 해당 SHA에서 확인할 테스트 코드

1. newline-delimited line이 이미 internal buffer에 있는 상태를 만드는 fixture와 fault activation 시점을 찾습니다.
2. EOF tail이 internal buffer에 남은 상태에서 result allocation만 실패시키는 sequence를 찾습니다.
3. 첫 failed call의 expected enum과 output pointer가 무엇인지 확인합니다.
4. fault를 해제한 뒤 같은 context를 그대로 재호출하는 코드와 exact expected bytes를 기록합니다.
5. retry call 전 context reset/recreate가 없음을 확인합니다.
6. failed attempt 뒤 allocation/release ledger가 leak 또는 invalid free 없이 정리되는 assertion을 찾습니다.
7. 두 scenario가 production extraction의 서로 다른 branch를 통과하는지 call path를 비교합니다.

#### Test commit 학습 기록

| 구분 | 해당 SHA에서 기록할 내용 |
| --- | --- |
| **Production invariant** | result allocation failure는 buffered input에 대해 non-consuming operation이며 cursor movement는 allocation 성공 뒤에만 commit되어야 합니다. |
| **Failure / boundary** | buffered newline extraction과 EOF-tail extraction의 caller-visible allocation failure를 분리합니다. |
| **Test technique** | 정확한 allocation point를 겨냥한 deterministic fault injection과 same-context retry입니다. |
| **Production path** | buffered interval → result allocation failure → error return → unchanged cursor → retry → successful copy/commit을 symbol로 적습니다. |
| **증명하는 것** | exact same line retry, no skip/shorten/early EOF, no temporary leak를 assertion별로 작성합니다. |
| **증명하지 않는 것** | read failure recovery, `EINTR`, `EAGAIN`, thread safety는 이 test가 증명하지 않음을 기록합니다. |
| **분류** | transactional extraction을 고정하는 narrow deterministic regression으로 분류합니다. |
| **막는 회귀** | pre-allocation cursor advance, EOF tail clear-before-copy, scan cursor loss를 어떤 scenario가 검출하는지 적습니다. |

#### Failure → retry state trace

| Scenario | failed call 전 `begin/scan/end/EOF` | failure return 후 state | retry result | successful commit 후 state |
| --- | --- | --- | --- | --- |
| buffered newline |  |  |  |  |
| EOF tail |  |  |  |  |

## 6. Invariant ledger

| Invariant | 최초/강화 commit | 부족함 또는 위험 | 고정한 test | 학습자가 남길 코드 근거 |
| --- | --- | --- | --- | --- |
| context는 own heap/buffer를 관리하고 descriptor는 borrow합니다. | `903768a43bf4` | destroy/reset이 fd를 close할 위험 | `249093ba477a` |  |
| caller가 reset/destroy로 reader lifetime을 제어할 수 있습니다. | `903768a43bf4` | external seek 또는 abandon 뒤 hidden state mismatch | `249093ba477a` |  |
| data result와 EOF/error status를 구분합니다. | `2e681112b304` | `char *`/`NULL` ambiguity | `249093ba477a` |  |
| non-line result는 output pointer를 `NULL`로 둡니다. | `2e681112b304` | stale caller pointer 오해/잘못된 free | `249093ba477a` |  |
| EOF는 context에 기록되어 repeated call에서 stable terminal입니다. | `2e681112b304` | repeated read 또는 accidental one-shot completion | `249093ba477a` |  |
| explicit API와 legacy API는 one authoritative engine을 사용합니다. | `9bd6ebf429e2` | duplicated parser divergence | explicit/legacy 관련 test를 해당 SHA에서 연결 |  |
| result allocation failure는 input을 소비하지 않습니다. | `9bd6ebf429e2` | cursor advance 후 allocation failure | `a24ad4e49cc4` |  |
| read-ahead state는 descriptor의 current stream position과 결합됩니다. | context design의 consequence | external seek, close/reuse, dup alias | `249093ba477a` |  |

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure 또는 위험 | root cause | 수정된 invariant/decision | 실제 수정 commit | regression test | 학습자 근거 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hidden state는 EOF까지 두면 충분함 | caller가 stream을 abandon/reset하거나 fd position을 바꿀 수 없음 | lifetime control 부재 | opaque create/reset/destroy | `903768a43bf4` | `249093ba477a` |  |
| `NULL` 하나면 모든 non-line outcome을 표현 가능 | EOF와 error를 구분할 수 없고 stale output 위험 | data와 status가 같은 return에 겹침 | enum result + output pointer rule + EOF state | `2e681112b304` | `249093ba477a` |  |
| legacy와 context parser를 따로 유지해도 됨 | behavior와 failure semantics가 diverge할 위험 | duplicated state-transition engine | legacy를 `blr_reader_next` adapter로 축소 | `9bd6ebf429e2` | `249093ba477a` 및 후속 tests |  |
| interval을 먼저 소비하고 result를 만들 수 있음 | allocation 실패 시 line skip/shorten/early EOF | commit point가 allocation 성공보다 앞섬 | copy 성공 뒤 cursor commit, scan restore | `9bd6ebf429e2` | `a24ad4e49cc4` |  |

## 8. Ownership / state / responsibility 변화

| 단계 | State owner | Descriptor owner | Reading engine | Result 표현 | Cleanup/cancel |
| --- | --- | --- | --- | --- | --- |
| descriptor-list model | hidden compatibility list/node | caller | legacy path | `char *`/`NULL` | EOF/error 중심 |
| `903768a43bf4` | explicit `t_blr_reader` caller handle + legacy adaptation | caller | context lifecycle 준비 | 기존 reading result 확인 | reset/destroy 가능 |
| `2e681112b304` | explicit context | caller | `blr_reader_next` | enum + output pointer | stable EOF state |
| `9bd6ebf429e2` | explicit context와 hidden context 모두 같은 engine 사용 | caller | one authoritative engine | adapter가 축소 mapping | allocation failure non-consuming |

### 실제 responsibility map

- **Public header가 노출하는 것:**
- **Opaque implementation이 숨기는 것:**
- **Caller가 반드시 release할 것:**
- **Library가 절대 close하지 않는 것:**
- **Reset이 폐기하는 state:**
- **Destroy가 폐기하는 resource:**
- **Adapter가 잃는 result information:**

## 9. Thread 최종 상태

Source 기준으로 이 Thread가 끝났을 때 explicit context는 caller-controlled lifetime, borrowed descriptor, `LINE`/`EOF`/`ERROR` result contract와 stable EOF를 제공합니다. `get_next_line`은 같은 engine을 사용하는 compatibility adapter이며, result allocation failure는 buffered input을 소비하지 않아 same-context retry가 가능합니다.

이 Thread 종료 시점에는 후속 `f0055ae5cf19`의 `BLR_AGAIN`을 아직 포함하지 않습니다.

### 학습자가 작성할 최종 상태 설명

- **context 내부 state와 public opacity:**
- **create/reset/destroy의 정확한 ownership 변화:**
- **`blr_reader_next` result별 state transition:**
- **legacy adapter mapping과 정보 손실:**
- **transactional extraction commit point:**
- **descriptor offset coupling과 reset 규칙:**

## 10. 최종 architecture 또는 execution flow 정리

```text
caller
    → blr_reader_create(fd)
        → context owns [heap object/internal buffer]
        → context borrows fd
    → blr_reader_next(context, &line)
        → clear output
        → stable EOF check
        → authoritative scan/read/extract engine
            → LINE: caller owns independent line
            → EOF: no line, terminal state retained
            → ERROR: no line, unread-state policy 확인
    → optional blr_reader_reset(context)
        → discard buffered state, keep fd open
    → blr_reader_destroy(context)
        → release owned state, keep fd open

get_next_line(fd)
    → hidden descriptor → context lookup
    → blr_reader_next
    → map rich result to line or NULL
```

### 해당 SHA symbol로 완성

1. **Context allocation과 initialization:**
2. **Output pointer 초기화:**
3. **EOF flag fast path:**
4. **LINE ownership transfer:**
5. **ERROR state preservation/cleanup:**
6. **Reset after external reposition:**
7. **Legacy adapter mapping:**
8. **Allocation failure retry path:**

## 11. 학습 완료 자가 점검

- [ ] opaque type 선언과 private layout을 구분했습니다.
- [ ] context가 descriptor를 소유하지 않는다는 코드와 test 근거가 있습니다.
- [ ] reset과 destroy가 각각 어떤 allocation/state를 폐기하는지 설명할 수 있습니다.
- [ ] 이 Thread 시점의 enum에 `BLR_AGAIN`을 소급하지 않았습니다.
- [ ] non-line result의 output pointer rule을 모든 branch에서 확인했습니다.
- [ ] repeated EOF가 new read 없이 terminal이 되는 코드를 찾았습니다.
- [ ] legacy parser가 제거되고 authoritative engine으로 연결되는 diff를 확인했습니다.
- [ ] newline과 EOF tail의 allocation failure에서 cursor가 유지되는 근거가 있습니다.
- [ ] external seek, fd reuse, dup alias를 서로 다른 lifecycle 문제로 설명할 수 있습니다.
- [ ] broad context tests와 narrow allocation retry test의 증명 범위를 구분했습니다.
