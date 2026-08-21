# Thread: Container packaging and runtime verification

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 원본 7개 Development Thread를 변경하지 않고, 같은 branch history에 product-delivery 관점을 추가한 확장 scaffold입니다.

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 `commit/commit-importance.md`의 분류를 사용합니다.
- 이 문서의 category, thread grouping, thread goal과 commit별 역할은 확장 계획에서 새로 정의했습니다.
- 실제 code evidence, build/test command 결과와 최종 설명은 학습자가 해당 SHA를 직접 확인해 채웁니다.
- 다른 branch의 구현이나 final HEAD를 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

검증된 standalone artifact를 multi-stage Docker image로 패키징하고 non-root 실행, route 응답, content-derived public asset 제공까지 실제 container HTTP 경로에서 검증하는 과정을 복원합니다.

### 계획된 핵심 invariant

- container build는 repository의 pinned runtime과 verified standalone artifact를 사용합니다.
- runtime image는 root가 아닌 `node` 사용자로 실행되고 필요한 static/public asset을 포함합니다.
- 전달 검증은 image 생성 자체가 아니라 시작된 container에 HTTP 요청을 보내 route와 content-referenced asset을 확인합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 직전 단계에서 source가 “개발 가능한 상태”였더라도 왜 “전달 가능한 artifact”라고 할 수 없었는가?
- Toolchain, build output, CI, performance gate 또는 runtime의 실제 owner는 각 SHA에서 어디에 있는가?
- 어떤 failure가 source-level test로는 잡히지 않고 production artifact 또는 container에서만 드러나는가?
- Local verification과 CI가 같은 command/artifact를 사용하는 지점은 어디이며, 다른 환경 가정은 무엇인가?
- 마지막 commit이 보장하는 delivery 범위와 여전히 외부 hosting/operations가 책임지는 범위는 무엇인가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 변경 파일과 build/runtime symbol을 확인했습니다.
- Source, generated artifact, CI gate, container/runtime owner를 구분했습니다.
- Missing artifact, build portability, threshold violation, startup failure와 cleanup branch를 기록했습니다.
- Test/CI command의 production path, technique, proves/does-not-prove를 구분했습니다.
- 최종 product-delivery 흐름을 코드 없이 설명할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 확장 thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `b87a2b453741` | build(docker): public 자산을 포함한 비루트 standalone image 추가 | A | DEPLOY | multi-stage build로 standalone/static/public만 담고 non-root runtime image를 구성합니다. |
| 2 | `b94fa6dd0118` | test(docker): runtime route와 public 자산 검증 자동화 | A | ARCH, VALIDATION, ROUTING | 실제 container를 기동해 non-root user, HTML routes, content-derived asset와 MIME을 검증하고 cleanup까지 자동화합니다. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA의 tree와 parent diff를 기준으로 작성합니다. 같은 commit이 다른 category에 다시 등장해도 여기서는 product delivery 관점에서 별도로 확인합니다.

### 1. `b87a2b453741` — build(docker): public 자산을 포함한 비루트 standalone image 추가

- **Importance:** A
- **Tags:** DEPLOY
- **확장 thread에서의 역할:** 초기 전달 경계 — multi-stage build로 standalone/static/public만 담고 non-root runtime image를 구성합니다.

#### 해당 SHA에서 확인할 실제 코드

- `b87a2b453741^`와 `b87a2b453741`의 first-parent diff에서 변경 파일과 핵심 build/test/runtime entry point를 확인합니다.
- Resulting tree에서 해당 설정·script·artifact의 caller/consumer와 실행 순서를 추적합니다.
- Build configuration, generated artifact/manifest, command entry point와 downstream consumer를 확인합니다.
- 정상 output과 missing/unsupported output이 어떻게 구분되고 실패로 전환되는지 확인합니다.

확인 원칙:

- 먼저 `b87a2b453741^`와 `b87a2b453741`를 비교합니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- 실제 실행하지 않은 build/test/CI/Docker 결과는 code inspection과 구분합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 |  |
| 실제 변경 file/symbol/command/artifact |  |
| Build/runtime/resource owner |  |
| Failure·missing output·cleanup 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 delivery commit 또는 관련 test 연결 |  |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** 경로, command/config, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** build decision, artifact boundary, failure branch 또는 cleanup을 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** exact SHA, command, environment와 실제 결과를 기록합니다.
- **다음 commit 연결:** 아직 검증되지 않은 artifact, portability 또는 runtime risk를 기록합니다.

### 2. `b94fa6dd0118` — test(docker): runtime route와 public 자산 검증 자동화

- **Importance:** A
- **Tags:** ARCH, VALIDATION, ROUTING
- **확장 thread에서의 역할:** 회귀·artifact 검증 — 실제 container를 기동해 non-root user, HTML routes, content-derived asset와 MIME을 검증하고 cleanup까지 자동화합니다.

#### 해당 SHA에서 확인할 실제 코드

- `b94fa6dd0118^`와 `b94fa6dd0118`의 first-parent diff에서 변경 파일과 핵심 build/test/runtime entry point를 확인합니다.
- Resulting tree에서 해당 설정·script·artifact의 caller/consumer와 실행 순서를 추적합니다.
- 대상 production invariant, fixture 또는 failure boundary, test technique와 실제 production path를 구분합니다.
- Test가 증명하는 것과 증명하지 않는 것을 명시하고, 실제 command 실행 여부를 별도로 기록합니다.

확인 원칙:

- 먼저 `b94fa6dd0118^`와 `b94fa6dd0118`를 비교합니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- 실제 실행하지 않은 build/test/CI/Docker 결과는 code inspection과 구분합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 |  |
| 실제 변경 file/symbol/command/artifact |  |
| Build/runtime/resource owner |  |
| Failure·missing output·cleanup 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 delivery commit 또는 관련 test 연결 |  |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** 경로, command/config, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** build decision, artifact boundary, failure branch 또는 cleanup을 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** exact SHA, command, environment와 실제 결과를 기록합니다.
- **다음 commit 연결:** 아직 검증되지 않은 artifact, portability 또는 runtime risk를 기록합니다.

## 6. Invariant ledger

| Invariant | 도입·강화 commit | 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| container build는 repository의 pinned runtime과 verified standalone artifact를 사용합니다. |  |  |  |  |
| runtime image는 root가 아닌 `node` 사용자로 실행되고 필요한 static/public asset을 포함합니다. |  |  |  |  |
| 전달 검증은 image 생성 자체가 아니라 시작된 container에 HTTP 요청을 보내 route와 content-referenced asset을 확인합니다. |  |  |  |  |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 위험 | 대응 commit | 실제 수정/강화 code에서 확인할 것 | Test/CI/runtime 증거 |
| --- | --- | --- | --- |
| 개발 환경에서는 동작하지만 fresh production build에서 실패할 수 있음 |  | pinned/self-contained build boundary |  |
| build 성공만으로 전달 artifact의 완전성을 가정함 |  | explicit artifact verification |  |
| 측정/검증은 존재하지만 release를 막지 못함 |  | CI gate 또는 fail-closed threshold |  |

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 file/symbol/command |
| --- | --- | --- | --- |
| Toolchain/build configuration |  |  |  |
| Generated production artifact |  |  |  |
| Verification/failure decision |  |  |  |
| Runtime/resource lifecycle |  |  |  |
| CI/release blocker |  |  |  |

## 9. Thread 최종 상태

### 확장 계획에서 정의한 최종 상태

검증된 standalone artifact를 multi-stage Docker image로 패키징하고 non-root 실행, route 응답, content-derived public asset 제공까지 실제 container HTTP 경로에서 검증하는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- Thread 시작 시점의 delivery 상태와 위험:
- Build/artifact/runtime responsibility 이동 순서:
- 실제 failure 또는 portability/release risk:
- Fix/build/CI가 바꾼 invariant:
- Test/CI/runtime evidence가 보장한 범위:
- Thread 종료 시점에도 보장하지 않는 hosting/operations 범위:

## 10. 최종 product-delivery flow 정리

1. Source와 pinned toolchain에서 production build를 시작합니다.
   - 실제 코드/설정 위치:
   - 입력과 출력:
   - 실패 처리:
2. Build가 deployable artifact와 static/public asset을 생성합니다.
   - 실제 코드/설정 위치:
   - 입력과 출력:
   - 실패 처리:
3. Artifact verification 또는 release budget이 결과를 검사합니다.
   - 실제 코드/설정 위치:
   - 입력과 출력:
   - 실패 처리:
4. CI가 같은 production decision path를 release gate로 실행합니다.
   - 실제 workflow 위치:
   - 입력과 출력:
   - 실패 처리:
5. 최종 runtime artifact가 실제 HTTP 요청을 처리합니다.
   - 실제 코드/설정 위치:
   - 입력과 출력:
   - startup/cleanup 처리:

### 코드 없이 설명하기

> 이 Thread의 최종 흐름을 source → build → artifact → verification → release/runtime 순서로 작성합니다.

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA가 `web/portfolio` ancestry에 속하는지 확인했습니다.
- [ ] 각 commit의 parent diff와 resulting tree를 확인했습니다.
- [ ] Importance에 따라 S/A/B/C 학습 깊이를 구분했습니다.
- [ ] Fix를 기존 가정 → failure → root cause → corrected invariant로 설명했습니다.
- [ ] Test/CI의 technique, production path, proves/does-not-prove를 구분했습니다.
- [ ] 실행하지 않은 build/test/Docker 결과를 fabricated evidence로 기록하지 않았습니다.
- [ ] Final HEAD를 과거 commit에 소급하지 않았습니다.
- [ ] Thread 최종 product-delivery 흐름을 코드 없이 설명할 수 있습니다.
