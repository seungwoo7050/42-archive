# 한국어 기술 문서 번역 품질 게이트

## 1. 목적

이 문서는 검증이 완료된 영문 기술 문서를 한국어로 번역·교정한 뒤,
저장소에 커밋하기 전에 수행해야 하는 품질 검증 기준을 정의한다.

이 게이트의 목적은 번역문의 기술적 사실을 다시 검증하는 것이 아니다.
영문 원문을 정본(source of truth)으로 간주하고 다음 사항을 확인한다.

- 원문의 구조와 정보가 누락되지 않았는가
- 번역 과정에서 기술적으로 의미 있는 식별자가 손상되지 않았는가
- 원문의 구조화된 데이터가 그대로 보존되었는가
- 본문이 과도하게 축약되거나 일부만 번역되지 않았는가
- Markdown 구조가 손상되지 않았는가
- 한국어 특성에 따른 자연스러운 문자 수 감소를 오류로 잘못 판정하지 않는가

이 게이트는 번역 품질에 대한 완전한 의미 검증을 대신하지 않는다.
자동 검증으로 확인할 수 있는 구조적 무결성과 번역 완전성을 우선적으로 검사하고,
자동 판정이 어려운 이상치는 `REVIEW` 상태로 분리한다.

---

## 2. 전제

검증 대상에는 다음 두 문서가 존재한다고 가정한다.

- 검증이 완료된 영문 원문
- 영문 원문을 기준으로 작성한 한국어 번역본

영문 원문은 기술적 사실, 분류, 구조 및 설명 내용이 확정된 문서로 취급한다.

따라서 이 게이트에서는 다음 작업을 수행하지 않는다.

- 소스 코드 검증
- Git 히스토리 재분석
- 커밋 중요도 재평가
- 기술적 사실의 외부 검증
- 태그 재분류
- 아키텍처 재해석
- 원문에 없는 정보 추가

한국어 문서는 원문의 의미와 정보를 유지하면서
자연스러운 한국어 기술 문체로 현지화하는 것을 목표로 한다.

---

## 3. 기본 원칙

### 3.1 구조와 의미 보존을 문자 수보다 우선한다

영어와 한국어는 동일한 의미를 표현하는 데 필요한 문자 수가 크게 다르다.

예를 들어 다음과 같은 영어 기술 용어는 한국어에서 훨씬 짧게 표현될 수 있다.

- `initialization` → `초기화`
- `configuration` → `설정`
- `authentication` → `인증`
- `persistent storage` → `영속 스토리지`

또한 영어의 관사, 전치사, 대명사 및 일부 반복 표현은
한국어에서는 조사나 문맥으로 자연스럽게 흡수된다.

따라서 한국어 문서의 문자 수가 영문보다 크게 감소하는 것은 정상적인 현상이며,
`char_ratio`만으로 누락이나 과도한 축약을 판정해서는 안 된다.

구조, 식별자, 문단, 문장 및 핵심 앵커가 정상적으로 보존되었다면
낮은 `char_ratio`는 언어 특성에 따른 압축으로 인정할 수 있다.

### 3.2 Hard invariant와 soft metric을 분리한다

검증 항목은 두 종류로 나눈다.

**Hard invariant**

번역 과정에서 변경되거나 손실되어서는 안 되는 항목이다.

하나라도 위반되면 문서의 무결성이 깨진 것으로 간주한다.

**Soft metric**

번역 누락이나 과도한 축약 가능성을 탐지하기 위한 휴리스틱이다.

단독 이상치는 자동 실패가 아니라 검토 대상으로 사용한다.

---

## 4. 입력 정규화

비교 전에 영문과 한국어 문서를 동일한 방식으로 정규화한다.

### 4.1 문자 인코딩

모든 문서는 UTF-8을 기준으로 처리한다.

Unicode 문자열은 NFC 방식으로 정규화한다.

문자 수는 UTF-8 byte 수가 아니라 Unicode code point 기준으로 계산한다.

한국어 한 글자는 UTF-8에서 여러 byte를 사용하므로 byte 길이를 비교 지표로 사용하지 않는다.

### 4.2 줄바꿈

다음 줄바꿈 형식을 모두 LF(`\n`)로 통일한다.

- CRLF
- CR
- LF

### 4.3 공백

비교용 표현에서 일반 prose의 줄 끝 공백은 제거할 수 있다.

그러나 다음 영역의 공백은 임의로 변경하지 않는다.

- fenced code block
- inline code
- Markdown table
- 들여쓰기가 의미를 가지는 block
- 명령어 및 코드 예제

문서 전체에 대해 무조건적인 다중 공백 축소를 적용해서는 안 된다.

---

## 5. Hard invariants

다음 항목은 자동 검증에서 우선적으로 검사한다.

### 5.1 파일 존재

영문 원문과 한국어 번역본이 모두 존재해야 한다.

빈 파일은 허용하지 않는다.

### 5.2 Markdown heading 구조

원문의 heading 구조가 번역본에도 보존되어야 한다.

heading의 텍스트 자체는 번역할 수 있으므로 문자열의 완전 일치를 요구하지 않는다.

다음 요소를 비교한다.

- heading 개수
- heading level
- heading의 상대적인 순서
- 필수 section의 존재 여부

문서 형식상 제목이 고정되어 있어야 하는 경우에는
문서별 profile에서 추가적인 exact-match 규칙을 정의할 수 있다.

### 5.3 fenced code block

Markdown code fence의 구조가 보존되어야 한다.

검사 대상:

- opening fence 수
- closing fence 수
- 전체 fenced block 수
- fence 균형 여부

코드 블록 내부 내용은 별도 규칙이 없는 한 번역하지 않는다.

### 5.4 구조화된 데이터

다음과 같이 의미가 구조에 포함된 데이터는 원문과 동일하게 보존해야 한다.

- commit SHA
- 버전 번호
- 중요도 등급
- 분류 태그
- 파일 경로
- 명령어
- URL
- API 이름
- 환경 변수명
- configuration key
- identifier
- table의 식별자 필드

문서별로 중요도가 높은 구조화 필드는 `critical anchor`로 지정한다.

`critical anchor`는 기본적으로 100% 보존해야 한다.

### 5.5 중요 식별자 순서

단순 존재 여부뿐 아니라 순서 자체가 의미를 가지는 문서에서는
critical anchor의 sequence도 비교한다.

예:

```text
abc123
↓
def456
↓
789abcd
```

위 관계가 다음처럼 바뀌면 실패다.

```text
def456
↓
abc123
↓
789abcd
```

모든 값이 존재하더라도 순서가 바뀌었기 때문이다.

### 5.6 구조화된 값의 대응 관계

서로 연관된 필드는 개별 집합이 아니라 tuple 단위로 검증한다.

예를 들어 다음 행이 있다면:

```text
(commit_sha, importance, tags)
```

각 필드의 전체 집합이 같은지만 확인해서는 안 된다.

다음 관계가 그대로 유지되어야 한다.

```text
abc123 → S → ARCH, CORE
def456 → A → TEST
```

다음과 같은 번역 결과는 실패다.

```text
abc123 → A → TEST
def456 → S → ARCH, CORE
```

SHA, 등급, 태그의 집합은 모두 같지만 의미 관계가 바뀌었기 때문이다.

---

## 6. Anchor 검증

### 6.1 Critical anchors

기술적 의미가 크고 번역 과정에서 변경되어서는 안 되는 토큰이다.

예:

* commit SHA
* 파일 경로
* 환경 변수
* 중요도 등급
* 분류 태그
* 명령어
* 명시적으로 보존 대상으로 지정한 identifier

기본 요구사항:

```text
critical_anchor_ratio = 1.00
```

하나라도 손실되거나 변경되면 `FAIL`로 처리한다.

### 6.2 General inline-code anchors

일반적인 backtick 표현도 가능한 한 보존해야 한다.

예:

```markdown
docker compose
wp-config.php
SIGTERM
mariadb_data
```

그러나 번역 과정에서 문장 구조가 바뀌면서
동일한 토큰의 반복 횟수가 일부 달라질 가능성도 있으므로
critical anchor와 별도로 관리한다.

권장 기준:

```text
inline_code_anchor_ratio >= 0.95
```

### 6.3 Multiset 비교

anchor는 단순한 `set`으로 비교하지 않는다.

예를 들어 원문에 다음 토큰이 세 번 등장할 수 있다.

```text
`wp-config.php`
`wp-config.php`
`wp-config.php`
```

번역문에 한 번만 존재해도 `set` 비교에서는 동일한 값이 존재한다고 판정된다.

따라서 등장 횟수를 포함하는 multiset 방식으로 비교한다.

구현 시에는 Python의 `collections.Counter`와 같은 자료구조를 사용할 수 있다.

---

## 7. 구조 보존 지표

Hard invariant를 모두 통과한 문서에 대해 다음 soft metric을 계산한다.

### 7.1 Paragraph ratio

```text
paragraph_ratio = KO paragraph count / EN paragraph count
```

권장 기본 범위:

```text
0.85 <= paragraph_ratio <= 1.20
```

paragraph는 일반 prose block을 기준으로 한다.

heading, table, fenced code block 등은 별도로 분류한다.

paragraph ratio는 line ratio보다 의미 보존 여부를 판단하는 데 우선한다.

### 7.2 Non-empty line ratio

```text
line_ratio = KO non-empty line count / EN non-empty line count
```

권장 관찰 범위:

```text
0.85 <= line_ratio <= 1.25
```

단, line count는 Markdown reflow나 자연스러운 문장 결합에 쉽게 영향을 받으므로
단독 실패 조건으로 사용하지 않는다.

### 7.3 Sentence ratio

```text
sentence_ratio = KO sentence count / EN sentence count
```

권장 기본 범위:

```text
0.75 <= sentence_ratio <= 1.50
```

영어와 한국어의 문장 분할 방식이 다르기 때문에 넓은 허용 범위를 둔다.

한 영문 문장을 두 개의 한국어 문장으로 나누거나,
서로 밀접한 두 문장을 하나로 결합하는 것은 자연스러운 번역일 수 있다.

### 7.4 List item ratio

목록 중심 문서에서는 bullet 및 numbered item 수를 비교한다.

권장 범위:

```text
0.90 <= list_item_ratio <= 1.10
```

목록 항목 자체가 의미 단위인 문서에서는
문서별 profile을 통해 exact-match로 강화할 수 있다.

### 7.5 Table structure

Markdown table을 사용하는 문서에서는 다음을 확인한다.

* table 개수
* column 수
* data row 수
* critical field 보존

구조화된 데이터 table의 row 수는 원칙적으로 정확히 일치해야 한다.

---

## 8. 문자 수 비율

다음 값을 참고 지표로 계산한다.

```text
char_ratio = normalized_KO_character_count
           / normalized_EN_character_count
```

문자 수에는 Markdown 문법과 보존되는 기술 식별자가 포함될 수 있다.

`char_ratio`는 번역 누락 탐지에 유용하지만
언어 간 표현 밀도 차이가 크므로 단독 합격/실패 기준으로 사용하지 않는다.

### 권장 해석

```text
char_ratio >= 0.55
```

일반적인 정상 범위로 본다.

```text
0.40 <= char_ratio < 0.55
```

한국어 특성에 따른 자연스러운 압축이 자주 발생할 수 있는 범위다.

다른 구조적 검사가 모두 정상이라면 자동 통과시킬 수 있다.

```text
char_ratio < 0.40
```

과도한 축약이나 누락 가능성을 확인하기 위한 `REVIEW` 신호로 사용한다.

이 값만으로 `FAIL` 처리하지 않는다.

예외적으로 다음과 같은 여러 지표가 동시에 심각하게 감소한다면
구조적 결손으로 판단할 수 있다.

```text
char_ratio < 0.30
AND paragraph_ratio < 0.70
AND sentence_ratio < 0.65
```

이 경우 자동 `FAIL`을 허용할 수 있다.

---

## 9. 번역되지 않은 영문 prose 탐지

한국어 문서에는 기술 용어와 고유 명칭 때문에 영어가 정상적으로 존재할 수 있다.

예:

* Docker
* MariaDB
* WordPress
* FastCGI
* PHP-FPM
* `wp-config.php`

따라서 단순 ASCII 비율이나 영문 문자 비율로 번역 누락을 판정해서는 안 된다.

대신 일반 prose block에서
여러 개의 영어 단어가 연속적으로 남아 있는 경우를 탐지한다.

예를 들어 다음은 번역 누락 후보로 볼 수 있다.

```text
The restore transaction now verifies every target resource before...
```

반면 다음은 정상이다.

```text
WordPress는 PHP-FPM을 통해 요청을 처리한다.
```

권장 방식은 다음과 같다.

```text
- code block 제외
- inline code 제외
- URL 제외
- identifier 제외
- 기술 용어 allowlist 적용
- 한글이 거의 없는 장문의 영어 prose 탐지
```

의심 문단이 발견되면 기본적으로 `REVIEW` 처리한다.

명백하게 원문의 전체 paragraph가 번역되지 않은 경우에는 `FAIL` 처리할 수 있다.

---

## 10. 판정 상태

최종 상태는 다음 네 단계로 구분한다.

### PASS

다음 조건을 모두 만족한다.

```text
- 모든 hard invariant 통과
- critical anchor 100% 보존
- 일반 anchor 기준 충족
- 주요 구조 지표 정상
- 번역되지 않은 일반 영어 prose 없음
- char_ratio >= 0.55
```

### PASS_LANG_COMP

언어 특성에 따른 자연스러운 문자 수 감소가 확인된 정상 문서다.

다음 조건을 모두 만족한다.

```text
- 모든 hard invariant 통과
- critical anchor 100% 보존
- 일반 anchor 기준 충족
- paragraph/list/table 등 구조 정상
- 번역되지 않은 일반 영어 prose 없음
- 0.40 <= char_ratio < 0.55
```

`PASS_LANG_COMP`는 품질이 낮은 PASS가 아니다.

영어와 한국어의 표현 밀도 차이 때문에 발생하는
정상적인 압축을 별도로 기록하기 위한 상태다.

커밋 허용 여부는 `PASS`와 동일하다.

### REVIEW

자동 검사만으로 정상 여부를 확정하기 어려운 상태다.

예:

```text
- char_ratio < 0.40
- paragraph ratio 이상
- sentence ratio 이상
- 일반 inline-code anchor 일부 누락
- 장문의 미번역 영어 prose 의심
- Markdown 구조는 보존되었지만 내용 압축 가능성이 있음
```

Hard invariant는 모두 통과해야 한다.

`REVIEW`는 자동 실패가 아니며 수동 확인 후
`PASS` 또는 `PASS_LANG_COMP`로 승인할 수 있다.

### FAIL

구조적 무결성이 깨진 상태다.

예:

```text
- 필수 파일 누락
- 문서 전체 또는 주요 section 누락
- critical anchor 손실
- commit SHA 누락 또는 변경
- 중요도/태그 관계 변경
- 구조화 table row 손실
- 순서가 중요한 identifier sequence 변경
- code fence 파괴
- 명백한 전체 paragraph 미번역
- 여러 completeness metric이 동시에 심각하게 붕괴
```

`FAIL` 상태의 문서는 커밋하지 않는다.

---

## 11. 상태 우선순위

여러 조건이 동시에 발생하면 다음 우선순위를 적용한다.

```text
FAIL
>
REVIEW
>
PASS_LANG_COMP
>
PASS
```

Hard invariant 실패는 다른 모든 metric보다 우선한다.

예를 들어 다음 문서는 `char_ratio`가 정상이어도 `FAIL`이다.

```text
char_ratio = 0.82
commit SHA 하나 누락
```

반대로 다음 문서는 `PASS_LANG_COMP`가 될 수 있다.

```text
char_ratio = 0.48
critical anchor = 100%
heading/block/table 구조 정상
paragraph 구조 정상
미번역 prose 없음
```

---

## 12. 문서별 Profile

공통 규칙만으로 표현하기 어려운 구조적 규칙은
문서별 profile을 추가하여 검사할 수 있다.

예를 들어 커밋 분석 문서에서는 다음 규칙을 강화할 수 있다.

### Commit body 계열

권장 invariant:

```text
commit section count exact match
commit section order exact match
commit subject identity preserved
inline technical token coverage >= 95%
```

커밋 subject가 번역 대상이 아니라면 exact-match로 검사한다.

이미 한국어로 작성된 commit subject는 그대로 보존한다.

### Commit importance 계열

권장 invariant:

```text
classification commit SHA sequence exact match
importance grade per commit exact match
tag set per commit exact match
classification row count exact match
development-thread commit sequence exact match
most-important-commit SHA set exact match
```

`Summary`, `Why`, `Problem`, `Decision`, `Why it mattered` 등
자연어 설명은 한국어로 번역하되,
구조화된 commit 관계는 변경하지 않는다.

문서별 profile은 공통 게이트를 완화하기 위한 수단으로 사용하지 않는다.
필요한 경우 공통 규칙보다 더 엄격한 검증을 추가하는 용도로만 사용한다.

---

## 13. 권장 검증 순서

게이트는 다음 순서로 실행한다.

```text
1. 파일 존재와 UTF-8 검사
2. Markdown 기본 구조 파싱
3. Hard invariant 검사
4. Critical anchor 검사
5. 문서별 구조화 데이터 검사
6. Paragraph/list/table 구조 검사
7. 일반 inline-code anchor 검사
8. 미번역 prose 탐지
9. line/sentence/char ratio 계산
10. 최종 상태 산출
```

Hard invariant 단계에서 실패한 경우
후속 heuristic 결과와 관계없이 최종 상태는 `FAIL`이다.

---

## 14. 출력 형식

자동 게이트는 최소한 다음 정보를 출력해야 한다.

```text
Document: <path>
Status: PASS | PASS_LANG_COMP | REVIEW | FAIL

Hard invariants:
  file_ok:
  heading_structure_ok:
  fence_structure_ok:
  critical_anchor_ok:
  structured_data_ok:

Metrics:
  paragraph_ratio:
  line_ratio:
  sentence_ratio:
  list_item_ratio:
  inline_code_anchor_ratio:
  char_ratio:

Language:
  untranslated_prose_ok:

Reason:
  <판정의 직접적인 원인>
```

문서별 추가 검사가 있다면 별도 항목으로 출력한다.

예:

```text
Commit document:
  commit_count_ok:
  commit_sequence_ok:
  importance_grade_ok:
  tag_mapping_ok:
```

CI 환경에서는 사람이 읽을 수 있는 요약과 함께
프로그램이 처리할 수 있는 JSON 결과를 추가로 출력하는 것을 권장한다.

---

## 15. 커밋 정책

다음 상태는 자동 커밋 또는 PR 검증을 통과할 수 있다.

```text
PASS
PASS_LANG_COMP
```

다음 상태는 수동 검토가 필요하다.

```text
REVIEW
```

다음 상태는 커밋 또는 병합을 차단한다.

```text
FAIL
```

`PASS_LANG_COMP`를 실패나 경고로 취급하지 않는다.
한국어 번역에서 정상적으로 발생하는 표현 압축을
일반적인 `PASS`와 구분해 관찰하기 위한 상태다.

---

## 16. 비목표

이 게이트는 다음을 보장하지 않는다.

* 한국어 문장이 최상의 문체인지 여부
* 기술 용어 선택이 유일하게 올바른지 여부
* 원문의 기술적 사실이 실제 구현과 일치하는지 여부
* 원문의 중요도 평가가 적절한지 여부
* 자연어 문장 간 의미가 완벽히 동일한지 여부

이러한 항목은 자동 구조 검증만으로 완전히 판단할 수 없다.

이 게이트가 보장하려는 것은 다음 범위다.

> 이미 검증된 영문 정본을 한국어로 현지화하는 과정에서
> 구조, 식별자, 분류, 관계 및 설명 범위가 손실되거나
> 번역 작업 자체가 불완전한 상태로 커밋되는 것을 방지한다.

---

## 17. 설계 원칙 요약

이 게이트는 다음 우선순위를 따른다.

```text
구조적 무결성
>
기술 식별자와 관계 보존
>
번역 완전성
>
문단 및 문장 구조
>
문자 수 비율
```

`char_ratio`는 품질을 직접 측정하는 지표가 아니다.

낮은 문자 수 비율이 구조적 손실과 함께 나타날 때는
누락 가능성을 강하게 시사하지만,
다른 검사가 모두 정상이라면 한국어의 높은 표현 밀도에 따른
정상적인 언어 압축으로 인정한다.

자동 게이트의 목적은 자연스러운 한국어를 기계적인 길이 기준에 맞추는 것이 아니라,
자연스러운 번역을 허용하면서도 원문의 정보 손실을 신뢰성 있게 탐지하는 데 있다.
