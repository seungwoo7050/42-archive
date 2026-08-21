# Thread 2. Large finite vectors and normalization stability

## 1. Thread 목표

일반적인 단위 벡터 테스트로는 드러나지 않는 큰 유한 벡터의 중간 overflow를 추적하고, 공유 수학 계층의 작은 구현 변경이 카메라·normal·cylinder axis·ray direction 전반의 유효성을 어떻게 복구하는지 확인합니다.

### Source significance

> This is a compact root-cause correction thread. The original mathematical interface was already
> shared by camera directions, normals, axes, and rays; the later test demonstrates that ordinary
> unit-vector cases were insufficient to protect it. The thread matters because a small implementation
> detail in a foundational value type could silently turn a meaningful finite direction into a
> zero-like result throughout the renderer.

### 이 Thread에 연결된 source invariant

- A non-negligible finite vector can be converted to its unit direction.

### 이 Thread에 연결된 engineering difficulty

- Maintaining numerical validity across normalization, quadratic intersection, near-zero directions, large finite values, and conservative cylinder bounds.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 기존 magnitude 계산에서 입력은 finite인데 왜 제곱 합이 infinity가 되는가?
- infinity로 계산된 길이가 normalization 결과를 zero-like 값으로 붕괴시키는 실제 연산 순서는 무엇인가?
- `std::hypot` 기반 계산이 public interface를 바꾸지 않고 어떤 numerical invariant를 복구하는가?
- 회귀 테스트가 일반 정규화 정확도가 아니라 정확히 어떤 overflow mechanism을 고정하는가?

## 3. 완료 기준

- [x] fix 직전과 fix SHA의 magnitude/normalization 코드를 직접 비교했습니다.
- [x] `(1e308, 0, 0)`이 기존 구현에서 실패하는 연산 과정을 수치적으로 설명할 수 있습니다.
- [x] 변경된 production path와 regression test의 호출 경로를 연결했습니다.
- [x] 이 테스트가 보장하는 범위와 보장하지 않는 다른 numerical edge를 구분했습니다.
- [x] 모든 참조 SHA가 `cpp/miniRT` branch HEAD의 ancestry에 속하는지 확인했습니다.
- [ ] 해당 SHA checkout에서 build/test/benchmark 명령을 직접 실행했습니다. 로컬 외부 네트워크와 checkout이 제공되지 않아 실행 evidence는 만들지 않았습니다.

### 검증 범위

- 지정 branch HEAD: `7d08c7c13fa68c3e60eea3c7014658b0a133e6f0`
- 각 참조 SHA는 Thread 내부의 연속 compare chain에서 `behind_by = 0`, merge base가 선행 SHA였고, Thread 종료 SHA도 branch HEAD의 조상으로 확인했습니다.
- 구현 설명은 해당 commit의 diff/file content를 기준으로 작성했으며, final HEAD의 후속 API를 과거 SHA에 소급하지 않았습니다.
- 테스트와 benchmark는 source mechanism과 production path만 검사했습니다. 실행 결과, sanitizer 결과, wall-clock 수치는 기록하지 않았습니다.

## 4. Commit map

1. `aa92a87c98a3` — `fix(math): 큰 유한 벡터를 안정적으로 정규화`
   - Importance: A
   - Tags: DEBUG, EDGE, RAY_PIPELINE
   - Source-defined role: Replaces overflow-prone sum-of-squares magnitude with `std::hypot`.

2. `ff18d1cc3afc` — `test(math): 큰 유한 벡터 정규화 검증`
   - Importance: B
   - Tags: TEST, EDGE
   - Source-defined role: Fixes the exact large-finite-vector regression as a permanent test case.

## 5. Commit별 학습 기록

### 5.1 `aa92a87c98a3` — `fix(math): 큰 유한 벡터를 안정적으로 정규화`

- Importance: A
- Tags: DEBUG, EDGE, RAY_PIPELINE
- Thread order: 1/2

#### Source에서 확정된 역할

- Development Thread role: Replaces overflow-prone sum-of-squares magnitude with `std::hypot`.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** `Vec3::length`가 `sqrt(x*x + y*y + z*z)` 계열의 `lengthSquared()` 결과에 의존했습니다. 입력 component가 finite여도 `1e308 * 1e308`은 `double` 범위를 넘어 infinity가 되므로 실제 vector는 의미 있는 방향을 갖는데도 중간 계산만 overflow합니다.
- **핵심 구현 결정:** `src/math.cpp`에서 public API와 normalization branch는 유지하고 magnitude 계산만 3-argument `std::hypot(x, y, z)`로 교체합니다. `hypot`은 component scale을 조정해 제곱합의 불필요한 중간 overflow/underflow를 줄입니다.

#### Failure → Fix 연결

- **기존 가정:** finite components의 제곱합도 meaningful finite magnitude를 만든다.
- **실제 failure 또는 위험:** 큰 component를 제곱하는 중간 연산이 infinity가 되어 normalize 결과를 0 방향처럼 만듭니다.
- **root cause:** 결과 범위가 아니라 naive sum-of-squares evaluation의 중간 overflow입니다.
- **수정된 decision/invariant:** scaled algorithm을 사용하는 `std::hypot`으로 magnitude를 계산합니다.
- **regression 연결:** `ff18d1cc3afc`의 `(1e308,0,0) == (1,0,0)` assertion입니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/math.cpp — `Vec3::length`
  - include/ray/math.hpp — `Vec3`, normalization API
- **caller → callee / data flow:** `Vec3(1e308,0,0)` → old: square `inf` → length `inf` → component/`inf` = zero-like; fixed: `hypot` = `1e308` → division = `(1,0,0)`
- **ownership·state transition:** ownership 변화는 없습니다. 동일한 immutable component 입력에서 derived magnitude와 normalized output만 바뀝니다. near-zero epsilon 정책과 normalization interface는 그대로입니다.
- **failure/edge branch:** 수정 전 위험은 input non-finiteness가 아니라 finite input의 intermediate overflow입니다. 이 fix는 parser range, NaN/Inf 수용 정책, 모든 subnormal 정확도를 새로 정의하지 않습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** non-negligible large finite vector가 avoidable overflow 때문에 zero-like direction으로 붕괴하지 않습니다.
- **이 SHA가 보장하지 않는 것:** 모든 가능한 방향과 비정상 부동소수 값에 대한 완전한 정책은 보장하지 않습니다.
- **직접 확인/후속 evidence:** immediate parent의 sum-of-squares와 이 SHA의 `std::hypot` 한 줄 차이를 확인하고, 후속 exact regression과 연결했습니다. 실행은 하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `ff18d1cc3afc`
- 이 commit이 다음 단계에 제공하는 것: `ff18d1cc3afc`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.2 `ff18d1cc3afc` — `test(math): 큰 유한 벡터 정규화 검증`

- Importance: B
- Tags: TEST, EDGE
- Thread order: 2/2

#### Source에서 확정된 역할

- Development Thread role: Fixes the exact large-finite-vector regression as a permanent test case.

#### B-level 구현 역할 복원

- **직전 관련 상태:** production fix만 존재하면 향후 `lengthSquared` 기반 구현으로 되돌아가도 일반적인 작은 unit-vector test는 회귀를 잡지 못할 수 있습니다.
- **핵심 구현 결정:** `tests/core_tests.cpp`에 정확히 `(1e308, 0, 0)`을 normalize하고 `Vec3(1, 0, 0)`과 exact equality로 비교하는 case를 추가합니다. 다른 component가 0이므로 fixed path의 기대값은 표현 가능한 정확한 1과 0입니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/core_tests.cpp — large finite vector normalization assertion
  - src/math.cpp — `Vec3::length`/normalization production path
- **caller → callee / data flow:** test vector construction → public normalization → `Vec3::length` → `std::hypot` → component division → exact vector comparison
- **ownership·state transition:** fixture나 mutable 외부 상태 없이 하나의 deterministic value regression입니다.
- **failure/edge branch:** fix 이전에는 magnitude가 infinity가 되고 x component가 0처럼 되어 assertion이 실패합니다. 이 테스트는 NaN, infinity, subnormal, arbitrary 3-axis approximate accuracy를 다루지 않습니다.

#### Test commit 분석 기준

- **대상 production invariant:** non-negligible large finite vector는 unit direction으로 변환됩니다.
- **test technique:** 단일 deterministic boundary input과 exact expected vector 비교
- **통과하는 production path:** `Vec3` construction → normalization → `Vec3::length` → division
- **이 test가 증명하는 것:** `(1e308,0,0)`의 과거 intermediate-overflow 회귀가 차단됩니다.
- **이 test가 증명하지 않는 것:** 모든 vector direction, NaN/Inf 정책, subnormal precision을 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 과거에 실패한 large-finite overflow mechanism을 정확한 입력으로 고정합니다.
- **이 SHA가 보장하지 않는 것:** 일반 numerical conformance suite를 대신하지 않습니다.
- **직접 확인/후속 evidence:** 테스트 소스와 호출 경로를 검사했습니다. 이 환경에서는 해당 test executable을 빌드하거나 fix 전/후로 실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `aa92a87c98a3`
- 다음 Thread commit: 이 Thread의 종료점
- 이 commit이 Thread 종료에 제공하는 것: Thread-level invariant ledger와 최종 실행 흐름에서 이 SHA의 결과를 최종 상태에 반영했습니다.

## 6. Invariant ledger

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| 큰 finite vector의 unit-direction 변환 | 기존 normalization API | aa92a87c98a3 | naive component square가 infinity가 됨 | ff18d1cc3afc | `Vec3::length`의 `std::hypot`과 exact regression |

### Ledger 보완 기록

- 각 invariant는 위 표의 SHA에서 observable behavior 또는 state로 처음 나타났습니다.
- 후속 commit이 같은 용어를 사용하더라도 그 보장을 과거 SHA에 소급하지 않았습니다.
- test/evidence 열은 production path와 assertion 또는 deterministic work gate를 함께 가리킵니다.
- 실행하지 않은 test는 source-level evidence로만 기록했습니다.

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| finite component 제곱합의 intermediate infinity | `std::hypot`의 scaled magnitude | ff18d1cc3afc | `normalize(Vec3(1e308,0,0)) == Vec3(1,0,0)` |

### 연결 검토

- feature commit도 어떤 잘못된 state 또는 semantic drift를 막는지 production path에 연결했습니다.
- fix commit은 기존 가정 → 실제 위험 → root cause → corrected decision → regression 순서로 기록했습니다.
- test가 broad integration인지 deterministic boundary/differential/failure-injection regression인지 commit 기록에서 구분했습니다.
- assertion이 증명하지 않는 범위와 실행하지 못한 항목을 별도로 남겼습니다.

## 8. Ownership / state / responsibility 변화

이 Thread는 object ownership을 바꾸지 않습니다. source state는 세 `double` component이고, derived state는 magnitude와 normalized components입니다. fix 전에는 finite source가 `inf` intermediate와 zero-like output으로 전이됐고, fix 후에는 finite magnitude와 unit direction으로 전이됩니다. public interface, caller ownership, epsilon branch는 유지됩니다.

### 학습자 최종 기록

- **source state와 derived state:** 이 Thread는 object ownership을 바꾸지 않습니다. source state는 세 `double` component이고, derived state는 magnitude와 normalized components입니다. fix 전에는 finite source가 `inf` intermediate와 zero-like output으로 전이됐고, fix 후에는 finite magnitude와 unit direction으로 전이됩니다. public interface, caller ownership, epsilon branch는 유지됩니다.
- **mutation/transition boundary:** commit별 `ownership·state transition`과 위 invariant ledger에 표시했습니다.
- **failure 시 복구 상태:** Failure → Fix → Test 표와 각 fix/test section에 정상·오류 상태를 구분했습니다.

## 9. Thread 최종 상태

large finite component를 가진 non-negligible vector도 avoidable intermediate overflow 없이 길이와 unit direction을 계산합니다. 정확한 과거 실패 입력이 regression으로 남아 naive sum-of-squares 회귀를 막습니다. NaN/Inf/subnormal 전체 정책은 이 Thread가 정의하지 않습니다.

### 직접 작성한 결론

- **Thread 시작과 종료의 behavior 차이:** large finite component를 가진 non-negligible vector도 avoidable intermediate overflow 없이 길이와 unit direction을 계산합니다. 정확한 과거 실패 입력이 regression으로 남아 naive sum-of-squares 회귀를 막습니다. NaN/Inf/subnormal 전체 정책은 이 Thread가 정의하지 않습니다.
- **아직 다른 Thread 또는 외부 검증이 보완해야 하는 항목:** non-finite 입력 정책과 geometry-specific numerical edges는 별도 parser/geometry contracts에 남습니다.

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

```text
`Vec3` components → `Vec3::length` → normalization divisor → component division → camera/normal/axis/ray consumers
```

### 실제 코드로 완성한 흐름

1. caller가 finite `Vec3`를 normalization API에 전달합니다.
2. `Vec3::length`가 세 component를 `std::hypot`으로 결합합니다.
3. 기존 near-zero branch가 magnitude를 검사합니다.
4. 유효 magnitude이면 각 component를 그 값으로 나눕니다.
5. camera direction, normal, cylinder axis, ray direction consumer가 같은 unit vector를 읽습니다.
6. core regression은 `(1e308,0,0)`이 정확한 +X unit vector인지 검사합니다.

### 학습자의 최종 설명

large finite component를 가진 non-negligible vector도 avoidable intermediate overflow 없이 길이와 unit direction을 계산합니다. 정확한 과거 실패 입력이 regression으로 남아 naive sum-of-squares 회귀를 막습니다. NaN/Inf/subnormal 전체 정책은 이 Thread가 정의하지 않습니다.

남은 경계는 다음과 같습니다. non-finite 입력 정책과 geometry-specific numerical edges는 별도 parser/geometry contracts에 남습니다.

## 11. 학습 완료 자가 점검

- [x] 모든 commit을 source 순서대로 확인했습니다.
- [x] 각 commit의 SHA, subject, importance, tags를 그대로 유지했습니다.
- [x] 모든 핵심 설명에 해당 SHA의 file path와 symbol 근거를 기록했습니다.
- [x] final HEAD의 구조를 과거 SHA에 소급하지 않았습니다.
- [x] S/A/B importance에 맞춰 architecture, subsystem, localized role의 깊이를 구분했습니다.
- [x] source에서 확정하지 않은 실행 결과나 runtime 수치를 사실로 채우지 않았습니다.
- [x] failure와 fix/test를 실제 production path로 연결했습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] invariant ledger의 각 변화를 commit evidence와 연결했습니다.
- [ ] 해당 SHA checkout에서 테스트·benchmark·sanitizer를 직접 실행했습니다. 환경 제한 때문에 미실행 상태입니다.
- [x] 별도의 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 위험 → 수정 → 검증 발전을 설명할 수 있는 기록을 남겼습니다.
