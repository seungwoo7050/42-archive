# Thread: Hardening file-descriptor output against partial system calls

## Thread 목표

**Source significance**

> The initial public API cannot return status, so reliability has to be enforced internally and failure has to stop further composite output. The thread evolves from formatting correctness to a system-call progress invariant, then proves that invariant with a deterministic substitute for `write`.

### 이 Thread에 직접 연결된 source invariant

> File-descriptor output advances after every positive short write, retries `EINTR`, treats zero progress as failure, and stops composite output after a permanent error.

### 이 Thread에 직접 연결된 engineering difficulties

> Preserving output progress across short system calls while fitting a public `void` descriptor API that cannot return an error status.

> Reproducing allocation and write failures deterministically without changing the production API.

## 이 Thread를 이해하기 위한 핵심 질문

- 초기 one-shot `write`가 어떤 failure/partial-success 상태를 처리하지 못하는가?
- public API가 `void`일 때 내부 helper는 failure를 어떻게 전달해 composite output을 멈추는가?
- positive short write 이후 offset/remaining state는 어떤 순서로 갱신되는가?
- `EINTR`, zero progress, permanent error는 각각 retry/stop 정책이 어떻게 다른가?
- number output refactor가 이후 공통 write path에 어떤 연결을 만드는가?
- deterministic scripted `write`가 실제 OS timing에 의존하지 않고 retry sequence를 어떻게 증명하는가?

## 완료 기준

- `26509fd54c3d`의 one-shot policy와 `3f2bfbf11e1f`의 write-until-complete policy를 실제 코드로 비교했습니다.
- short write 후 progress state, `EINTR` retry, zero-progress failure, permanent-error stop을 순서대로 추적했습니다.
- sign/prefix 또는 앞선 component failure 뒤 후속 출력이 중지되는 control flow를 확인했습니다.
- `b013c926ceb5`에서 scripted return/error sequence와 production call sequence가 1:1로 연결되는지 확인했습니다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags | Source role |
| --- | --- | --- | --- | --- | --- |
| 1 | `26509fd54c3d` | `feat(io): 파일 디스크립터 출력 함수 추가` | B | FD_OUTPUT, CORE | Adds the initial void-returning descriptor API and one-shot writes. |
| 2 | `60c35f2fb431` | `test(io): 파일 디스크립터 출력 검증` | B | FD_OUTPUT, TEST | Captures normal bytes and establishes the initial invalid-descriptor and broken-pipe observations. |
| 3 | `1077556d1c4b` | `refactor(io): 숫자 출력을 자릿수 helper로 분리` | B | FD_OUTPUT, REFACTOR | Routes integer digits through the common character-output path. |
| 4 | `3f2bfbf11e1f` | `fix(io): 파일 디스크립터 출력을 끝까지 재시도` | S | FD_OUTPUT, CORE, RISK | Introduces write-until-complete behavior, `EINTR` retry, zero-progress rejection, and permanent-error stopping. |
| 5 | `b013c926ceb5` | `test(io): 부분 쓰기와 EINTR 이후 진행을 검증` | A | FD_OUTPUT, TEST, RISK | Replaces nondeterministic operating-system timing with scripted write results and verifies the exact retry sequence. |

## Commit별 학습 기록

### `26509fd54c3d` — `feat(io): 파일 디스크립터 출력 함수 추가`

**Source 확정 역할:** arbitrary file descriptor를 대상으로 하는 initial void-returning output API를 one-shot writes로 도입합니다.

#### 해당 SHA에서 확인할 코드

- character, string, newline, signed-decimal descriptor helper의 public declarations와 implementations를 찾습니다.
- composite newline output이 string/character primitive를 어떤 순서로 재사용하는지 확인합니다.
- integer output이 fixed stack buffer를 만들고 한 번의 `write`로 제출하는 경로를 확인합니다.
- `write` 반환값을 버리는 지점을 찾고 public `void` API와 연결해 기록합니다.
- `INT_MIN` magnitude가 signed negation 없이 처리되는 코드를 확인합니다.
- short write 또는 `EINTR` 이후 남은 byte를 재시도하는 loop가 없는지 확인합니다.

#### 학습 기록

- public API contract:
- normal formatting path:
- `write` 호출 단위:
- error observation 수단:
- short write에서 아직 보장하지 않는 것:
- `EINTR`에서 아직 보장하지 않는 것:
- composite output의 failure continuation 가능성:

### `60c35f2fb431` — `test(io): 파일 디스크립터 출력 검증`

**Source 확정 역할:** pipe capture로 정상 byte sequence를 확인하고, invalid closed descriptor와 suppressed `SIGPIPE` 아래 broken pipe의 초기 observable behavior를 기록합니다.

#### Test commit 학습

- production invariant/contract 대상:
  - 정상 formatting과 ordering:
  - invalid descriptor control return:
  - broken pipe에서 `EPIPE` 관찰:
- test technique:
  - pipe capture 구성 지점을 찾습니다.
  - `SIGPIPE` suppression과 `errno` 관찰 위치를 찾습니다.
- 실제 production code path:
  - 네 output helper 각각 어떤 write path를 통과하는지 기록합니다.
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
  - source상 partial write / interrupted write completion은 아직 증명하지 않습니다. 실제 test code가 이를 주입하지 않는지 확인합니다.
- 테스트 성격:
  - [ ] broad integration
  - [ ] deterministic regression
  - [ ] ordinary pipe/error observation
  - 선택 근거:
- 다음 refactor/fix와 연결:

### `1077556d1c4b` — `refactor(io): 숫자 출력을 자릿수 helper로 분리`

**Source 확정 역할:** signed-decimal output을 sign handling + recursive unsigned digit emitter로 분리하고 각 digit을 공통 character-output primitive로 보냅니다.

#### 해당 SHA에서 확인할 코드

- 이전 `26509fd54c3d`의 fixed decimal buffer 경로와 이 SHA의 구현을 비교합니다.
- sign handling과 unsigned magnitude 계산을 찾습니다.
- recursive digit emitter의 base/recursive case를 실제 코드에서 기록합니다.
- 각 digit이 어떤 common character-output path를 통과하는지 caller/callee를 추적합니다.
- public behavior가 아직 short-write reliability를 보장하도록 바뀐 것이 아닌지 source role과 실제 코드로 구분합니다.
- one-byte writes 증가라는 trade-off가 구현상 어떻게 나타나는지 확인합니다.

#### 학습 기록

- 변경 전 number-output path:
- 변경 후 path:
- 공통 emission boundary:
- public behavior 유지 근거:
- 다음 fix가 이 구조를 이용할 수 있는 지점:

### `3f2bfbf11e1f` — `fix(io): 파일 디스크립터 출력을 끝까지 재시도`

**Source 확정 역할:** positive short write progress 보존, `EINTR` retry, zero progress rejection, permanent-error stop을 포함하는 project-defining system-call invariant를 복구합니다.

#### 기존 가정 → 실제 failure 또는 위험

- 기존 one-shot assumption:
- positive short write에서 생기는 truncation:
- `EINTR`을 completion으로 취급할 때의 문제:
- 모든 error를 무조건 retry할 때의 문제:
- public `void` API가 직접 status를 돌려줄 수 없는 제약:

#### 해당 SHA에서 확인할 실제 핵심 코드

- private `write_all` 또는 source가 설명한 completion helper를 찾습니다.
- 한 번의 request가 `SSIZE_MAX`를 넘지 않도록 제한하는 코드를 확인합니다.
- `write`가 양수를 반환했을 때 pointer/offset과 remaining byte count가 **반환된 수만큼만** 전진하는지 확인합니다.
- `write == -1`과 `errno == EINTR`인 branch가 progress를 중복 적용하지 않고 retry하는지 확인합니다.
- `write == 0`에서 `EIO`로 전환하고 종료하는 경로를 확인합니다.
- 다른 permanent error에서 즉시 stop하는 경로를 확인합니다.
- character/string/newline/integer helper가 새 completion path로 어떻게 route되는지 확인합니다.
- recursive number output에서 내부 failure status가 상위 호출로 어떻게 propagation되는지 추적합니다.
- sign emission 실패 후 digit emission이 중지되는지 확인합니다.
- composite newline 출력에서 앞 component failure 후 다음 write를 하지 않는지 확인합니다.

#### state transition 기록

| 상황 | 이전 remaining/progress | system call 결과 | 다음 state | retry/stop | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| positive full write | | | | | |
| positive short write | | | | | |
| `EINTR` | | | | | |
| zero progress | | | | | |
| permanent error | | | | | |

#### 수정된 invariant

- progress가 보존되는 조건:
- retry 가능한 유일한 error:
- zero progress 처리:
- composite stop 조건:
- public API가 `void`여도 내부적으로 확보되는 보장:

#### 후속 검증 연결

- ordinary pipe test로 결정적으로 만들기 어려운 scenario:
- `b013c926ceb5`가 scripted result로 고정해야 하는 순서:

### `b013c926ceb5` — `test(io): 부분 쓰기와 EINTR 이후 진행을 검증`

**Source 확정 역할:** deterministic scripted `write` 결과를 사용해 partial progress, interruption, zero, permanent error의 정확한 retry/stop sequence를 검증합니다.

#### Test commit 학습

- production invariant 대상:
  - positive short write 후 남은 byte만 재시도:
  - `EINTR` retry:
  - zero progress rejection:
  - permanent error 이후 composite stop:
- failure injection technique:
  - 실제 `write`를 substitute하는 test/build boundary를 찾습니다.
  - scripted return values와 `errno`를 저장/소비하는 state를 찾습니다.
  - production이 요청한 buffer pointer/length 또는 call count를 기록하는 instrumentation을 확인합니다.
- production path 추적:
  - short write → next request:
  - `EINTR` → same remaining range retry:
  - zero → `EIO`/stop:
  - hard error → no later component:
- exact retry sequence:
  - test script:
  - 예상 call sequence:
  - 실제 assertion:
- 테스트가 증명하는 것:
- 테스트가 증명하지 않는 것:
- 테스트 성격:
  - [ ] broad integration
  - [ ] deterministic regression
  - [ ] deterministic system-call failure injection
  - 선택 근거:
- 후속 변경에서 막아야 할 회귀:

## Invariant ledger

| 단계 | Commit | Source에 연결된 invariant 상태 | 실제 코드에서 확인한 근거 |
| --- | --- | --- | --- |
| initial API | `26509fd54c3d` | one-shot write, completion invariant 미확립 | |
| initial observation | `60c35f2fb431` | 정상 bytes와 기본 error observation만 검증 | |
| common path preparation | `1077556d1c4b` | number digits가 common character path를 사용 | |
| fix / invariant restoration | `3f2bfbf11e1f` | progress, `EINTR`, zero, permanent error 정책 확립 | |
| deterministic regression | `b013c926ceb5` | exact retry/stop sequence 강제 검증 | |

## Failure → Fix → Test 연결

- 기존 가정: one-shot `write`가 요청을 충분히 처리한다고 간주
- 실제 failure/위험: short write, `EINTR`, zero progress, permanent error 후 잘못된 continuation
- root cause:
- 구조 준비: `1077556d1c4b`
- fix: `3f2bfbf11e1f`
- 실제 수정 코드:
- regression test: `b013c926ceb5`
- failure injection script:
- 고정된 invariant:

## State / responsibility 변화

- 초기 public `void` API가 caller에게 제공하지 못하는 status:
- 내부 helper가 새로 맡는 completion responsibility:
- composite helper가 맡는 stop-on-error responsibility:
- test harness가 맡는 deterministic system-call boundary:

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
