# Thread: Technology stack icon, list, and marquee

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 원본 7개 Development Thread를 변경하지 않고, 같은 branch history를 웹 개발 학습 영역별로 추가 분류한 확장 scaffold입니다.

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 `commit/commit-importance.md`의 분류를 사용합니다.
- 이 문서의 category, thread grouping, thread goal과 commit별 역할은 확장 계획에서 새로 정의했습니다.
- 실제 code evidence, failure 재현, command 결과와 최종 설명은 학습자가 해당 SHA를 직접 확인해 채웁니다.
- 다른 branch의 구현이나 final HEAD를 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

Canonical technology ID가 simple-icons mapping, fallback SVG, bounded stack list와 motion-aware marquee로 렌더링되는 과정을 복원합니다.

### 계획된 핵심 invariant

- `Technology stack icon, list, and marquee`의 주요 결정은 route/design/component마다 중복 해석되지 않고 명시된 owner에 위치합니다.
- Optional, disabled, unknown, empty 또는 unsupported state는 암묵적 성공으로 처리하지 않습니다.
- 마지막 consumer와 regression evidence는 같은 production decision path를 기준으로 확인합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 첫 commit 직전에는 이 관심사가 어느 파일과 consumer에 분산돼 있었는가?
- Commit sequence를 따라가며 데이터, 상태, 렌더링 또는 routing의 실제 owner가 어떻게 이동하는가?
- Optional, disabled, unknown, empty, unsupported state는 각 시점에 어떻게 처리되는가?
- 마지막 commit이 보장하는 것과 여전히 다른 thread가 책임지는 범위는 무엇인가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 변경 파일과 symbol을 확인했습니다.
- 중앙화된 결정과 renderer/component에 남은 표현 책임을 구분했습니다.
- Failure, absence, fallback, cleanup 또는 progressive-enhancement branch를 기록했습니다.
- 관련 test가 있으면 production path, technique, proves/does-not-prove를 구분했습니다.
- 최종 실행 흐름을 코드 없이 설명할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 확장 thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `ebc245105c03` | feat(stack): 기술 스택 아이콘 매핑 추가 | B | RENDERER | 초기 상태와 vocabulary를 고정합니다. |
| 2 | `3d9b847d8094` | feat(stack): 기술 스택 폴백 아이콘 추가 | B | RENDERER | 기능·책임 경계를 확장합니다. |
| 3 | `6aa8ee3b90b1` | feat(stack): 공용 기술 스택 목록 추가 | B | RENDERER | 기능·책임 경계를 확장합니다. |
| 4 | `48559efebf68` | feat(stack): 기술 스택 마키 프리미티브 추가 | B | RENDERER | 기능·책임 경계를 확장합니다. |
| 5 | `3b9c1a636356` | style(stack): 기술 스택 마키 동작 추가 | B | RENDERER | Thread의 통합·검증 상태를 확인합니다. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA의 tree와 parent diff를 기준으로 작성합니다. 같은 commit이 다른 확장 thread에 다시 등장해도 이 thread의 관점에서 별도로 확인합니다.

### 1. `ebc245105c03` — feat(stack): 기술 스택 아이콘 매핑 추가

- **Importance:** B
- **Tags:** RENDERER
- **확장 thread에서의 역할:** 초기 상태/기반

#### 해당 SHA에서 확인할 실제 코드

- `ebc245105c03^`와 `ebc245105c03`의 first-parent diff에서 변경 파일과 핵심 symbol을 확인합니다.
- Resulting tree에서 새 symbol의 caller/callee와 data/state ownership을 추적합니다.
- Commit이 추가한 입력, 출력, optional/disabled/unknown state와 integration point를 확인합니다.
- 이 SHA가 보장하는 범위와 후속 commit에 남긴 미완성 범위를 기록합니다.

확인 원칙:

- 먼저 `ebc245105c03^`와 `ebc245105c03`를 비교합니다.
- Final HEAD의 helper, test, file layout을 이 commit에 소급하지 않습니다.
- 실행하지 않은 command 결과는 정적 검토와 구분합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** exact SHA, command, environment와 실제 결과를 기록합니다.
- **다음 commit 연결:** 남은 문제나 확장 지점을 기록합니다.

### 2. `3d9b847d8094` — feat(stack): 기술 스택 폴백 아이콘 추가

- **Importance:** B
- **Tags:** RENDERER
- **확장 thread에서의 역할:** 기능·경계 확장

#### 해당 SHA에서 확인할 실제 코드

- `3d9b847d8094^`와 `3d9b847d8094`의 first-parent diff에서 변경 파일과 핵심 symbol을 확인합니다.
- Resulting tree에서 새 symbol의 caller/callee와 data/state ownership을 추적합니다.
- Commit이 추가한 입력, 출력, optional/disabled/unknown state와 integration point를 확인합니다.
- 이 SHA가 보장하는 범위와 후속 commit에 남긴 미완성 범위를 기록합니다.

확인 원칙:

- 먼저 `3d9b847d8094^`와 `3d9b847d8094`를 비교합니다.
- Final HEAD의 helper, test, file layout을 이 commit에 소급하지 않습니다.
- 실행하지 않은 command 결과는 정적 검토와 구분합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** exact SHA, command, environment와 실제 결과를 기록합니다.
- **다음 commit 연결:** 남은 문제나 확장 지점을 기록합니다.

### 3. `6aa8ee3b90b1` — feat(stack): 공용 기술 스택 목록 추가

- **Importance:** B
- **Tags:** RENDERER
- **확장 thread에서의 역할:** 기능·경계 확장

#### 해당 SHA에서 확인할 실제 코드

- `6aa8ee3b90b1^`와 `6aa8ee3b90b1`의 first-parent diff에서 변경 파일과 핵심 symbol을 확인합니다.
- Resulting tree에서 새 symbol의 caller/callee와 data/state ownership을 추적합니다.
- Commit이 추가한 입력, 출력, optional/disabled/unknown state와 integration point를 확인합니다.
- 이 SHA가 보장하는 범위와 후속 commit에 남긴 미완성 범위를 기록합니다.

확인 원칙:

- 먼저 `6aa8ee3b90b1^`와 `6aa8ee3b90b1`를 비교합니다.
- Final HEAD의 helper, test, file layout을 이 commit에 소급하지 않습니다.
- 실행하지 않은 command 결과는 정적 검토와 구분합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** exact SHA, command, environment와 실제 결과를 기록합니다.
- **다음 commit 연결:** 남은 문제나 확장 지점을 기록합니다.

### 4. `48559efebf68` — feat(stack): 기술 스택 마키 프리미티브 추가

- **Importance:** B
- **Tags:** RENDERER
- **확장 thread에서의 역할:** 기능·경계 확장

#### 해당 SHA에서 확인할 실제 코드

- `48559efebf68^`와 `48559efebf68`의 first-parent diff에서 변경 파일과 핵심 symbol을 확인합니다.
- Resulting tree에서 새 symbol의 caller/callee와 data/state ownership을 추적합니다.
- Commit이 추가한 입력, 출력, optional/disabled/unknown state와 integration point를 확인합니다.
- 이 SHA가 보장하는 범위와 후속 commit에 남긴 미완성 범위를 기록합니다.

확인 원칙:

- 먼저 `48559efebf68^`와 `48559efebf68`를 비교합니다.
- Final HEAD의 helper, test, file layout을 이 commit에 소급하지 않습니다.
- 실행하지 않은 command 결과는 정적 검토와 구분합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** exact SHA, command, environment와 실제 결과를 기록합니다.
- **다음 commit 연결:** 남은 문제나 확장 지점을 기록합니다.

### 5. `3b9c1a636356` — style(stack): 기술 스택 마키 동작 추가

- **Importance:** B
- **Tags:** RENDERER
- **확장 thread에서의 역할:** 통합·검증

#### 해당 SHA에서 확인할 실제 코드

- `3b9c1a636356^`와 `3b9c1a636356`의 first-parent diff에서 변경 파일과 핵심 symbol을 확인합니다.
- Resulting tree에서 새 symbol의 caller/callee와 data/state ownership을 추적합니다.
- 적용 selector, token, breakpoint, motion/focus/semantics 영향과 DOM contract를 확인합니다.
- Visual change가 interaction 또는 accessibility invariant를 바꾸는지 구분합니다.

확인 원칙:

- 먼저 `3b9c1a636356^`와 `3b9c1a636356`를 비교합니다.
- Final HEAD의 helper, test, file layout을 이 commit에 소급하지 않습니다.
- 실행하지 않은 command 결과는 정적 검토와 구분합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** exact SHA, command, environment와 실제 결과를 기록합니다.
- **다음 commit 연결:** 남은 문제나 확장 지점을 기록합니다.

## 6. Invariant ledger

| Invariant | 도입·강화 commit | 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| `Technology stack icon, list, and marquee`의 핵심 결정은 한 owner가 수행합니다. |  |  |  |  |
| Optional/disabled/unknown state는 explicit policy로 처리됩니다. |  |  |  |  |
| Consumer와 regression evidence는 동일 production path를 사용합니다. |  |  |  |  |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 위험 | 대응 commit | 실제 수정/강화 code에서 확인할 것 | Test 또는 실행 증거 |
| --- | --- | --- | --- |
| Caller/renderer마다 같은 결정을 다시 수행함 |  | 중앙화된 owner와 제거된 local logic |  |
| Empty/unknown/disabled state가 정상 값처럼 흘러감 |  | explicit branch, fallback, omission 또는 error |  |
| 구현은 존재하지만 regression evidence가 없음 |  | production path를 직접 통과하는 test/command |  |

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| 입력 또는 source state |  |  |  |
| 파생·선택·정렬·fallback |  |  |  |
| Route/component/rendering |  |  |  |
| Failure/absence 처리 |  |  |  |
| Regression evidence |  |  |  |

## 9. Thread 최종 상태

### 확장 계획에서 정의한 최종 상태

Canonical technology ID가 simple-icons mapping, fallback SVG, bounded stack list와 motion-aware marquee로 렌더링되는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- Thread 시작 시점의 설계와 위험:
- 핵심 decision과 responsibility 이동 순서:
- 실제 failure, absence 또는 performance/accessibility risk:
- Fix/refactor가 바꾼 invariant:
- Test/browser evidence가 보장한 범위:
- Thread 종료 시점에도 보장하지 않는 범위:

## 10. 최종 architecture 또는 execution flow 정리

1. 초기 source/state를 읽거나 구성합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
2. 공용 boundary가 validation, selection, normalization 또는 state resolution을 수행합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
3. Route/component/view model이 필요한 형태로 데이터를 준비합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
4. Renderer 또는 browser interaction이 결과를 소비합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
5. Test 또는 실행 command가 production invariant를 검증합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:

### 코드 없이 설명하기

> 이 Thread의 최종 흐름을 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서로 작성합니다.

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA가 `web/portfolio` ancestry에 속하는지 확인했습니다.
- [ ] 각 commit의 parent diff와 resulting tree를 확인했습니다.
- [ ] Importance에 따라 S/A/B/C 학습 깊이를 구분했습니다.
- [ ] Fix를 기존 가정 → failure → root cause → corrected invariant로 설명했습니다.
- [ ] Test의 technique, production path, proves/does-not-prove를 구분했습니다.
- [ ] Final HEAD를 과거 commit에 소급하지 않았습니다.
- [ ] Thread 최종 흐름을 코드 없이 설명할 수 있습니다.
