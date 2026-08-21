# Thread: Whole-stream accumulation to a bounded streaming line parser

## 1. Thread 목표

전체 입력을 EOF까지 모으는 초기 reader가, 임의의 `read` 분할과 무관하게 한 번에 정확히 한 줄을 반환하고 남은 입력을 보존하는 bounded streaming parser로 발전하는 과정을 복원합니다. 이후 direct tail read와 구조적 성능 측정이 이 parser의 cursor·ownership invariant를 약화시키지 않는지도 확인합니다.

### Source에서 연결된 프로젝트 항목

- **Project profile:** POSIX C buffered record reading과 static-library API 설계 중, incremental line framing과 dynamic buffer-window representation을 담당하는 Thread입니다.
- **Critical invariants:** 한 번의 성공 결과는 정확히 한 logical record이며, newline이 있으면 포함하고 caller가 소유하는 독립 allocation이어야 합니다.
- **Critical invariants:** EOF의 unterminated suffix는 한 번만 반환되고 이후 EOF는 안정적으로 유지되어야 하며, empty stream은 empty line을 만들어서는 안 됩니다.
- **Critical invariants:** 최종 architecture의 buffer state는 `0 <= begin <= scan <= end < capacity`와 `bytes[end]`의 NUL sentinel을 유지하며 capacity arithmetic은 wrap되지 않아야 합니다.
- **Major engineering difficulty:** kernel이 입력을 어떤 크기로 나누어 반환하더라도 observable record가 달라지지 않는 parser를 설계하는 문제입니다.
- **Major engineering difficulty:** append-only accumulator를 unread-window로 바꾸면서 allocation rollback과 caller ownership을 유지하는 문제입니다.
- **Major engineering difficulty:** wall-clock 대신 operation count로 반복 scan, linear growth, per-chunk copy 회귀를 재현 가능하게 검출하는 문제입니다.

### Source가 확정한 significance

이 Thread는 세 가지 결정을 구분합니다. 첫째, bytes를 실패 시 손상 없이 누적하는 방법입니다. 둘째, logical record를 표현하고 소비하는 방법입니다. 셋째, parser 비용이 repeated append copy, repeated scan, linear-capacity growth로 되돌아가지 않도록 검증하는 방법입니다. 초기 구현은 ownership과 growth의 기반을 제공하고, unread interval과 line extractor가 durable architecture를 확립합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- EOF까지 누적하는 상태와 한 줄씩 소비하는 상태는 어떤 필드 차이로 표현되는가?
- `begin`, `scan`, `end`, `capacity`는 각각 어떤 byte 영역을 뜻하며 어느 함수가 변경하는가?
- newline이 한 read 안, read 경계, 여러 line이 섞인 read에 있을 때 같은 결과가 나오는 이유는 무엇인가?
- result allocation, reserve, compaction, growth가 실패할 때 기존 unread bytes는 어디에 남는가?
- 최종 unterminated suffix와 empty stream은 어떤 조건으로 구분되는가?
- direct tail read가 기존 append-copy 경로를 어떻게 대체하면서 rollback 순서를 유지하는가?
- 4 MiB metric test의 숫자는 어떤 알고리즘적 선택을 고정하며 무엇을 고정하지 않는가?

## 3. 완료 기준

- 초기 accumulator의 allocation·append·EOF return 경로를 실제 코드로 설명할 수 있습니다.
- unread interval의 각 index와 NUL sentinel이 모든 reserve branch에서 어떻게 유지되는지 입증했습니다.
- newline extraction과 EOF-tail extraction의 cursor mutation 순서를 해당 SHA 코드로 추적했습니다.
- 여러 `BUFFER_SIZE`에서 같은 logical line sequence가 나오는 이유를 test case와 production path로 연결했습니다.
- scratch-buffer 제거 전후의 read destination과 copy 횟수 차이를 비교했습니다.
- 4 MiB test의 고정 수치가 어떤 regression을 검출하는지, wall-clock benchmark와 어떻게 다른지 설명할 수 있습니다.

## 4. Commit map
| 순서 | Commit | Subject | Importance | Tags | Source에서 확정된 Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `85e4c2a41a4c` | `feat(reader): 파일 끝의 마지막 줄 반환` | **A** | `CORE`, `LINE_STATE`, `RISK` | 기하급수적 누적, ownership rollback, EOF tail 규칙을 확립합니다. |
| 2 | `7e64d3d79ad4` | `refactor(buffer): 읽지 않은 입력을 구간으로 표현` | **S** | `ARCH`, `LINE_STATE`, `HARD` | 소비한 prefix를 안전하게 제외하기 위한 unread-window 표현을 도입합니다. |
| 3 | `39a2b9055728` | `feat(reader): 줄을 분리하고 남은 입력 보존` | **S** | `CORE`, `LINE_STATE`, `HARD` | 한 줄 추출, newline 보존, scan 진행, unread suffix 보존을 구현합니다. |
| 4 | `656528529ade` | `test(reader): BUFFER_SIZE 경계값 검증` | **A** | `TEST`, `LINE_STATE`, `EDGE` | 여러 chunk 크기와 어려운 경계에서도 framing과 ownership이 유지됨을 검증합니다. |
| 5 | `dbf1abd21121` | `refactor(buffer): 남은 입력 버퍼를 읽기 공간으로 재사용` | **A** | `PERF`, `LINE_STATE`, `REFACTOR` | reserved tail로 직접 읽어 매 read마다 발생하던 scratch-buffer 복사를 제거합니다. |
| 6 | `a0654d9de446` | `test(perf): 4 MiB 입력의 작업량 기준 고정` | **A** | `PERF`, `TEST`, `LINE_STATE` | 대용량 입력의 재현 가능한 작업량을 고정해 multiplicative work 회귀를 막습니다. |

## 5. Commit별 학습 기록
### 5.1 `85e4c2a41a4c` — `feat(reader): 파일 끝의 마지막 줄 반환`

- **Commit:** `85e4c2a41a4c`
- **Subject:** `feat(reader): 파일 끝의 마지막 줄 반환`
- **Importance:** **A**
- **Tags:** `CORE`, `LINE_STATE`, `RISK`

#### Source에서 확정된 역할

이 commit은 여러 `read`에 걸친 persistent accumulation, geometric buffer growth, descriptor probing, allocation/I/O failure cleanup을 도입합니다. EOF가 오면 누적한 bytes를 caller가 독립적으로 소유하는 result로 복사하고 internal state를 정리합니다. trailing newline이 없는 마지막 byte sequence도 data이며 버리면 안 된다는 규칙을 확립합니다.

이 시점에는 embedded newline을 분리하지 않으며, 전체 파일을 하나의 final record처럼 처리합니다. 따라서 완성된 line reader가 아니라 이후 line extraction이 재사용할 ownership·growth·rollback 기반입니다.

#### 직전 상태와 비교할 지점

- 공개 계약이 도입된 직전 관련 SHA `466cfcbd3525`와 비교해, header contract가 실제 reader state와 어떤 함수로 연결되는지 확인합니다.
- commit parent와 diff해 최초로 생긴 allocation, reserve/growth, descriptor probe, EOF copy, cleanup 경로를 구분합니다.
- 아직 존재하지 않는 line split, unread suffix, persistent scan cursor를 이후 구현의 관점에서 소급해 설명하지 않습니다.

#### 해당 SHA에서 확인할 실제 코드

1. persistent accumulation state를 보관하는 객체 또는 file-scope storage와 각 필드의 초기값을 찾습니다.
2. descriptor를 실제 read 전에 검사하거나 probe하는 caller와 callee를 찾고, invalid/closed descriptor가 어느 cleanup branch로 이동하는지 추적합니다.
3. capacity가 부족할 때 새 allocation을 얻고 기존 allocation을 교체하는 순서를 확인합니다. 새 allocation 실패 전에 기존 pointer가 덮어써지지 않는지 기록합니다.
4. positive short read를 append하는 코드, EOF를 판정하는 코드, I/O error를 처리하는 코드를 분리해 발췌합니다.
5. EOF에서 accumulated bytes를 caller-owned NUL-terminated result로 복사하는 지점과 internal state release 순서를 확인합니다.
6. empty input과 unterminated nonempty input이 서로 다른 return 결과가 되는 조건을 찾습니다.

#### 코드 근거 기록

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| accumulation state 정의와 초기화 | `get_next_line.c`, `t_reader`와 `static t_reader g_reader = {-1, NULL, 0, 0}` | `fd`, `bytes`, `length`, `capacity`가 process lifetime의 singleton state입니다. 첫 호출 전에는 descriptor가 없고 allocation도 없습니다. |
| geometric capacity 계산과 overflow 방어 | `reserve_bytes`: `capacity *= 2`; `capacity > (size_t)-1 / 2`이면 `required`; `append_bytes`: `length > SIZE_MAX - current - 1` 검사 | NUL 한 바이트를 포함한 `required` 계산이 wrap되기 전에 실패하며, capacity는 필요 크기 이상이 될 때까지 배가됩니다. |
| old allocation을 보존하는 replacement 순서 | `reserve_bytes`: `malloc(capacity)` → 기존 bytes 복사 → `free(g_reader.bytes)` → pointer/capacity 교체 | 새 allocation 실패 시 기존 pointer, length, capacity는 바뀌지 않습니다. 교체가 성공한 뒤에만 이전 allocation의 소유권을 놓습니다. |
| read progress / EOF / error 분기 | `get_next_line`: zero-length probe, `while (read_size > 0)`, `read_size < 0`, `length == 0` | 양수는 append되는 progress, 0은 EOF, 음수는 오류입니다. short positive read도 EOF로 취급하지 않고 다음 read를 계속합니다. |
| caller-visible result allocation·copy·NUL 종료 | `append_bytes`가 매 append 뒤 `bytes[length]='\0'`; `release_final_line`은 `line = g_reader.bytes` | 실제 SHA에는 별도 result allocation/copy가 없습니다. 내부 allocation 자체를 caller에게 이전하므로 결과는 독립 소유가 되지만 source의 “복사” 설명과 구현 방식은 다릅니다. |
| failure 및 EOF cleanup | `reset_reader`; EOF nonempty의 `release_final_line` | invalid fd, append 실패, read 오류, empty EOF는 allocation을 free합니다. nonempty EOF는 pointer를 넘긴 뒤 singleton의 pointer와 길이만 초기화해 caller가 free할 owner가 됩니다. |

**최소 코드 근거**

`85e4c2a41a4c`, `get_next_line.c`, `release_final_line`:

```c
line = g_reader.bytes;
g_reader.bytes = NULL;
g_reader.length = 0;
g_reader.capacity = 0;
return (line);
```

이 코드는 result copy가 아니라 ownership transfer입니다. 고정된 Source 역할은 변경하지 않았으며, 저장소에서 관찰된 차이를 이 학습 기록에 명시합니다.

#### 학습자가 복원할 결정과 한계

- **해결하려던 문제:** `read` 한 번으로 전체 입력이 오지 않더라도 bytes를 누적하고, EOF 직전의 newline 없는 suffix를 data로 반환해야 했습니다. `append_bytes`가 여러 positive read를 이어 붙이고 `length != 0`일 때 `release_final_line`으로 반환합니다.
- **기존 설계가 충분하지 않았던 이유:** `466cfcbd3525`에는 header의 `get_next_line(int fd)` 선언과 `BUFFER_SIZE` 검증만 있고 persistent bytes, growth, failure rollback을 수행하는 구현이 없었습니다.
- **선택한 결정:** singleton accumulator와 geometric growth를 사용합니다. realloc을 쓰지 않고 새 allocation을 먼저 확보해 실패 시 기존 state를 보존합니다. EOF에서는 내부 allocation을 직접 넘겨 복사 비용 없이 caller ownership으로 전환합니다.
- **이 commit이 보장하는 것:** valid descriptor의 empty stream은 `NULL`, nonempty stream은 전체 bytes 한 덩어리, invalid/closed fd와 I/O·allocation 오류는 `NULL`이며 해당 singleton allocation을 정리합니다. 여러 read에 걸친 입력과 short read도 누적합니다.
- **아직 보장하지 않는 것:** `find_line_end`나 `scan`이 없으므로 embedded newline을 분리하지 않습니다. `"a\nb\n"`도 한 번에 전체 문자열로 반환됩니다. 또한 singleton이므로 fd를 바꾸면 이전 fd의 state를 버립니다.
- **다음 commit과의 연결:** 하나의 `length`는 “전체 allocation 중 유효한 끝”만 나타냅니다. 반환한 prefix와 다음 호출에 남길 suffix를 동시에 표현하려면 소비 시작점인 `begin`이 필요하므로 `7e64d3d79ad4`가 `[begin, end)`를 도입합니다.

### 5.2 `7e64d3d79ad4` — `refactor(buffer): 읽지 않은 입력을 구간으로 표현`

- **Commit:** `7e64d3d79ad4`
- **Subject:** `refactor(buffer): 읽지 않은 입력을 구간으로 표현`
- **Importance:** **S**
- **Tags:** `ARCH`, `LINE_STATE`, `HARD`

#### Source가 확정한 Problem

하나의 active length만으로는 accumulated bytes, 이미 반환한 prefix, 아직 읽지 않은 bytes, scan progress, unused capacity를 구분하기 어렵습니다. Incremental line consumption은 이 영역들이 서로 다른 의미를 가져야 하며, allocation failure가 기존 data를 손상시키지 않아야 합니다.

#### Source가 확정한 Decision

buffer를 capacity-managed allocation 내부의 unread interval `[begin, end)`로 표현합니다. 소비한 prefix는 `begin`을 전진시켜 제외하고, remaining bytes는 필요할 때만 compact하며, geometric growth는 allocation과 copy가 성공한 뒤에만 기존 allocation을 교체합니다.

#### Source가 확정한 중요성

이 표현은 이후 newline scan, suffix preservation, explicit context, failure retry, direct tail read가 공유하는 기반입니다. 최종 reader는 repeated string concatenation이 아니라 bytes 위의 stateful window로 이해해야 합니다.

#### 해당 SHA에서 확인할 실제 핵심 코드

1. reader state 정의에서 `begin`, `end`, `capacity` 또는 같은 의미의 필드가 어떻게 추가·변경되었는지 직전 관련 SHA `85e4c2a41a4c`와 비교합니다.
2. logical unread length를 계산하는 코드와 allocation 전체 capacity를 계산하는 코드를 구분합니다.
3. free tail space만으로 요청을 만족하는 branch, consumed prefix를 compact하는 branch, 새 allocation으로 grow하는 branch를 각각 찾습니다.
4. compaction 전후에 unread bytes의 source/destination range와 index reset 순서를 기록합니다.
5. growth size 계산에서 overflow를 막는 조건과 필요한 NUL sentinel 공간을 포함하는지 확인합니다.
6. 새 allocation 또는 copy 준비가 실패했을 때 old allocation, `begin`, `end`가 그대로 유지되는지 failure return 직전 상태를 확인합니다.
7. reserve 완료 후 `bytes[end]`에 NUL sentinel을 유지하는 지점과 모든 mutation path에서 sentinel이 유효한지 확인합니다.
8. 이 commit이 line extraction 자체를 도입하지 않고 representation만 바꾸는지 caller 흐름으로 확인합니다.

#### State representation 복원

| 영역 | index/field | 해당 SHA의 실제 의미 | 변경 주체 | 실패 시 유지 조건 |
| --- | --- | --- | --- | --- |
| 소비 완료 prefix | `[0, begin)` | 논리적으로 읽은 것으로 간주해 다음 결과에서 제외할 영역입니다. 이 SHA에는 extraction이 없어 정상 경로에서 아직 `begin`이 0에 머뭅니다. | 이후 extraction 또는 `compact_bytes`가 사용하도록 준비됨 | growth allocation 실패 전에는 `begin`을 변경하지 않습니다. |
| unread bytes | `[begin, end)` | caller에게 아직 전달하지 않은 유효 byte 구간이며 길이는 `unread_length() == end - begin`입니다. | `append_bytes`, 향후 extraction, `compact_bytes` | growth 실패 시 pointer와 두 index가 그대로입니다. compaction은 실패하지 않는 in-place mutation입니다. |
| append 가능한 tail | `[end, capacity)` 중 sentinel 이후 공간 | `capacity - end >= appended + 1`이면 allocation·compaction 없이 새 bytes와 NUL을 둘 수 있습니다. | `reserve_bytes`, `append_bytes` | tail branch는 state를 바꾸지 않고 성공만 반환합니다. |
| allocation 전체 크기 | `capacity` | `bytes`가 가리키는 block의 크기입니다. logical unread length와 별개입니다. | `reserve_bytes` growth success, `reset_reader` | 새 allocation 실패 시 기존 capacity 유지 |
| NUL sentinel | `bytes[end]` | unread interval의 물리적 끝 바로 뒤에 둔 검사·문자열 편의용 byte입니다. record 내용에는 포함되지 않습니다. | `compact_bytes`, growth commit, `append_bytes` | 성공한 mutation마다 다시 기록하며 실패 path는 기존 sentinel을 건드리지 않습니다. |

#### Reserve branch별 코드 근거

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| tail 재사용 branch | `reserve_bytes`: `capacity - end >= appended + 1` | 현재 `end` 뒤에 data와 sentinel을 둘 수 있으면 pointer와 index를 전혀 바꾸지 않습니다. |
| unread suffix compaction branch | `begin > 0 && required <= capacity` → `compact_bytes()` | allocation 전체에는 충분하지만 앞쪽 consumed 공간 때문에 연속 tail이 부족한 경우 `[begin,end)`를 0으로 당깁니다. |
| geometric growth branch | capacity 1부터 doubling, `malloc(capacity)`, unread copy, old free, index commit | 필요한 크기가 allocation 전체보다 크면 새 block을 먼저 얻습니다. 성공 후 unread bytes만 복사하고 `begin=0`, `end=length`로 정규화합니다. |
| capacity arithmetic overflow branch | `appended > SIZE_MAX - length - 1`; doubling saturation 검사 | `length + appended + 1`과 doubling이 wrap되기 전에 0을 반환합니다. sentinel 공간까지 계산합니다. |
| allocation failure rollback branch | `allocation = malloc(capacity); if (allocation == NULL) return (0);`가 old free와 index commit보다 앞 | 실패 시 old allocation, `begin`, `end`, `capacity`, sentinel이 모두 그대로입니다. |
| NUL sentinel 복구 지점 | `compact_bytes`, growth success, `append_bytes`의 `bytes[end] = '\0'` | 모든 실제 byte/index mutation이 끝난 뒤 새 logical end에 sentinel을 씁니다. |

**최소 코드 근거**

`7e64d3d79ad4`, `get_next_line.c`, `reserve_bytes`:

```c
allocation = malloc(capacity);
if (allocation == NULL)
    return (0);
if (length > 0)
    copy_bytes(allocation, g_reader.bytes + g_reader.begin, length);
free(g_reader.bytes);
```

실패 가능한 획득을 먼저 수행하므로 growth branch는 non-destructive입니다.

#### Ownership·failure 분석

- 기존 allocation은 함수 진입 시 `g_reader`가 소유합니다. 새 block을 받은 직후부터 교체 전까지는 지역 변수 `allocation`이 임시 owner이며, unread copy가 끝난 뒤 기존 block을 free하고 `g_reader.bytes = allocation`으로 ownership을 넘깁니다.
- compaction은 allocation ownership을 바꾸지 않습니다. `copy_bytes`가 작은 주소 방향으로 왼쪽 이동하며 index를 0부터 증가시키므로 source와 destination이 겹쳐도 아직 읽지 않은 source byte를 덮지 않습니다. 일반적인 양방향 overlap을 지원하는 함수는 아니지만 이 호출 방향에서는 안전합니다.
- growth failure는 `malloc` 직후 반환하므로 state mutation이 없습니다. overflow도 allocation·index mutation 전에 반환합니다. 반면 compaction은 성공을 전제로 실제 위치를 바꾸며 별도 failure branch가 없습니다.
- source가 최종 invariant로 제시한 `0 <= begin <= scan <= end < capacity` 중 이 SHA에는 `scan`이 없습니다. 실제 invariant는 allocation이 있을 때 `0 <= begin <= end < capacity`, 그리고 `bytes[end] == '\0'`입니다.

#### 이 commit의 보장과 다음 연결

- **보장:** logical unread bytes와 allocation capacity를 분리하고, reserve가 tail reuse, left compaction, geometric growth를 선택할 수 있습니다. growth failure는 old unread interval을 보존합니다.
- **보장하지 않는 것:** `get_next_line`은 여전히 EOF까지 읽고 `release_final_line` 한 번만 반환합니다. `scan`과 one-line extraction은 없습니다.
- **다음 연결:** `39a2b9055728`은 `[begin,end)` 안에서 `scan`으로 newline을 찾고 `[begin,line_end)`만 결과로 복사한 뒤 `begin=line_end`를 commit하여 suffix를 남깁니다.

### 5.3 `39a2b9055728` — `feat(reader): 줄을 분리하고 남은 입력 보존`

- **Commit:** `39a2b9055728`
- **Subject:** `feat(reader): 줄을 분리하고 남은 입력 보존`
- **Importance:** **S**
- **Tags:** `CORE`, `LINE_STATE`, `HARD`

#### Source가 확정한 Problem

EOF까지 누적하는 구현은 library의 중심 계약을 만족하지 못합니다. caller는 delimiter가 read 경계를 가로지르거나 하나의 read에 여러 line이 들어 있어도 한 call에서 정확히 한 logical line을 받아야 합니다.

#### Source가 확정한 Decision

reader는 persistent scan cursor에서 newline을 찾고, newline까지의 prefix를 독립 allocation으로 반환하며, 해당 record만큼 unread start를 전진시킵니다. 뒤의 모든 bytes는 다음 call을 위해 보존합니다. EOF에서는 nonempty suffix를 한 번 반환한 뒤 completion으로 이동합니다.

#### Source가 확정한 중요성

이 commit이 whole-stream accumulator를 reusable streaming line reader로 바꿉니다. kernel read partitioning을 caller에게 보이지 않게 만들고, 한 성공 call이 정확히 한 record만 소비한다는 핵심 consumption invariant를 확립합니다.

#### 해당 SHA에서 확인할 실제 핵심 코드

1. `scan` cursor 또는 같은 역할의 필드가 state에 추가된 diff와 초기값을 찾습니다.
2. newline search helper가 `[scan, end)` 중 어디를 검사하고, delimiter를 못 찾았을 때 `scan`을 어디까지 전진시키는지 추적합니다.
3. newline을 찾은 경우 result length에 newline byte가 포함되는 계산을 확인합니다.
4. caller-owned result allocation, bytes copy, NUL termination의 순서를 발췌합니다.
5. 성공한 extraction 뒤 `begin`과 `scan`이 각각 어떤 값으로 이동하며 unread suffix가 어떻게 보존되는지 확인합니다.
6. 연속 newline이 각각 별도 empty line result가 되는 조건을 실제 index 계산으로 설명합니다.
7. EOF이며 unread suffix가 nonempty인 branch와 EOF이며 unread bytes가 없는 branch를 구분합니다.
8. 한 read가 첫 line의 newline 뒤에 다음 line 일부까지 가져온 경우, 두 번째 prefix가 내부 buffer에 남는 경로를 추적합니다.

#### 핵심 execution trace

아래 세 입력을 해당 SHA의 실제 index 값으로 추적합니다.

| 사례 | 각 단계의 `begin` | 각 단계의 `scan` | 각 단계의 `end` | 반환 result | 남은 unread bytes |
| --- | --- | --- | --- | --- | --- |
| newline이 read 경계 앞에 있음 | 예: 첫 read `"ab"`: `0`; 다음 read `"\ncd"`: `0`; extraction 후 `3` | 첫 scan 후 `2`; newline 발견 시 `3`; extraction 후 `3` | 첫 read `2`; 다음 read `5`; extraction 후 `5` | `"ab\n"` | `[3,5)`의 `"cd"` |
| 한 read에 두 line이 들어옴 | `"a\nb\n"` read 후 `0`; 첫 extraction 후 `2`; 둘째 extraction 후 state 폐기 | 첫 newline에서 `2`; commit `2`; 다음 newline에서 `4` | read 후와 두 extraction 전까지 `4` | 첫 call `"a\n"`, 다음 call `"b\n"` | 첫 call 뒤 `[2,4)`의 `"b\n"`; 둘째 뒤 없음 |
| newline 없는 EOF tail | data read 후 `0`; EOF transfer 후 singleton 초기화 | data scan 후 `4`; 초기화 후 0 | data read 후 `4`; 초기화 후 0 | `"tail"` | 없음; 다음 call은 empty EOF로 `NULL` |

연속 newline `"\n\n"`에서는 첫 `find_line_end`가 1을 반환해 길이 1인 `"\n"`을 만들고 `begin=scan=1`로 이동합니다. 다음 호출은 index 1의 newline을 찾아 다시 길이 1인 `"\n"`을 만듭니다. 빈 logical line은 NUL-only 문자열이 아니라 newline을 포함한 한 바이트 result입니다.

#### 코드 근거 기록

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| newline scan 시작/종료 조건 | `find_line_end`: `while (scan < end)`, byte가 `\n`이면 `scan++` 후 반환, 없으면 `scan=end` | 이미 확인한 prefix를 재검색하지 않으며 반환 index는 delimiter 다음 위치입니다. |
| delimiter 포함 result length 계산 | `extract_line`: `length = line_end - begin` | `line_end`가 newline 다음 index이므로 newline 자체가 result에 포함됩니다. |
| result allocation·copy·NUL termination | `malloc(length + 1)` → `copy_bytes` → `line[length]='\0'` | 각 성공 result는 internal buffer와 별도 allocation이며 caller가 free해야 합니다. |
| 성공 후 `begin` commit | `reader->begin = line_end` | 방금 반환한 record만 consumed prefix가 되고 그 뒤 bytes는 남습니다. |
| 성공 후 `scan` 재설정 또는 보정 | `reader->scan = reader->begin` | 다음 record의 시작에서 다시 탐색합니다. compaction 시에는 기존 scan에서 old begin을 빼 상대 위치를 유지합니다. |
| EOF tail 반환과 이후 completion | `unread_length()!=0`이면 `release_final_line`; 없으면 `reset_reader`/`NULL` | nonempty suffix는 한 번 반환되고 singleton state가 비워집니다. 이후 EOF call은 `NULL`입니다. |

**최소 코드 근거**

`39a2b9055728`, `get_next_line.c`, `find_line_end`와 `extract_line`:

```c
if (reader->bytes[reader->scan] == '\n')
{
    reader->scan++;
    return (reader->scan);
}
```

```c
reader->begin = line_end;
reader->scan = reader->begin;
```

첫 부분이 delimiter를 result 범위에 포함하고, 둘째 부분이 성공한 record만 소비합니다.

#### Failure와 아직 남은 범위

- result allocation이 실패하면 이 SHA의 `extract_line`은 `discard_reader(reader)`를 호출합니다. 따라서 `begin`과 `scan`을 보존해 재시도하는 것이 아니라 해당 descriptor의 전체 state를 해제합니다. 이후 `9bd6ebf429e2`의 transactional extraction을 이 SHA에 소급할 수 없습니다.
- read error도 `discard_reader`를 호출해 unread bytes를 버립니다. EOF는 오류와 달리 nonempty unread suffix를 반환합니다.
- 이 SHA는 여전히 하나의 file-scope singleton만 사용합니다. 다른 fd가 들어오면 기존 state를 reset하므로 descriptor별 isolation이나 explicit result taxonomy는 없습니다.

#### 이 commit이 보장하는 것

- 성공한 `extract_line`이 소비하는 범위는 정확히 `[begin,line_end)`이며 newline이 발견된 경우 newline까지 포함합니다.
- `[line_end,end)`는 다음 호출용 unread suffix로 남고, EOF의 `[begin,end)` nonempty tail은 마지막 result가 됩니다.
- kernel chunk boundary가 logical record boundary와 분리되는 이유는 매 read 뒤 기존 `scan`부터 이어서 검사하고, newline이 없으면 더 읽되 이미 받은 bytes와 새 bytes를 같은 interval에 유지하기 때문입니다.

### 5.4 `656528529ade` — `test(reader): BUFFER_SIZE 경계값 검증`

- **Commit:** `656528529ade`
- **Subject:** `test(reader): BUFFER_SIZE 경계값 검증`
- **Importance:** **A**
- **Tags:** `TEST`, `LINE_STATE`, `EDGE`

#### Source에서 확정된 역할

동일한 reader behavior를 `BUFFER_SIZE` 1, 2, default, much larger value로 실행합니다. chunk boundary 주변 data, 큰 adjacent lines, pipe input, high-numbered descriptors, repeated EOF, 반환 buffer의 독립성, descriptor를 닫지 않는 borrowing behavior를 검증합니다.

#### 해당 SHA에서 확인할 테스트 코드

1. 각 `BUFFER_SIZE` 변형을 어떤 build target, compile definition, test loop로 실행하는지 찾습니다.
2. delimiter가 chunk 앞·경계·뒤에 놓이는 fixture와 expected line sequence를 확인합니다.
3. large adjacent lines가 growth, scan, suffix retention을 동시에 통과하도록 구성된 입력을 찾습니다.
4. pipe input과 high-numbered descriptor를 생성·정리하는 helper를 확인합니다.
5. repeated EOF call의 expected value와 몇 번 반복하는지 기록합니다.
6. 반환된 line을 보관한 뒤 reader를 계속 사용해 internal buffer와 alias하지 않음을 확인하는 assertion을 찾습니다.
7. 호출 뒤 descriptor가 여전히 열려 있음을 어떤 system call 또는 assertion으로 확인하는지 찾습니다.

#### Test commit 학습 기록

| 구분 | 해당 SHA에서 기록할 내용 |
| --- | --- |
| **Production invariant** | `tests/test_boundaries.c`의 `check_single_line`, large adjacent line, storage independence case가 한 call당 한 line, suffix 보존, caller-owned result를 각각 확인합니다. |
| **Failure / boundary** | body 길이를 `BUFFER_SIZE-1`, `BUFFER_SIZE`, `BUFFER_SIZE+1`, `3*BUFFER_SIZE+7`로 배치하고, newline 유무·연속 line·empty input·pipe·high fd를 구분합니다. |
| **Test technique** | Makefile의 `MATRIX_SIZES := 1 2 42 1024`와 size별 object/bin 경로를 사용하는 compile-time behavioral matrix입니다. 각 size는 별도 `build/obj/<size>`와 `tests/bin/test_reader_<size>`를 사용합니다. |
| **Production path** | fixture 생성 → file/pipe/fd 준비 → `get_next_line` → selected descriptor state의 scan/read/extract → result 비교/free → descriptor close 순입니다. |
| **증명하는 것** | 같은 fixture가 네 chunk 크기에서 같은 line sequence를 내고, repeated EOF는 `NULL`, first result는 subsequent read 뒤에도 내용이 유지되며 두 result pointer가 다름을 assertion으로 고정합니다. |
| **증명하지 않는 것** | allocation/read fault injection, `EINTR`/`EAGAIN`, explicit context enum, 구조적 copy·allocation count는 이 commit의 범위가 아닙니다. |
| **분류** | 여러 compile-time chunk 크기와 실제 descriptor 형태를 포괄하는 broad boundary regression입니다. |
| **막는 회귀** | delimiter alignment 의존은 size matrix, suffix 손실은 adjacent lines, alias는 retained first line/pointer inequality, unstable EOF는 반복 `NULL`, fd를 닫는 동작은 test가 명시적으로 descriptor를 계속 사용·정리하는 흐름이 검출합니다. |

**실제 fixture 근거**

- `tests/test_boundaries.c`의 large case는 첫 body 32,768 bytes 뒤 newline과 이어지는 32,771-byte tail을 사용해 grow, first extraction, suffix retention, EOF tail을 한 sequence로 통과시킵니다.
- high-numbered descriptor는 `fcntl(..., F_DUPFD, 128)`로 생성합니다.
- empty input은 `get_next_line`의 `NULL`을 세 번 확인하고, single-line helper도 line 반환 뒤 EOF `NULL`을 두 번 확인합니다.
- descriptor borrowing은 일반 case에서 library가 `close`를 호출하지 않고 test가 마지막에 직접 닫는 방식과, high-fd/pipe를 후속 operation에 사용하는 behavior로 간접 검증됩니다. 이 SHA에 context API의 명시적 `F_GETFD` assertion은 없습니다.

#### 결과 기록

| `BUFFER_SIZE` | 실행 명령 | 통과/실패 | 실패 시 최초 assertion | 확인한 production path |
| ---: | --- | --- | --- | --- |
| 1 | `make --no-print-directory test-run BUFFER_SIZE=1` | **미실행** — 이 환경에서는 branch checkout을 만들 수 없어 binary를 빌드·실행하지 못했습니다. | 실행 결과 없음 | Makefile과 test source inspection으로 size별 object/archive, scan/extract path를 확인했습니다. |
| 2 | `make --no-print-directory test-run BUFFER_SIZE=2` | **미실행** — 같은 환경 제한 | 실행 결과 없음 | 동일 |
| default | `make --no-print-directory test-run BUFFER_SIZE=42` | **미실행** — 같은 환경 제한 | 실행 결과 없음 | 동일 |
| large | `make --no-print-directory test-run BUFFER_SIZE=1024` | **미실행** — 같은 환경 제한 | 실행 결과 없음 | 동일 |

실행 결과를 통과로 간주하지 않았습니다. 확인한 것은 `656528529ade`의 Makefile·test implementation과 production code뿐입니다.

### 5.5 `dbf1abd21121` — `refactor(buffer): 남은 입력 버퍼를 읽기 공간으로 재사용`

- **Commit:** `dbf1abd21121`
- **Subject:** `refactor(buffer): 남은 입력 버퍼를 읽기 공간으로 재사용`
- **Importance:** **A**
- **Tags:** `PERF`, `LINE_STATE`, `REFACTOR`

#### Source에서 확정된 역할

기존 stack scratch buffer에 `read`한 뒤 internal buffer로 append-copy하던 경로를 제거합니다. reserve가 확보한 internal unread buffer의 tail을 system call destination으로 직접 사용하고, positive read만큼 `end`를 늘린 뒤 NUL sentinel을 복구합니다.

#### 변경 전후 비교

- **변경 전:** 직전 구현의 `get_next_line`은 `char buffer[BUFFER_SIZE]`를 destination으로 사용하고, `append_bytes(reader, buffer, read_size)`가 다시 `copy_bytes`로 persistent allocation에 복사했습니다. scratch storage는 한 public call의 stack lifetime만 가집니다.
- **변경 후:** `reserve_bytes(reader, BUFFER_SIZE)` 뒤 `read(fd, reader->bytes + reader->end, BUFFER_SIZE)`를 호출합니다. 양수일 때만 `end += read_size` 후 `bytes[end]='\0'`을 기록합니다.
- 이 비교는 각각 해당 historical SHA의 `get_next_line.c` symbol을 사용했으며 후속 context API symbol을 끌어오지 않았습니다.

#### 해당 SHA에서 확인할 실제 코드

1. read caller가 필요한 tail capacity를 계산하고 reserve를 먼저 호출하는 순서를 확인합니다.
2. reserve 성공 전에는 `read`가 실행되지 않는지 control flow를 추적합니다.
3. system call destination이 internal allocation의 어느 offset인지 pointer expression을 발췌합니다.
4. short positive read에서 실제 반환 byte 수만큼 `end`가 증가하는지 확인합니다.
5. zero read와 negative read에서는 `end`가 증가하지 않는지 각 branch를 확인합니다.
6. 새 bytes 뒤 NUL sentinel을 복구하는 정확한 지점을 기록합니다.
7. compaction 또는 growth가 발생한 뒤 read destination이 stale pointer를 사용하지 않는지 caller/callee 순서로 확인합니다.

#### 코드 근거 기록

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| 변경 전 scratch-buffer read | 직전 `get_next_line.c`: `char buffer[BUFFER_SIZE]`; `read(fd, buffer, BUFFER_SIZE)` | kernel bytes가 먼저 stack에 저장됐습니다. |
| 변경 전 append copy | 직전 `append_bytes`: reserve 후 `copy_bytes(reader->bytes + reader->end, bytes, length)` | 모든 positive read마다 stack → persistent buffer 복사가 하나 추가됐습니다. |
| 변경 후 reserve-before-read | `while (1)` 첫 분기 `if (!reserve_bytes(...))` 다음에만 `read` | 연속 공간을 확보하지 못하면 system call을 수행하지 않고 해당 legacy node를 정리합니다. |
| 변경 후 direct tail destination | `reader->bytes + reader->end` | unread interval 끝의 예약된 tail이 곧 system-call destination입니다. |
| positive read 뒤 `end` mutation | `if (read_size <= 0) break; reader->end += (size_t)read_size` | 요청량이 아니라 실제 반환량만 state에 commit합니다. short read는 정상 progress입니다. |
| NUL sentinel 복구 | `reader->bytes[reader->end] = '\0'` | 새 `end`가 정해진 직후 sentinel을 복구하고 scan합니다. |
| reserve/read failure에서 unread interval 유지 | reserve growth 실패 자체는 non-destructive이나 caller는 `discard_reader`; read error도 `discard_reader` | reserve/read helper 내부의 interval은 commit 전 안전하지만 이 시점 legacy API 정책은 실패 시 selected node를 폐기하므로 caller 재시도용 state는 보존하지 않습니다. |

**최소 코드 근거**

`dbf1abd21121`, `get_next_line.c`, read loop:

```c
if (!reserve_bytes(reader, (size_t)BUFFER_SIZE))
{
    discard_reader(reader);
    return (NULL);
}
read_size = read(fd, reader->bytes + reader->end,
        (size_t)BUFFER_SIZE);
```

reserve가 compaction/growth로 pointer를 확정한 뒤 destination을 계산하므로 stale pre-reserve pointer를 사용하지 않습니다.

#### 성능 결정과 invariant

- 변경 전에는 모든 successful read마다 `append_bytes`의 copy가 한 번 발생했습니다. 변경 후에는 kernel이 persistent tail에 직접 쓰므로 그 copy가 사라집니다.
- zero-copy 전체 구현은 아닙니다. capacity growth 때 unread bytes를 새 allocation으로 복사하고, newline result는 caller-owned allocation으로 복사합니다. 이 SHA의 EOF tail은 내부 allocation을 직접 이전하지만 후속 authoritative context engine에서는 별도 result copy로 통일됩니다.
- reserve의 arithmetic/allocation failure는 old allocation을 부분 교체하지 않지만 compatibility caller가 node를 폐기합니다. read error도 이 SHA에서는 selected node의 unread bytes를 정리합니다. 후속 explicit context의 retry semantics를 소급하지 않습니다.
- observable line semantics는 바뀌지 않도록 기존 `656528529ade` matrix가 같은 production public API를 계속 통과하도록 Makefile에 포함됩니다. 실제 실행은 이 환경에서 수행하지 못했습니다.

### 5.6 `a0654d9de446` — `test(perf): 4 MiB 입력의 작업량 기준 고정`

- **Commit:** `a0654d9de446`
- **Subject:** `test(perf): 4 MiB 입력의 작업량 기준 고정`
- **Importance:** **A**
- **Tags:** `PERF`, `TEST`, `LINE_STATE`

#### Source에서 확정된 역할

4 MiB newline 없는 입력을 `BUFFER_SIZE=4096`으로 읽고 system call, allocation, release, internal copy volume을 test hook으로 셉니다. manifest는 checksum과 함께 **1025 reads, 13 allocations, 11 copy operations, 12,533,760 copied bytes**를 고정하며 wall-clock은 정보로만 남기고 pass/fail 조건으로 사용하지 않습니다.

#### 해당 SHA에서 확인할 테스트·계측 코드

1. 4 MiB fixture가 생성되는 방식과 newline이 없음을 보장하는 코드를 찾습니다.
2. `BUFFER_SIZE=4096` build가 실제 production implementation에 적용되는 지점을 확인합니다.
3. read, allocation, release, copy를 세는 hook 또는 wrapper와 production call site의 연결을 추적합니다.
4. 1025 reads가 data reads와 EOF read를 어떻게 합산한 값인지 실제 counter increment 위치로 계산합니다.
5. 13 allocations, 11 copy operations, 12,533,760 bytes가 각각 어떤 growth/result-copy 단계에서 발생하는지 기록합니다.
6. line checksum이 caller-visible result의 정확성을 어떻게 확인하는지 expected value와 계산 함수를 찾습니다.
7. wall-clock 결과가 assertion에 들어가지 않고 informational output에만 쓰이는지 확인합니다.
8. manifest mismatch가 어떤 failure message와 exit status를 만드는지 확인합니다.

#### Test commit 학습 기록

| 구분 | 해당 SHA에서 기록할 내용 |
| --- | --- |
| **Production invariant** | geometric growth, direct tail read, persistent `scan`이 하나의 4 MiB EOF-tail에서 per-chunk append copy와 repeated full scan 없이 진행된다는 구조적 기준입니다. |
| **Failure / boundary** | newline이 전혀 없는 매우 긴 record는 매 chunk마다 전체 buffer를 복사하거나 처음부터 재검색하는 회귀를 가장 크게 드러냅니다. |
| **Test technique** | Makefile이 production을 `metric_malloc`, `metric_free`, `metric_read`, `BLR_COPY_OBSERVER=metric_copy_observer`로 다시 컴파일하고, output manifest를 `diff -u`로 비교하는 deterministic operation counting입니다. |
| **Production path** | 4 MiB fixture → explicit context create → reserve/direct read/scan 반복 → EOF → final result allocation/copy → FNV-1a checksum → counters 출력 → manifest diff입니다. |
| **증명하는 것** | 이 입력과 ABI/configuration에서 read·allocation·copy 수와 result checksum이 기준과 같음을 증명합니다. |
| **증명하지 않는 것** | 모든 입력 크기의 수학적 상한, zero-copy, 실제 latency 상한, thread safety는 증명하지 않습니다. allocation bytes에는 `sizeof(t_blr_reader)`가 들어가므로 ABI 변화에도 민감합니다. |
| **분류** | wall-clock 대신 재현 가능한 구조적 작업량을 고정한 deterministic performance regression입니다. |
| **막는 회귀** | linear growth는 allocation/copy 수·bytes를, scratch append-copy 재도입은 copy count/bytes를, repeated scan은 해당 observer가 직접 scan을 세지는 않지만 전체 구조와 wall output/후속 설계 검토에서 드러납니다. manifest는 주로 read/allocation/copy 회귀를 직접 고정합니다. |

#### 고정 수치 재구성

| Metric | Source 기준 | 해당 SHA의 counter 증가 지점 | 직접 계산한 이유 |
| --- | ---: | --- | --- |
| reads | 1025 | `metric_read`가 production의 data/EOF read마다 증가 | 4,194,304 / 4,096 = 1,024 data reads와 EOF 확인 1회입니다. zero-length descriptor probe의 계수 여부는 metric wrapper 구현에서 별도로 다루며 manifest의 data path 합계는 1025입니다. |
| allocations | 13 | `metric_malloc`: context, buffer growth, final line | context 1회 + capacities 8,192부터 8,388,608까지 11회 + 4,194,305-byte caller line 1회입니다. |
| copy operations | 11 | production `copy_bytes`가 length > 0일 때 `BLR_COPY_OBSERVER` 호출 | 11번의 growth 중 최초 8,192 allocation은 old length 0이라 관찰되지 않습니다. 이후 growth copy 10회와 final result copy 1회입니다. |
| copied bytes | 12,533,760 | `metric_copy_observer(length)` 누적 | growth 길이 `4096+12288+28672+61440+126976+258048+520192+1044480+2093056+4190208 = 8,339,456`; final 4,194,304를 더하면 12,533,760입니다. |
| line checksum | `790796585941148453` | `tests/metrics/test_metrics.c`의 caller-visible line FNV-1a 계산 | manifest가 길이 4,194,304와 checksum을 함께 비교해 작업량만 맞고 내용이 틀린 구현을 거부합니다. |

allocation byte 합계 `20,963,393`은 buffer capacities 합, final line allocation, 측정 ABI의 context object 크기를 포함합니다. wall-clock은 stderr 정보로만 출력되고 `tests/manifests/metrics-4mib.txt`에 없으므로 pass/fail 조건이 아닙니다. `metrics` target은 실제 output을 파일에 쓰고 `diff`가 다르면 nonzero로 종료합니다.

**실행 상태**

- 예상 명령: `make metrics` at `a0654d9de446`.
- **미실행:** 이 작업 환경에서는 해당 SHA의 checkout을 로컬에 구성하지 못해 binary 실행 및 manifest diff를 수행하지 않았습니다.
- 위 수치는 `Makefile`, `tests/metrics/*`, manifest, 해당 SHA의 production code를 대조해 재구성한 code-inspection 결과입니다.

## 6. Invariant ledger

| Invariant | 최초로 확인할 commit | 강화 또는 표현 변경 | 검증 commit | 학습자가 남길 코드 근거 |
| --- | --- | --- | --- | --- |
| trailing newline이 없는 nonempty EOF suffix도 data로 반환합니다. | `85e4c2a41a4c` | `39a2b9055728`에서 line sequence의 마지막 record로 통합됩니다. | `656528529ade` | `length != 0`/`unread_length()!=0` EOF branch와 unterminated boundary fixtures. |
| caller-visible line은 internal mutable buffer와 독립된 allocation입니다. | `85e4c2a41a4c` | `39a2b9055728`에서 record 단위 copy-out으로 사용됩니다. | `656528529ade` | 초기 SHA는 buffer ownership transfer로 독립성을 얻고, 39a는 `malloc+copy`; test는 first result 유지와 pointer inequality를 확인합니다. |
| consumed prefix와 unread suffix를 index로 구분합니다. | `7e64d3d79ad4` | `39a2b9055728`에서 `scan`과 one-record consumption으로 확장됩니다. | `656528529ade` | `unread_length=end-begin`, extraction의 `begin=line_end`, adjacent line fixture. |
| reserve failure는 old unread interval을 부분 교체하지 않습니다. | `7e64d3d79ad4` | `dbf1abd21121`에서 reserve-before-direct-read 순서로 유지됩니다. | 해당 failure test는 다른 Thread의 commit과 연결해 확인 | allocation 전 state와 `malloc` 성공 뒤 old free 순서; `fd03a831686b` fault harness는 legacy cleanup까지 검증합니다. |
| read chunk boundary는 logical record boundary가 아닙니다. | `39a2b9055728` | 여러 `BUFFER_SIZE`와 pipe input에서 검증됩니다. | `656528529ade` | persistent `[begin,scan,end)`와 size matrix의 동일 expected lines. |
| 이미 scan한 bytes를 반복해 전체 검색하지 않습니다. | `39a2b9055728` | direct tail read와 함께 대용량 operation count로 간접 고정됩니다. | `a0654d9de446` | `find_line_end`가 current `scan`부터 시작하고 no-delimiter 시 `scan=end`; metric은 대용량 구조 회귀를 감시합니다. |
| per-read scratch append-copy가 없습니다. | `dbf1abd21121` | 구조적 copy count로 회귀를 감시합니다. | `a0654d9de446` | `read(..., bytes+end, ...)`와 11-copy manifest. |

## 7. Failure → Fix → Test 연결

이 Thread에는 subject가 `fix`인 commit이 없습니다. 대신 초기 위험을 representation·parser·performance refactor로 제거하고 test가 이를 고정하는 흐름을 기록합니다.

| 기존 상태 또는 위험 | Source에서 확정된 원인 | 설계/변경 commit | 검증 commit | 실제 failure path와 assertion |
| --- | --- | --- | --- | --- |
| newline 없는 마지막 bytes를 버릴 위험 | EOF를 record content와 구분하지 못함 | `85e4c2a41a4c` | `656528529ade` | EOF에서 nonempty length/unread를 result로 이전하며 tests는 newline 없는 body와 EOF `NULL` 순서를 확인합니다. |
| 반환한 prefix와 남은 suffix를 한 length로 관리 | 소비 위치와 allocation capacity가 같은 개념으로 묶임 | `7e64d3d79ad4` | `656528529ade` | `[begin,end)`와 compaction/growth가 suffix를 보존하고 adjacent-line expected sequence가 손실을 검출합니다. |
| whole stream을 한 record로 반환 | persistent delimiter scan과 prefix retirement가 없음 | `39a2b9055728` | `656528529ade` | `find_line_end` + `extract_line`; multiple/empty lines fixtures가 한 call 한 record와 newline retention을 확인합니다. |
| 매 read마다 scratch → internal append copy | system call destination과 persistent storage가 분리됨 | `dbf1abd21121` | `a0654d9de446` | direct tail destination으로 변경하고 metric copy observer가 scratch copy 재도입 시 count/bytes 증가를 검출합니다. |
| wall-clock만으로 performance를 판단 | scheduling과 machine load 때문에 재현성이 낮음 | `a0654d9de446` | 같은 commit의 manifest | wall time은 assertion에서 제외하고 read/allocation/copy/checksum의 exact manifest를 `diff`합니다. |

## 8. Ownership / state / responsibility 변화

| 단계 | Internal allocation owner | Caller result owner | Active state 표현 | read 책임 | extraction 책임 |
| --- | --- | --- | --- | --- | --- |
| `85e4c2a41a4c` | 읽는 동안 `g_reader`; EOF nonempty에서 pointer를 넘길 때 ownership 종료 | `release_final_line` 반환 이후 caller | append-only `length/capacity` accumulator | `get_next_line`이 stack scratch로 반복 read | EOF에서 internal allocation 자체를 이전 |
| `7e64d3d79ad4` | 여전히 `g_reader` | EOF transfer 이후 caller | unread `[begin, end)` window | stack scratch → `append_bytes` | 아직 line split 없음 |
| `39a2b9055728` | singleton allocation; record extraction 후 suffix가 있으면 유지 | 각 newline result allocation과 EOF-transferred tail | `begin/scan/end` 기반 record state | stack scratch read와 append | `find_line_end` + `extract_line`, EOF `release_final_line` |
| `dbf1abd21121` | descriptor node가 buffer 소유 | newline result 또는 EOF tail caller | 같은 window 유지 | reserved tail로 direct read | 기존 의미 유지 |
| `a0654d9de446` | production 변화 없음; metric wrappers가 획득·해제를 관찰 | production 변화 없음 | operation hooks로 관찰 | `metric_read` call/byte count 측정 | `copy_bytes` observer와 final checksum 측정 |

## 9. Thread 최종 상태

Source 기준으로 이 Thread가 끝났을 때 다음이 확립되어 있습니다.

- whole-stream accumulator가 unread-window 기반 one-line streaming parser로 바뀌었습니다.
- newline이 있으면 result에 포함하며, 다음 record의 bytes는 internal suffix로 남습니다.
- EOF의 nonempty unterminated suffix는 final line으로 반환됩니다.
- parser behavior는 여러 `BUFFER_SIZE`와 어려운 descriptor/input boundary에서 검증됩니다.
- read는 reserved internal tail로 직접 수행됩니다.
- 4 MiB workload의 structural operation count가 manifest로 고정됩니다.

### 학습자가 작성할 최종 상태 설명

- **최종 state fields와 각 의미:** `fd`는 borrowed descriptor number, `bytes`는 context/node-owned allocation, `begin`은 unread 시작, `scan`은 다음 검사 위치, `end`는 valid byte exclusive end, `capacity`는 allocation 크기, 후속 context engine 시점의 `reached_eof`는 terminal EOF 기억, `next`는 legacy list link입니다.
- **한 line을 반환할 때 commit되는 mutation:** `find_line_end`가 exclusive end를 찾고 result allocation/copy/NUL이 성공한 뒤 `begin=line_end`, `scan=begin`을 commit합니다. `[begin,end)`의 다음 bytes는 남습니다.
- **EOF tail을 반환할 때 commit되는 mutation:** EOF flag를 세우고 unread nonempty이면 `extract_line(reader,end)`로 별도 caller allocation을 만든 뒤 `begin=scan=end`가 됩니다. 다음 call은 EOF입니다. 초기 SHA의 direct transfer와 최종 context copy를 구분했습니다.
- **reserve/read/result allocation failure에서 유지되는 state:** reserve growth는 새 allocation 성공 전 old interval을 유지합니다. 최종 explicit engine에서는 read error와 result allocation failure도 logical unread를 유지하고 scan을 begin으로 복구합니다. 그러나 `39a2b9055728`와 `dbf1abd21121`의 legacy path는 실패 시 node를 폐기했으므로 시점별 차이가 있습니다.
- **이 Thread가 다루지 않고 이후 Thread로 넘기는 범위:** descriptor별 hidden state isolation, caller-controlled context lifecycle, explicit result enum, `EINTR`/`EAGAIN` semantics와 retry는 다른 Thread에서 확립됩니다.

## 10. 최종 architecture 또는 execution flow 정리

해당 SHA의 실제 symbol로 아래 흐름을 완성합니다. final HEAD symbol을 대신 넣지 않습니다.

```text
public reader call
    → [find_line_end / reader->scan < reader->end]
        → found: [extract_line의 malloc, copy_bytes, NUL]
        → [reader->begin = line_end; reader->scan = reader->begin]
        → caller-owned line 반환
    → not found: [reserve_bytes(reader, BUFFER_SIZE)]
        → [tail reuse / compact_bytes / geometric allocation]
        → read into [reader->bytes + reader->end]
        → positive read: [end += read_size; bytes[end] = '\0'] 후 재검색
        → EOF + unread bytes: [해당 시점 release_final_line 또는 context의 extract_line(end)]
        → EOF + no unread bytes: completion
        → failure: [historical legacy는 discard, 최종 explicit context는 state 보존]
```

### 코드 근거가 포함된 최종 설명

1. **Entry와 state 접근:** 초기에는 `g_reader`, descriptor-state 이후에는 `find_reader(fd)`가 선택한 `t_reader`, explicit API 이후에는 caller가 넘긴 `t_blr_reader`가 state owner입니다.
2. **Scan 범위와 delimiter 판정:** `find_line_end`는 `[scan,end)`만 검사하고 newline을 발견하면 `scan`을 newline 다음으로 증가시켜 exclusive `line_end`를 반환합니다.
3. **Reserve branch와 overflow 방어:** `appended > SIZE_MAX - unread_length - 1`을 먼저 검사하며, tail reuse → compact → geometric grow 순으로 선택합니다. growth는 `malloc` 성공 뒤에만 old allocation을 교체합니다.
4. **Direct read와 index mutation:** `dbf1abd21121`부터 reserve 뒤 `bytes+end`로 읽고 positive actual count만 `end`에 더한 뒤 sentinel을 복구합니다.
5. **Line extraction과 suffix preservation:** caller result가 준비된 뒤 `begin=line_end`, `scan=begin`; `end`는 유지되므로 뒤 bytes가 다음 call의 unread suffix입니다.
6. **EOF tail과 stable completion:** 초기 legacy는 nonempty tail allocation을 이전하고 state를 제거합니다. explicit engine은 `reached_eof`를 기록하고 tail을 copy-out한 뒤 repeated `BLR_EOF`를 반환합니다.
7. **Operation count가 bounded되는 이유:** capacity가 geometric하게 증가하고, scan은 이미 검사한 bytes를 건너뛰며, read가 persistent tail로 직접 들어갑니다. 따라서 4 MiB case의 read 1025·allocation 13·copy 11/12,533,760 bytes 기준이 유지됩니다.

## 11. 학습 완료 자가 점검

- [x] `85e4c2a41a4c`가 finished line parser가 아닌 이유를 실제 코드로 보였습니다.
- [x] `[begin, end)`와 allocation capacity를 혼동하지 않습니다.
- [x] `scan`이 반복 full-buffer scan을 피하는 방법을 index trace로 설명할 수 있습니다.
- [x] newline 포함 result length와 NUL termination 위치를 코드로 확인했습니다.
- [x] one successful call이 다음 line의 byte를 소비하지 않는다는 근거가 있습니다.
- [x] empty stream과 empty line과 unterminated tail을 구분할 수 있습니다.
- [x] reserve failure 시 old allocation이 유지되는 mutation 순서를 확인했습니다.
- [x] scratch-buffer 제거 전후의 copy path를 실제 diff로 비교했습니다.
- [x] 1025/13/11/12,533,760 수치를 counter 위치로 재구성했습니다.
- [x] 이 Thread의 behavior를 final HEAD 없이 각 SHA 기준으로 설명할 수 있습니다.
