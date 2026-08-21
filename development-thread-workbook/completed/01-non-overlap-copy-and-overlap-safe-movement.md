# Thread: Separating non-overlapping copy from overlap-safe movement

## Thread 목표

**Source significance**

> The sequence makes the precondition boundary explicit instead of hiding overlap handling inside every copy. The stronger operation is built only where needed, and the tests cover both possible overlap directions because the safe traversal direction changes with range placement.

이 문서에서는 source가 확정한 non-overlap precondition과 overlap-safe movement의 분리를 실제 SHA 코드에서 복원합니다.

### 이 Thread에 직접 연결된 source invariant

> A length-bounded memory operation accesses only the specified valid byte range; zero-length operations perform no access, and overlapping movement preserves every source byte needed by later copies.

### 이 Thread에 직접 연결된 engineering difficulty

> Distinguishing the weaker non-overlap copy precondition from the direction-sensitive behavior required for overlapping ranges.

## 이 Thread를 이해하기 위한 핵심 질문

- `ft_memcpy`가 책임지지 않는 조건은 어디에 명시되거나 구현으로 드러나는가?
- overlap이 발생했을 때 어떤 배치에서 forward copy가 unread source를 파괴하는가?
- `ft_memmove`는 어떤 경우 직접 역방향 복사를 하고, 어떤 경우 기존 primitive를 재사용하는가?
- zero length와 identical pointer 경로는 실제로 memory access를 피하는가?
- 테스트는 두 overlap 방향과 disjoint case를 어떻게 구분해 검증하는가?

## 완료 기준

- `4873fb11ac60`의 non-overlap contract와 `f2c4c042b339`의 stronger contract 차이를 코드로 설명할 수 있습니다.
- `f2c4c042b339`에서 traversal direction 결정과 unread source 보존 관계를 직접 추적했습니다.
- `69853cd4d3ce`에서 same-position, forward-overlap, backward-overlap, disjoint case가 실제 production path를 어떻게 통과하는지 확인했습니다.
- whole-buffer 비교가 destination 밖 변경까지 잡는지 test code에서 확인했습니다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags | Source role |
| --- | --- | --- | --- | --- | --- |
| 1 | `4873fb11ac60` | `feat(memory): 겹치지 않는 메모리 복사 구현` | B | BYTE_RANGE, CORE | Establishes `ft_memcpy` as the primitive whose caller guarantees non-overlapping ranges. |
| 2 | `f2c4c042b339` | `feat(memory): 겹치는 메모리의 안전한 이동 구현` | A | BYTE_RANGE, CORE, RISK | Adds direction-sensitive movement so destination overlap cannot destroy unread source bytes. |
| 3 | `69853cd4d3ce` | `test(memory): 겹치는 메모리 이동 검증` | B | BYTE_RANGE, TEST | Differentially verifies same-position, forward-overlap, backward-overlap, and disjoint cases. |

## Commit별 학습 기록

### `4873fb11ac60` — `feat(memory): 겹치지 않는 메모리 복사 구현`

**Source 확정 역할:** non-overlapping byte-copy primitive를 도입하며, overlap 처리는 의도적으로 책임 범위 밖에 둡니다.

#### 해당 SHA에서 확인할 코드

- `libft.h`에서 `ft_memcpy` public declaration을 찾습니다.
- `ft_memcpy` 구현 translation unit에서 source와 destination을 byte 단위로 다루는 타입을 확인합니다.
- original destination을 보존해 반환하는 지점을 확인합니다.
- source가 `const` 역할을 유지하는지, 실제 write 대상이 destination에만 한정되는지 확인합니다.
- overlap detection 또는 backward-copy 처리가 없는지 확인하고, 그것이 precondition 경계와 어떻게 연결되는지 기록합니다.
- 이 SHA의 parent와 비교해 public API/build에 어떤 구현 단위가 추가되었는지 확인합니다.

#### 학습 기록

- 직전 상태: parent에는 `ft_memset`과 `ft_bzero`가 있었지만 byte range를 다른 위치로 복사하는 public API와 `src/memory/ft_memory_copy.c`는 없었습니다. 이 commit은 Makefile의 `SRC`, `libft.h`, 새 translation unit을 함께 추가했습니다.
- 해결하려던 문제: caller가 길이로 지정한 source bytes를 destination으로 옮기고, libc와 같은 방식으로 원래 destination pointer를 돌려주는 기본 primitive가 필요했습니다.
- 실제 loop와 byte-range 경계: `destination`은 `unsigned char *`, `source`는 `const unsigned char *`로 변환됩니다. `length > 0`인 동안 현재 byte 하나를 읽어 현재 destination에 쓰고 두 pointer를 1씩 전진시킨 뒤 `length`를 1 줄입니다. 따라서 정상 precondition 아래 정확히 `[0, original_length)`만 읽고 씁니다. 길이가 0이면 loop body에 들어가지 않아 pointer를 역참조하지 않습니다.
- caller가 지켜야 하는 precondition: 읽을 source range와 쓸 destination range가 각각 유효하고 서로 겹치지 않아야 합니다. 구현에는 overlap 판정, 임시 buffer, 역방향 traversal이 없으므로 겹치는 range를 넘기는 것은 이 함수가 책임지는 동작이 아닙니다.
- 반환값 계약: local byte pointer를 전진시키지만 마지막에는 변경하지 않은 매개변수 `destination`을 반환합니다. 따라서 반환값은 첫 destination address입니다.
- 이 commit이 보장하는 것: non-overlap precondition 아래 byte representation을 길이만큼 순서대로 복사하고 source를 수정하지 않으며, zero length에서는 memory access 없이 원래 destination을 반환합니다.
- 이 commit이 보장하지 않는 것: overlap에서 원본 byte 보존, invalid pointer의 방어, nonzero length의 `NULL` 처리, 범위 유효성 검사는 보장하지 않습니다.
- 다음 commit에서 강화되어야 하는 이유: destination write가 아직 읽지 않은 source 위치와 겹치면 앞에서부터 복사하는 현재 loop가 source 자체를 먼저 덮어쓸 수 있습니다. overlap을 허용하는 호출에는 별도의 traversal 결정을 가진 stronger operation이 필요합니다.

### `f2c4c042b339` — `feat(memory): 겹치는 메모리의 안전한 이동 구현`

**Source 확정 역할:** overlap 시 unread source byte가 destination write로 파괴되지 않도록 traversal direction을 선택합니다.

**Source 확정 결정:** same-position 또는 zero length는 즉시 반환하고, destination이 source interval 내부에서 시작하는 경우 backward copy를 사용하며, 나머지 경우 forward `ft_memcpy`를 재사용합니다.

#### 변경 전 상태 확인

- 먼저 `4873fb11ac60`에서 `ft_memcpy`가 non-overlap만 전제로 한다는 근거를 다시 확인합니다.
- `f2c4c042b339`의 parent에서 `ft_memmove`가 없던 상태 또는 이 commit이 추가하는 public/API/build 경계를 확인합니다.

#### 해당 SHA에서 확인할 실제 핵심 코드

- `ft_memmove` declaration과 구현 translation unit을 찾습니다.
- identical pointers와 zero length early return이 memory access보다 앞에 있는지 확인합니다.
- overlap 판단에 사용되는 조건을 실제 코드로 기록합니다.
- destination이 source range 내부에서 시작할 때 index 또는 pointer가 어떤 방향으로 이동하는지 추적합니다.
- backward copy에서 **읽기 전에 덮어쓰면 안 되는 source byte**를 작은 예제로 직접 표시합니다.
- forward-safe case가 `ft_memcpy`로 위임되는 caller/callee 연결을 확인합니다.
- source 설명대로 unrelated object에 대한 단순 address ordering 대신 source range 내 위치 판정을 어떻게 구현했는지 확인합니다.

#### 상태 / invariant 변화 기록

- 변경 전 precondition: `ft_memcpy` caller가 두 range의 non-overlap을 보장해야 했습니다. 구현은 항상 낮은 offset에서 높은 offset으로 진행했습니다.
- 새로 제공되는 stronger contract: 두 유효 range가 겹쳐도 `ft_memmove`가 아직 읽지 않은 source byte를 보존하는 방향으로 복사합니다. 성공 후 destination의 `length` bytes는 호출 전 source bytes와 같습니다.
- traversal direction 결정 조건: byte pointer를 만든 직후 `destination_byte == source_byte || length == 0`이면 반환합니다. 그 밖에는 `offset`을 1부터 `length - 1`까지 증가시키며 `destination_byte == source_byte + offset`인지 찾습니다. 이 조건이 참이면 destination 시작점이 source interval 내부에 있으므로 backward copy를 수행합니다. 끝까지 일치하지 않으면 `ft_memcpy`를 호출합니다.
- preserved source information: backward branch는 먼저 `length--`한 뒤 `destination_byte[length] = source_byte[length]`를 수행합니다. 가장 높은 offset부터 읽고 쓰므로 낮은 offset의 아직 읽지 않은 source가 높은 destination write로 덮이지 않습니다.
- zero-length no-access 근거: early return이 overlap 탐색과 `ft_memcpy` 호출보다 앞에 있습니다. 따라서 `ft_memmove(NULL, NULL, 0)`도 pointer arithmetic이나 dereference 없이 `NULL`을 반환합니다.

#### failure scenario 직접 복원

- forward copy가 실패하는 overlap 배치: 초기 bytes가 `A B C D E`이고 `source = &buffer[0]`, `destination = &buffer[1]`, `length = 4`인 경우입니다. destination은 `source + 1`이므로 source interval 내부에서 시작합니다.
- 각 iteration에서 손실되는 unread source byte: forward iteration 0이 `buffer[1] = buffer[0]`을 수행하면 아직 iteration 1에서 읽어야 할 원본 `B`가 `A`로 바뀝니다. 다음에는 바뀐 `A`가 다시 `buffer[2]`로 전달되어 결과가 연쇄적으로 오염됩니다.
- backward traversal이 이를 막는 이유: offset 3의 `D`를 destination offset 3으로 먼저 옮기고 2, 1, 0 순서로 진행합니다. 각 write는 이미 읽은 쪽의 높은 source 위치에만 영향을 주므로 다음에 읽을 낮은 source byte가 유지됩니다.
- 반대 overlap 방향에서 forward traversal이 안전한 이유: `destination = &buffer[0]`, `source = &buffer[1]`처럼 destination이 source보다 앞에 있으면 각 write는 다음 iteration에서 읽을 source보다 낮은 주소에 놓입니다. 구현은 이 경우 source interval 내부에서 destination을 찾지 못하고 `ft_memcpy`의 forward loop를 재사용합니다.

#### 보장 범위

- 이 commit이 새로 보장하는 것: same-position과 zero length의 no-access return, destination이 source 내부에서 시작하는 경우의 backward copy, destination-before-source overlap과 disjoint range의 forward copy를 하나의 API에서 제공합니다. 단순 relational pointer 비교 대신 `source + offset`과의 equality만 사용합니다.
- 아직 test commit 없이는 코드 inspection에 의존하는 부분: 두 overlap 방향에서 실제 bytes가 system `memmove`와 같은지, destination 밖 byte가 변하지 않는지, 여러 길이와 offset에서 반환 pointer가 맞는지는 이 commit 자체에 새 테스트가 없어 코드 검사에 의존합니다.
- 다음 `69853cd4d3ce`가 확인해야 할 위험: early return, forward-safe overlap, backward-required overlap, disjoint range, 반환값, destination 바깥 write를 서로 다른 배치와 길이에서 검증해야 합니다.

### `69853cd4d3ce` — `test(memory): 겹치는 메모리 이동 검증`

**Source 확정 역할:** system `memmove`를 oracle로 사용해 same-position, forward-overlap, backward-overlap, disjoint move를 비교합니다.

#### Test commit 학습

- production invariant 대상:
  - 기록: 호출 전 source bytes가 overlap 방향과 무관하게 destination에 보존되고, 함수가 원래 destination을 반환하며, 지정 range 밖 buffer는 변하지 않아야 합니다. zero length는 `NULL` pointer에도 접근하지 않아야 합니다.
- 재현하는 boundary/failure:
  - same-position: `check_move(0, 0, length)`가 모든 길이에서 identical-pointer early return을 통과합니다.
  - forward-overlap: `check_move(0, 1, length)`는 길이 2 이상에서 destination-before-source overlap을 만들고 forward reuse path를 통과합니다. `(7, 19)`도 길이 15 이상에서는 같은 방향의 overlap입니다.
  - backward-overlap: `check_move(1, 0, length)`는 길이 2 이상에서 destination이 source interval 안에 놓여 backward branch를 통과합니다. `(23, 5)`는 길이 31과 63에서 같은 branch를 통과합니다.
  - disjoint: `(7, 19)`는 길이 12 이하, 실제 목록에서는 0·1·2·3·7·8에서 disjoint입니다. `(23, 5)`는 길이 18 이하, 실제 목록에서는 0·1·2·3·7·8·15·16에서 disjoint입니다. `(0, 1)`과 `(1, 0)`도 길이 1에서는 서로 다른 한 byte range입니다.
  - zero-length null-pointer: `CHECK(ft_memmove(NULL, NULL, 0) == NULL)`가 early return의 no-access 조건과 반환값을 직접 확인합니다.
- test technique:
  - source에 확정된 differential oracle 사용 위치를 실제 test code에서 찾습니다. `check_move`는 동일한 pattern으로 채운 `actual`과 `expected`를 준비하고, `actual`에는 `ft_memmove`, `expected`에는 system `memmove`를 적용합니다.
  - patterned buffer 초기화와 whole-buffer comparison 위치를 찾습니다. 128 bytes를 `(index * 29U + 17U)`로 채운 뒤 `memcmp(actual, expected, sizeof(actual))`를 수행하므로 destination 밖의 예상하지 않은 변경도 검출합니다.
- 실제 production path:
  - 각 case가 `ft_memmove`의 어느 분기로 들어가는지 기록합니다. `(0,0)` 또는 모든 zero length는 early return입니다. destination offset이 source offset보다 크고 그 차이가 length보다 작으면 backward branch이며, 그 밖에는 `ft_memcpy` branch입니다.
  - `ft_memcpy` reuse path를 통과하는 case를 확인합니다. destination-before-source overlap, disjoint range, destination이 source 끝 이후인 range가 이 path를 사용합니다.
- 테스트가 증명하는 것: 열 개의 길이와 다섯 offset 조합에서 반환값과 128-byte 전체 결과가 host `memmove`와 동일함을 결정적으로 확인합니다. 양쪽 overlap 방향, same-position, 여러 disjoint 구간, zero-length `NULL`을 포함합니다.
- 테스트가 증명하지 않는 것: 가능한 모든 길이와 offset, 유효하지 않은 nonzero pointer, 실제 object 범위를 벗어난 입력, 매우 큰 길이, 성능 특성은 증명하지 않습니다. oracle 자체와 같은 환경의 libc 동작을 기준으로 한 비교입니다.
- 테스트 성격:
  - [ ] broad integration
  - [x] deterministic regression
  - [x] differential boundary test
  - 선택 근거: 고정 pattern·길이·offset으로 항상 같은 production branches를 통과하고 system `memmove` 결과와 전체 buffer를 차등 비교하므로 deterministic differential boundary regression입니다. 여러 subsystem을 묶는 broad integration test는 아닙니다.
- 후속 변경에서 막아야 할 회귀: overlap 판정 조건 반전, backward index의 off-by-one, zero-length에서 pointer access, forward branch에서 잘못된 길이 전달, 원래 destination이 아닌 전진한 pointer 반환, destination 밖 write를 막습니다.
- 실행 근거: 저장소 checkout을 만들 수 없는 현재 환경에서는 test binary를 실행하지 않았습니다. 위 결과는 `69853cd4d3ce`의 test code와 해당 production SHA를 직접 검사한 내용이며 실행 성공을 주장하지 않습니다.

## Invariant ledger

| 시점 | Commit | Source에 연결된 invariant | 실제 코드에서 확인한 근거 |
| --- | --- | --- | --- |
| weaker primitive | `4873fb11ac60` | non-overlap precondition 아래 지정 byte range만 copy | `src/memory/ft_memory_copy.c`의 `length > 0` loop가 byte 하나씩 읽고 쓰며 overlap branch 없이 원래 `destination`을 반환합니다. |
| stronger operation | `f2c4c042b339` | overlap 시 later copy에 필요한 source byte 보존 | `destination == source + offset`을 source interval 안에서 찾으면 `length - 1`부터 0까지 복사하고, 나머지는 `ft_memcpy`로 위임합니다. |
| verification | `69853cd4d3ce` | 두 overlap 방향, same-position, disjoint, zero-length 경계 검증 | `tests/test_memory_move.c`가 고정 pattern과 여러 길이/offset을 system `memmove`와 whole-buffer 차등 비교하고 `NULL, NULL, 0`을 별도로 검사합니다. |

## Failure → Fix → Test 연결

이 thread는 source상 별도 `fix(...)` commit이 아니라 stronger feature 도입으로 위험을 해결합니다.

- 기존 가정: `ft_memcpy` caller가 non-overlap을 보장
- 위험: overlap에서 forward copy가 unread source를 덮어쓸 수 있음
- stronger decision: `f2c4c042b339`
- 실제 수정/추가 코드 근거: 새 `src/memory/ft_memory_move.c`가 source interval 안에서 destination 시작점을 탐색하고, 해당하면 backward loop를 수행하며, forward-safe case만 `ft_memcpy`에 넘깁니다.
- 검증: `69853cd4d3ce`
- regression으로 고정된 동작: same-position/zero-length no access, 두 방향 overlap의 byte 보존, disjoint copy, original destination return, destination 밖 byte 불변이 고정됩니다.

## Byte-range / responsibility 변화

- `ft_memcpy` caller responsibility: 두 유효 byte range가 겹치지 않는다는 사실과 각 range가 `length` bytes를 수용한다는 사실을 보장합니다.
- `ft_memmove` implementation responsibility: 유효 range가 겹치는지 방향상 필요한 만큼 판정하고 unread source를 보존하는 traversal을 선택합니다.
- 공통 byte-range invariant: 정상 입력에서는 지정된 `length` bytes만 읽고 destination의 같은 길이만 쓰며, 길이 0이면 접근하지 않고 원래 destination을 반환합니다.
- 두 API를 분리했을 때 얻는 계약상의 차이: 일반 복사는 단순한 forward primitive와 명시적 non-overlap precondition을 유지하고, overlap 비용과 방향 결정은 이를 요구하는 `ft_memmove` 호출에만 부과됩니다.

## Thread 최종 상태

- 마지막 commit 시점에 이 thread가 보장하는 것:
  - 기록: 코드상 `ft_memcpy`와 `ft_memmove`의 책임이 분리되고, `ft_memmove`는 destination-inside-source에만 backward traversal을 적용합니다. 고정된 차등 테스트는 선택한 경계 조합에서 반환값과 전체 buffer가 libc oracle과 같음을 검사합니다.
- 이 thread만으로는 보장하지 않는 것:
  - 기록: invalid nonzero pointers, object bounds 밖 length, 모든 가능한 offset/length, concurrency, 성능을 보장하거나 검증하지 않습니다. 실행 결과도 현재 환경에서는 생산하지 않았습니다.
- source의 significance와 실제 코드 확인 결과가 연결되는 지점:
  - 기록: overlap 처리를 `ft_memcpy`에 숨기지 않고 stronger `ft_memmove`에만 두었고, destination 배치에 따라 traversal을 바꾸며, 테스트가 양쪽 방향을 구분해 oracle과 비교한다는 점이 source significance와 일치합니다.

## 최종 architecture 또는 execution flow 정리

해당 thread의 commit history를 근거로 최종 흐름을 직접 작성합니다.

- 시작 조건 / 입력: caller가 유효한 destination, source, length를 전달합니다. `ft_memcpy`는 non-overlap을 추가 precondition으로 요구하고 `ft_memmove`는 overlap을 허용합니다.
- 핵심 분기 또는 책임 경계: `ft_memmove`는 same-position/zero length를 먼저 종료하고, destination이 `source + 1`부터 `source + length - 1` 중 하나인지 확인합니다. 해당하면 backward, 아니면 `ft_memcpy` forward path입니다.
- 상태 또는 ownership 변화: 별도 allocation이나 ownership transfer는 없습니다. destination bytes만 변경되고 source는 read-only view로 취급됩니다.
- failure 처리: API에는 status가 없고 invalid range를 검증하지 않습니다. 안전성은 유효 범위 precondition과 overlap 방향 선택으로 확보합니다.
- verification 경로: `tests/test_memory_move.c`가 동일 초기 buffer에 project/system 구현을 적용한 뒤 전체 128 bytes와 반환 pointer를 비교합니다.
- 최종 설명: 기본 복사는 단순한 non-overlap primitive로 유지됩니다. overlap-safe API는 destination이 아직 읽지 않은 source의 뒤쪽을 덮을 때만 뒤에서 앞으로 복사하고, 그 외에는 기존 forward primitive를 재사용합니다. 이 분리는 caller precondition과 구현 책임을 명확히 하며, 고정된 differential test가 대표적인 양방향 overlap과 경계를 회귀로 묶습니다.

## 학습 완료 자가 점검

- [x] 모든 commit을 문서 순서대로 해당 SHA에서 확인했습니다.
- [x] 중요도와 tags를 source 그대로 유지했습니다.
- [x] 실제 코드 근거와 source 확정 설명을 구분했습니다.
- [x] 변경 전/후 비교가 필요한 commit은 이전 관련 SHA와 비교했습니다.
- [x] failure → fix → test 연결을 실제 코드와 test code로 확인했습니다.
- [x] final HEAD를 과거 commit 설명에 소급하지 않았습니다.
- [x] 이 thread의 최종 invariant와 execution flow를 코드 근거로 설명할 수 있습니다.
