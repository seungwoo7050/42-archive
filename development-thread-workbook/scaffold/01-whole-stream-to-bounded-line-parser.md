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
| accumulation state 정의와 초기화 |  |  |
| geometric capacity 계산과 overflow 방어 |  |  |
| old allocation을 보존하는 replacement 순서 |  |  |
| read progress / EOF / error 분기 |  |  |
| caller-visible result allocation·copy·NUL 종료 |  |  |
| failure 및 EOF cleanup |  |  |

#### 학습자가 복원할 결정과 한계

- **해결하려던 문제:** 여러 `read`에 걸친 bytes와 newline 없는 EOF tail을 잃지 않고 반환해야 했던 이유를 코드 근거로 작성합니다.
- **기존 설계가 충분하지 않았던 이유:** public contract만으로는 persistent bytes, growth, failure rollback을 제공할 수 없었던 지점을 적습니다.
- **선택한 결정:** geometric growth와 copy-out ownership이 어떤 lifetime 문제를 피하는지 설명합니다.
- **이 commit이 보장하는 것:** empty input, EOF tail, chunk spanning, invalid descriptor에 대해 실제 보장 범위를 작성합니다.
- **아직 보장하지 않는 것:** embedded newline을 한 줄씩 분리하지 않는 코드 근거를 남깁니다.
- **다음 commit과의 연결:** append-only active length가 왜 `7e64d3d79ad4`의 unread interval로 바뀌어야 하는지 작성합니다.
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
| 소비 완료 prefix |  |  |  |  |
| unread bytes |  |  |  |  |
| append 가능한 tail |  |  |  |  |
| allocation 전체 크기 |  |  |  |  |
| NUL sentinel |  |  |  |  |

#### Reserve branch별 코드 근거

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| tail 재사용 branch |  |  |
| unread suffix compaction branch |  |  |
| geometric growth branch |  |  |
| capacity arithmetic overflow branch |  |  |
| allocation failure rollback branch |  |  |
| NUL sentinel 복구 지점 |  |  |

#### Ownership·failure 분석

- 기존 allocation의 owner와 새 allocation의 임시 owner가 교체 전후로 누구인지 단계별로 작성합니다.
- compaction은 allocation ownership을 바꾸지 않지만 byte 위치를 바꿉니다. 겹치는 copy를 어떤 primitive로 처리하는지 확인합니다.
- growth failure가 non-destructive라는 결론을 return path와 실제 mutation 순서로 입증합니다.
- source가 최종 invariant로 제시한 `0 <= begin <= scan <= end < capacity` 중 이 SHA에서 실제로 존재하는 필드만 기록하고, 아직 도입되지 않은 `scan`을 소급하지 않습니다.

#### 이 commit의 보장과 다음 연결

- **보장:** unread bytes와 consumed prefix를 분리하고 reserve가 tail reuse, compaction, growth를 선택할 수 있는 기반을 작성합니다.
- **보장하지 않는 것:** one-line extraction과 persistent scan cursor가 아직 없는지 확인합니다.
- **다음 연결:** `39a2b9055728`이 이 interval의 어느 prefix를 result로 만들고 어느 suffix를 남기는지 예측한 뒤 실제 코드로 검증합니다.
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
| newline이 read 경계 앞에 있음 |  |  |  |  |  |
| 한 read에 두 line이 들어옴 |  |  |  |  |  |
| newline 없는 EOF tail |  |  |  |  |  |

#### 코드 근거 기록

| 확인 대상 | 해당 SHA에서 남길 근거 | 학습자가 정리할 결론 |
| --- | --- | --- |
| newline scan 시작/종료 조건 |  |  |
| delimiter 포함 result length 계산 |  |  |
| result allocation·copy·NUL termination |  |  |
| 성공 후 `begin` commit |  |  |
| 성공 후 `scan` 재설정 또는 보정 |  |  |
| EOF tail 반환과 이후 completion |  |  |

#### Failure와 아직 남은 범위

- result allocation이 실패할 때 이 SHA의 `begin`과 `scan`이 실제로 보존되는지 확인합니다. 이후 `9bd6ebf429e2`에서 transactional extraction이 명시적으로 강화되므로 final behavior를 이 SHA에 소급하지 않습니다.
- read error와 EOF가 같은 cleanup을 사용하는지, unread bytes가 있는 상태에서 각각 어떤 결과가 되는지 기록합니다.
- 이 commit이 descriptor별 state isolation이나 explicit result taxonomy를 아직 제공하지 않는다는 코드 근거를 남깁니다.

#### 이 commit이 보장하는 것

- 한 successful call이 소비하는 logical record의 범위를 실제 코드로 정의합니다.
- newline retention, suffix preservation, final unterminated tail의 순서를 작성합니다.
- kernel chunk boundary와 logical record boundary가 분리되는 이유를 caller → scan → extract → next call 순서로 설명합니다.
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
| **Production invariant** | 한 call은 정확히 한 line을 반환하고 suffix를 보존하며, 결과 allocation은 internal buffer와 독립적이라는 invariant를 실제 assertion과 연결합니다. |
| **Failure / boundary** | `BUFFER_SIZE`보다 짧거나 긴 record, delimiter가 경계에 있는 경우, empty/repeated newline, EOF tail, high fd, pipe, repeated EOF를 구분합니다. |
| **Test technique** | 여러 compile-time configuration을 반복하는 behavioral matrix인지, 각 configuration이 별도 object/archive를 사용하는지 기록합니다. |
| **Production path** | fixture 생성 → descriptor open/pipe → public reader call → scan/extract/read path → cleanup 순서를 해당 SHA symbol로 적습니다. |
| **증명하는 것** | read partition이 달라도 caller-visible line sequence와 ownership이 동일하다는 근거를 작성합니다. |
| **증명하지 않는 것** | fault injection, `EINTR`/`EAGAIN`, explicit context result taxonomy, algorithmic operation count는 이 test만으로 증명되지 않음을 확인합니다. |
| **분류** | 여러 환경과 edge case를 포괄하는 broad boundary regression으로 분류하고 근거를 적습니다. |
| **막는 회귀** | delimiter alignment 의존, suffix 손실, internal buffer alias, reader가 fd를 닫는 동작, unstable EOF를 각각 어떤 assertion이 막는지 기록합니다. |

#### 결과 기록

| `BUFFER_SIZE` | 실행 명령 | 통과/실패 | 실패 시 최초 assertion | 확인한 production path |
| ---: | --- | --- | --- | --- |
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| default |  |  |  |  |
| large |  |  |  |  |
### 5.5 `dbf1abd21121` — `refactor(buffer): 남은 입력 버퍼를 읽기 공간으로 재사용`

- **Commit:** `dbf1abd21121`
- **Subject:** `refactor(buffer): 남은 입력 버퍼를 읽기 공간으로 재사용`
- **Importance:** **A**
- **Tags:** `PERF`, `LINE_STATE`, `REFACTOR`

#### Source에서 확정된 역할

기존 stack scratch buffer에 `read`한 뒤 internal buffer로 append-copy하던 경로를 제거합니다. reserve가 확보한 internal unread buffer의 tail을 system call destination으로 직접 사용하고, positive read만큼 `end`를 늘린 뒤 NUL sentinel을 복구합니다.

#### 변경 전후 비교

- **변경 전:** `read` destination, scratch storage의 lifetime, append helper, 추가 copy 지점을 직전 관련 code에서 찾습니다.
- **변경 후:** reserve 요청 크기, `bytes + end` 형태의 destination, `end` mutation, sentinel write를 해당 SHA에서 찾습니다.
- 함수명은 final HEAD에서 가져오지 않고 두 SHA의 실제 symbol을 각각 기록합니다.

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
| 변경 전 scratch-buffer read |  |  |
| 변경 전 append copy |  |  |
| 변경 후 reserve-before-read |  |  |
| 변경 후 direct tail destination |  |  |
| positive read 뒤 `end` mutation |  |  |
| NUL sentinel 복구 |  |  |
| reserve/read failure에서 unread interval 유지 |  |  |

#### 성능 결정과 invariant

- 제거된 copy가 매 successful read마다 발생했는지 실제 caller path로 계산합니다.
- direct tail read가 zero-copy 전체 구현을 의미하지 않는 이유를 growth copy와 caller result copy로 구분합니다.
- reserve failure가 기존 unread bytes를 보존하고, read error가 이미 존재하던 bytes를 어떻게 다루는지 이 SHA 범위에서 기록합니다.
- observable line semantics가 바뀌지 않았음을 `656528529ade` test matrix와 연결해 설명합니다.
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
| **Production invariant** | geometric growth, direct tail read, persistent scan cursor가 대용량 unterminated record에서 bounded structural work를 만든다는 invariant를 연결합니다. |
| **Failure / boundary** | 하나의 매우 긴 EOF tail이 linear growth, per-chunk append copy, repeated full-buffer scan을 유발할 수 있는 경계를 설명합니다. |
| **Test technique** | fault/perf hook 기반 deterministic operation counting과 checksum manifest를 구분해 기록합니다. |
| **Production path** | fixture → repeated reserve/read/scan → EOF-tail result allocation → checksum → counter comparison 순서를 실제 symbol로 적습니다. |
| **증명하는 것** | 정해진 input/configuration에서 구조적 read/allocation/copy 횟수가 기준을 넘지 않고 result가 정확하다는 점을 작성합니다. |
| **증명하지 않는 것** | zero-copy, 모든 입력 크기의 asymptotic proof, thread safety, 실제 latency 상한은 증명하지 않음을 기록합니다. |
| **분류** | 재현 가능한 deterministic performance regression test로 분류합니다. |
| **막는 회귀** | linear-capacity expansion, scratch append-copy 재도입, repeated scan이 각각 어떤 counter를 증가시키는지 연결합니다. |

#### 고정 수치 재구성

| Metric | Source 기준 | 해당 SHA의 counter 증가 지점 | 직접 계산한 이유 |
| --- | ---: | --- | --- |
| reads | 1025 |  |  |
| allocations | 13 |  |  |
| copy operations | 11 |  |  |
| copied bytes | 12,533,760 |  |  |
| line checksum | source manifest에서 확인 |  |  |

## 6. Invariant ledger

| Invariant | 최초로 확인할 commit | 강화 또는 표현 변경 | 검증 commit | 학습자가 남길 코드 근거 |
| --- | --- | --- | --- | --- |
| trailing newline이 없는 nonempty EOF suffix도 data로 반환합니다. | `85e4c2a41a4c` | `39a2b9055728`에서 line sequence의 마지막 record로 통합됩니다. | `656528529ade` |  |
| caller-visible line은 internal mutable buffer와 독립된 allocation입니다. | `85e4c2a41a4c` | `39a2b9055728`에서 record 단위 copy-out으로 사용됩니다. | `656528529ade` |  |
| consumed prefix와 unread suffix를 index로 구분합니다. | `7e64d3d79ad4` | `39a2b9055728`에서 `scan`과 one-record consumption으로 확장됩니다. | `656528529ade` |  |
| reserve failure는 old unread interval을 부분 교체하지 않습니다. | `7e64d3d79ad4` | `dbf1abd21121`에서 reserve-before-direct-read 순서로 유지됩니다. | 해당 failure test는 다른 Thread의 commit과 연결해 확인 |  |
| read chunk boundary는 logical record boundary가 아닙니다. | `39a2b9055728` | 여러 `BUFFER_SIZE`와 pipe input에서 검증됩니다. | `656528529ade` |  |
| 이미 scan한 bytes를 반복해 전체 검색하지 않습니다. | `39a2b9055728` | direct tail read와 함께 대용량 operation count로 간접 고정됩니다. | `a0654d9de446` |  |
| per-read scratch append-copy가 없습니다. | `dbf1abd21121` | 구조적 copy count로 회귀를 감시합니다. | `a0654d9de446` |  |

## 7. Failure → Fix → Test 연결

이 Thread에는 subject가 `fix`인 commit이 없습니다. 대신 초기 위험을 representation·parser·performance refactor로 제거하고 test가 이를 고정하는 흐름을 기록합니다.

| 기존 상태 또는 위험 | Source에서 확정된 원인 | 설계/변경 commit | 검증 commit | 실제 failure path와 assertion |
| --- | --- | --- | --- | --- |
| newline 없는 마지막 bytes를 버릴 위험 | EOF를 record content와 구분하지 못함 | `85e4c2a41a4c` | `656528529ade` |  |
| 반환한 prefix와 남은 suffix를 한 length로 관리 | 소비 위치와 allocation capacity가 같은 개념으로 묶임 | `7e64d3d79ad4` | `656528529ade` |  |
| whole stream을 한 record로 반환 | persistent delimiter scan과 prefix retirement가 없음 | `39a2b9055728` | `656528529ade` |  |
| 매 read마다 scratch → internal append copy | system call destination과 persistent storage가 분리됨 | `dbf1abd21121` | `a0654d9de446` |  |
| wall-clock만으로 performance를 판단 | scheduling과 machine load 때문에 재현성이 낮음 | `a0654d9de446` | 같은 commit의 manifest |  |

## 8. Ownership / state / responsibility 변화

| 단계 | Internal allocation owner | Caller result owner | Active state 표현 | read 책임 | extraction 책임 |
| --- | --- | --- | --- | --- | --- |
| `85e4c2a41a4c` |  |  | append-only accumulator |  | EOF copy-out |
| `7e64d3d79ad4` |  |  | unread `[begin, end)` window |  | 아직 line split 없음 |
| `39a2b9055728` |  |  | `begin/scan/end` 기반 record state |  | newline/EOF-tail extraction |
| `dbf1abd21121` |  |  | 같은 window 유지 | reserved tail로 direct read | 기존 의미 유지 |
| `a0654d9de446` | production 변화 없음 | production 변화 없음 | operation hooks로 관찰 | call count 측정 | final copy count 측정 |

## 9. Thread 최종 상태

Source 기준으로 이 Thread가 끝났을 때 다음이 확립되어 있습니다.

- whole-stream accumulator가 unread-window 기반 one-line streaming parser로 바뀌었습니다.
- newline이 있으면 result에 포함하며, 다음 record의 bytes는 internal suffix로 남습니다.
- EOF의 nonempty unterminated suffix는 final line으로 반환됩니다.
- parser behavior는 여러 `BUFFER_SIZE`와 어려운 descriptor/input boundary에서 검증됩니다.
- read는 reserved internal tail로 직접 수행됩니다.
- 4 MiB workload의 structural operation count가 manifest로 고정됩니다.

### 학습자가 작성할 최종 상태 설명

- **최종 state fields와 각 의미:**
- **한 line을 반환할 때 commit되는 mutation:**
- **EOF tail을 반환할 때 commit되는 mutation:**
- **reserve/read/result allocation failure에서 유지되는 state:**
- **이 Thread가 다루지 않고 이후 Thread로 넘기는 범위:**

## 10. 최종 architecture 또는 execution flow 정리

해당 SHA의 실제 symbol로 아래 흐름을 완성합니다. final HEAD symbol을 대신 넣지 않습니다.

```text
public reader call
    → [buffered newline 탐색 함수 / 조건]
        → found: [result allocation 및 copy]
        → [begin/scan commit]
        → caller-owned line 반환
    → not found: [tail capacity 확인]
        → [tail reuse / compaction / growth]
        → read into [actual destination]
        → positive read: [end/sentinel update] 후 재검색
        → EOF + unread bytes: [tail copy-out]
        → EOF + no unread bytes: completion
        → failure: [해당 SHA의 보존/정리 동작]
```

### 코드 근거가 포함된 최종 설명

1. **Entry와 state 접근:**
2. **Scan 범위와 delimiter 판정:**
3. **Reserve branch와 overflow 방어:**
4. **Direct read와 index mutation:**
5. **Line extraction과 suffix preservation:**
6. **EOF tail과 stable completion:**
7. **Operation count가 bounded되는 이유:**

## 11. 학습 완료 자가 점검

- [ ] `85e4c2a41a4c`가 finished line parser가 아닌 이유를 실제 코드로 보였습니다.
- [ ] `[begin, end)`와 allocation capacity를 혼동하지 않습니다.
- [ ] `scan`이 반복 full-buffer scan을 피하는 방법을 index trace로 설명할 수 있습니다.
- [ ] newline 포함 result length와 NUL termination 위치를 코드로 확인했습니다.
- [ ] one successful call이 다음 line의 byte를 소비하지 않는다는 근거가 있습니다.
- [ ] empty stream과 empty line과 unterminated tail을 구분할 수 있습니다.
- [ ] reserve failure 시 old allocation이 유지되는 mutation 순서를 확인했습니다.
- [ ] scratch-buffer 제거 전후의 copy path를 실제 diff로 비교했습니다.
- [ ] 1025/13/11/12,533,760 수치를 counter 위치로 재구성했습니다.
- [ ] 이 Thread의 behavior를 final HEAD 없이 각 SHA 기준으로 설명할 수 있습니다.
