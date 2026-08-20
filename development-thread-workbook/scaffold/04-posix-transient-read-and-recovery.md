# Thread: POSIX transient-read and recovery semantics

## 1. Thread 목표

short read, `EINTR`, `EAGAIN`/`EWOULDBLOCK`, terminal I/O error, EOF를 서로 다른 state transition으로 처리하는 최종 POSIX streaming semantics를 복원합니다. 이미 받아들인 partial bytes가 wait/error 뒤에도 보존되고, explicit API와 compatibility adapter가 각각 표현 가능한 범위 안에서 resume하는지 realistic nonblocking pipe와 scripted fault sequence로 검증합니다.

### Source에서 연결된 프로젝트 항목

- **Core technical area:** POSIX descriptor와 system-call semantics—short reads, EOF, invalid descriptors, `EINTR`, `EAGAIN`, `EWOULDBLOCK`, recoverable I/O failure를 담당합니다.
- **Critical invariants:** `BLR_LINE`, `BLR_EOF`, `BLR_AGAIN`, `BLR_ERROR`는 구분되어야 하며 non-line outcome은 output pointer를 `NULL`로 둡니다.
- **Critical invariants:** `EINTR`는 같은 logical operation으로 retry하고, `EAGAIN`/`EWOULDBLOCK`은 partial input을 보존한 채 temporary incompleteness를 노출합니다.
- **Critical invariants:** allocation/read failure가 explicit context의 unread input을 부분 소비하면 안 됩니다.
- **Major engineering difficulty:** allocation failure, short reads, interruption, nonblocking wait, later retry 사이에서 이미 accepted bytes를 잃거나 중복하지 않는 문제입니다.
- **Major engineering difficulty:** `NULL`로 EOF/error/wait를 구분하지 못하는 compatibility API에도 useful resumability를 제공하는 문제입니다.
- **Practical engineering area:** deterministic read scripting과 actual nonblocking pipe를 결합해 OS scheduling에 의존하지 않는 검증을 만드는 문제입니다.

### Source가 확정한 significance

중요한 progression은 단순 errno mapping이 아닙니다. implementation은 interruption, temporary lack of readiness, terminal failure, EOF를 record boundary로 오해하지 않고 이미 읽은 bytes를 유지해야 합니다. fault harness가 transition을 제어하고, fix가 state policy를 정의하며, 실제 nonblocking test와 ordered adversarial test가 각각 현실적인 behavior와 정확한 cursor mutation을 검증합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- positive short read, zero read, `-1/EINTR`, `-1/EAGAIN`, 다른 `-1/error`는 각각 `end`, `scan`, EOF flag에 어떤 영향을 주는가?
- `EINTR` retry는 어떤 wrapper/loop에서 이루어지고 caller에게 왜 보이지 않는가?
- `BLR_AGAIN`은 어떤 조건에서 반환되며 unread fragment와 output pointer는 어떻게 유지되는가?
- terminal I/O error 뒤에도 explicit context의 accepted bytes가 남는다는 것은 다음 call에서 어떤 path로 resume한다는 뜻인가?
- compatibility adapter가 `BLR_AGAIN`을 `NULL`로 map하면서도 hidden context를 제거하지 않는 조건은 무엇인가?
- actual nonblocking pipe test와 scripted fault test가 각각 증명하는 범위는 어떻게 다른가?
- progress와 failure가 번갈아 나올 때 `end`와 `scan`이 duplicate/skip 없이 유지되는지 어떻게 입증하는가?

## 3. 완료 기준

- read wrapper와 parser loop의 result mapping을 실제 코드로 복원했습니다.
- `EINTR`가 retry되고 `EAGAIN`이 `BLR_AGAIN`으로 나오는 정확한 조건을 확인했습니다.
- partial bytes가 `AGAIN`과 terminal error 뒤 어떻게 context에 남는지 state trace가 있습니다.
- legacy adapter가 wait 뒤 hidden context를 retain하는 cleanup decision을 설명할 수 있습니다.
- nonblocking pipe fixture의 staged write/close sequence와 expected results를 추적했습니다.
- scripted harness의 ordered entries와 production `end/scan` mutation을 연결했습니다.
- realistic integration test와 deterministic regression의 증명 범위·비증명 범위를 구분했습니다.

## 4. Commit map
| 순서 | Commit | Subject | Importance | Tags | Source에서 확정된 Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `fd03a831686b` | `test(failure): 메모리 할당과 읽기 실패 처리 검증` | **A** | `TEST`, `POSIX_IO`, `RISK` | deterministic short-read/read-error injection과 allocation ownership tracking 기반을 제공합니다. |
| 2 | `f0055ae5cf19` | `fix(reader): 중단된 읽기를 재시도하고 대기 상태를 보존` | **S** | `CORE`, `POSIX_IO`, `RISK` | `EINTR` 재시도, `BLR_AGAIN` 도입, transient/terminal failure에서 accepted bytes 보존을 확립합니다. |
| 3 | `f3504f674c73` | `test(reader): 비차단 부분 입력 보존 검증` | **A** | `TEST`, `POSIX_IO`, `EDGE` | staged nonblocking input으로 wait, resume, suffix, EOF tail, legacy compatibility를 검증합니다. |
| 4 | `11033bd85c59` | `test(failure): EINTR·EAGAIN·I/O 오류 순서 검증` | **A** | `TEST`, `POSIX_IO`, `RISK` | progress와 failure가 섞인 scripted sequence에서 cursor와 result taxonomy를 검증합니다. |

## 5. Commit별 학습 기록
### 5.1 `fd03a831686b` — `test(failure): 메모리 할당과 읽기 실패 처리 검증`

- **Commit:** `fd03a831686b`
- **Subject:** `test(failure): 메모리 할당과 읽기 실패 처리 검증`
- **Importance:** **A**
- **Tags:** `TEST`, `POSIX_IO`, `RISK`

#### Source에서 확정된 역할 — POSIX transition 관점

allocation/release/read replacement를 통해 short read, partial input 전후 read error, exact allocation failure를 deterministic하게 만듭니다. 이 Thread에서는 node isolation보다 read script가 production loop에 어떤 outcome 순서를 공급하고, positive progress와 negative failure 사이 state를 어떻게 관찰하는지에 집중합니다.

#### 해당 SHA에서 확인할 harness 코드

1. read script entry가 return value, bytes, errno를 어떤 자료구조로 표현하는지 찾습니다.
2. positive short read가 caller-provided destination에 몇 bytes를 복사하고 어떤 return value를 주는지 확인합니다.
3. error entry가 partial data를 같은 call에서 함께 반환하는지, 또는 이전 positive entry 뒤 별도 negative call로 표현되는지 구분합니다.
4. script cursor가 각 replacement read마다 어떻게 advance되는지 기록합니다.
5. production read caller가 replacement를 실제 `read`와 같은 contract로 사용하는지 compile/link 경계를 확인합니다.
6. error 발생 전후 `end`, unread bytes, allocation ownership을 test가 직접 또는 간접으로 어떻게 관찰하는지 찾습니다.
7. short read를 EOF로 오해하지 않는 expected sequence와 assertion을 확인합니다.

#### Test commit 학습 기록 — fault harness 기반

| 구분 | 해당 SHA에서 기록할 내용 |
| --- | --- |
| **Production invariant** | positive short read는 valid progress이며, exact failure transition에서도 accepted bytes와 allocation ownership이 일관되어야 합니다. |
| **Failure / boundary** | short read, error-before-progress, error-after-prior-progress, allocation failure를 구분합니다. |
| **Test technique** | scripted replacement read와 allocation/free ledger를 설명합니다. |
| **Production path** | script entry 소비 → production read wrapper/parser → state mutation/return → next scripted call을 적습니다. |
| **증명하는 것** | short-read handling, selected error cleanup/retention, invalid/duplicate free absence를 해당 SHA 범위에서 작성합니다. |
| **증명하지 않는 것** | `EINTR` retry와 `BLR_AGAIN` result는 아직 fix 전이므로 이 harness 존재만으로 증명되지 않음을 기록합니다. |
| **분류** | 후속 POSIX state-machine tests를 가능하게 하는 deterministic failure infrastructure로 분류합니다. |
| **막는 회귀** | short read를 EOF로 처리, error 뒤 state corruption, duplicate free를 어떤 scenario가 검출하는지 적습니다. |

#### 후속 fix를 위한 baseline

- 이 SHA에서 `EINTR`, `EAGAIN`, `EWOULDBLOCK`이 production code에서 어떻게 처리되는지 직접 확인합니다.
- 후속 `f0055ae5cf19` diff에서 result/status/cleanup이 바뀌는 지점을 찾을 수 있도록 현재 behavior를 구체적으로 기록합니다.
- 같은 commit을 descriptor-state Thread에서 이미 보았더라도 여기서는 read outcome ordering과 parser state에만 초점을 둡니다.
### 5.2 `f0055ae5cf19` — `fix(reader): 중단된 읽기를 재시도하고 대기 상태를 보존`

- **Commit:** `f0055ae5cf19`
- **Subject:** `fix(reader): 중단된 읽기를 재시도하고 대기 상태를 보존`
- **Importance:** **S**
- **Tags:** `CORE`, `POSIX_IO`, `RISK`

#### Source가 확정한 Problem

POSIX `read`는 interrupt되거나, future line의 일부를 이미 받은 뒤 temporary no-data를 보고할 수 있습니다. 이를 EOF, cleanup, destructive error로 처리하면 partial input을 잃고 nonblocking stream을 사용할 수 없습니다.

#### Source가 확정한 Decision

low-level read path가 `EINTR`를 내부에서 retry합니다. `EAGAIN`/`EWOULDBLOCK`은 explicit API의 `BLR_AGAIN`이 되며 accumulated bytes를 그대로 보존합니다. 다른 I/O error는 `BLR_ERROR`로 보고하지만 explicit context가 이미 받아들인 unread bytes를 버리지 않습니다. compatibility adapter는 wait를 `NULL`로 축소하되 descriptor context를 retain해 later call이 resume하게 합니다.

#### Source가 확정한 중요성

이 commit은 final POSIX streaming semantics를 확립합니다. scheduling/readiness는 record를 지연할 수 있지만 record boundary를 바꾸거나 partial bytes를 소비할 수 없습니다. result taxonomy가 EOF/error distinction을 넘어 complete POSIX state model이 되는 지점입니다.

#### Fix commit 연결 구조

##### 기존 가정

- negative `read`를 하나의 terminal failure로 처리하거나, no-result 상태에서 cleanup해도 된다는 가정이 코드에 있었는지 직전 SHA에서 확인합니다.
- compatibility `NULL` 뒤 hidden state를 항상 버려도 된다는 가정이 있었는지 확인합니다.

##### 실제 failure 또는 위험

- partial fragment 뒤 `EAGAIN`이 오면 prefix가 사라지는 sequence를 작성합니다.
- `EINTR`를 caller-visible error로 반환하면 logical operation이 불필요하게 중단되는 sequence를 작성합니다.
- terminal error 뒤 accepted bytes를 버리면 later retry가 어떤 bytes를 잃는지 작성합니다.

##### Root cause

- errno category와 parser state transition을 같은 cleanup branch로 묶은 코드가 있는지 diff로 확인합니다.
- read outcome을 EOF/error/wait로 구분할 result taxonomy가 부족했던 지점을 기록합니다.

##### 수정된 invariant / decision

- `EINTR`는 동일 system-call intent를 retry합니다.
- `EAGAIN`/`EWOULDBLOCK`은 `BLR_AGAIN`이며 unread bytes를 유지합니다.
- terminal error는 `BLR_ERROR`이지만 explicit context의 accepted bytes를 retroactively erase하지 않습니다.
- compatibility adapter는 `BLR_AGAIN`을 `NULL`로 map해도 hidden context를 제거하지 않습니다.

#### 해당 SHA에서 확인할 실제 핵심 코드

1. public result enum에 `BLR_AGAIN`이 추가된 declaration과 enum ordering을 확인합니다.
2. low-level read wrapper 또는 loop가 `errno == EINTR`에서 같은 destination/count로 재호출하는지 확인합니다.
3. `EAGAIN`과 `EWOULDBLOCK`을 portable하게 비교하는 조건을 찾습니다.
4. read wrapper의 internal outcome이 `blr_reader_next`의 `BLR_AGAIN`/`BLR_ERROR`로 mapping되는 caller chain을 작성합니다.
5. positive read에서만 `end`가 실제 byte count만큼 증가하는지 확인합니다.
6. `BLR_AGAIN` return 직전 `begin/scan/end`, EOF flag, output pointer가 어떻게 유지되는지 기록합니다.
7. terminal error return 직전 explicit context의 unread interval을 free/clear하지 않는지 확인합니다.
8. compatibility adapter switch에서 `BLR_AGAIN`이 `NULL`로 map되지만 context/node removal branch로 가지 않는지 확인합니다.
9. descriptor probing에도 `EINTR` retry가 적용되는지 source가 언급한 actual/probe read 경로를 각각 찾습니다.

#### Result taxonomy와 state mutation

| Low-level outcome | retry 여부 | explicit result | `end` 변화 | unread bytes | hidden legacy context | output pointer |
| --- | --- | --- | --- | --- | --- | --- |
| positive short read |  | 즉시 result인지 loop 계속인지 확인 |  |  |  |  |
| zero / EOF |  |  |  |  |  |  |
| `-1`, `EINTR` |  | caller에게 노출되는지 확인 |  |  |  |  |
| `-1`, `EAGAIN` |  | `BLR_AGAIN` |  |  | retained | NULL |
| `-1`, `EWOULDBLOCK` |  | `BLR_AGAIN` |  |  | retained | NULL |
| `-1`, other error |  | `BLR_ERROR` |  |  | 해당 SHA policy | NULL |

#### 코드 근거 기록

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| `BLR_AGAIN` public declaration |  |  |
| `EINTR` retry loop |  |  |
| `EAGAIN`/`EWOULDBLOCK` classification |  |  |
| positive read의 `end` mutation |  |  |
| `BLR_AGAIN` return 전 state preservation |  |  |
| terminal error 뒤 accepted bytes preservation |  |  |
| legacy adapter retain-vs-cleanup decision |  |  |

#### 후속 regression 연결

- `f3504f674c73`는 actual nonblocking pipe에서 fragment → AGAIN → completion → suffix → EOF tail을 검증합니다.
- `11033bd85c59`는 `EINTR` → short read → `EAGAIN`, short read → terminal error → later success의 ordered transition을 deterministic하게 검증합니다.
- 두 test가 같은 invariant를 서로 다른 technique으로 고정하는 이유를 작성합니다.
### 5.3 `f3504f674c73` — `test(reader): 비차단 부분 입력 보존 검증`

- **Commit:** `f3504f674c73`
- **Subject:** `test(reader): 비차단 부분 입력 보존 검증`
- **Importance:** **A**
- **Tags:** `TEST`, `POSIX_IO`, `EDGE`

#### Source에서 확정된 역할

nonblocking pipe에 line을 여러 단계로 공급합니다. 첫 fragment는 `BLR_AGAIN`, 이후 bytes는 첫 line을 완성하고 다음 line의 prefix를 시작하며, 다음 wait는 두 번째 fragment를 보존합니다. writer close 후 remaining bytes가 unterminated tail이 되고 그 다음 stable EOF가 됩니다. compatibility function도 wait를 거쳐 prefix를 보존하는지 확인합니다.

#### 해당 SHA에서 확인할 테스트 코드

1. pipe 생성과 read end를 nonblocking으로 바꾸는 system call/flag를 찾습니다.
2. 각 stage에서 writer가 보내는 exact bytes와 newline 위치를 기록합니다.
3. 첫 fragment 뒤 explicit API expected result가 `BLR_AGAIN`이고 output pointer가 null인지 확인합니다.
4. 다음 write가 first line을 완성하면서 second line prefix도 함께 전달하는지 fixture bytes를 확인합니다.
5. first `BLR_LINE` 뒤 internal suffix가 다음 call에서 `BLR_AGAIN`까지 유지되는 expected sequence를 기록합니다.
6. writer close가 EOF를 만들고 remaining fragment가 EOF tail `BLR_LINE`으로 나온 뒤 stable `BLR_EOF`가 되는 assertion을 찾습니다.
7. compatibility call이 wait에서 `NULL`을 반환한 뒤 later write에서 prefix를 포함한 line을 반환하는 sequence를 확인합니다.
8. reader/pipe descriptor와 returned lines를 test가 정리하는 순서를 확인합니다.

#### Test commit 학습 기록

| 구분 | 해당 SHA에서 기록할 내용 |
| --- | --- |
| **Production invariant** | readiness boundary는 record boundary가 아니며 partial bytes는 여러 no-data call을 지나도 유지되어야 합니다. |
| **Failure / boundary** | actual `EAGAIN`, fragmented newline completion, following suffix, writer-close EOF tail, repeated EOF를 구분합니다. |
| **Test technique** | 실제 nonblocking pipe와 staged writes를 사용하는 realistic integration/boundary test입니다. |
| **Production path** | fcntl/pipe setup → write fragment → `blr_reader_next`/adapter → read wrapper → state retain/extract → close writer → EOF path를 적습니다. |
| **증명하는 것** | actual OS nonblocking behavior에서 fragment preservation, no duplication, suffix retention, EOF authorization, legacy resumability를 작성합니다. |
| **증명하지 않는 것** | 모든 errno ordering, exact `EINTR` retry count, terminal error after progress는 scripted test가 별도로 필요함을 기록합니다. |
| **분류** | broad realistic POSIX integration regression으로 분류합니다. |
| **막는 회귀** | `EAGAIN` cleanup, fragment duplication, read-ahead loss, premature EOF-tail return을 assertion별로 연결합니다. |

#### Stage별 state trace

| Stage | writer action | expected explicit result | returned bytes | context unread bytes | EOF state | legacy result |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | first fragment | `BLR_AGAIN` |  |  |  | 해당 scenario 기록 |
| 2 | line completion + next prefix |  |  |  |  |  |
| 3 | no new data | `BLR_AGAIN` |  |  |  |  |
| 4 | writer close | EOF-tail `BLR_LINE` |  |  |  |  |
| 5 | repeated call | `BLR_EOF` | NULL | empty | terminal |  |
### 5.4 `11033bd85c59` — `test(failure): EINTR·EAGAIN·I/O 오류 순서 검증`

- **Commit:** `11033bd85c59`
- **Subject:** `test(failure): EINTR·EAGAIN·I/O 오류 순서 검증`
- **Importance:** **A**
- **Tags:** `TEST`, `POSIX_IO`, `RISK`

#### Source에서 확정된 역할

scripted read harness가 isolated fault가 아니라 ordered sequence를 공급합니다. interruption 뒤 short read와 `EAGAIN`, short read 뒤 terminal I/O error와 later successful call을 다룹니다. interruption은 caller에게 보이지 않고, temporary wait는 data loss 없이 보고되며, terminal error도 이미 accepted된 bytes를 지우지 않아야 합니다.

#### 해당 SHA에서 확인할 테스트 코드

1. `EINTR` → positive short read → `EAGAIN` script의 exact entries와 expected public results를 기록합니다.
2. low-level replacement read call count로 `EINTR`가 내부 retry되었음을 확인하는 assertion을 찾습니다.
3. short read bytes가 `end`에 반영된 뒤 `EAGAIN` result가 나오는 production path를 추적합니다.
4. short read → terminal error → later success script에서 error call 후 같은 context를 재호출하는지 확인합니다.
5. later success가 prior accepted bytes와 new bytes를 정확히 결합한 line을 반환하는 expected value를 기록합니다.
6. scan cursor가 error/again 뒤 possible delimiter를 skip하거나 같은 bytes를 duplicate하지 않는지 검출하는 fixture를 찾습니다.
7. 각 sequence 종료 시 allocation/free ledger와 unread state를 확인하는 assertion을 기록합니다.

#### Test commit 학습 기록

| 구분 | 해당 SHA에서 기록할 내용 |
| --- | --- |
| **Production invariant** | `end`는 positive read에 대해서만 증가하고, `scan`은 status transition을 지나도 unread bytes와 일관되며, retry는 duplicate/skip 없이 resume해야 합니다. |
| **Failure / boundary** | `EINTR` 후 progress 후 wait, progress 후 terminal error 후 later success라는 ordered adversarial sequence입니다. |
| **Test technique** | scripted deterministic read replacement와 exact call/result assertions를 사용합니다. |
| **Production path** | script entry → retry wrapper → parser loop → public result → same-context next call을 각 단계별 symbol로 적습니다. |
| **증명하는 것** | interruption invisibility, `BLR_AGAIN` preservation, terminal-error preservation, exact cursor progress를 작성합니다. |
| **증명하지 않는 것** | 실제 kernel nonblocking readiness와 scheduling behavior는 `f3504f674c73`이 보완함을 기록합니다. |
| **분류** | ordered state-machine transition을 고정하는 narrow deterministic regression입니다. |
| **막는 회귀** | `EINTR` 노출, `EAGAIN` cleanup, error 뒤 accepted-byte erase, duplicated reread, delimiter skip을 scenario별로 연결합니다. |

#### Ordered transition trace

| Sequence | Low-level event | read wrapper 동작 | public result | `begin/scan/end` 변화 | 다음 call의 시작 state |
| --- | --- | --- | --- | --- | --- |
| A | `EINTR` |  | caller-visible result 없음 |  | same logical read |
| A | short read |  | loop/scan 계속 |  |  |
| A | `EAGAIN` |  | `BLR_AGAIN` |  | preserved fragment |
| B | short read |  |  |  |  |
| B | terminal error |  | `BLR_ERROR` |  | accepted bytes preserved |
| B | later success |  | expected line |  | next record state |

## 6. Invariant ledger

| Invariant | 기반/도입 commit | fix에서 확정 | 현실적 검증 | deterministic 검증 | 학습자가 남길 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| short read는 EOF가 아니라 valid progress입니다. | `fd03a831686b` harness로 제어 가능 | `f0055ae5cf19` production path 확인 | `f3504f674c73`의 staged input | `11033bd85c59` |  |
| `EINTR`는 같은 logical operation으로 retry합니다. | harness baseline | `f0055ae5cf19` | actual pipe test는 직접 `EINTR`를 보장하지 않음 | `11033bd85c59` |  |
| `EAGAIN`/`EWOULDBLOCK`은 EOF가 아니라 `BLR_AGAIN`입니다. | harness baseline | `f0055ae5cf19` | `f3504f674c73` | `11033bd85c59` |  |
| wait는 accumulated partial input을 소비하거나 cleanup하지 않습니다. | fault harness로 관찰 가능 | `f0055ae5cf19` | `f3504f674c73` | `11033bd85c59` |  |
| terminal I/O error도 explicit context의 accepted bytes를 지우지 않습니다. | `fd03a831686b` | `f0055ae5cf19` | 실제 pipe test 범위 확인 | `11033bd85c59` |  |
| compatibility adapter는 wait를 `NULL`로 map해도 hidden context를 보존합니다. | adapter architecture | `f0055ae5cf19` | `f3504f674c73` | 필요 시 scripted legacy case 확인 |  |
| `end`는 positive read byte 수만큼만 증가합니다. | buffer state model | `f0055ae5cf19` | staged behavior | `11033bd85c59` |  |

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure 또는 위험 | root cause | 수정된 invariant/decision | 실제 수정 코드 확인 | regression test |
| --- | --- | --- | --- | --- | --- | --- |
| negative read는 모두 terminal error | `EINTR`가 logical read를 불필요하게 중단 | errno category 미분리 | `EINTR` internal retry | `f0055ae5cf19`의 read wrapper | `11033bd85c59` |
| no data면 EOF/cleanup | partial fragment 뒤 `EAGAIN`에서 data loss | readiness와 stream completion 혼동 | `BLR_AGAIN` + state preservation | `f0055ae5cf19`의 mapping/return | `f3504f674c73`, `11033bd85c59` |
| error면 buffered bytes도 폐기 | prior positive read 뒤 terminal error에서 prefix 손실 | accepted data와 current syscall failure를 한 상태로 처리 | explicit context unread bytes retained | `f0055ae5cf19` error branch | `11033bd85c59` |
| compatibility `NULL`이면 hidden state 제거 | wait 뒤 later call이 prefix 없이 재개 | API 표현 한계와 cleanup policy 혼동 | `BLR_AGAIN` mapping은 `NULL`, context는 retain | `f0055ae5cf19` adapter branch | `f3504f674c73` |

### Fix commit 실제 코드 기록

- **직전 behavior:**
- **failure를 유발하는 concrete sequence:**
- **errno classification 함수/조건:**
- **state mutation 전후 순서:**
- **cleanup을 하지 않는 branch:**
- **explicit result mapping:**
- **legacy mapping:**
- **후속 test assertion:**

## 8. Ownership / state / responsibility 변화

이 Thread의 핵심은 allocation owner 변경보다 read outcome을 해석하는 책임의 분리입니다.

| 책임 | fix 전 실제 위치 | `f0055ae5cf19` 이후 위치 | 보존해야 하는 state | caller가 보는 결과 |
| --- | --- | --- | --- | --- |
| raw `read`와 errno 해석 |  | low-level retry/classification | destination와 count, accepted bytes | 직접 보이지 않음 |
| parser loop progress |  | authoritative reader engine | `begin/scan/end` | LINE/EOF/AGAIN/ERROR |
| wait state 표현 | 없음 또는 error/NULL로 혼합 | explicit `BLR_AGAIN` | unread fragment | `BLR_AGAIN` |
| legacy compatibility | `NULL` 의미 혼합 | rich result 축소 mapping | hidden context retain 여부 | `char *`/`NULL` |
| terminal error 이후 retry |  | explicit context policy | accepted unread bytes | `BLR_ERROR`, later call 가능 |

## 9. Thread 최종 상태

Source 기준으로 이 Thread가 끝났을 때 reader는 다음을 구분합니다.

- `EINTR`: same logical read를 내부 retry합니다.
- positive short read: valid progress로 받아들이고 실제 byte 수만큼 state를 늘립니다.
- `EAGAIN`/`EWOULDBLOCK`: `BLR_AGAIN`으로 보고하며 partial bytes를 유지합니다.
- terminal I/O error: `BLR_ERROR`로 보고하되 explicit context가 이미 accepted한 bytes를 지우지 않습니다.
- EOF: remaining unterminated suffix를 line으로 반환한 뒤 stable EOF로 이동합니다.
- legacy adapter: wait를 `NULL`로 표현하지만 hidden context를 유지해 later call이 resume할 수 있습니다.

### 학습자가 작성할 최종 상태 설명

- **raw read outcome taxonomy:**
- **각 outcome의 exact state mutation:**
- **explicit API의 output/result rule:**
- **legacy API의 정보 손실과 보완 정책:**
- **partial fragment가 여러 call을 통과하는 실제 trace:**
- **real pipe test와 scripted test의 상호 보완:**

## 10. 최종 architecture 또는 execution flow 정리

```text
blr_reader_next(context, &line)
    → output = NULL
    → buffered delimiter scan
        → found: transactional line extraction → BLR_LINE
    → need more bytes
        → reserve tail
        → low-level read wrapper
            → EINTR: retry same read
            → positive n: end += n, restore sentinel, scan again
            → EAGAIN/EWOULDBLOCK: preserve state → BLR_AGAIN
            → other error: preserve accepted unread state → BLR_ERROR
            → 0/EOF:
                → unread tail exists: copy tail → BLR_LINE
                → no unread bytes: stable BLR_EOF

get_next_line(fd)
    → hidden context lookup
    → blr_reader_next
        → BLR_LINE: return line
        → BLR_AGAIN: return NULL, retain context
        → EOF/error: map and apply actual cleanup policy
```

### 실제 symbol과 조건으로 완성

1. **errno retry/classification:**
2. **positive read state commit:**
3. **`BLR_AGAIN` return 전 state:**
4. **terminal error return 전 state:**
5. **EOF와 wait 구분:**
6. **legacy context retention condition:**
7. **next call resume point:**
8. **test harness가 이 흐름을 관찰하는 hook:**

## 11. 학습 완료 자가 점검

- [ ] short read와 EOF를 return value로 정확히 구분합니다.
- [ ] `EINTR` retry loop가 같은 logical operation을 유지하는 근거가 있습니다.
- [ ] `EAGAIN`과 `EWOULDBLOCK`이 `BLR_AGAIN`으로 연결되는 코드를 확인했습니다.
- [ ] `BLR_AGAIN`에서 output pointer가 null이고 unread fragment가 남는 것을 확인했습니다.
- [ ] terminal error 뒤 explicit context의 accepted bytes가 보존되는 path를 추적했습니다.
- [ ] legacy adapter가 wait 뒤 context를 제거하지 않는 근거가 있습니다.
- [ ] writer close 전에는 unterminated fragment를 line으로 반환하지 않는 이유를 설명할 수 있습니다.
- [ ] actual nonblocking pipe test와 scripted error test의 차이를 구분했습니다.
- [ ] ordered sequence에서 `end`가 positive read에만 증가함을 확인했습니다.
- [ ] `fd03a831686b`를 descriptor-state Thread와 중복 유지하고 여기서는 POSIX transition 관점으로 작성했습니다.
