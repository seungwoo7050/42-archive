# Thread 4. Material syntax to bounded recursive reflection

## 1. Thread 목표

기존 diffuse-only `traceRay`에 deterministic perfect-metal recursion을 추가하고, scene syntax와 CLI depth setting이 그 bounded transport contract를 어떻게 노출하면서 기존 diffuse scene을 보존하는지 확인합니다.

### Source significance

> The material thread changes `traceRay` from a terminal direct-light computation into bounded
> recursion without introducing randomness or schedule-dependent sampling. Keeping omitted material
> tokens diffuse preserves existing scenes, while the depth contract makes recursive work finite and
> externally configurable. The tests show both the new metal path and the unchanged diffuse golden,
> which is the relevant compatibility boundary.

### 이 Thread에 연결된 source invariant

- Recursive metal transport is bounded by `maxDepth`.
- Omitting the material token preserves diffuse behavior and the existing diffuse golden.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- material value가 `Diffuse`와 `Metal`을 구분한 뒤 `traceRay` control flow는 어떻게 갈라지는가?
- metal depth zero와 depth positive의 반환·secondary-ray 생성 규칙은 무엇인가?
- reflected ray origin offset, acceleration mode, statistics sink, decremented depth가 재귀 호출에 어떻게 전달되는가?
- optional material token이 기존 `.rt` arity와 diffuse default를 어떻게 보존하는가?
- test가 grammar, unknown-material failure, recursion, secondary count, diffuse golden을 각각 어떤 경로로 검증하는가?

## 3. 완료 기준

- [ ] metal reflection의 실제 수식과 ray 생성 순서를 해당 SHA에서 기록했습니다.
- [ ] depth가 감소하는 지점과 depth zero 종료 결과를 코드로 설명할 수 있습니다.
- [ ] `sp`, `pl`, `cy`의 base arity와 optional-token arity를 실제 parser 분기에서 확인했습니다.
- [ ] 기존 material 생략 scene이 diffuse로 남는 backward-compatibility 증거를 테스트와 연결했습니다.
- [ ] CLI `--max-depth`의 default, 범위, 중복·오류 처리를 renderer setting까지 추적했습니다.

## 4. Commit map

1. `85583e1e9beb` — `feat(material): metal 모델과 깊이 제한 반사 구현`
   - Importance: A
   - Tags: CORE, MATERIAL, RAY_PIPELINE
   - Source-defined role: Extends tracing with a deterministic perfect-metal branch and depth consumption.

2. `a90130a5b030` — `feat(parser): 선택적 도형 재질 문법 추가`
   - Importance: B
   - Tags: PARSER, MATERIAL
   - Source-defined role: Adds optional material tokens while retaining diffuse defaults.

3. `9a352ffe8233` — `test(material): 재질 파싱과 반사 깊이 검증`
   - Importance: B
   - Tags: TEST, MATERIAL, DETERMINISM
   - Source-defined role: Verifies parsing, unknown-material failure, recursion depth, secondary-ray counts, and diffuse compatibility.

4. `3aa806753cc4` — `feat(cli): 반사 깊이 option과 기본값 추가`
   - Importance: B
   - Tags: CLI, MATERIAL
   - Source-defined role: Exposes reflection depth through the CLI and adopts a default of four.

## 5. Commit별 학습 기록

### 5.1 `85583e1e9beb` — `feat(material): metal 모델과 깊이 제한 반사 구현`

- Importance: A
- Tags: CORE, MATERIAL, RAY_PIPELINE
- Thread order: 1/4

#### Source에서 확정된 역할

- Development Thread role: Extends tracing with a deterministic perfect-metal branch and depth consumption.
- Classification summary: Adds diffuse/metal material types and depth-limited perfect reflection with secondary-ray accounting.
- Importance rationale: The commit changes the tracing model from terminal direct lighting to deterministic recursion, a significant capability and control-flow extension.

#### 해당 SHA에서 확인할 실제 코드

- `Material` representation에 `Diffuse`/`Metal` type discriminator가 추가되는 field/default를 기록합니다.
- 기존 diffuse shapes가 source change 없이 same default를 얻는 constructor/default path를 확인합니다.
- `traceRay` hit handling에서 diffuse direct-light branch와 metal branch가 갈라지는 condition을 추적합니다.
- incident direction과 oriented normal로 perfect reflection direction을 계산하는 actual expression을 기록합니다.
- metal hit에서 remaining depth zero가 black을 반환하는 branch와 positive depth branch의 순서를 확인합니다.
- reflected origin이 normal 방향으로 `kRayTMin`만큼 offset되는 코드와 recursive interval을 기록합니다.
- recursive call에 acceleration mode, stats sink, decremented depth가 그대로 전달되는지 확인합니다.
- returned color에 metal albedo를 component-wise multiply하는 위치와 secondary-ray counter 증가 시점을 추적합니다.

#### Source에서 확정된 이 SHA의 경계

- metal reflection은 perfect specular이며 random scattering/fuzz를 포함하지 않습니다.
- depth zero는 reflected contribution을 black으로 종료합니다.
- diffuse path의 existing direct-light behavior는 default material로 유지됩니다.

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
- 다음 Thread commit: `a90130a5b030`
- 비교 지침: Thread 1의 `e8b7dc42a52c`에서 depth parameter가 unused였던 상태와 비교해 tracing control flow가 terminal diffuse에서 bounded recursion으로 바뀌는 지점을 기록합니다.
- 직접 작성한 연결 설명:

### 5.2 `a90130a5b030` — `feat(parser): 선택적 도형 재질 문법 추가`

- Importance: B
- Tags: PARSER, MATERIAL
- Thread order: 2/4

#### Source에서 확정된 역할

- Development Thread role: Adds optional material tokens while retaining diffuse defaults.
- Classification summary: Adds optional `diffuse`/`metal` tokens to all shape directives.
- Importance rationale: This is normal syntax integration for an already defined material model, with backward-compatible diffuse defaults.

#### 해당 SHA에서 확인할 실제 코드

- `sp`, `pl`, `cy` handlers가 base token count 또는 base+1만 허용하는 exact arity checks를 기록합니다.
- optional trailing token이 없을 때 `Diffuse`를 선택하는 default path를 확인합니다.
- `diffuse`와 `metal` 문자열을 `MaterialType`으로 변환하는 shared helper의 signature와 error path를 기록합니다.
- unknown material identifier가 source/line-aware `ParseError`를 만드는 branch를 추적합니다.
- geometry constructor가 raw token이 아니라 validated material value를 받는 call site를 확인합니다.
- 기존 fixture/forms가 수정 없이 parsing되는지 해당 SHA tests/fixtures에서 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- surplus arguments는 optional material 지원 이후에도 silently ignored되지 않습니다.
- material token omission은 backward-compatible diffuse behavior입니다.

#### B-level 학습 기록

- Thread에서 이 commit이 맡는 구현 역할:
- 실제 추가/수정된 핵심 symbol:
- 입력·상태·출력의 변화:
- 다음 related commit이 의존하는 결과:

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

- 이전 Thread commit: `85583e1e9beb`
- 다음 Thread commit: `9a352ffe8233`
- 비교 지침: 각 shape directive의 기존 parser SHA와 diff해 syntax-specific geometry validation은 유지되고 optional material parsing만 추가되는지 확인합니다.
- 직접 작성한 연결 설명:

### 5.3 `9a352ffe8233` — `test(material): 재질 파싱과 반사 깊이 검증`

- Importance: B
- Tags: TEST, MATERIAL, DETERMINISM
- Thread order: 3/4

#### Source에서 확정된 역할

- Development Thread role: Verifies parsing, unknown-material failure, recursion depth, secondary-ray counts, and diffuse compatibility.
- Classification summary: Tests material parsing, unknown types, reflection depth, secondary rays, and the unchanged diffuse golden.
- Importance rationale: The suite usefully covers parsing, depth, and backward compatibility, but it verifies a contained feature rather than a project-wide invariant.

#### Test commit 분석 기준

- 대상 production invariant: material grammar는 explicit failure/default를 유지하고 metal recursion은 depth-bound, deterministic, stats-visible이며 diffuse output은 호환된다.
- 재현하는 failure/boundary: omitted/explicit/unknown token, depth 0/1, repeated trace, secondary-ray count.
- test technique: in-memory parser tests, isolated one-surface mirror trace, exact color/counter assertions, existing golden reuse.
- 통과하는 production path: scene parser material helper → shape material → `traceRay` metal/diffuse branch → recursive trace/stats.
- 이 test가 증명하는 것: grammar contract, bounded reflection mechanism, deterministic single bounce, diffuse backward compatibility.
- 이 test가 증명하지 않는 것: arbitrary multi-bounce arrangements, all CLI parsing boundaries, stochastic materials를 증명하지 않는다.
- test 성격: deterministic feature regression spanning parser and tracing.
- 막는 regression: unknown token defaulting, depth boundary drift, missing/decremented counter error, diffuse golden change.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- in-memory parser cases에서 omitted material과 explicit diffuse/metal을 각 shape directive별로 어떻게 구성하는지 기록합니다.
- unknown material case의 expected `ParseError`와 source location assertion을 확인합니다.
- one-surface mirror scene의 geometry/background/albedo/lighting setup을 기록합니다.
- depth zero expected black과 depth one expected background × albedo assertion을 actual values로 확인합니다.
- repeat trace의 exact result equality와 exactly one secondary ray assertion을 기록합니다.
- existing all-diffuse scene checksum golden이 어떤 API path로 실행되는지 확인합니다.

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

- 이전 Thread commit: `a90130a5b030`
- 다음 Thread commit: `3aa806753cc4`
- 비교 지침: feature/parser commits의 contracts를 하나의 suite가 어떻게 나눠 검사하는지 test case별 production path를 분리합니다.
- 직접 작성한 연결 설명:

### 5.4 `3aa806753cc4` — `feat(cli): 반사 깊이 option과 기본값 추가`

- Importance: B
- Tags: CLI, MATERIAL
- Thread order: 4/4

#### Source에서 확정된 역할

- Development Thread role: Exposes reflection depth through the CLI and adopts a default of four.
- Classification summary: Adds `--max-depth 0..32` and changes the default reflection depth to four.
- Importance rationale: The flag makes recursive rendering configurable, but the material mechanism and depth semantics were established earlier.

#### 해당 SHA에서 확인할 실제 코드

- CLI option loop에서 `--max-depth` duplicate tracking과 next-argument consumption을 확인합니다.
- shared bounded unsigned parser가 full decimal conversion, malformed/negative input, inclusive max 32를 어떻게 검사하는지 기록합니다.
- missing value와 out-of-range value가 usage error status 2로 가는 경로를 확인합니다.
- `RenderSettings` default depth가 one에서 four로 바뀌는 initialization을 기록합니다.
- parsed depth가 CLI execution path에서 renderer setting과 recursive `traceRay`까지 전달되는 caller chain을 추적합니다.
- depth zero를 explicit하게 허용하면서 arbitrary large recursion을 32로 제한하는 boundary를 기록합니다.

#### Source에서 확정된 이 SHA의 경계

- CLI default는 four이며 accepted explicit range는 0..32입니다.
- malformed, missing, duplicate, out-of-range values는 renderer에 전달되지 않습니다.

#### B-level 학습 기록

- Thread에서 이 commit이 맡는 구현 역할:
- 실제 추가/수정된 핵심 symbol:
- 입력·상태·출력의 변화:
- 다음 related commit이 의존하는 결과:

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

- 이전 Thread commit: `9a352ffe8233`
- 다음 Thread commit: 이 Thread의 종료점
- 비교 지침: material feature의 internal depth contract와 비교해 이 commit은 behavior mechanism이 아니라 external configuration boundary를 추가함을 구분합니다.
- 직접 작성한 연결 설명:

## 6. Invariant ledger

source가 연결한 invariant의 시간상 변화를 실제 코드 근거로 완성합니다.

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| 재귀는 depth budget으로 종료 | 85583e1e9beb | 3aa806753cc4 | depth zero boundary | 9a352ffe8233 | 작성 |
| 기존 scene은 material 생략 시 diffuse | a90130a5b030 | 9a352ffe8233 | optional grammar가 기존 arity를 깨뜨릴 위험 | 9a352ffe8233 | 작성 |

### Ledger 보완 기록

- 각 invariant가 처음 observable behavior가 된 SHA:
- invariant를 우회하거나 깨뜨릴 수 있었던 실제 code path:
- fix 뒤 새로 금지되거나 강제된 state transition:
- test가 invariant를 직접 고정하는 assertion:
- source가 명시하지 않은 invariant를 추가했다면 삭제하거나 근거를 재확인:

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| unknown material token을 default로 삼아 오류를 숨김 | parser boundary에서 명시적 `ParseError` | 9a352ffe8233 unknown-material regression | 작성 |
| reflection chain이 제한 없이 계속됨 | depth zero black, positive depth에서 decrement | 9a352ffe8233 depth 0/1 regression | 작성 |
| new material support가 diffuse output을 바꿈 | omitted token의 diffuse default와 기존 shading branch 유지 | all-diffuse golden regression | 작성 |

### 연결 검토

- feature를 독립적인 성공 경로로만 읽지 않고 어떤 failure를 예방하는지 기록:
- fix가 기존 assumption을 어떻게 수정했는지 기록:
- test가 symptom이 아니라 root cause를 재현하는지 확인:
- test가 증명하지 않는 범위를 별도로 기록:

## 8. Ownership / state / responsibility 변화

- material이 shape에 저장되고 hit record로 전달된 뒤 tracing에서 값으로 소비되는 경로를 확인합니다.
- remaining depth가 mutable global state가 아니라 각 recursive call의 값으로 전달되는지 기록합니다.

### 학습자 최종 기록

- source state:
- derived/cache state:
- owner와 non-owner:
- mutation 또는 transition boundary:
- failure 시 복구되는 상태:

## 9. Thread 최종 상태

shape material은 diffuse 또는 perfect metal로 해석되며, metal ray는 depth budget을 하나씩 소비해 결정적으로 재귀합니다. scene token을 생략하면 diffuse가 유지되고, CLI는 0..32 범위와 default 4를 통해 recursion을 제어합니다.

### 직접 작성

- Thread 시작 시점과 종료 시점의 behavior 차이:
- 최종적으로 authoritative한 contract:
- 아직 다른 Thread가 보완해야 하는 항목:

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

`shape material value → `traceRay` diffuse/metal branch → reflected ray + decremented depth → recursive trace → albedo modulation; `.rt` optional token and CLI `--max-depth` supply the runtime state`

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
