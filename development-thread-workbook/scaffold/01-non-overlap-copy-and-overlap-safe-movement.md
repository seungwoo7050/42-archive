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

- 직전 상태:
- 해결하려던 문제:
- 실제 loop와 byte-range 경계:
- caller가 지켜야 하는 precondition:
- 반환값 계약:
- 이 commit이 보장하는 것:
- 이 commit이 보장하지 않는 것:
- 다음 commit에서 강화되어야 하는 이유:

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

- 변경 전 precondition:
- 새로 제공되는 stronger contract:
- traversal direction 결정 조건:
- preserved source information:
- zero-length no-access 근거:

#### failure scenario 직접 복원

- forward copy가 실패하는 overlap 배치:
- 각 iteration에서 손실되는 unread source byte:
- backward traversal이 이를 막는 이유:
- 반대 overlap 방향에서 forward traversal이 안전한 이유:

#### 보장 범위

- 이 commit이 새로 보장하는 것:
- 아직 test commit 없이는 코드 inspection에 의존하는 부분:
- 다음 `69853cd4d3ce`가 확인해야 할 위험:

### `69853cd4d3ce` — `test(memory): 겹치는 메모리 이동 검증`

**Source 확정 역할:** system `memmove`를 oracle로 사용해 same-position, forward-overlap, backward-overlap, disjoint move를 비교합니다.

#### Test commit 학습

- production invariant 대상:
  - 기록:
- 재현하는 boundary/failure:
  - same-position:
  - forward-overlap:
  - backward-overlap:
  - disjoint:
  - zero-length null-pointer:
- test technique:
  - source에 확정된 differential oracle 사용 위치를 실제 test code에서 찾습니다.
  - patterned buffer 초기화와 whole-buffer comparison 위치를 찾습니다.
- 실제 production path:
  - 각 case가 `ft_memmove`의 어느 분기로 들어가는지 기록합니다.
  - `ft_memcpy` reuse path를 통과하는 case를 확인합니다.
- 테스트가 증명하는 것:
- 테스트가 증명하지 않는 것:
- 테스트 성격:
  - [ ] broad integration
  - [ ] deterministic regression
  - [ ] differential boundary test
  - 선택 근거:
- 후속 변경에서 막아야 할 회귀:

## Invariant ledger

| 시점 | Commit | Source에 연결된 invariant | 실제 코드에서 확인한 근거 |
| --- | --- | --- | --- |
| weaker primitive | `4873fb11ac60` | non-overlap precondition 아래 지정 byte range만 copy | |
| stronger operation | `f2c4c042b339` | overlap 시 later copy에 필요한 source byte 보존 | |
| verification | `69853cd4d3ce` | 두 overlap 방향, same-position, disjoint, zero-length 경계 검증 | |

## Failure → Fix → Test 연결

이 thread는 source상 별도 `fix(...)` commit이 아니라 stronger feature 도입으로 위험을 해결합니다.

- 기존 가정: `ft_memcpy` caller가 non-overlap을 보장
- 위험: overlap에서 forward copy가 unread source를 덮어쓸 수 있음
- stronger decision: `f2c4c042b339`
- 실제 수정/추가 코드 근거:
- 검증: `69853cd4d3ce`
- regression으로 고정된 동작:

## Byte-range / responsibility 변화

- `ft_memcpy` caller responsibility:
- `ft_memmove` implementation responsibility:
- 공통 byte-range invariant:
- 두 API를 분리했을 때 얻는 계약상의 차이:

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
