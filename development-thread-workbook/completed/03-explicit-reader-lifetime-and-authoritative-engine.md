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
| context heap object | `blr_reader_create`: fd probe 뒤 `malloc(sizeof(*reader))` | explicit API에서는 caller가 handle을 보유; legacy insertion 뒤 hidden list | 유지 | internal buffer 해제 후 object 해제 | 해당 없음 |
| internal byte buffer | create 시에는 `NULL`; 첫 `reserve_bytes`에서 lazy allocation | 해당 context | `free(reader->bytes)`, pointer/indices/capacity를 0으로 초기화 | `free(reader->bytes)` 후 object 해제 | 해당 없음 |
| supplied file descriptor | caller가 create 전에 열어 전달 | caller | `reader->fd`는 유지되고 fd는 열려 있음 | fd는 열려 있음 | reset/destroy 모두 `close`하지 않음 |
| legacy list node/context | `create_legacy_reader`가 `blr_reader_create` 결과를 head에 insertion | `g_readers` hidden list | public reset을 자동 호출하지 않음 | `discard_legacy_reader`가 unlink 후 `blr_reader_destroy` | borrowed fd 유지 |

**실제 상태와 초기화**

- public header는 `typedef struct s_blr_reader t_blr_reader;`만 노출하고 field layout은 `get_next_line.c`에 둡니다.
- private object는 이 SHA에서 `fd`, `bytes`, `begin`, `scan`, `end`, `capacity`, `next`를 갖습니다. `reached_eof`는 아직 없습니다.
- `blr_reader_create`는 zero-length `read`로 fd를 검사한 뒤 context object 하나만 allocation합니다. internal buffer는 `NULL`이므로 create 중 “object 성공 후 buffer 실패”라는 두 단계 partial construction은 이 SHA에 존재하지 않습니다.
- object allocation 실패 시 list insertion이나 다른 resource 획득 전에 `NULL`을 반환합니다. explicit caller나 hidden list 어느 쪽에도 owner가 생기지 않습니다.
- reset은 buffer를 free하고 `bytes=NULL`, `begin=scan=end=capacity=0`으로 만듭니다. `fd`와 legacy `next` link는 바꾸지 않습니다.
- destroy는 `reader==NULL`이면 즉시 반환하며, non-NULL이면 buffer를 먼저 free하고 object를 free합니다.

**최소 코드 근거**

`903768a43bf4`, `get_next_line.c`, lifecycle:

```c
void blr_reader_reset(t_blr_reader *reader)
{
    if (reader == NULL)
        return ;
    free(reader->bytes);
    reader->bytes = NULL;
    reader->begin = 0;
    reader->scan = 0;
    reader->end = 0;
    reader->capacity = 0;
}
```

`close(reader->fd)`가 없으므로 reset은 parser state만 폐기합니다.

#### 학습자가 복원할 API decision

- hidden list lifetime만으로는 caller가 EOF 전에 stream을 포기하거나 `lseek` 후 old read-ahead를 제거할 수 없습니다. explicit handle은 caller가 그 시점에 reset/destroy할 수 있게 합니다.
- opacity는 buffer pointer, indices, linked-list link 같은 invariant-bearing fields를 caller가 임의 변경하지 못하게 합니다. public API는 대신 “context-owned memory, borrowed descriptor”라는 ownership만 노출합니다.
- reset은 같은 context·same fd를 유지한 채 buffered bytes와 cursor를 폐기하는 operation이고, destroy는 context allocation까지 끝냅니다. 둘 다 OS descriptor lifecycle operation이 아닙니다.
- 이 commit 시점에는 explicit result enum이 없고 read outcome을 richer status로 전달하는 `blr_reader_next`도 아직 없습니다. 다음 `2e681112b304`가 handle을 실제 state-machine API로 완성합니다.

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
| buffered newline 발견 | `BLR_LINE` | 새 caller-owned NUL-terminated allocation | 성공 뒤 `begin=line_end`, `scan=begin`; suffix 유지 | 기존 값 유지 | suffix scan/read 계속 |
| EOF + nonempty tail | `BLR_LINE` | `[begin,end)` copy 결과 | 성공 뒤 `begin=scan=end` | `1` | 다음 call은 clean EOF path |
| clean EOF / repeated EOF | `BLR_EOF` | `NULL` | empty interval 유지 | 최초 EOF에서 `1`, 이후 유지 | positive data read 없이 다시 `BLR_EOF` |
| invalid argument | `BLR_ERROR` | output pointer가 valid하면 entry에서 `NULL`; `line==NULL`이면 쓸 곳 없음 | reader가 valid한 경우 state mutation 없음 | 유지 | caller가 argument를 고쳐 재호출 가능 |
| allocation 또는 I/O error | `BLR_ERROR` | `NULL` | read error는 accepted unread 유지; result malloc 실패는 `begin` 유지, `scan=begin` 복구 | read error 전 값 또는 EOF-tail failure면 `1` | 같은 context로 retry 가능 |

#### 코드 근거 기록

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| public enum과 function declaration | `BLR_ERROR=-1`, `BLR_EOF=0`, `BLR_LINE=1`; `t_blr_result blr_reader_next(t_blr_reader *, char **)` | 이 SHA에는 세 상태만 있고 `BLR_AGAIN`은 없습니다. |
| output pointer 초기화 rule | entry의 `if (line != NULL) *line = NULL;`가 argument validation보다 앞 | stale caller value는 valid output pointer를 넘긴 모든 non-line path에서 제거됩니다. |
| successful line ownership transfer | `malloc(length+1)`, copy/NUL 후 `*line = ...`, `BLR_LINE` | caller가 반환 allocation을 free합니다. context buffer와 alias하지 않습니다. |
| EOF flag set/check | data read가 0일 때 `reached_eof=1`; buffered scan 뒤 `if (reader->reached_eof)` | EOF-tail과 clean EOF를 context state로 기억합니다. |
| repeated EOF fast path | `reached_eof && unread_length()==0`에서 `BLR_EOF` | 후속 positive-count data read loop에는 들어가지 않습니다. 다만 entry의 zero-length fd probe는 여전히 호출됩니다. |
| error return과 state 처리 | probe/read negative는 `BLR_ERROR`; allocation 실패는 `scan=begin` 후 error | explicit context 자체와 logical unread bytes를 free하지 않습니다. |

**최소 코드 근거**

`2e681112b304`, `get_next_line.c`, `blr_reader_next` entry:

```c
if (line != NULL)
    *line = NULL;
if (reader == NULL || line == NULL)
    return (BLR_ERROR);
```

result data와 status가 분리되며 non-line result가 stale pointer를 남기지 않습니다.

#### 이 commit이 보장하는 것과 이후 변화

- 실제 enumerator는 `LINE`, `EOF`, `ERROR`입니다. `EAGAIN`/`EWOULDBLOCK`은 아직 별도 결과가 아니며 후속 `f0055ae5cf19`에서 `BLR_AGAIN`이 추가됩니다.
- empty stream은 첫 positive-count read가 0이고 unread length가 0이므로 `BLR_EOF`; unterminated nonempty tail은 EOF flag 설정 후 먼저 `BLR_LINE`, 다음 call에 `BLR_EOF`입니다.
- source의 “repeated call이 new read 없이 terminal”은 data-read loop 기준으로 성립하지만 실제 code는 매 call entry에서 `read(fd,&probe,0)` validation을 수행합니다. 따라서 **positive-count stream read는 재실행하지 않지만 read system call 자체가 완전히 0회인 것은 아닙니다.**
- allocation failure의 non-consuming behavior는 이 SHA의 inline extraction path에 이미 있습니다. `9bd6ebf429e2`는 이를 공통 `extract_line`으로 옮겨 legacy adapter까지 같은 rule을 쓰게 합니다.
- legacy `get_next_line`은 이 시점에도 별도 parsing path를 유지하므로 engine divergence 위험이 남습니다.

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

**변경 전후 call graph**

```text
2e681112b304
explicit caller → blr_reader_next (inline scan/read/result allocation)
get_next_line(fd) → hidden list → 별도 legacy scan/read/extract/EOF code

9bd6ebf429e2
explicit caller ─┐
                 ├→ blr_reader_next → extract_line
get_next_line ───┘        ↑
  hidden fd→context lookup┘
```

compatibility list의 node type은 raw 별도 type이 아니라 같은 `t_blr_reader` context이며 `next`를 private field로 사용합니다.

#### Transactional extraction trace

| 단계 | result allocation 상태 | `begin` | `scan` | `end` | caller output | retry 시 기대 |
| --- | --- | ---: | ---: | ---: | --- | --- |
| delimiter 발견 직후 | 미시도 | old `begin` | `line_end` | unchanged | `NULL` | same interval still logically unread |
| allocation 실패 | 실패 | unchanged | `begin`으로 복구 | unchanged | `NULL`, `BLR_ERROR` | same delimiter를 다시 찾아 exact line retry |
| allocation/copy 성공 직전 | temp allocation 성공 | unchanged | `line_end` | unchanged | temp line 준비 | 아직 consumption commit 전 |
| cursor commit 후 | 성공 | `line_end` | new `begin` | unchanged | caller-owned line, `BLR_LINE` | next record/suffix |

EOF tail도 `line_end=end`, `reached_eof=1`인 점만 다릅니다. allocation 실패 시 `begin`과 `end`는 유지되고 `scan=begin`; retry는 EOF flag를 보고 같은 `[begin,end)`를 다시 `extract_line`합니다. 성공 뒤 `begin=scan=end`입니다.

#### 코드 근거 기록

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| legacy adapter entry | `char *get_next_line(int fd)` | historical signature는 유지됩니다. |
| descriptor → context lookup | `find_reader(fd)`; missing이면 `create_legacy_reader(fd)` | hidden list도 explicit context object를 소유합니다. |
| `blr_reader_next` authoritative call | `result = blr_reader_next(reader, &line)` | buffering/scan/read/EOF/failure decision이 한 engine에 모입니다. |
| result enum → `char *`/`NULL` mapping | `result == BLR_LINE`이면 line; 그 외 context discard 후 `NULL` | EOF와 ERROR 정보는 compatibility return에서 합쳐집니다. 이 SHA에는 AGAIN이 없습니다. |
| newline result allocation failure rollback | `extract_line`: malloc 실패 시 `reader->scan=reader->begin; return NULL` | begin/end를 소비하지 않고 exact retry state를 남깁니다. |
| `scan` restoration | 위 `scan=begin` | `find_line_end`가 같은 delimiter를 다시 발견할 수 있습니다. |
| EOF tail copy-out | `extract_line(reader, reader->end)`가 malloc/copy/NUL | 초기 legacy의 internal buffer transfer를 제거하고 모든 line을 독립 allocation으로 통일합니다. |
| context/node cleanup policy | adapter가 LINE 외 result에서 `discard_legacy_reader` | explicit context는 caller가 보유하지만 hidden legacy context는 EOF/ERROR에 제거됩니다. |

#### 기존 가정 → 실제 위험 → 수정된 decision

- **기존 가정:** `2e681112b304` 직전 legacy path에서는 `extract_line` allocation 실패 시 selected hidden node를 폐기하고, EOF tail은 internal buffer를 직접 transfer했습니다. explicit path는 별도 inline code로 rollback했습니다.
- **실제 failure:** 두 parser가 유지되면 explicit API는 retry 가능하지만 legacy API는 같은 allocation failure에서 line을 잃는 등 behavior가 갈라질 수 있습니다.
- **root cause:** 동일한 scan/read/extract state transition을 두 public entry가 중복 구현하고, legacy extraction이 allocation 성공 전에 recovery 가능 state를 버립니다.
- **수정된 invariant:** result allocation과 copy가 성공한 뒤에만 `begin`을 전진시키며, allocation 실패 시 `scan=begin`; 두 API가 `blr_reader_next` 하나를 호출합니다.
- **후속 regression:** `a24ad4e49cc4`는 explicit context에서 newline과 EOF tail의 same-context retry를 deterministic하게 확인합니다.

**관찰된 도입 시점 차이**

고정 Source 역할은 이 commit에서 non-consuming extraction을 확립한다고 설명합니다. 실제 repository inspection상 explicit `blr_reader_next`의 inline path는 `2e681112b304`에서 이미 allocation 실패 시 `scan=begin`, `begin` 유지 동작을 갖고 있었습니다. `9bd6ebf429e2`의 정확한 변화는 그 rule을 공통 `extract_line`으로 centralize하고 legacy adapter까지 적용한 것입니다. Source text는 변경하지 않고 실제 도입·통합 시점을 구분했습니다.

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
| **Production invariant** | caller가 context state를 소유하고 fd는 borrow하며, `LINE`/`EOF`/`ERROR`, output NULL rule, reset/destroy semantics가 public contract와 일치해야 합니다. |
| **Failure / boundary** | ordered two-line/EOF, empty, invalid args, external `lseek`, destroy-before-EOF, close+`dup2` reuse, duplicated descriptor alias를 분리합니다. |
| **Test technique** | real pipe/file descriptors와 public context API만 사용하는 broad lifecycle/contract integration tests입니다. |
| **Production path** | create → next 반복 → optional external fd operation → reset/destroy/new create → result/free/close 순이며, private fields를 직접 검사하지 않습니다. |
| **증명하는 것** | result order, output clearing, borrowed fd, reset requirement, new context on reused integer, one context through surviving dup alias를 assertion으로 확인합니다. |
| **증명하지 않는 것** | same-context concurrent synchronization, nonblocking AGAIN, every allocation point, repeated EOF의 exact syscall count는 증명하지 않습니다. |
| **분류** | 여러 lifecycle boundary를 포괄하는 broad public-contract regression입니다. |
| **막는 회귀** | destroy가 fd를 close, reset이 stale read-ahead를 유지, reused fd에 old context 사용, non-line result가 stale output을 남기는 회귀를 각 scenario가 검출합니다. |

#### Descriptor / context 관계 기록

| Scenario | kernel offset 변화 주체 | context buffer 상태 | reset 필요 여부 | 기대 result | 근거 test |
| --- | --- | --- | --- | --- | --- |
| normal sequential read | `blr_reader_next`의 positive reads | read-ahead suffix와 cursors 유지 | 아니요 | `"first\n"` → `"last"` → EOF → EOF | result-state case |
| external seek | caller의 `lseek(fd,0,SEEK_SET)` | seek 전 buffer는 old offset에서 가져온 stale read-ahead | **필요** | `blr_reader_reset` 후 다시 `"repeat\n"` | reset-after-external-seek |
| close 후 fd number reuse | caller `close(first)` 후 `dup2(replacement, first)` | old context는 destroy해야 하며 새 stream에는 새 context 필요 | old context reset보다 destroy/new create가 사용됨 | new context에서 `"new\n"` | reused-descriptor test |
| duplicated descriptor alias | `dup`가 same open file description/offset을 공유 | test는 surviving alias 하나에 context 하나를 붙임 | 해당 sequence에서는 아니요 | original close 뒤 alias context가 두 line을 순서대로 읽음 | single-context-on-dup-alias |
| destroy before EOF | context read-ahead가 있을 수 있으나 `blr_reader_destroy`가 폐기 | library buffer 없음; fd 자체는 open | 새 context를 만들거나 caller가 직접 fd 사용 | `fcntl(F_GETFD)>=0`, `lseek` 후 새 context로 first line | cancel-without-closing |

**실제 assertion 범위**

- repeated EOF는 `BLR_EOF`가 두 번 반환되고 output이 `NULL`임을 확인합니다. read counter는 없으므로 “positive data read가 재실행되지 않는다”는 것은 production code inspection으로 보완했습니다.
- destroy borrowing은 `fcntl(fd, F_GETFD) >= 0`과 후속 `lseek`/새 context read로 직접 확인합니다.
- reuse test는 `dup2(replacement, first) == first`로 같은 integer를 강제하고 **old context를 destroy한 뒤** new context가 `"new\n"`을 반환하는지 확인합니다.
- dup alias test는 두 context가 같은 open file description을 경쟁하는 경우를 만들지 않습니다. original을 닫고 alias 하나에 context 하나를 사용합니다. 따라서 shared-offset hazard 전부를 증명하지는 않습니다.
- returned line은 매 success 뒤 test가 `free`합니다. pointer independence는 production allocation path와 lifecycle 결과를 함께 근거로 판단합니다.
- 해당 suite는 이 환경에서 실행하지 않았습니다.

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
| **Production invariant** | result allocation failure는 buffered input에 대해 non-consuming이며 allocation/copy success 뒤에만 `begin`을 commit해야 합니다. |
| **Failure / boundary** | already-buffered newline extraction과 reached-EOF unterminated tail extraction을 별도 scenario로 다룹니다. |
| **Test technique** | `fault_allocation_fail_at(n)`로 exact allocation attempt를 `NULL`로 만들고 failure를 해제한 뒤 same context를 재호출합니다. |
| **Production path** | `find_line_end` 또는 EOF-tail branch → `extract_line` malloc failure → `scan=begin`, ERROR/NULL → same context retry → malloc/copy/commit → exact line입니다. |
| **증명하는 것** | newline `"\n"`와 tail `"tail"`이 실패 뒤 한 번 정확히 반환되고, skip/truncate/early EOF·leak·invalid/double free가 없음을 확인합니다. |
| **증명하지 않는 것** | read failure recovery, EINTR/EAGAIN, thread safety는 다루지 않습니다. |
| **분류** | transactional extraction commit point를 고정하는 narrow deterministic regression입니다. |
| **막는 회귀** | pre-allocation `begin` advance, EOF-tail clear-before-copy, scan cursor loss는 retry result 또는 allocation ledger assertion을 실패시킵니다. |

#### Failure → retry state trace

| Scenario | failed call 전 `begin/scan/end/EOF` | failure return 후 state | retry result | successful commit 후 state |
| --- | --- | --- | --- | --- |
| buffered newline | `0/1/1/0` — delimiter를 찾아 `scan`이 newline 다음 | `begin=0`, `scan=0`, `end=1`, EOF 0; `BLR_ERROR`, line NULL | same context에서 `BLR_LINE`, `"\n"` | `begin=scan=end=1`, EOF 0; 다음 data read에서 EOF 확인 |
| EOF tail | `0/end/end/1` — EOF를 이미 보고 tail이 unread | `begin=0`, `scan=0`, `end` 유지, EOF 1; `BLR_ERROR`, line NULL | same context에서 `BLR_LINE`, exact `"tail"` | `begin=scan=end`, EOF 1; 다음 call `BLR_EOF` |

**Fault activation과 범위**

- newline case는 input `"\n"`의 context 생성과 buffer 확보 뒤 caller-line allocation이 되는 특정 attempt를 실패시키고, 즉시 ERROR/NULL과 retry success를 확인합니다.
- tail helper는 baseline allocation count를 얻은 뒤 index 2부터 각 allocation attempt를 실패시키는 loop를 사용합니다. 따라서 commit subject와 Source 역할의 중심은 final line allocation retry이지만, 실제 loop에는 buffer growth allocation 실패 지점도 포함될 수 있습니다. final line allocation이 실패하는 index에서는 위 non-consuming tail trace가 검증됩니다.
- retry 전 `blr_reader_reset`, destroy, create를 호출하지 않습니다. fault만 disable하고 같은 handle을 넘깁니다.
- scenario 종료 후 live allocation, invalid free, double free가 0인지 확인합니다.
- 실행 명령은 Makefile의 `failure-test` 계열이지만 이 환경에서는 실행하지 않았습니다.

## 6. Invariant ledger

| Invariant | 최초/강화 commit | 부족함 또는 위험 | 고정한 test | 학습자가 남길 코드 근거 |
| --- | --- | --- | --- | --- |
| context는 own heap/buffer를 관리하고 descriptor는 borrow합니다. | `903768a43bf4` | destroy/reset이 fd를 close할 위험 | `249093ba477a` | lifecycle code에 close 없음; destroy 후 F_GETFD/lseek/new reader. |
| caller가 reset/destroy로 reader lifetime을 제어할 수 있습니다. | `903768a43bf4` | external seek 또는 abandon 뒤 hidden state mismatch | `249093ba477a` | reset frees buffer/indices; seek+reset과 destroy-before-EOF tests. |
| data result와 EOF/error status를 구분합니다. | `2e681112b304` | `char *`/`NULL` ambiguity | `249093ba477a` | enum declarations와 ordered LINE/EOF/error cases. |
| non-line result는 output pointer를 `NULL`로 둡니다. | `2e681112b304` | stale caller pointer 오해/잘못된 free | `249093ba477a` | entry output clear와 deliberately seeded pointer assertions. |
| EOF는 context에 기록되어 repeated call에서 stable terminal입니다. | `2e681112b304` | repeated read 또는 accidental one-shot completion | `249093ba477a` | `reached_eof`, EOF twice; zero-length probe nuance 기록. |
| explicit API와 legacy API는 one authoritative engine을 사용합니다. | `9bd6ebf429e2` | duplicated parser divergence | explicit/legacy 관련 test를 해당 SHA에서 연결 | `get_next_line`의 `blr_reader_next` call과 shared `extract_line`. |
| result allocation failure는 input을 소비하지 않습니다. | `9bd6ebf429e2` | cursor advance 후 allocation failure | `a24ad4e49cc4` | 실제 explicit inline origin은 2e; 9bd shared helper의 scan rollback과 same-context retry. |
| read-ahead state는 descriptor의 current stream position과 결합됩니다. | context design의 consequence | external seek, close/reuse, dup alias | `249093ba477a` | lseek+reset, dup2 reuse+new context, surviving alias test. |

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure 또는 위험 | root cause | 수정된 invariant/decision | 실제 수정 commit | regression test | 학습자 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| hidden state는 EOF까지 두면 충분함 | caller가 stream을 abandon/reset하거나 fd position을 바꿀 수 없음 | lifetime control 부재 | opaque create/reset/destroy | `903768a43bf4` | `249093ba477a` | lifecycle functions와 seek/reset, destroy/reuse cases. |
| `NULL` 하나면 모든 non-line outcome을 표현 가능 | EOF와 error를 구분할 수 없고 stale output 위험 | data와 status가 같은 return에 겹침 | enum result + output pointer rule + EOF state | `2e681112b304` | `249093ba477a` | enum/entry clear와 empty-vs-error assertions. |
| legacy와 context parser를 따로 유지해도 됨 | behavior와 failure semantics가 diverge할 위험 | duplicated state-transition engine | legacy를 `blr_reader_next` adapter로 축소 | `9bd6ebf429e2` | `249093ba477a` 및 후속 tests | adapter call graph와 shared extractor. |
| interval을 먼저 소비하고 result를 만들 수 있음 | allocation 실패 시 line skip/shorten/early EOF | commit point가 allocation 성공보다 앞섬 | copy 성공 뒤 cursor commit, scan restore | `9bd6ebf429e2` | `a24ad4e49cc4` | same-context newline/tail retry. Explicit inline behavior는 2e부터 존재함. |

## 8. Ownership / state / responsibility 변화

| 단계 | State owner | Descriptor owner | Reading engine | Result 표현 | Cleanup/cancel |
| --- | --- | --- | --- | --- | --- |
| descriptor-list model | hidden compatibility list/node | caller | legacy path | `char *`/`NULL` | EOF/error 중심 |
| `903768a43bf4` | explicit `t_blr_reader` caller handle + legacy adaptation | caller | context lifecycle 준비 | 기존 reading result 확인 | reset/destroy 가능 |
| `2e681112b304` | explicit context | caller | `blr_reader_next` | enum + output pointer | stable EOF state |
| `9bd6ebf429e2` | explicit context와 hidden context 모두 같은 engine 사용 | caller | one authoritative engine | adapter가 축소 mapping | allocation failure non-consuming |

### 실제 responsibility map

- **Public header가 노출하는 것:** opaque type name, create/reset/destroy/next function signatures, result enum과 borrowed-fd/output ownership contract입니다.
- **Opaque implementation이 숨기는 것:** fd value, buffer allocation, `begin/scan/end/capacity`, EOF flag, legacy list link입니다.
- **Caller가 반드시 release할 것:** every `BLR_LINE`의 `*line` allocation과 explicit context handle입니다.
- **Library가 절대 close하지 않는 것:** `blr_reader_create`에 supplied된 descriptor입니다.
- **Reset이 폐기하는 state:** internal bytes, capacity, begin/scan/end, EOF flag이며 context object와 fd association은 유지합니다.
- **Destroy가 폐기하는 resource:** internal allocation과 context object입니다. fd는 남습니다.
- **Adapter가 잃는 result information:** EOF와 ERROR를 모두 `NULL`로 축소합니다. 후속 AGAIN도 `NULL`로 축소되지만 hidden context retention policy로 일부 resumability를 보완합니다.

## 9. Thread 최종 상태

Source 기준으로 이 Thread가 끝났을 때 explicit context는 caller-controlled lifetime, borrowed descriptor, `LINE`/`EOF`/`ERROR` result contract와 stable EOF를 제공합니다. `get_next_line`은 같은 engine을 사용하는 compatibility adapter이며, result allocation failure는 buffered input을 소비하지 않아 same-context retry가 가능합니다.

이 Thread 종료 시점에는 후속 `f0055ae5cf19`의 `BLR_AGAIN`을 아직 포함하지 않습니다.

### 학습자가 작성할 최종 상태 설명

- **context 내부 state와 public opacity:** private struct가 fd, owned bytes, unread/scan indices, capacity, EOF flag, optional legacy link를 보관하고 public header는 incomplete type만 노출합니다.
- **create/reset/destroy의 정확한 ownership 변화:** create 성공 시 caller 또는 hidden list가 object owner, reserve 후 context가 buffer owner가 됩니다. reset은 buffer만 놓고 object/fd를 유지하며 destroy는 object까지 해제하되 fd는 caller 소유입니다.
- **`blr_reader_next` result별 state transition:** LINE은 result allocation 성공 뒤 begin/scan commit, EOF는 empty unread와 reached_eof 유지, ERROR는 output NULL이고 accepted unread를 소비하지 않습니다. 이 Thread 시점엔 AGAIN 없음입니다.
- **legacy adapter mapping과 정보 손실:** hidden context를 lookup/create해 same engine을 부르고 LINE만 pointer로 반환합니다. EOF/ERROR는 모두 NULL이므로 caller는 구분하지 못하며 hidden context는 제거됩니다.
- **transactional extraction commit point:** malloc과 copy/NUL이 성공한 다음에만 `begin=line_end`, `scan=begin`; failure는 `scan=begin`으로 복구합니다.
- **descriptor offset coupling과 reset 규칙:** context의 buffer는 prior kernel offset에서 read-ahead한 bytes를 포함합니다. caller가 lseek하거나 fd integer의 target을 바꾸면 reset 또는 old context destroy/new context가 필요합니다. dup aliases는 offset을 공유하므로 context 사용을 임의로 섞으면 안 됩니다.

## 10. 최종 architecture 또는 execution flow 정리

```text
caller
    → blr_reader_create(fd)
        → context owns [heap object; first reserve부터 internal buffer]
        → context borrows fd
    → blr_reader_next(context, &line)
        → clear output
        → stable EOF check
        → authoritative scan/read/extract engine
            → LINE: caller owns independent line
            → EOF: no line, terminal state retained
            → ERROR: no line, unread state retained by explicit context
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

1. **Context allocation과 initialization:** `blr_reader_create` validates fd, allocates object, sets bytes NULL, indices/capacity/EOF 0, fd copied, next NULL.
2. **Output pointer 초기화:** `blr_reader_next` first clears `*line` when pointer is non-NULL, then validates arguments.
3. **EOF flag fast path:** buffered scan after entry probe; `reached_eof` with empty unread returns `BLR_EOF`, nonempty invokes tail extraction. Positive-count data read is skipped.
4. **LINE ownership transfer:** `extract_line` allocates length+1, copies, NUL-terminates, then commits cursors and stores pointer for caller.
5. **ERROR state preservation/cleanup:** explicit API returns ERROR without destroying context; line allocation resets scan, read/probe errors leave unread logical data. Legacy adapter may destroy hidden context according to result.
6. **Reset after external reposition:** caller performs `lseek`, then `blr_reader_reset` discards read-ahead before next call.
7. **Legacy adapter mapping:** `find_reader/create_legacy_reader` → `blr_reader_next`; LINE returns pointer, other result returns NULL and this Thread's policy discards hidden context.
8. **Allocation failure retry path:** same context, begin/end/EOF unchanged, scan restored to begin; fault disabled; next call rebuilds same result and commits once.

## 11. 학습 완료 자가 점검

- [x] opaque type 선언과 private layout을 구분했습니다.
- [x] context가 descriptor를 소유하지 않는다는 코드와 test 근거가 있습니다.
- [x] reset과 destroy가 각각 어떤 allocation/state를 폐기하는지 설명할 수 있습니다.
- [x] 이 Thread 시점의 enum에 `BLR_AGAIN`을 소급하지 않았습니다.
- [x] non-line result의 output pointer rule을 모든 branch에서 확인했습니다.
- [x] repeated EOF가 positive-count data read 없이 terminal이 되는 코드와 zero-length probe 예외를 찾았습니다.
- [x] legacy parser가 제거되고 authoritative engine으로 연결되는 diff를 확인했습니다.
- [x] newline과 EOF tail의 allocation failure에서 cursor가 유지되는 근거가 있습니다.
- [x] external seek, fd reuse, dup alias를 서로 다른 lifecycle 문제로 설명할 수 있습니다.
- [x] broad context tests와 narrow allocation retry test의 증명 범위를 구분했습니다.
