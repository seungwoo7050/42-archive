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

- [ ] fix 직전과 fix SHA의 magnitude/normalization 코드를 직접 비교했습니다.
- [ ] `(1e308, 0, 0)`이 기존 구현에서 실패하는 연산 과정을 수치적으로 설명할 수 있습니다.
- [ ] 변경된 production path와 regression test의 호출 경로를 연결했습니다.
- [ ] 이 테스트가 보장하는 범위와 보장하지 않는 다른 numerical edge를 구분했습니다.

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
- Classification summary: Replaces sum-of-squares magnitude with `std::hypot` for stable large-vector normalization.
- Importance rationale: This is a small but non-obvious numerical root-cause fix affecting cameras, normals, cylinder axes, and rays; it restores a broadly relied-on mathematical invariant.

#### Failure → Fix 연결

- 기존 가정: finite vector의 `x*x + y*y + z*z`가 meaningful finite magnitude를 제공한다.
- 실제 failure 또는 위험: 큰 finite component의 제곱이 infinity가 되어 normalization divisor가 infinity가 되고 방향이 zero-like로 붕괴한다.
- root cause: sum-of-squares의 avoidable intermediate overflow.
- 수정된 decision/invariant: scaled `std::hypot` algorithm으로 magnitude를 계산한다.
- regression test 연결: `ff18d1cc3afc`에서 exact large-vector regression을 고정한다.

#### 학습자 root-cause 기록

- fix 직전 SHA에서 가정이 코드로 드러나는 지점:
- failure를 유발하는 입력/state/event:
- failure가 observable behavior로 나타나는 순서:
- 수정 코드가 root cause를 차단하는 정확한 branch:
- symptom 완화가 아니라 root cause 수정임을 보여주는 근거:
- regression test가 같은 failure mechanism을 재현하는 지점:

#### 해당 SHA에서 확인할 실제 코드

- fix 직전 SHA의 vector magnitude/length implementation에서 component square와 sum의 expression type·evaluation order를 확인합니다.
- 이 SHA의 `std::hypot` 사용 형태가 3개 component를 어떤 방식으로 결합하는지 기록합니다.
- normalization이 length result를 검사하고 divide하는 branch를 before/after로 비교합니다.
- finite input `(1e308, 0, 0)`이 이전 코드에서 infinity length와 zero-like normalized result로 이어지는 값을 직접 계산합니다.
- camera frame, surface normal, cylinder axis, ray direction이 같은 normalization interface를 사용하는 실제 call sites를 이 SHA에서 찾습니다.

#### Source에서 확정된 이 SHA의 경계

- fix는 avoidable intermediate overflow/underflow를 줄이지만 parser range validation이나 every possible non-finite input policy를 새로 정의하지 않습니다.
- shared epsilon과 near-zero policy는 기존 contract로 유지됩니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `ff18d1cc3afc`
- 비교 지침: immediate parent와 `aa92a87c98a3`을 diff해 public API는 유지되고 numerical mechanism만 바뀌는지 확인합니다.
- 직접 작성한 연결 설명:

### 5.2 `ff18d1cc3afc` — `test(math): 큰 유한 벡터 정규화 검증`

- Importance: B
- Tags: TEST, EDGE
- Thread order: 2/2

#### Source에서 확정된 역할

- Development Thread role: Fixes the exact large-finite-vector regression as a permanent test case.
- Classification summary: Adds the large-finite-vector normalization regression.
- Importance rationale: The test precisely protects the preceding fix, but its significance remains localized to one numerical boundary.

#### Test commit 분석 기준

- 대상 production invariant: non-negligible large finite vector는 meaningful unit direction으로 정규화된다.
- 재현하는 failure/boundary: sum-of-squares가 overflow하는 magnitude range.
- test technique: single deterministic boundary input과 exact expected vector comparison.
- 통과하는 production path: `Vec3` construction → normalization → magnitude/length → component division.
- 이 test가 증명하는 것: 이전에 overflow하던 대표 input이 positive x unit vector로 복구되었음.
- 이 test가 증명하지 않는 것: 모든 direction, subnormal, NaN/infinity 정책이나 일반적인 approximate accuracy 전체를 증명하지 않는다.
- test 성격: deterministic numerical regression.
- 막는 regression: 향후 단순 sum-of-squares 구현으로 되돌아가 large finite directions가 붕괴하는 회귀.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- test에서 구성하는 exact input `(1e308, 0, 0)`과 expected normalized vector를 기록합니다.
- assertion이 exact equality인지 approximate comparison인지 확인하고 그 이유를 production representation과 연결합니다.
- test가 호출하는 public normalization path와 `std::hypot` implementation까지의 production call chain을 추적합니다.
- fix 이전 SHA에서 같은 test를 적용했을 때 어떤 value/assertion failure가 발생하는지 가능한 범위에서 재현합니다.

#### 직접 확인 증거

- 확인한 file path와 symbol:
- Thread에서 필요한 핵심 변화:
- 직접 확인한 caller/callee 또는 state change:
- 다음 commit에 제공하는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `aa92a87c98a3`
- 다음 Thread commit: 이 Thread의 종료점
- 비교 지침: 직전 fix commit과 test commit을 한 쌍으로 보고 production change와 regression evidence가 동일 numerical mechanism을 가리키는지 확인합니다.
- 직접 작성한 연결 설명:

## 6. Invariant ledger

source가 연결한 invariant의 시간상 변화를 실제 코드 근거로 완성합니다.

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| 큰 finite vector의 unit-direction 변환 | 기존 vector normalization contract | aa92a87c98a3 | aa92a87c98a3 | ff18d1cc3afc | 작성 |

### Ledger 보완 기록

- 각 invariant가 처음 observable behavior가 된 SHA:
- invariant를 우회하거나 깨뜨릴 수 있었던 실제 code path:
- fix 뒤 새로 금지되거나 강제된 state transition:
- test가 invariant를 직접 고정하는 assertion:
- source가 명시하지 않은 invariant를 추가했다면 삭제하거나 근거를 재확인:

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| finite component의 제곱 합이 infinity로 overflow | `std::hypot`의 scaled magnitude 계산 | `(1e308, 0, 0)` exact unit-vector regression | 작성 |

### 연결 검토

- feature를 독립적인 성공 경로로만 읽지 않고 어떤 failure를 예방하는지 기록:
- fix가 기존 assumption을 어떻게 수정했는지 기록:
- test가 symptom이 아니라 root cause를 재현하는지 확인:
- test가 증명하지 않는 범위를 별도로 기록:

## 8. Ownership / state / responsibility 변화

이 Thread의 중심은 object ownership이 아니라 numerical state transition입니다.

- fix 전 input state → intermediate state → output state:
- fix 후 input state → intermediate state → output state:
- public interface는 유지되고 내부 numerical mechanism만 바뀌는지:
- downstream consumers가 관찰하는 변화:

### 학습자 최종 기록

- source state:
- derived/cache state:
- owner와 non-owner:
- mutation 또는 transition boundary:
- failure 시 복구되는 상태:

## 9. Thread 최종 상태

큰 유한 성분을 가진 non-negligible vector도 avoidable intermediate overflow 없이 길이와 단위 방향을 계산하며, 그 실패 메커니즘은 정확한 regression input으로 고정됩니다.

### 직접 작성

- Thread 시작 시점과 종료 시점의 behavior 차이:
- 최종적으로 authoritative한 contract:
- 아직 다른 Thread가 보완해야 하는 항목:

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

``Vec3` components → magnitude/length → normalization divisor → normalized direction → camera/normal/axis/ray consumers`

### 실제 코드로 완성할 흐름

1. entry point와 입력 state:
2. 핵심 caller → callee:
3. state/ownership mutation:
4. success result:
5. failure branch와 cleanup/fallback:
6. test/benchmark가 통과하는 동일 production path:

### 학습자의 최종 설명

이 영역에는 source 문장을 복사하지 말고, 확인한 SHA별 코드와 연결 관계를 근거로
설계 → 구현 → 실패 또는 위험 → 수정 → 검증의 발전 과정을 직접 작성합니다.

## 11. 학습 완료 자가 점검

- [ ] 모든 commit을 source 순서대로 확인했습니다.
- [ ] 각 commit의 SHA, subject, importance, tags를 그대로 유지했습니다.
- [ ] 모든 핵심 설명에 해당 SHA의 file path와 symbol 근거가 있습니다.
- [ ] final HEAD의 구조를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B importance에 맞는 깊이로 기록했습니다.
- [ ] source에서 확정하지 않은 구현 세부를 정답처럼 채우지 않았습니다.
- [ ] failure와 fix/test가 실제 production path로 연결됩니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] invariant ledger의 각 변화가 commit evidence와 연결됩니다.
- [ ] 별도의 프로젝트 재학습 없이 이 Thread의 발전 과정을 설명할 수 있습니다.
