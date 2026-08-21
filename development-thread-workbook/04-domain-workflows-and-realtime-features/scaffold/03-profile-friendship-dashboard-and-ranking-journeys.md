# Profile·friendship·dashboard·ranking journey

- 카테고리: `04-domain-workflows-and-realtime-features` — 도메인 워크플로와 실시간 기능
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

repository read model과 API route를 browser profile, friend action, dashboard, leaderboard UI로 연결하고 fabricated metric/sample fallback을 제거하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- profile/dashboard/ranking은 repository-backed read model에서 파생되며 fabricated metric을 사용하지 않습니다.
- friend mutation target은 route에서 조회한 canonical user identity로 결정됩니다.
- empty history와 request failure는 명시적인 상태로 표현됩니다.

## 2. 핵심 질문

- public profile과 current-user dashboard는 identity/visibility 면에서 어떻게 다릅니까?
- recent match ordering이 streak, rating history, profile result를 계산하는 공통 근거가 됩니까?
- route handle, authenticated user ID, friend target ID가 섞이지 않도록 어떤 adapter를 사용합니까?
- 데이터가 없거나 요청이 실패한 상태를 sample 성공 상태와 구분하는 UI branch는 무엇입니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `c5b96a06925c` | `feat(db): 프로필 조회와 변경 저장 구현` | B | PERSISTENCE | public profile read와 authenticated update를 repository에 추가합니다. |
| 2 | `0364c42f776b` | `feat(db): 순위 조회 구현` | B | PERSISTENCE | leaderboard projection과 ordering을 추가합니다. |
| 3 | `c7ea1ff241c8` | `feat(db): 최근 경기와 대시보드 조회 구현` | B | PERSISTENCE | recent match와 dashboard aggregate를 구현합니다. |
| 4 | `0bcc487d949f` | `feat(api): 프로필과 친구 리소스 라우트 추가` | B | PERSISTENCE | public profile/dashboard와 identity-bound friendship API를 노출합니다. |
| 5 | `cbe876359d31` | `feat(web): 플레이어 대시보드 구현` | B | WEB | dashboard read model을 시각화하는 route를 구현합니다. |
| 6 | `cb295396771f` | `feat(web): 순위표 화면 추가` | B | WEB | rank, rating, record, win rate를 leaderboard route에 렌더링합니다. |
| 7 | `0afc0a0694bd` | `feat(web): 공개 프로필 화면 추가` | B | WEB | handle-scoped public profile route를 추가합니다. |
| 8 | `051eac1b4aee` | `feat(profile): 친구 요청 동작 연결` | B | AUTH, WEB | profile route의 target identity를 friend request mutation에 연결합니다. |
| 9 | `035b97ca7c58` | `fix(db): 최근 경기에서 최고 연승 계산` | B | PERSISTENCE | fabricated formula 대신 실제 match order/result에서 best streak를 계산합니다. |
| 10 | `6b661420e060` | `test(db): 최고 연승 계산 검증` | B | PERSISTENCE, TEST | win ordering과 loss reset rule을 검증합니다. |
| 11 | `3c6c9134ee94` | `fix(dashboard): 빈 rating history를 정확히 표시` | B | PERSISTENCE, WEB | history가 없을 때 임의 chart를 만들지 않고 evidence absence를 표시합니다. |
| 12 | `51e66cf1df80` | `fix(profile): 공개 프로필 상태 표현 개선` | B | PERSISTENCE, WEB | recent match result/opponent/score와 explicit empty state를 렌더링합니다. |
| 13 | `c17e7ad0fd84` | `feat(web): profile과 friend 조회 query 추가` | B | WEB | own profile/friend list용 schema-validated helper와 scoped query option을 추가합니다. |
| 14 | `8bc4d0cc32bd` | `test(web): profile과 friend 조회 규칙 검증` | B | AUTH, WEB, TEST | request identity와 query ownership을 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): 프로필 조회와 변경 저장 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `c5b96a06925c` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | public profile read와 authenticated update를 repository에 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `0364c42f776b` — `feat(db): 순위 조회 구현`

### 5.2. `feat(db): 순위 조회 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `0364c42f776b` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | leaderboard projection과 ordering을 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `c5b96a06925c` — `feat(db): 프로필 조회와 변경 저장 구현`
- 다음 관련 SHA: `c7ea1ff241c8` — `feat(db): 최근 경기와 대시보드 조회 구현`

### 5.3. `feat(db): 최근 경기와 대시보드 조회 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `c7ea1ff241c8` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | recent match와 dashboard aggregate를 구현합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `0364c42f776b` — `feat(db): 순위 조회 구현`
- 다음 관련 SHA: `0bcc487d949f` — `feat(api): 프로필과 친구 리소스 라우트 추가`

### 5.4. `feat(api): 프로필과 친구 리소스 라우트 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `0bcc487d949f` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | public profile/dashboard와 identity-bound friendship API를 노출합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `c7ea1ff241c8` — `feat(db): 최근 경기와 대시보드 조회 구현`
- 다음 관련 SHA: `cbe876359d31` — `feat(web): 플레이어 대시보드 구현`

### 5.5. `feat(web): 플레이어 대시보드 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `cbe876359d31` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | dashboard read model을 시각화하는 route를 구현합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `0bcc487d949f` — `feat(api): 프로필과 친구 리소스 라우트 추가`
- 다음 관련 SHA: `cb295396771f` — `feat(web): 순위표 화면 추가`

### 5.6. `feat(web): 순위표 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `cb295396771f` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | rank, rating, record, win rate를 leaderboard route에 렌더링합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `cbe876359d31` — `feat(web): 플레이어 대시보드 구현`
- 다음 관련 SHA: `0afc0a0694bd` — `feat(web): 공개 프로필 화면 추가`

### 5.7. `feat(web): 공개 프로필 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `0afc0a0694bd` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | handle-scoped public profile route를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `cb295396771f` — `feat(web): 순위표 화면 추가`
- 다음 관련 SHA: `051eac1b4aee` — `feat(profile): 친구 요청 동작 연결`

### 5.8. `feat(profile): 친구 요청 동작 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `051eac1b4aee` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | profile route의 target identity를 friend request mutation에 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `0afc0a0694bd` — `feat(web): 공개 프로필 화면 추가`
- 다음 관련 SHA: `035b97ca7c58` — `fix(db): 최근 경기에서 최고 연승 계산`

### 5.9. `fix(db): 최근 경기에서 최고 연승 계산`

| 항목 | 값 |
| --- | --- |
| SHA | `035b97ca7c58` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | fabricated formula 대신 실제 match order/result에서 best streak를 계산합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [작성] |
| 실제 실패 또는 위험 | [작성] |
| Root cause | [작성] |
| 수정된 invariant | [작성] |
| 변경 코드 | [SHA·파일·심볼 작성] |
| Regression evidence | [후속 test SHA·fixture 작성] |

비교 기준:
- 직전 관련 SHA: `051eac1b4aee` — `feat(profile): 친구 요청 동작 연결`
- 다음 관련 SHA: `6b661420e060` — `test(db): 최고 연승 계산 검증`

### 5.10. `test(db): 최고 연승 계산 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `6b661420e060` |
| Importance | B |
| Tags | PERSISTENCE, TEST |
| Source에서 확정된 역할 | win ordering과 loss reset rule을 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- 테스트가 주입하는 입력·시간·동시성·오류와 실제 production path를 구분해 기록합니다.
- 테스트가 증명하는 범위와 실제 process/network/database까지는 증명하지 않는 범위를 함께 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [unit/integration/concurrency/failure injection/process/browser/load 중 구분] |
| 통과하는 production path | [caller 순서 작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

비교 기준:
- 직전 관련 SHA: `035b97ca7c58` — `fix(db): 최근 경기에서 최고 연승 계산`
- 다음 관련 SHA: `3c6c9134ee94` — `fix(dashboard): 빈 rating history를 정확히 표시`

### 5.11. `fix(dashboard): 빈 rating history를 정확히 표시`

| 항목 | 값 |
| --- | --- |
| SHA | `3c6c9134ee94` |
| Importance | B |
| Tags | PERSISTENCE, WEB |
| Source에서 확정된 역할 | history가 없을 때 임의 chart를 만들지 않고 evidence absence를 표시합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [작성] |
| 실제 실패 또는 위험 | [작성] |
| Root cause | [작성] |
| 수정된 invariant | [작성] |
| 변경 코드 | [SHA·파일·심볼 작성] |
| Regression evidence | [후속 test SHA·fixture 작성] |

비교 기준:
- 직전 관련 SHA: `6b661420e060` — `test(db): 최고 연승 계산 검증`
- 다음 관련 SHA: `51e66cf1df80` — `fix(profile): 공개 프로필 상태 표현 개선`

### 5.12. `fix(profile): 공개 프로필 상태 표현 개선`

| 항목 | 값 |
| --- | --- |
| SHA | `51e66cf1df80` |
| Importance | B |
| Tags | PERSISTENCE, WEB |
| Source에서 확정된 역할 | recent match result/opponent/score와 explicit empty state를 렌더링합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [작성] |
| 실제 실패 또는 위험 | [작성] |
| Root cause | [작성] |
| 수정된 invariant | [작성] |
| 변경 코드 | [SHA·파일·심볼 작성] |
| Regression evidence | [후속 test SHA·fixture 작성] |

비교 기준:
- 직전 관련 SHA: `3c6c9134ee94` — `fix(dashboard): 빈 rating history를 정확히 표시`
- 다음 관련 SHA: `c17e7ad0fd84` — `feat(web): profile과 friend 조회 query 추가`

### 5.13. `feat(web): profile과 friend 조회 query 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `c17e7ad0fd84` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | own profile/friend list용 schema-validated helper와 scoped query option을 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `51e66cf1df80` — `fix(profile): 공개 프로필 상태 표현 개선`
- 다음 관련 SHA: `8bc4d0cc32bd` — `test(web): profile과 friend 조회 규칙 검증`

### 5.14. `test(web): profile과 friend 조회 규칙 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `8bc4d0cc32bd` |
| Importance | B |
| Tags | AUTH, WEB, TEST |
| Source에서 확정된 역할 | request identity와 query ownership을 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- 테스트가 주입하는 입력·시간·동시성·오류와 실제 production path를 구분해 기록합니다.
- 테스트가 증명하는 범위와 실제 process/network/database까지는 증명하지 않는 범위를 함께 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [unit/integration/concurrency/failure injection/process/browser/load 중 구분] |
| 통과하는 production path | [caller 순서 작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

비교 기준:
- 직전 관련 SHA: `c17e7ad0fd84` — `feat(web): profile과 friend 조회 query 추가`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| profile/dashboard/ranking은 repository-backed read model에서 파생되며 fabricated metric을 사용하지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| friend mutation target은 route에서 조회한 canonical user identity로 결정됩니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| empty history와 request failure는 명시적인 상태로 표현됩니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| profile identity | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| recent match ordering | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| dashboard aggregate | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| leaderboard projection | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| friend mutation target | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| empty/error UI state | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

- 최종 authoritative owner: [작성]
- 최종 상태/invariant: [작성]
- 남아 있는 의도적 제한 또는 비보장: [작성]
- 다른 Thread가 의존하는 contract: [작성]
- 대표 코드 근거: [SHA·파일·심볼 작성]

## 10. 최종 execution flow

```text
[입력/이벤트]
    ↓
[검증·권한·소유권 경계]
    ↓
[상태 전이·DB 작업·브라우저 반영]
    ↓
[출력·관측·rollback·cleanup]
```

## 11. 학습 완료 자가 점검

- [ ] 모든 SHA를 지정 브랜치에서 확인했습니다.
- [ ] commit subject, importance, tags를 변경하지 않았습니다.
- [ ] final HEAD 코드를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B/C에 맞게 조사 깊이를 구분했습니다.
- [ ] fix와 test를 실제 production path에 연결했습니다.
- [ ] 실행하지 않은 명령의 결과를 작성하지 않았습니다.
- [ ] Thread 최종 owner와 execution flow를 실제 근거로 설명할 수 있습니다.
