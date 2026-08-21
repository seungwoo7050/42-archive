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
| **Production invariant** | positive short read는 valid progress이며, exact failure transition에서도 selected node의 allocation ownership과 cleanup이 일관되어야 합니다. |
| **Failure / boundary** | global positive-read cap에 의한 short read, first positive-count read EIO, prior short progress 뒤 third read EIO, allocation failure를 구분합니다. |
| **Test technique** | production object를 `test_read`/`test_malloc`/`test_free`로 macro-substitute하고 target fd, read-call index, maximum read size, allocation attempt index를 설정합니다. |
| **Production path** | zero-length probe는 fault를 우회 → positive-count `test_read` → real read 또는 exact EIO → legacy parser append/scan/cleanup → 다음 call/assertion입니다. |
| **증명하는 것** | read cap 3에서도 complete line/tail이 정확히 반환되고, error 전후 selected state가 당시 cleanup policy대로 해제되며 leak/invalid/double free가 없음을 증명합니다. |
| **증명하지 않는 것** | `EINTR` retry와 `BLR_AGAIN`은 아직 production에 없고, 이 SHA harness도 errno sequence 배열을 제공하지 않습니다. |
| **분류** | 후속 POSIX state-machine test를 위한 deterministic failure infrastructure와 baseline regression입니다. |
| **막는 회귀** | short read를 EOF로 오해하면 expected complete lines가 실패하고, EIO cleanup이 잘못되면 live/invalid/double counters 또는 survivor assertion이 실패합니다. |

**Harness와 baseline의 실제 모습**

- `fault_read_limit(3)`은 target fd의 요청 `count`를 3 이하로 줄인 뒤 real `read`를 호출합니다. 따라서 returned bytes는 real descriptor에서 오며 harness가 별도 byte array를 destination에 복사하지 않습니다.
- `fault_read_fail_on(fd, n)`은 target fd의 n번째 positive-count read에서 `errno=EIO`, `-1`을 반환합니다. 한 system call에서 “일부 bytes + error”를 동시에 반환하지 않습니다. partial progress 뒤 error는 이전 positive read entry와 다음 negative call로 분리됩니다.
- target fd의 positive-count call마다 `read_call_count`가 증가합니다. zero-length descriptor probe는 counter/fault에서 제외됩니다.
- 이 SHA에는 `{return, bytes, errno}` 구조체 배열과 script cursor가 없습니다. Source가 표현한 일반 scripted ordering은 후속 `11033bd85c59`에서 errno script 배열로 추가됩니다. 고정 Source 문구는 유지하고 실제 SHA의 제한을 명시합니다.

**실제 baseline scenarios**

- short-read case: `read_limit=3`, source `"short reads still work\nlast"`; complete first line, EOF tail `"last"`, then `NULL`을 기대하고 read calls가 2보다 큰지 확인합니다.
- error-before-progress: first positive-count read를 EIO로 만들어 `NULL`, calls 1, clean allocation ledger를 확인합니다.
- error-after-progress: `read_limit=4`, third read EIO, source `"partial bytes must be discarded"`; 이 SHA의 legacy policy는 selected node와 accepted prefix를 폐기하고 `NULL`을 반환합니다. **accepted bytes preservation은 아직 baseline이 아닙니다.**
- cross-descriptor case: left node가 first line 뒤 suffix를 갖고, right fd first read에 EIO를 주입한 뒤 left가 `"left two"`를 반환하는지 확인합니다.

#### 후속 fix를 위한 baseline

- 이 SHA production code는 negative read의 errno를 분류하지 않습니다. read error면 selected legacy node를 `discard_reader`하고 `NULL`을 반환합니다.
- `EINTR`, `EAGAIN`, `EWOULDBLOCK`도 모두 같은 terminal error path에 들어갑니다.
- 따라서 partial fragment 뒤 EAGAIN은 state loss, EINTR은 caller-visible failure, terminal EIO 뒤 explicit retry는 불가능한 baseline입니다. `f0055ae5cf19` diff는 이 cleanup/error taxonomy를 바꿉니다.
- 같은 commit을 descriptor-state Thread에서 다룬 기록과 달리 이곳에서는 read return ordering과 accepted-byte policy만 사용했습니다.
- Makefile의 `failure-test`는 이 환경에서 실행하지 않았습니다.

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

- 직전 code는 `read_size < 0`을 errno에 관계없이 `BLR_ERROR` 또는 legacy cleanup으로 취급했습니다.
- compatibility adapter는 `LINE` 이외의 result에서 hidden context를 제거하는 정책이었습니다.

##### 실제 failure 또는 위험

- fragment `"par"`를 accepted한 다음 EAGAIN이면 기존 policy가 node를 제거해 later `"tial\n"`과 결합할 prefix를 잃습니다.
- EINTR를 ERROR로 노출하면 caller가 같은 operation을 수동 재개해야 하고 hidden adapter는 context를 버릴 수 있습니다.
- short positive read 뒤 terminal EIO에서 explicit context까지 clear하면 later success가 prior bytes와 결합되지 않습니다.

##### Root cause

- syscall negative result를 interruption, temporary readiness, permanent failure로 분류하지 않고 하나의 cleanup branch로 묶었습니다.
- rich result enum에 temporary incompleteness가 없었고 compatibility `NULL`과 cleanup decision을 같은 것으로 취급했습니다.

##### 수정된 invariant / decision

- `EINTR`는 동일 destination/count의 `read`를 내부 반복합니다.
- `EAGAIN`/`EWOULDBLOCK`은 `BLR_AGAIN`이며 unread bytes와 EOF flag를 유지합니다.
- 다른 error는 `BLR_ERROR`이지만 explicit context의 accepted unread bytes를 유지합니다.
- compatibility adapter는 `BLR_AGAIN`을 `NULL`로 반환하되 hidden context는 제거하지 않습니다.

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
| positive short read | retry가 아니라 valid progress; parser loop가 scan 후 더 읽을 수 있음 | newline 발견 시 `BLR_LINE`, 아니면 loop 계속 | 실제 `n`만큼 증가 | append되어 유지 | 유지 | line 전에는 `NULL` |
| zero / EOF | 재시도하지 않음 | unread tail이면 `BLR_LINE`, 없으면 `BLR_EOF` | 변화 없음 | tail은 성공 copy 후 소비 | adapter는 EOF에서 제거; tail LINE이면 suffix 정책에 따라 유지 | tail line 또는 NULL |
| `-1`, `EINTR` | **같은 read 즉시 retry** | caller에게 별도 result 없음 | 변화 없음 | 그대로 | 그대로 | 그대로 NULL |
| `-1`, `EAGAIN` | 즉시 syscall retry하지 않음 | `BLR_AGAIN` | 변화 없음 | 보존 | retained | NULL |
| `-1`, `EWOULDBLOCK` | 즉시 syscall retry하지 않음 | `BLR_AGAIN` | 변화 없음 | 보존 | retained | NULL |
| `-1`, other error | 즉시 retry하지 않음 | `BLR_ERROR` | 변화 없음 | explicit context에서 보존 | adapter는 result != AGAIN이므로 selected hidden context 제거 | NULL |

#### 코드 근거 기록

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| `BLR_AGAIN` public declaration | result enum에 `BLR_AGAIN = 2` 추가 | LINE/EOF/ERROR와 temporary wait를 구분합니다. |
| `EINTR` retry loop | `read_retrying`: first `read`; `while (read_size < 0 && errno == EINTR) read(...)` | same fd/destination/count가 유지되고 caller에게 interruption이 보이지 않습니다. |
| `EAGAIN`/`EWOULDBLOCK` classification | `errno == EAGAIN` 또는 `errno == EWOULDBLOCK`이면 `BLR_AGAIN` | 두 macro가 같은 값인 platform에서도 논리 OR은 올바르게 동작합니다. |
| positive read의 `end` mutation | `if (read_size <= 0) break; end += read_size; bytes[end]='\0'` | 음수/0에서는 end가 증가하지 않고 actual positive bytes만 accepted됩니다. |
| `BLR_AGAIN` return 전 state preservation | error branch가 free/reset/index clear 없이 return | reserve가 representation을 compact/grow했을 수 있지만 logical unread content와 cursor 의미는 유지됩니다. |
| terminal error 뒤 accepted bytes preservation | other negative branch도 `BLR_ERROR`만 반환 | explicit handle은 살아 있고 next call이 same begin/scan/end에서 이어갑니다. |
| legacy adapter retain-vs-cleanup decision | LINE return; `if (result != BLR_AGAIN) discard_legacy_reader(reader); return NULL` | AGAIN만 hidden context를 유지하고 EOF/ERROR는 historical NULL cleanup policy를 적용합니다. |

**최소 코드 근거**

`f0055ae5cf19`, `get_next_line.c`, low-level wrapper와 adapter:

```c
read_size = read(fd, buffer, count);
while (read_size < 0 && errno == EINTR)
    read_size = read(fd, buffer, count);
```

```c
if (result != BLR_AGAIN)
    discard_legacy_reader(reader);
return (NULL);
```

첫 코드는 interruption을 parser state transition으로 만들지 않고, 둘째 코드는 compatibility `NULL`과 state disposal을 분리합니다.

#### 후속 regression 연결

- `f3504f674c73`는 actual nonblocking pipe에서 `"part"` → AGAIN → `"ial\nnext"` → first LINE → AGAIN → writer close → EOF-tail LINE → EOF를 검증합니다.
- `11033bd85c59`는 deterministic errno script로 EINTR → real short read → EAGAIN, 그리고 real short read → EIO → later success를 재현합니다.
- real pipe test는 actual kernel O_NONBLOCK behavior를 다루지만 EINTR/EIO ordering을 강제하지 못합니다. scripted test는 exact ordering/call count를 다루지만 실제 scheduler/readiness를 증명하지 않습니다.

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
| **Production invariant** | readiness boundary는 record boundary가 아니며 `AGAIN`은 `[begin,end)` fragment를 소비·반환·cleanup하지 않아야 합니다. |
| **Failure / boundary** | actual EAGAIN, fragmented delimiter completion, same read의 following suffix, writer-close EOF tail, repeated EOF, legacy NULL wait를 구분합니다. |
| **Test technique** | `pipe` 후 read end `fcntl(F_GETFL/F_SETFL, O_NONBLOCK)`, staged `write`, explicit/legacy calls를 사용하는 realistic POSIX integration/boundary test입니다. |
| **Production path** | nonblocking setup → fragment write → `blr_reader_next`/adapter → `read_retrying` → AGAIN/scan/extract → writer close → read 0/EOF-tail path입니다. |
| **증명하는 것** | actual OS EAGAIN에서 prefix preservation, exact line 결합, suffix retention, close 전 tail 미반환, close 후 tail/EOF, legacy hidden-context retention을 증명합니다. |
| **증명하지 않는 것** | EINTR retry count, arbitrary errno order, progress 뒤 terminal EIO recovery는 다루지 않습니다. |
| **분류** | broad realistic POSIX integration regression입니다. |
| **막는 회귀** | EAGAIN cleanup은 first line/legacy line mismatch, duplicate fragment는 exact strcmp, premature EOF-tail은 stage 3 AGAIN assertion, unstable EOF는 final EOF assertion이 검출합니다. |

#### Stage별 state trace

| Stage | writer action | expected explicit result | returned bytes | context unread bytes | EOF state | legacy result |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `write("part", 4)` | `BLR_AGAIN` | NULL | `"part"` (`begin=0`, `scan=end=4`) | 0 | 별도 legacy scenario에서는 `write("leg")` 뒤 `NULL`, hidden context retained |
| 2 | `write("ial\nnext", 8)` | `BLR_LINE` | `"partial\n"` | `"next"` suffix | 0 | legacy는 다음 `write("acy\n")` 뒤 `"legacy\n"` |
| 3 | no new data | `BLR_AGAIN` | NULL | `"next"` 그대로 | 0 | explicit scenario만 확인 |
| 4 | writer close | EOF-tail `BLR_LINE` | `"next"` | empty | 1 | legacy writer close 뒤 `NULL`로 EOF mapping/cleanup |
| 5 | repeated call | `BLR_EOF` | NULL | empty | terminal | legacy hidden context는 이미 EOF NULL에서 제거됨 |

**Exact setup과 cleanup**

- helper는 `pipe(fds)`, `fcntl(read_fd, F_GETFL)`, `fcntl(read_fd, F_SETFL, flags | O_NONBLOCK)` 순으로 설정합니다.
- explicit scenario의 first reader call은 writer가 열려 있고 newline 없는 `"part"`만 있으므로 `read`가 fragment를 받은 뒤 다음 read에서 EAGAIN을 보고 tail을 반환하지 않습니다.
- stage 2의 `"ial\nnext"`는 first delimiter와 next record prefix를 한 번에 전달해 first LINE 뒤 suffix가 남는지 동시에 확인합니다.
- returned line은 각 success 뒤 free하고 explicit context를 destroy합니다. writer/read end는 test가 직접 close합니다. library가 fd를 닫는다는 가정은 하지 않습니다.
- suite는 이 환경에서 실행하지 않았습니다.

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
| **Production invariant** | `end`는 positive real read에만 증가하고, EINTR는 public transition이 아니며, AGAIN/ERROR 뒤 accepted `[begin,end)`와 `scan`이 retry 가능한 상태로 남아야 합니다. |
| **Failure / boundary** | script A `EINTR → success(short) → EAGAIN`, script B `success(short) → EIO → later success`입니다. |
| **Test technique** | target fd의 각 positive-count replacement read에 errno script entry를 순서대로 적용하고 zero entry는 read-limit이 적용된 real read를 수행합니다. exact call/result/line과 allocation ledger를 확인합니다. |
| **Production path** | `fault_read_script` → `test_read` → `read_retrying`의 EINTR loop → parser end/scan mutation → public result → same-context next call입니다. |
| **증명하는 것** | interruption invisibility/call count, `BLR_AGAIN` fragment preservation, terminal `BLR_ERROR` 뒤 same-context recovery, exact no-skip/no-duplicate line을 증명합니다. |
| **증명하지 않는 것** | actual kernel O_NONBLOCK readiness와 scheduling은 scripted replacement가 아니라 `f3504f674c73`이 보완합니다. |
| **분류** | ordered state-machine transition을 고정하는 narrow deterministic regression입니다. |
| **막는 회귀** | EINTR 노출, EAGAIN cleanup, EIO에서 accepted bytes erase, end 증가 오류, scan reset/skip은 expected public result와 exact final strings를 실패시킵니다. |

**Ordered script mechanism**

- `fault_read_script(fd, errors, length)`는 최대 64개의 **errno integer 배열**을 복사합니다. 각 target positive-count read에서 next entry를 소비합니다.
- entry가 nonzero면 그 errno를 설정하고 `-1`; entry가 0이면 configured `fault_read_limit`으로 count를 줄인 뒤 real `read`를 호출합니다.
- 따라서 script가 successful bytes 자체를 저장하지는 않습니다. bytes는 실제 fixture fd에서 오고 script는 success/error 순서만 정합니다.
- script cursor는 target read call마다 한 칸 전진하며 EINTR retry도 replacement read를 다시 호출하므로 다음 entry를 소비합니다.

#### Ordered transition trace

| Sequence | Low-level event | read wrapper 동작 | public result | `begin/scan/end` 변화 | 다음 call의 시작 state |
| --- | --- | --- | --- | --- | --- |
| A | `EINTR` | 같은 destination/count로 즉시 replacement read 재호출 | caller-visible result 없음 | `0/0/0` 유지 | same logical read 내부 |
| A | short read | script 0 → limit 3 real read로 `"par"` | parser loop/scan 계속 | `begin=0`, `end=3`, scan `0→3` | same public call에서 다음 read |
| A | `EAGAIN` | wrapper가 EINTR가 아니므로 `-1` 반환; engine이 AGAIN 분류 | `BLR_AGAIN`, line NULL | `0/3/3` 유지 | same context에 `"par"` 보존 |
| A retry | later real short reads | `"tia"`, 이어 `"l\nl"` 등 limit 3 chunks | first `BLR_LINE` | newline exclusive end 8에서 `begin=scan=8`, 당시 `end=9` | suffix `"l"`과 remaining source에서 `"last"` 완성 |
| B | short read | script 0 → `"rec"` 3 bytes | loop 계속 | `0/3/3` | 같은 public call next read |
| B | terminal `EIO` | retry하지 않고 engine에 negative 전달 | `BLR_ERROR`, line NULL | `0/3/3` 유지 | same context에 `"rec"` 보존 |
| B | later success | script exhausted, real reads continue | `BLR_LINE` | prior prefix와 new bytes scan; success 뒤 begin/scan commit | exact `"recoverable\n"`, then EOF |

**실제 assertions**

- A는 `errors = {EINTR, 0, EAGAIN}`, read limit 3, source `"partial\nlast"`를 사용합니다. first public result는 `BLR_AGAIN`, output NULL, `fault_read_calls()==3`로 EINTR가 내부 retry됐음을 고정합니다. 이후 exact `"partial\n"`, `"last"`, EOF를 확인합니다.
- B는 `errors = {0, EIO}`, limit 3, source `"recoverable\n"`를 사용합니다. 첫 call ERROR/NULL 후 reset/recreate 없이 같은 context를 재호출해 full line과 EOF를 확인합니다.
- `scan`을 직접 expose하지 않지만 exact line bytes가 prior+later data를 한 번씩 포함하는지로 skip/duplicate를 간접 관찰합니다.
- destroy 뒤 allocation ledger의 live/invalid/double-free 상태가 clean인지 확인합니다.
- 해당 failure binary는 이 환경에서 실행하지 않았습니다.

## 6. Invariant ledger

| Invariant | 기반/도입 commit | fix에서 확정 | 현실적 검증 | deterministic 검증 | 학습자가 남길 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| short read는 EOF가 아니라 valid progress입니다. | `fd03a831686b` harness로 제어 가능 | `f0055ae5cf19` production path 확인 | `f3504f674c73`의 staged input | `11033bd85c59` | positive `read_size`만큼 end 증가, read-limit fixtures의 complete lines. |
| `EINTR`는 같은 logical operation으로 retry합니다. | harness baseline | `f0055ae5cf19` | actual pipe test는 직접 `EINTR`를 보장하지 않음 | `11033bd85c59` | `read_retrying` loop와 script A calls 3/first AGAIN. |
| `EAGAIN`/`EWOULDBLOCK`은 EOF가 아니라 `BLR_AGAIN`입니다. | harness baseline | `f0055ae5cf19` | `f3504f674c73` | `11033bd85c59` | errno condition, writer-open fragment tests, script A. |
| wait는 accumulated partial input을 소비하거나 cleanup하지 않습니다. | fault harness로 관찰 가능 | `f0055ae5cf19` | `f3504f674c73` | `11033bd85c59` | AGAIN branch no mutation/free; `part`+`ial`, `par`+later exact results. |
| terminal I/O error도 explicit context의 accepted bytes를 지우지 않습니다. | `fd03a831686b` | `f0055ae5cf19` | 실제 pipe test 범위 확인 | `11033bd85c59` | ERROR branch no clear; `rec` + later bytes = `recoverable\n`. |
| compatibility adapter는 wait를 `NULL`로 map해도 hidden context를 보존합니다. | adapter architecture | `f0055ae5cf19` | `f3504f674c73` | 필요 시 scripted legacy case 확인 | `result != BLR_AGAIN`일 때만 discard; `leg`+`acy\n` test. |
| `end`는 positive read byte 수만큼만 증가합니다. | buffer state model | `f0055ae5cf19` | staged behavior | `11033bd85c59` | `read_size <=0` break 이후에만 `end += read_size`; state traces. |

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure 또는 위험 | root cause | 수정된 invariant/decision | 실제 수정 코드 확인 | regression test |
| --- | --- | --- | --- | --- | --- |
| negative read는 모두 terminal error | `EINTR`가 logical read를 불필요하게 중단 | errno category 미분리 | `EINTR` internal retry | `f0055ae5cf19`의 `read_retrying` | `11033bd85c59` |
| no data면 EOF/cleanup | partial fragment 뒤 `EAGAIN`에서 data loss | readiness와 stream completion 혼동 | `BLR_AGAIN` + state preservation | `f0055ae5cf19`의 errno mapping/return | `f3504f674c73`, `11033bd85c59` |
| error면 buffered bytes도 폐기 | prior positive read 뒤 terminal error에서 prefix 손실 | accepted data와 current syscall failure를 한 상태로 처리 | explicit context unread bytes retained | `f0055ae5cf19` error branch | `11033bd85c59` |
| compatibility `NULL`이면 hidden state 제거 | wait 뒤 later call이 prefix 없이 재개 | API 표현 한계와 cleanup policy 혼동 | `BLR_AGAIN` mapping은 `NULL`, context는 retain | `f0055ae5cf19` adapter branch | `f3504f674c73` |

### Fix commit 실제 코드 기록

- **직전 behavior:** negative read는 errno와 무관하게 selected legacy state discard 또는 explicit ERROR로 끝났고 AGAIN enum이 없었습니다.
- **failure를 유발하는 concrete sequence:** `"part"` accepted → EAGAIN → state discard → later `"ial\n"`만 반환하거나 line 손실; `EINTR` 한 번으로 caller-visible error; `"rec"` accepted → EIO → prefix loss입니다.
- **errno classification 함수/조건:** `read_retrying`의 EINTR loop, `blr_reader_next`의 `errno == EAGAIN || errno == EWOULDBLOCK` branch입니다.
- **state mutation 전후 순서:** reserve → read; only positive result commits `end` and sentinel → scan. negative wait/error는 indices/EOF를 commit하지 않습니다.
- **cleanup을 하지 않는 branch:** explicit AGAIN/ERROR returns, legacy adapter의 AGAIN mapping입니다.
- **explicit result mapping:** wait는 `BLR_AGAIN`, other negative는 `BLR_ERROR`, line/EOF 기존 taxonomy 유지입니다.
- **legacy mapping:** LINE은 pointer, AGAIN은 NULL+retain, EOF/ERROR는 NULL+discard입니다.
- **후속 test assertion:** actual `"partial\n"`/`"next"`, legacy `"legacy\n"`, script A call count/result, script B `"recoverable\n"`입니다.

## 8. Ownership / state / responsibility 변화

이 Thread의 핵심은 allocation owner 변경보다 read outcome을 해석하는 책임의 분리입니다.

| 책임 | fix 전 실제 위치 | `f0055ae5cf19` 이후 위치 | 보존해야 하는 state | caller가 보는 결과 |
| --- | --- | --- | --- | --- |
| raw `read`와 errno 해석 | parser/public path의 direct `read`와 generic negative branch | `read_retrying`이 EINTR 처리, engine이 wait/error 분류 | destination/count와 preexisting accepted bytes | EINTR는 직접 보이지 않음 |
| parser loop progress | direct loop | authoritative `blr_reader_next` | `begin/scan/end`, sentinel, EOF flag | LINE/EOF/AGAIN/ERROR |
| wait state 표현 | 없음 또는 error/NULL로 혼합 | explicit `BLR_AGAIN` | unread fragment | `BLR_AGAIN` |
| legacy compatibility | `NULL` 의미와 cleanup 결합 | rich result 축소 mapping | AGAIN일 때 hidden context retain 여부 | `char *`/`NULL` |
| terminal error 이후 retry | legacy는 selected node 폐기, explicit baseline은 정책 미완성 | explicit context ERROR return without unread clear | accepted unread bytes | `BLR_ERROR`, same handle later call 가능 |

## 9. Thread 최종 상태

Source 기준으로 이 Thread가 끝났을 때 reader는 다음을 구분합니다.

- `EINTR`: same logical read를 내부 retry합니다.
- positive short read: valid progress로 받아들이고 실제 byte 수만큼 state를 늘립니다.
- `EAGAIN`/`EWOULDBLOCK`: `BLR_AGAIN`으로 보고하며 partial bytes를 유지합니다.
- terminal I/O error: `BLR_ERROR`로 보고하되 explicit context가 이미 accepted한 bytes를 지우지 않습니다.
- EOF: remaining unterminated suffix를 line으로 반환한 뒤 stable EOF로 이동합니다.
- legacy adapter: wait를 `NULL`로 표현하지만 hidden context를 유지해 later call이 resume할 수 있습니다.

### 학습자가 작성할 최종 상태 설명

- **raw read outcome taxonomy:** positive n, 0/EOF, -1/EINTR, -1/EAGAIN-or-EWOULDBLOCK, -1/other를 각각 progress, completion, internal retry, temporary wait, explicit error로 해석합니다.
- **각 outcome의 exact state mutation:** positive만 end 증가/sentinel/scan, 0만 reached_eof set, EINTR/AGAIN/ERROR는 current call에서 index·EOF를 바꾸지 않습니다. reserve compaction/growth는 logical unread를 보존합니다.
- **explicit API의 output/result rule:** entry에서 output NULL; complete record only LINE+allocation, terminal empty EOF, wait AGAIN, other failure ERROR입니다. non-line output은 NULL입니다.
- **legacy API의 정보 손실과 보완 정책:** EOF/ERROR/AGAIN 모두 NULL이지만 AGAIN에서는 hidden context를 유지해 later call이 accepted prefix를 이어갑니다.
- **partial fragment가 여러 call을 통과하는 실제 trace:** `part` → AGAIN, `ial\nnext` → `partial\n`, no data → AGAIN with `next`, close → `next`, EOF입니다.
- **real pipe test와 scripted test의 상호 보완:** real pipe는 actual O_NONBLOCK/EOF behavior, script는 EINTR/EIO exact order와 call count/state recovery를 고정합니다.

## 10. 최종 architecture 또는 execution flow 정리

```text
blr_reader_next(context, &line)
    → output = NULL
    → buffered delimiter scan
        → found: transactional line extraction → BLR_LINE
    → need more bytes
        → reserve tail
        → read_retrying
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
        → EOF/error: return NULL and discard selected hidden context
```

### 실제 symbol과 조건으로 완성

1. **errno retry/classification:** `read_retrying` loops only on EINTR; `blr_reader_next` checks EAGAIN/EWOULDBLOCK after a negative result.
2. **positive read state commit:** `reader->end += (size_t)read_size`, `bytes[end]='\0'`, then `find_line_end`.
3. **`BLR_AGAIN` return 전 state:** output NULL, begin/scan/end logical state unchanged from accepted fragment, reached_eof false, context alive.
4. **terminal error return 전 state:** explicit context remains allocated and accepted bytes remain; output NULL. legacy adapter later discards its hidden context because result is not AGAIN.
5. **EOF와 wait 구분:** read 0 sets `reached_eof=1`; EAGAIN does not. EOF can authorize unterminated tail, wait cannot.
6. **legacy context retention condition:** exactly `result == BLR_AGAIN`; LINE returns line, EOF/ERROR discard.
7. **next call resume point:** `find_line_end` begins from preserved `scan`; if no delimiter, reserve/read appends at preserved `end`.
8. **test harness가 이 흐름을 관찰하는 hook:** `test_read` errno script/call counter/read limit, allocation ledger, public enum/output and exact string assertions입니다.

## 11. 학습 완료 자가 점검

- [x] short read와 EOF를 return value로 정확히 구분합니다.
- [x] `EINTR` retry loop가 같은 logical operation을 유지하는 근거가 있습니다.
- [x] `EAGAIN`과 `EWOULDBLOCK`이 `BLR_AGAIN`으로 연결되는 코드를 확인했습니다.
- [x] `BLR_AGAIN`에서 output pointer가 null이고 unread fragment가 남는 것을 확인했습니다.
- [x] terminal error 뒤 explicit context의 accepted bytes가 보존되는 path를 추적했습니다.
- [x] legacy adapter가 wait 뒤 context를 제거하지 않는 근거가 있습니다.
- [x] writer close 전에는 unterminated fragment를 line으로 반환하지 않는 이유를 설명할 수 있습니다.
- [x] actual nonblocking pipe test와 scripted error test의 차이를 구분했습니다.
- [x] ordered sequence에서 `end`가 positive read에만 증가함을 확인했습니다.
- [x] `fd03a831686b`를 descriptor-state Thread와 중복 유지하고 여기서는 POSIX transition 관점으로 작성했습니다.
