# A single output state becomes a robust system-call boundary

## 1. Thread 목표

초기 local write/count 처리에서 출발해, 모든 conversion이 공유하는 `t_printf` 출력 상태와 최종 POSIX `write` 진행 정책이 어떤 commit을 거쳐 형성되는지 복원합니다.

### Source에서 확정된 significance

출력 계층은 편의성 helper에서 모든 conversion이 공유하는 상태 머신으로 발전합니다. count 범위, progress, interruption, permanent failure, system-call 비용, process signal policy가 명시되고 운영체제 타이밍에 의존하지 않는 방식으로 검증됩니다.

### 이 Thread에 명시적으로 연결되는 source invariant / engineering difficulty

- Invariant: 누적 count는 `INT_MAX`를 넘어 narrow/overflow하지 않습니다.
- Invariant: positive short write는 buffer를 전진시키고, `EINTR`는 retry하며, request는 `SSIZE_MAX`를 넘지 않고, non-retryable 또는 zero-byte result는 output을 error로 중단합니다.
- Invariant: library는 process의 `SIGPIPE` disposition을 바꾸지 않으며, 이미 OS가 받아들인 byte를 rollback할 수 없습니다.
- Engineering difficulty: partial write, interruption, zero progress, `EPIPE`, `SIGPIPE`를 처리하면서 process-wide signal policy까지 library가 소유하지 않는 경계를 유지하는 문제입니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 출력 descriptor, 누적 count, sticky error의 ownership은 언제 하나의 상태로 묶이는가?
- positive short write, `EINTR`, zero progress, permanent error는 각각 state와 buffer offset을 어떻게 바꾸는가?
- `ssize_t` 결과와 public `int` return count 사이의 범위 경계는 어디에서 보장되는가?
- wide padding 성능 개선은 공통 failure/count path를 우회하지 않고 어떻게 이루어지는가?
- `EPIPE`가 발생해도 library가 process-wide `SIGPIPE` policy를 소유하지 않는다는 사실은 코드와 테스트에서 어떻게 드러나는가?

## 3. 완료 기준

- `1d6a5cee3041`부터 `1223518652bd`까지 write state transition을 실제 함수와 branch로 설명할 수 있습니다.
- count overflow, short write, `EINTR`, zero return, `EPIPE` 각각에 대해 state 변화와 public return 결과를 구분할 수 있습니다.
- 64-byte padding chunk가 성능만 바꾸고 공통 output invariant는 바꾸지 않는다는 근거를 해당 SHA 코드와 테스트에서 제시할 수 있습니다.
- caller-owned `SIGPIPE` disposition과 library-owned error propagation의 경계를 설명할 수 있습니다.

## 4. Commit map

| SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- |
| `1d6a5cee3041` | feat(core): 리터럴과 퍼센트 출력 구현 | `B` | `CORE, OUTPUT` | Starts with a local write-and-count helper that rejects short writes. |
| `3f7b0ab926d0` | feat(output): 출력 컨텍스트와 쓰기 API 추가 | `S` | `ARCH, OUTPUT, CORE` | Introduces shared descriptor, count, and sticky-error state and resumes after positive short writes. |
| `78e5d25d7df6` | refactor(core): 리터럴 출력을 컨텍스트 API로 이관 | `B` | `OUTPUT, REFACTOR` | Migrates literal output to the shared context, eliminating duplicate accounting. |
| `c627bd1f85bb` | fix(output): 쓰기 결과를 집계하기 전에 범위 검증 | `A` | `OUTPUT, RISK, DEBUG` | Validates a wide `ssize_t` result before narrowing it into the public `int` count. |
| `8a3ec50cb689` | fix(output): 중단된 쓰기 재시도와 요청 크기 제한 | `S` | `OUTPUT, CORE, RISK` | Caps requests at `SSIZE_MAX`, retries `EINTR`, and creates a deterministic write seam. |
| `22e65c176b5d` | perf(output): 반복 채움을 묶어서 출력 | `A` | `OUTPUT, PERF` | Emits wide padding in bounded chunks rather than one system call per byte. |
| `1223518652bd` | test(output): 쓰기 실패 시퀀스와 채움 전략 검증 | `A` | `OUTPUT, TEST, RISK` | Scripts partial progress, interruption, zero writes, `EPIPE`, and verifies `SIGPIPE` and chunking policy. |

## 5. Commit별 학습 기록

> 원칙: 아래 기록은 final HEAD가 아니라 각 항목의 정확한 SHA에서 작성합니다. source가 확정하지 않은 파일명/함수명은 현재 골격에서 추측하지 않습니다.

## 5.1 `1d6a5cee3041` — feat(core): 리터럴과 퍼센트 출력 구현

- Importance: `B`
- Tags: `CORE, OUTPUT`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Starts with a local write-and-count helper that rejects short writes.
- Commit Classification summary: Creates the public entry point, archive, literal loop, percent escape, and initial counting.
- Importance 근거: This is necessary project bootstrap, but its one-byte writes and short-write rejection are an initial implementation later replaced by the defining output architecture.

### 학습 깊이
- 이 commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/code 변화에 집중합니다.
- 학습자 기록 — 직전 상태 대비 필요한 변화:
  - 이전 parent에는 이 library 구현이 없었고, 이 SHA에서 public `ft_printf`, archive build, literal/`%%` 출력의 최소 실행 경로가 처음 생겼습니다.
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - `src/ft_printf.c`의 `ft_printf`가 format cursor와 local `count`를 소유하고, `ft_write_count`가 fd 1 write와 누적 길이 검사를 함께 수행합니다.
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - literal과 escaped percent를 모두 한 byte씩 `ft_write_count`에 넘깁니다. helper는 `length <= 0`이면 no-op, 합계 범위를 먼저 검사하고, `write(1, ...)`가 정확히 요청 길이를 반환한 경우에만 count를 증가시킵니다.
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - positive short write를 실패로 처리하는 정책과 entry point에 붙어 있는 count/error 책임은 `3f7b0ab926d0`의 context API 및 `78e5d25d7df6`의 migration으로 대체됩니다.

### 해당 SHA에서 확인할 코드
- 해당 SHA에서 public `ft_printf` entry point와 local write/count helper의 실제 이름과 위치를 찾습니다.
- literal byte와 `%%`가 main format loop에서 어떤 branch를 거쳐 fd 1로 전달되는지 추적합니다.
- null format, `write` failure, count + requested length의 `INT_MAX` overflow check 순서를 실제 조건식으로 기록합니다.
- positive short write가 “일부 progress”가 아니라 failure로 판정되는 조건을 확인합니다.
- 직후 `3f7b0ab926d0`과 비교하여 descriptor/count/error 책임 중 무엇이 local implementation에서 context로 이동했는지 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_printf.c`: `ft_write_count`, `ft_printf`. `format == 0`은 `va_start` 전에 `-1`; `*format == '%' && *(format + 1) == '%'`이면 `%` 한 byte; 그 외에는 현재 literal 한 byte를 기록합니다.
  - `ft_write_count`: `*count > INT_MAX - length`, `written < 0 || written != length`가 실패 branch입니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 1d6a5cee3041, src/ft_printf.c, ft_write_count */
written = (int)write(1, buffer, (size_t)length);
if (written < 0 || written != length)
    return (-1);
*count += written;
```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - public formatter의 최소 골격을 만든 commit입니다. 다만 출력 상태는 local 변수와 helper에 흩어져 있고, 성공을 “요청 길이 전체가 한 번에 기록됨”으로 정의하므로 POSIX가 허용하는 short write를 진행 상태로 보존하지 못합니다.

## 5.2 `3f7b0ab926d0` — feat(output): 출력 컨텍스트와 쓰기 API 추가

- Importance: `S`
- Tags: `ARCH, OUTPUT, CORE`
- Most Important Commits 목록: 포함
- Thread 내 역할: Introduces shared descriptor, count, and sticky-error state and resumes after positive short writes.
- Commit Classification summary: Introduces a shared output context with descriptor, count, sticky error, and short-write progress.
- Importance 근거: This abstraction determines how every later formatter accounts for bytes and propagates failure. Removing it would leave a fundamental gap in the project's responsibility boundaries and output correctness story.

### 학습 깊이
- 이 commit은 architecture/invariant의 핵심으로 취급합니다.
- 학습자 기록 — 직전 상태:
  - `ft_printf`의 local `count`와 `ft_write_count`가 fd 1, count, 실패를 함께 다뤘고, 한 번의 short write도 즉시 실패했습니다.
- 학습자 기록 — 해결하려던 문제:
  - 이후 모든 conversion이 같은 descriptor/count/error 규칙을 써야 하며, positive short write 이후 아직 쓰지 못한 suffix를 계속 처리해야 했습니다.
- 학습자 기록 — 기존 설계가 충분하지 않았던 이유:
  - entry point 전용 helper에는 공유 가능한 sticky failure state가 없고, caller마다 count와 write 결과를 다시 처리하게 될 위험이 있었습니다.
- 학습자 기록 — 선택한 핵심 decision:
  - private `t_printf { fd, count, error }`와 `ft_printf_init`, `ft_printf_write`, `ft_printf_putchar`를 도입하고, `ft_printf_write`가 남은 buffer 전체를 처리하는 단일 loop를 소유하도록 했습니다.
- 학습자 기록 — ownership / lifecycle / state transition:
  - caller가 stack context를 생성하고 initializer가 세 field를 설정합니다. output API만 `count`와 `error`를 mutate합니다. positive result마다 pointer와 remaining length를 진행시키며, failure 후 `error == 1`은 이후 write를 차단합니다.
- 학습자 기록 — failure scenario와 public consequence:
  - 이 SHA의 API 자체는 `written <= 0` 또는 count overflow에서 `error = 1`, `-1`을 반환합니다. 다만 이 commit 시점의 `ft_printf`는 아직 새 context를 호출하지 않으므로 public entry와의 통합은 다음 SHA에서 이루어집니다.
- 학습자 기록 — 이 SHA가 보장하는 것:
  - 새 output API를 사용하는 caller에서는 positive short write가 suffix 재시도로 이어지고, 모든 성공 byte가 한 count에 집계되며 error가 sticky해집니다.
- 학습자 기록 — 아직 보장하지 않는 것:
  - `EINTR` 재시도, `SSIZE_MAX` request cap, `ssize_t`를 `int`로 narrow하기 전 개별 범위 검사, 실제 entry point migration은 아직 없습니다.
- 학습자 기록 — 후속 fix/test로 이어지는 지점:
  - `78e5d25d7df6`이 entry를 migration하고, `c627bd1f85bb`가 narrowing 순서를 고치며, `8a3ec50cb689`와 `1223518652bd`가 POSIX retry 정책과 deterministic proof를 완성합니다.

### 해당 SHA에서 확인할 코드
- 해당 SHA의 private `t_printf` 정의에서 descriptor, accumulated count, sticky error에 대응하는 실제 field를 기록합니다.
- context initializer, `ft_printf_write`, `ft_printf_putchar`의 caller/callee 관계를 추적합니다.
- `ft_printf_write`에서 positive short write 후 buffer pointer/remaining length/count가 각각 언제 갱신되는지 순서대로 기록합니다.
- 한 번 error state에 들어간 뒤 subsequent write가 어떻게 차단되는지 모든 early-return branch를 확인합니다.
- count overflow 검사 위치와 `write` return type 처리 방식을 기록하고, 이후 `c627bd1f85bb`가 왜 이 경계를 다시 수정하는지 비교할 근거를 남깁니다.
- parent SHA와 diff하여 이전 local state가 제거/대체된 정확한 코드 지점을 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_printf_internal.h`: `t_printf`의 `fd`, `count`, `error`; output API 선언.
  - `src/ft_output.c`: `ft_printf_init`, `ft_printf_write`, `ft_printf_putchar`. `ctx->error` early return, `written <= 0`, count overflow branch, positive progress mutation이 있습니다.
  - `Makefile`: `src/ft_output.c`를 archive source에 추가합니다. `src/ft_printf.c`의 기존 local helper는 이 SHA에 아직 남아 있습니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 3f7b0ab926d0, src/ft_output.c, ft_printf_write */
while (length > 0)
{
    written = write(ctx->fd, buffer, length);
    if (written <= 0)
    {
        ctx->error = 1;
        return (-1);
    }
    if (ctx->count > INT_MAX - (int)written)
    {
        ctx->error = 1;
        return (-1);
    }
    ctx->count += (int)written;
    buffer += written;
    length -= (size_t)written;
}
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: `src/ft_printf.c`의 local `int count`와 `ft_write_count`가 fd 1을 고정하고 short write를 거부했습니다.
  - 이후: 별도 private context가 fd/count/error를 소유하고, `ft_printf_write`가 positive result만큼 suffix를 전진시킵니다. entry point migration은 아직 일어나지 않았습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - formatter 전반이 공유할 output state machine의 핵심을 도입한 commit입니다. descriptor, 누적 count, sticky error를 하나의 private context에 모으고 short write를 정상 progress로 바꾸었지만, 이 시점에는 새 API가 아직 public loop에 연결되지 않았고 POSIX interruption/range 세부 규칙도 미완성입니다.

## 5.3 `78e5d25d7df6` — refactor(core): 리터럴 출력을 컨텍스트 API로 이관

- Importance: `B`
- Tags: `OUTPUT, REFACTOR`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Migrates literal output to the shared context, eliminating duplicate accounting.
- Commit Classification summary: Migrates literal and percent output to the shared context.
- Importance 근거: The migration removes duplicate accounting and is required integration work, but the decisive architecture was established by the preceding context commit.

### 학습 깊이
- 이 commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/code 변화에 집중합니다.
- 학습자 기록 — 직전 상태 대비 필요한 변화:
  - shared output API는 존재했지만 `ft_printf`가 여전히 local helper와 local count를 사용해 두 구현이 병존했습니다.
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - public loop의 literal/escaped-percent 출력을 `ft_printf_putchar(&ctx, ...)`로 이관하고 local helper를 삭제합니다.
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - `ft_printf`가 stack `t_printf ctx`를 초기화하고 traversal 동안 같은 context를 전달합니다. loop 종료 뒤 `ctx.error`이면 `-1`, 아니면 `ctx.count`를 반환합니다.
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - 이후 conversion dispatch도 이 context를 공유하며, output loop의 range/EINTR/request 정책은 후속 fix에서 강화됩니다.

### 해당 SHA에서 확인할 코드
- 해당 SHA의 `ft_printf`에서 literal/escaped-percent가 shared output API를 호출하는 지점을 찾습니다.
- entry point가 format traversal, variadic traversal init/close, final context-to-public-result translation만 담당하는지 실제 코드로 확인합니다.
- 직전 SHA에 남아 있던 local write/count implementation이 완전히 제거되었는지 diff로 확인합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_printf.c`: local `ft_write_count` 삭제, `t_printf ctx`, `ft_printf_init(&ctx, 1)`, 두 `ft_printf_putchar` branch, final `ctx.error` translation.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 78e5d25d7df6, src/ft_printf.c, ft_printf */
ft_printf_init(&ctx, 1);
while (*format)
{
    if (*format == '%' && *(format + 1) == '%')
    {
        if (ft_printf_putchar(&ctx, '%') < 0)
            break ;
        format += 2;
    }
    else
    {
        if (ft_printf_putchar(&ctx, *format) < 0)
            break ;
        format++;
    }
}
va_end(args);
if (ctx.error)
    return (-1);
return (ctx.count);
```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 새 architecture를 실제 public 경로에 연결한 integration commit입니다. entry point에서 중복 count/write 처리를 없애고, 모든 현재 출력이 같은 context의 count와 sticky error를 통과하도록 만들었습니다.

## 5.4 `c627bd1f85bb` — fix(output): 쓰기 결과를 집계하기 전에 범위 검증

- Importance: `A`
- Tags: `OUTPUT, RISK, DEBUG`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Validates a wide `ssize_t` result before narrowing it into the public `int` count.
- Commit Classification summary: Rejects a write result wider than int before narrowing and adding it.
- Importance 근거: The small fix restores the public count invariant at the exact conversion boundary and avoids implementation-defined narrowing. Its impact is significant despite the one-line diff.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - `written`은 `ssize_t`인데 guard가 `(int)written`을 먼저 만들었습니다. 성공값이 `INT_MAX`보다 크면 검증 자체가 implementation-defined narrowing 결과에 의존했습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - system-call result의 representability를 wide type 상태에서 먼저 검사하고, 통과한 뒤에만 public `int` count 계산에 참여시킵니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - `written > INT_MAX` 또는 `count > INT_MAX - (int)written`이면 count/pointer/remaining을 mutate하지 않고 sticky error로 전환합니다.
- 학습자 기록 — failure 또는 edge case:
  - 단일 successful write가 public return type보다 큰 경우와 기존 count와의 합이 `INT_MAX`를 넘는 경우를 구분합니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: `ssize_t` 성공값을 안전하게 `int`로 표현할 수 있을 때만 count에 더하며, 누적 count도 `INT_MAX`를 넘지 않습니다.
  - 미보장: oversized request 사전 제한, `EINTR` retry, 해당 거대 successful result를 실제로 발생시키는 deterministic test는 이 commit에 없습니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `8a3ec50cb689`가 request 자체를 `SSIZE_MAX`로 cap하고 interruption 정책을 추가합니다. `1223518652bd`는 output state를 광범위하게 검증하지만 이 exact `written > INT_MAX` branch를 직접 scripted하지는 않습니다.

### 해당 SHA에서 확인할 코드
- fix 직전 SHA에서 `write`의 `ssize_t` result가 `int`로 cast되는 위치와 overflow guard의 평가 순서를 기록합니다.
- `ssize_t` successful result가 `INT_MAX`보다 큰 경우 이전 식이 어떤 narrowing 위험을 갖는지 type 단위로 설명합니다.
- fix SHA에서 “개별 `written` representability 확인 → accumulated sum 확인”의 실제 조건 순서를 기록합니다.
- 범위 위반 시 sticky error와 public `-1`까지 어떤 경로로 전달되는지 추적합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_output.c`, `ft_printf_write`: 하나의 compound condition 앞쪽에 `written > INT_MAX`를 추가합니다. 실패 시 `ctx->error = 1`, caller chain을 따라 `ft_printf`가 `-1`을 반환합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* c627bd1f85bb, src/ft_output.c, ft_printf_write */
if (written > INT_MAX || ctx->count > INT_MAX - (int)written)
{
    ctx->error = 1;
    return (-1);
}
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: `ctx->count > INT_MAX - (int)written`
  - 이후: `written > INT_MAX`를 먼저 평가한 뒤 동일 누적 합 검사를 수행합니다.

### Failure → Fix 추적
- 기존 가정/상태: `write` result를 `int`로 먼저 cast해도 overflow guard가 안전하다는 암묵적 가정
- 실제 failure 또는 위험: `ssize_t` successful result > `INT_MAX`일 때 narrowing이 implementation-defined/negative가 될 수 있음
- source가 지목한 root cause: 범위 검증보다 cast가 먼저 일어나는 순서
- 수정된 decision/invariant: 각 `written`이 `int`에 representable한지 먼저 확인하고, 그 다음 accumulated sum을 `INT_MAX`에 대해 검증
- 학습자 기록 — 실제 수정 코드:
  - `if (written > INT_MAX || ctx->count > INT_MAX - (int)written)` 순서로 바뀌며, 실패 branch는 count를 갱신하기 전에 sticky error를 설정합니다.
- 학습자 기록 — regression test 연결:
  - source가 이 exact representability branch에 직접 연결한 deterministic case는 없습니다. `1223518652bd`는 partial/EINTR/zero/EPIPE/chunking을 검증하여 주변 state machine을 보호하지만, `written > INT_MAX` 반환을 생성하지 않습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 한 줄이지만 public return invariant를 지키는 type boundary fix입니다. wide syscall result를 좁힌 뒤 검사하던 순서를 뒤집어, representable한 성공값만 `int` count에 반영합니다.

## 5.5 `8a3ec50cb689` — fix(output): 중단된 쓰기 재시도와 요청 크기 제한

- Importance: `S`
- Tags: `OUTPUT, CORE, RISK`
- Most Important Commits 목록: 포함
- Thread 내 역할: Caps requests at `SSIZE_MAX`, retries `EINTR`, and creates a deterministic write seam.
- Commit Classification summary: Caps write requests at SSIZE_MAX, retries EINTR, and exposes a deterministic write test seam.
- Importance 근거: This completes the project-defining POSIX output policy beyond simple short-write handling. It establishes progress, interruption, and request-range invariants used by every conversion and enables direct failure-path proof.

### 학습 깊이
- 이 commit은 architecture/invariant의 핵심으로 취급합니다.
- 학습자 기록 — 직전 상태:
  - loop는 positive short write를 처리했지만 `write`에 남은 `size_t length`를 그대로 넘겼고, 모든 nonpositive result를 동일한 permanent error로 처리했습니다.
- 학습자 기록 — 해결하려던 문제:
  - `write`가 표현 가능한 최대 successful count를 넘는 request를 피하고, signal interruption을 실제 output failure와 구분하며, 드문 분기를 재현 가능하게 만들어야 했습니다.
- 학습자 기록 — 기존 설계가 충분하지 않았던 이유:
  - `EINTR`는 아무 byte도 소비하지 않았는데도 sticky failure가 되었고, production timing만으로 partial/EINTR/zero/EPIPE 순서를 안정적으로 시험할 수 없었습니다.
- 학습자 기록 — 선택한 핵심 decision:
  - 각 iteration의 `request`를 `min(length, SSIZE_MAX)`로 정하고, `written < 0 && errno == EINTR`이면 mutation 없이 continue합니다. compile-time macro로 system call 한 지점만 test writer로 대체합니다.
- 학습자 기록 — ownership / lifecycle / state transition:
  - `ft_printf_write`가 request sizing과 retry를 소유합니다. positive result만 count/buffer/length를 mutate하고, EINTR은 상태를 보존하며, zero 또는 non-EINTR negative는 `error = 1`로 terminal state를 만듭니다.
- 학습자 기록 — failure scenario와 public consequence:
  - EPIPE 등 permanent error와 zero progress는 이미 accepted된 prefix를 되돌리지 못한 채 public `-1`로 끝납니다. 이후 write 호출은 sticky early return으로 차단됩니다.
- 학습자 기록 — 이 SHA가 보장하는 것:
  - 요청 크기 제한, transparent EINTR retry, positive progress, zero/hard-error stop, deterministic seam이 한 output loop에 존재합니다.
- 학습자 기록 — 아직 보장하지 않는 것:
  - 이 commit 자체에는 scripted assertions가 없고, SIGPIPE disposition을 변경하지 않는 실제 integration 증명과 padding chunk cost 검증은 후속 test에 있습니다.
- 학습자 기록 — 후속 fix/test로 이어지는 지점:
  - `1223518652bd`가 `FT_PRINTF_TEST_WRITE`를 이용해 partial/EINTR/EPIPE/zero를 순서대로 주입하고, real broken pipe와 64-byte chunk까지 검증합니다.

### 해당 SHA에서 확인할 코드
- fix 직전 output loop에서 `EINTR`가 어떤 branch로 permanent failure가 되는지 확인합니다.
- fix SHA의 `ft_printf_write`에서 request length를 `SSIZE_MAX`로 cap하는 계산, `write` call, return-value 분기를 순서대로 추적합니다.
- positive return, `EINTR`, zero return, other error 각각에 대해 buffer/remaining/count/error가 변하는지 state table로 기록합니다.
- `EINTR` retry에서는 count와 remaining range가 유지되는지 실제 mutation 위치로 확인합니다.
- production build와 deterministic test build가 system-call boundary만 바꾸도록 `FT_PRINTF_TEST_WRITE` seam이 적용되는 위치를 확인합니다.
- 후속 `1223518652bd`의 scripted writer가 이 seam을 통해 어떤 production branch를 통과하는지 연결합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_output.c`: `<errno.h>`, `<stdint.h>`/range macro 사용, `FT_PRINTF_TEST_WRITE`에 따른 `FT_PRINTF_SYSTEM_WRITE`, `request`, EINTR branch, terminal nonpositive branch.
  - 상태표: positive=`count/pointer/remaining` 진행, EINTR=모두 유지, zero/other negative=`error=1`, 이후 호출은 첫 guard에서 실패합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 8a3ec50cb689, src/ft_output.c, ft_printf_write */
request = length;
if (request > (size_t)SSIZE_MAX)
    request = (size_t)SSIZE_MAX;
written = FT_PRINTF_SYSTEM_WRITE(ctx->fd, buffer, request);
if (written < 0 && errno == EINTR)
    continue ;
if (written <= 0)
{
    ctx->error = 1;
    return (-1);
}
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: `write(ctx->fd, buffer, length)`와 `written <= 0` 하나로 interruption도 terminal failure였습니다.
  - 이후: bounded request와 `errno == EINTR` retry가 positive/terminal branch보다 앞서며, build macro가 call site만 test seam으로 바꿉니다.

### Failure → Fix 추적
- 기존 가정/상태: positive short write만 resume하면 충분하고 interrupted call은 ordinary failure로 처리해도 된다는 상태
- 실제 failure 또는 위험: `EINTR`가 progress 없이 permanent failure가 되고 `size_t` remaining request가 `SSIZE_MAX`보다 클 수 있음
- source가 지목한 root cause: interruption과 permanent error를 구분하지 않고 system call signed result range를 request size에 반영하지 않음
- 수정된 decision/invariant: `SSIZE_MAX` request cap + `EINTR` transparent retry + nonpositive non-`EINTR` sticky failure + deterministic seam
- 학습자 기록 — 실제 수정 코드:
  - 위 발췌처럼 request cap과 EINTR branch가 mutation 전에 추가되고, 실제 call은 `FT_PRINTF_SYSTEM_WRITE` macro를 통합니다.
- 학습자 기록 — regression test 연결:
  - `1223518652bd`의 partial case는 `WRITE_PART(2) → WRITE_ALL`, interrupt case는 `EINTR → PART(3) → EINTR → ALL`, failure case는 immediate/partial-then-`EPIPE`와 zero를 주입합니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - POSIX write boundary를 완성한 핵심 fix입니다. “성공 byte만 state를 진행시키고, interruption은 그대로 재시도하며, progress 불가능한 결과만 terminal error”라는 규칙과 이를 검증할 seam을 같은 call site에 고정했습니다.

## 5.6 `22e65c176b5d` — perf(output): 반복 채움을 묶어서 출력

- Importance: `A`
- Tags: `OUTPUT, PERF`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Emits wide padding in bounded chunks rather than one system call per byte.
- Commit Classification summary: Emits repeated padding through bounded 64-byte chunks instead of one write per character.
- Importance 근거: The change materially reduces system-call count for wide fields while preserving bounded stack use and failure propagation. Later fault tests make the cost model observable.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - `ft_printf_putnchar`가 길이만큼 `ft_printf_putchar`를 호출하여 wide width가 한 byte당 한 output call/system call 비용으로 이어졌습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - producer는 고정 64-byte local buffer를 한 번 채우고 남은 길이에 따라 64 이하 chunk를 `ft_printf_write`에 넘깁니다. system-call semantics의 owner는 바꾸지 않습니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - 성능 모델만 O(width) one-byte calls에서 약 `ceil(width/64)` shared writes로 바뀌고, count/error/progress는 기존 context에서 동일하게 처리됩니다.
- 학습자 기록 — failure 또는 edge case:
  - negative/zero length는 loop를 실행하지 않습니다. 마지막 chunk는 64보다 작을 수 있으며, 어느 chunk에서든 shared write가 실패하면 즉시 `-1`입니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: stack 사용량은 width와 무관하게 64 bytes로 제한되고, 각 요청은 64 이하이며 공통 failure path를 유지합니다.
  - 미보장: 정확한 OS syscall 횟수 자체는 short write/EINTR에 따라 늘 수 있습니다. commit 자체에는 call-count assertion이 없습니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `1223518652bd`가 width 1000에서 scripted writer call 수 17과 largest request 64를 확인합니다.

### 해당 SHA에서 확인할 코드
- 이 SHA에서 repeated-character output이 one-byte loop에서 bounded stack chunk로 바뀐 함수와 diff를 찾습니다.
- 64-byte buffer 준비, 남은 padding에 따른 chunk length 결정, 반복 호출 순서를 기록합니다.
- 각 chunk가 직접 `write`하지 않고 shared `ft_printf_write`를 통과하는지 확인하여 count/error semantics가 유지되는 근거를 기록합니다.
- width가 매우 커도 stack usage가 user width와 비례하지 않는 이유를 실제 local storage 크기로 확인합니다.
- 후속 `1223518652bd`의 width 1000 test가 call count와 64-byte maximum을 어떻게 관찰하는지 연결합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_output.c`, `ft_printf_putnchar`: `char buffer[64]`, fill loop, `chunk = min(length, 64)`, `ft_printf_write`, `length -= chunk`.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 22e65c176b5d, src/ft_output.c, ft_printf_putnchar */
chunk = length;
if (chunk > (int)sizeof(buffer))
    chunk = (int)sizeof(buffer);
if (ft_printf_write(ctx, buffer, (size_t)chunk) < 0)
    return (-1);
length -= chunk;
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: `while (length-- > 0) ft_printf_putchar(ctx, c)` 형태의 one-byte 반복이었습니다.
  - 이후: 고정 buffer와 bounded chunk 반복으로 바뀌되, 최종 callee는 계속 `ft_printf_write`입니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - output invariant를 건드리지 않고 padding producer의 단위만 키운 성능 개선입니다. 고정 크기 stack buffer이므로 width가 커져도 메모리 사용은 증가하지 않고, failure/count는 기존 state machine을 그대로 통과합니다.

## 5.7 `1223518652bd` — test(output): 쓰기 실패 시퀀스와 채움 전략 검증

- Importance: `A`
- Tags: `OUTPUT, TEST, RISK`
- Most Important Commits 목록: 포함
- Thread 내 역할: Scripts partial progress, interruption, zero writes, `EPIPE`, and verifies `SIGPIPE` and chunking policy.
- Commit Classification summary: Injects partial writes, EINTR, EPIPE, zero progress, and verifies SIGPIPE and padding chunks.
- Importance 근거: This provides deterministic evidence for the S-level output state machine and confirms that the library does not mutate process signal policy. It is unusually strong failure-path verification.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - retry/chunk 정책은 구현돼 있었지만 실제 kernel timing으로는 원하는 partial/EINTR/EPIPE 순서를 재현하기 어렵고, SIGPIPE ownership과 accepted-prefix 보존을 명시적으로 증명하지 못했습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - production source를 `FT_PRINTF_TEST_WRITE`로 다시 compile한 별도 fault binary와 실제 archive를 쓰는 normal test를 함께 둡니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - production code는 바뀌지 않습니다. 테스트가 scripted step, call count, 최대 request, accepted output을 관찰 가능한 상태로 만들어 기존 invariant를 고정합니다.
- 학습자 기록 — failure 또는 edge case:
  - PART→ALL, EINTR/PART/EINTR/ALL, immediate EPIPE, PART→EPIPE, zero result, width 1000, real broken pipe를 각각 분리합니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: 지정한 deterministic sequence에서 offset/retry/stop/chunk behavior와 caller handler 보존이 assertion과 일치해야 suite가 통과합니다.
  - 미보장: 모든 OS scheduler 조합, 비동기 signal 전체, 이미 kernel이 받은 bytes의 rollback 가능성은 증명하지 않습니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - 이후 sanitizer/release targets가 이 fault suite도 다시 compile/run하여 runtime와 artifact 검증 축에 포함합니다.

### 해당 SHA에서 확인할 코드
- fault binary가 `FT_PRINTF_TEST_WRITE` seam을 사용하도록 build되는 실제 Makefile rule/compile definition을 기록합니다.
- scripted writer가 configured return sequence, request length, accepted bytes, call record를 어떤 상태로 보관하는지 확인합니다.
- full write, short write, `EINTR`, zero, `EPIPE` case마다 production `ft_printf_write`의 어떤 branch를 통과하는지 매핑합니다.
- partial failure 이전에 accepted된 bytes가 exact하게 남고 이후 write가 중단되는지 assertion을 확인합니다.
- width 1000 padding case의 request count와 maximum chunk 64 assertion을 확인합니다.
- real broken-pipe test에서 caller-owned `SIGPIPE` handler 설치/복원과 `ft_printf` return을 함께 확인합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `Makefile`: `tests/test_output_faults.c $(SRC)`를 `-DFT_PRINTF_TEST_WRITE`로 compile하여 `tests/bin/test_output_faults`를 만들고 실행합니다.
  - `tests/test_output_faults.c`: `t_write_step`, global step/call/output state, `ft_printf_test_write`, retry/failure/padding case 함수가 production seam을 구동합니다.
  - `tests/test_ft_printf.c`: pipe/dup2 기반 capture와 real broken-pipe `SIGPIPE` handler case가 archive path를 검사합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 1223518652bd, tests/test_output_faults.c, run_retry_cases */
reset_writer();
add_step(WRITE_PART, 2);
add_step(WRITE_ALL, 0);
expect_success("partial", 2, 7);
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: normal differential/error test만 있었고 writer return sequence 및 request 크기를 통제하지 못했습니다.
  - 이후: 별도 fault executable이 production sources를 seam-enabled로 compile하고, normal suite에는 real SIGPIPE policy case가 추가됩니다.

### Test commit 학습 기록
- production invariant 대상: positive short write progress, `EINTR` retry, zero/permanent failure stop, `SIGPIPE` ownership boundary, 64-byte padding chunk policy
- 재현하는 failure / boundary: scripted partial write, `EINTR`, zero-byte result, `EPIPE`; 별도의 real broken pipe
- test technique: compile-time write seam을 통한 deterministic fault injection + call/emitted-byte recording + real signal-policy case
- 통과하는 production path: `ft_printf` → padding/conversion output → `ft_printf_write` → substituted writer 또는 real `write`
- 이 test가 source상 증명하려는 것: retry offset, no-progress handling, hard-failure stop, prior accepted bytes, chunk bound, caller-owned signal disposition
- 이 test가 증명하지 않는 것: 모든 OS scheduling/timing behavior나 이미 OS가 받아들인 byte의 rollback을 증명하지 않습니다.
- 분류: deterministic regression/fault-injection 중심이며 signal policy는 real integration boundary case를 포함합니다.
- 후속 회귀 방지 역할: output loop, retry policy, padding optimization이 바뀌어도 동일 state transition과 signal boundary를 유지하도록 막습니다.
- 학습자 기록 — 실제 test 함수/fixture/seam/assertion:
  - `ft_printf_test_write`는 step마다 call 수와 largest request를 기록하고, PART/ALL에서 실제 accepted bytes를 capture buffer에 복사합니다. retry cases는 최종 exact bytes와 call 수, failure cases는 `-1`과 accepted prefix, padding case는 length 1000·17 calls·largest 64를 검사합니다. normal suite의 signal case는 caller handler 호출 수와 설치 상태를 모두 검사합니다.
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command: 미실행
  - environment: 현재 실행 환경에서 GitHub host DNS/checkout이 차단되어 exact SHA source tree를 로컬로 구성할 수 없었습니다.
  - result: 실행 결과를 주장하지 않습니다. `1223518652bd`의 Makefile과 두 test source는 exact commit diff/code inspection으로 확인했습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 드문 write 결과를 운에 맡기지 않고 production call boundary에 순서대로 주입하는 회귀 suite입니다. accepted bytes와 요청 단위까지 기록해 state transition을 검증하며, 실제 broken pipe에서는 library가 caller의 SIGPIPE disposition을 바꾸지 않는다는 별도 책임 경계도 확인합니다.

## 6. Invariant ledger

Source가 확정한 변화 축을 아래에 배치했습니다. “실제 코드 근거”는 학습자가 해당 SHA를 읽고 채웁니다.

| Invariant / concern | 도입 또는 초기 상태 | 강화 / 수정 | 고정한 검증 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| 공유 count/error state | `3f7b0ab926d0`에서 `t_printf`로 중앙화 | `c627bd1f85bb`에서 wide `ssize_t`를 `int`로 narrow하기 전 검증을 강화 | `1223518652bd`에서 fault sequence로 state transition 검증 | `src/ft_printf_internal.h`의 `t_printf`; `src/ft_output.c`의 init/write 및 `written > INT_MAX` guard; fault writer의 result/output assertions |
| write progress policy | `1d6a5cee3041`은 short write를 failure로 처리 | `3f7b0ab926d0`은 positive short write 진행을 도입하고 `8a3ec50cb689`는 `EINTR`/`SSIZE_MAX` 정책을 완성 | `1223518652bd`에서 partial/interrupt/zero/permanent failure를 deterministic하게 검증 | write loop의 pointer/length mutation은 positive branch 뒤에만 있고 EINTR은 `continue`; PART/EINTR/EPIPE/ZERO scripted cases가 각 branch를 통과 |
| padding cost model | `22e65c176b5d`에서 64-byte bounded chunk 도입 | 공통 `ft_printf_write` path 유지 | `1223518652bd`에서 width 1000의 call count와 최대 chunk 확인 | `ft_printf_putnchar`의 `char buffer[64]` 및 min chunk; fault test의 1000 bytes, 17 calls, largest request 64 assertions |
| signal ownership | `8a3ec50cb689`의 output error policy와 연결 | library가 `SIGPIPE` handler를 대체하지 않는 boundary 유지 | `1223518652bd`의 real broken-pipe test로 확인 | production output은 `write` error만 sticky state로 변환하며 signal API를 호출하지 않음; test가 caller handler 설치·호출·유지·복원을 검사 |

### 학습자 추가 기록

- source가 명시한 invariant 범위 안에서만 필요한 행을 추가합니다. 새 invariant를 확정 사실처럼 만들지 않습니다.
- 추가 기록:
  - 별도 행 추가는 필요하지 않습니다. 이미 네 행이 이 Thread의 source-defined count/progress/cost/signal 축을 모두 포함합니다.

## 7. Failure → Fix → Test 연결

| 기존 failure / risk | Fix / change | 수정 decision | Test / 학습 확인 |
| --- | --- | --- | --- |
| short write를 progress로 다루지 못함 | `3f7b0ab926d0` | positive short write 이후 남은 suffix 재시도 | `1223518652bd`에서 scripted partial write로 최종 검증 |
| wide `ssize_t`를 먼저 `int`로 cast할 위험 | `c627bd1f85bb` | narrowing 전에 개별 result 범위를 검증 | 학습자가 후속 test suite에서 이 경계의 직접/간접 검증 범위를 구분해 기록 |
| `EINTR`를 permanent failure로 취급하고 request가 `SSIZE_MAX`를 넘을 수 있음 | `8a3ec50cb689` | `EINTR` retry + request cap + test seam | `1223518652bd`에서 scripted `EINTR`, partial, zero, `EPIPE` 검증 |
| padding byte마다 system call 발생 | `22e65c176b5d` | stack의 bounded 64-byte chunk로 반복 출력 | `1223518652bd`에서 chunk size와 call count 검증 |

- 학습자 기록 — 실제 failure branch와 regression assertion을 연결한 추가 설명:
  - `written <= 0`는 EINTR branch 뒤에 있어 zero/EPIPE만 terminal error가 되고, partial result는 pointer/remaining을 진행시킵니다. fault suite는 exact final output 또는 accepted prefix와 call count를 검사합니다. `written > INT_MAX` guard는 code inspection으로 확인했으나 direct injected regression은 없습니다.

## 8. Ownership / state / responsibility 변화

| 시점 | Source상 owner / boundary | Source상 responsibility 변화 | 해당 SHA 코드 근거 |
| --- | --- | --- | --- |
| 초기 | `ft_printf` 내부/local helper | descriptor write, count, literal/percent 처리의 일부가 entry point 주변에 함께 존재 | `1d6a5cee3041`의 `src/ft_printf.c`: local `count`, `ft_write_count`, fd 1 고정 |
| `3f7b0ab926d0` | `t_printf` + output API | descriptor, count, sticky error를 하나의 private context가 소유 | `src/ft_printf_internal.h`의 세 field와 `src/ft_output.c`의 initializer/write API |
| `78e5d25d7df6` | `ft_printf` vs output context | entry point는 traversal/variadic lifecycle/final result translation에 집중하고 output semantics는 context로 이동 | `src/ft_printf.c`에서 local helper 삭제, `ft_printf_putchar(&ctx, ...)`, final `ctx.error/count` translation |
| `8a3ec50cb689` 이후 | `ft_printf_write` system-call boundary | request sizing, retry, progress, permanent failure의 책임이 한 write loop에 모임 | `request = min(length, SSIZE_MAX)`, EINTR continue, positive-only mutation, terminal sticky error |
| `22e65c176b5d` 이후 | padding producer vs output state | padding producer는 chunk를 만들고 실제 progress/count/failure는 기존 output API가 계속 소유 | `ft_printf_putnchar`의 64-byte local buffer가 각 chunk를 `ft_printf_write`에 전달 |

## 9. Thread 최종 상태

- Source가 확정한 도달점: 모든 conversion이 공유하는 output state machine에서 count range, progress, interruption, permanent failure, syscall cost, signal policy가 명시되고 별도로 검증된 상태입니다.
- 학습자 기록 — 마지막 commit 기준 실제 코드에서 확인한 최종 state:
  - `t_printf`가 fd/count/error를 소유하고 모든 producer가 `ft_printf_write` 또는 그 wrapper를 사용합니다. write loop는 bounded request, EINTR retry, positive-only progress, representability/누적 count 검사, zero/hard-error sticky stop을 적용합니다. padding은 64-byte chunk로 들어오며 fault test가 sequence와 request 크기를 관찰합니다.
- 학습자 기록 — 이 Thread 밖에서만 해결되는 남은 문제를 source 범위 안에서 구분:
  - format 전체의 사전 유효성/총 길이 원자성은 Thread 5의 preflight에서 다룹니다. numeric/text formatting 의미와 release/sanitizer artifact 검증도 각각 다른 Thread의 책임입니다. output failure 뒤 이미 accepted된 bytes는 어떤 후속 Thread도 rollback하지 않습니다.

## 10. 최종 architecture 또는 execution flow 정리

실제 SHA 코드를 읽은 뒤 아래 흐름을 완성합니다. source 설명만 복사하지 말고 함수/상태/branch를 연결합니다.

```text
[caller / ft_printf]
    -> [stack t_printf 초기화, conversion/literal producer]
    -> [ft_printf_putchar / ft_printf_putnchar / ft_printf_write]
    -> [request <= SSIZE_MAX, EINTR retry, positive progress 또는 sticky error]
    -> [ctx.error ? -1 : ctx.count]
```

- 각 단계에 대응하는 SHA / file / function:
  - `78e5d25d7df6` `src/ft_printf.c::ft_printf` → `3f7b0ab926d0`/`8a3ec50cb689` `src/ft_output.c::ft_printf_write` → `22e65c176b5d` `ft_printf_putnchar`; `1223518652bd`의 fault/real-write tests가 경계를 검증합니다.
- 핵심 state transition:
  - 초기 `{count=0,error=0}`에서 positive result마다 `{count += written, buffer += written, remaining -= written}`; EINTR은 동일 상태; zero/non-EINTR negative/range 위반은 `{error=1}` terminal state입니다.
- failure가 끊기는 지점:
  - `ft_printf_write`가 sticky error를 설정하고 `-1`을 반환하며, caller가 연쇄 반환합니다. 이후 output call은 `ctx->error` 첫 guard에서 system call 없이 실패합니다.
- 후속 fix/test가 보장한 지점:
  - narrowing 순서, request cap/EINTR policy, 64-byte padding unit, accepted-prefix/no-rollback, SIGPIPE disposition 비소유가 각각 fix와 deterministic/real tests로 고정됩니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 정확한 시점의 코드로 확인했습니다.
- [x] 각 commit의 subject, importance, tags를 source와 그대로 유지했습니다.
- [x] final HEAD의 코드를 과거 commit 설명에 소급 사용하지 않았습니다.
- [x] 필요한 parent/직전 관련 SHA 비교를 실제 diff로 수행했습니다.
- [x] source가 확정한 사실과 내가 코드에서 확인한 사실을 구분했습니다.
- [x] fix의 기존 가정 → failure/risk → root cause → decision → code → test 연결을 필요한 곳에서 완성했습니다.
- [x] test commit의 target invariant, technique, production path, proves/not-proves를 구분했습니다.
- [x] Invariant ledger에 실제 코드 근거를 채웠습니다.
- [x] 이 Thread의 최종 architecture/execution flow를 commit history 순서로 설명할 수 있습니다.
