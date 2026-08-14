# 콘텐츠 구조·참조·자산을 나누어 검증하기

## 관련 커밋

- `7d3a3d5` — `build(content): runtime 콘텐츠 검증 의존성 추가`
- `957651c` — `feat(content): JSON 구조와 교차 참조를 runtime에 검증`
- `63e096c` — `feat(content): 저장소 자산 참조 경계 검증`
- `99e1d0d` — `build(content): 콘텐츠 검사 명령을 prebuild에 연결`
- `170f25e` — `feat(content): 프로젝트 그룹과 지표를 콘텐츠로 관리`
- `9aeefe8` — `feat(content): 링크 배치와 연락 우선순위를 콘텐츠로 관리`
- `9739fc0` — `feat(content): 페이지 활성 상태와 큐레이션을 콘텐츠로 관리`
- `f8ced21` — `test(content): Vitest 기반 콘텐츠 계약 검증 추가`
- `9891f1a` — `feat(content): production readiness 규칙 추가`
- `e566219` — `build(content): readiness 검사를 prebuild에 연결`

`src/content`의 JSON은 TypeScript source처럼 보이지만 실행 시점에는 외부 값이다.
`as PortfolioContent` 같은 단언은 key, enum, 배열 길이와 ID 관계를 검사하지 않는다.
현재 구현은 검증을 구조, 파일 간 관계, 디스크 자산, 공개 준비의 네 층으로 나눈다.

## 1. 파일 구조는 Zod가 검사한다

`loadPortfolioSource()`는 14개 JSON을 각 schema로 파싱한다. 실패는 파일명, JSON
path와 Zod message를 가진 `PortfolioContentError`로 바뀐다.

```ts
const parsed = schema.safeParse(input);

if (!parsed.success) {
  throw new PortfolioContentError(
    parsed.error.issues.map((issue) => ({
      file,
      path: jsonPath(issue.path),
      message: issue.message,
    })),
  );
}
```

한 파일 안의 여러 Zod issue는 함께 보고된다. 다만 파일을 차례대로 파싱하므로 첫
구조 오류에서 예외가 나면 뒤 파일은 같은 실행에서 검사하지 않는다. “모든 JSON의
구조 오류를 한 번에 모은다”는 보장은 없다.

엄격성도 위치마다 다르다. profile과 여러 하위 객체는 `.strict()`지만 site,
presentation의 일부는 `.passthrough()`다. 확장을 허용한 위치에서는 알 수 없는 key가
오류가 되지 않고 결과에 남는다.

## 2. 구조가 맞은 뒤 파일 간 관계를 검사한다

모든 파일의 구조가 통과하면 loader가 ID 집합을 만들고 의미 오류를 `issues`에
누적한다. 이 단계에서는 여러 오류를 한 번에 보고할 수 있다.

주요 관계는 다음과 같다.

- project → group·tech stack
- metric filter → 활성 project·group·tag
- Resume·Journey·curation·Interview Map → 활성 project
- Contact preferred ID → 활성 공용 link
- navigation·공용 link·project link → 지원하고 활성화된 내부 route
- presentation template → 다섯 지원 design
- group·metric·project·tech·link·milestone 등 → 중복되지 않는 ID

metric의 tag 배열은 OR가 아니라 AND 조건이다. 즉 filter에 여러 tag가 있으면 project가
모두 포함해야 한다. 이런 계산 의미는 schema가 아니라
`projectMatchesMetricFilter()`에 남아 있다.

관계 검사가 모든 소비자 전제를 포괄하는 것은 아니다. 예를 들어
`skills.groups[].items`는 `tech-stack.json`의 ID처럼 쓰이지만 loader가 그 참조를
검사하지 않는다. 알 수 없는 값은 `StackList`에서는 fallback 아이콘으로 보이고,
홈 marquee를 만드는 필터에서는 제외될 수 있다.

## 3. 자산 경로와 실제 파일 존재를 분리한다

schema는 로컬 자산이 `/content/` 또는 `/template/`로 시작하는지 확인한다.
`validatePortfolioAssets()`는 해당 경로를 `public/` 아래로 해석한 뒤 디렉터리 탈출과
존재 여부를 검사한다.

```ts
const absoluteAssetPath = resolve(publicRoot, `.${reference.assetPath}`);
const pathFromPublic = relative(publicRoot, absoluteAssetPath);

if (
  pathFromPublic.startsWith("..") ||
  isAbsolute(pathFromPublic) ||
  !existsSync(absoluteAssetPath)
) {
  // file과 JSON path를 가진 issue 추가
}
```

이 검사는 경로가 존재한다는 사실까지만 증명한다. 일반 파일인지, image가 decode되는지,
PDF가 유효한지, 확장자와 MIME이 맞는지는 확인하지 않는다. container 검사는 JSON이
참조한 자산의 HTTP body와 일부 MIME을 별도로 확인하지만 image/PDF 내용 자체를
해석하지는 않는다.

## 4. 공개 준비는 별도 정책이다

`content:check`는 schema·관계·자산을 검사한다. `content:ready`는
`PORTFOLIO_CONTENT_MODE`에 따라 공개 준비를 판정한다. 기본값인 `template` mode에서는
placeholder를 허용하고 검색 색인을 막는다. `production` mode에서는 다음 조건을 더
요구한다.

- 검증 가능한 공개 `SITE_URL`
- placeholder marker가 제거된 콘텐츠
- `/content/` 아래 social image, profile photo, Resume와 project 자산
- 활성 project마다 하나 이상의 공개 HTTP(S) URL
- contact placement에 사용할 연락 수단

`prebuild`는 두 검사를 순서대로 실행한다.

```json
"prebuild": "npm run content:check && npm run content:ready"
```

일반 page 요청이 매번 이 두 command를 실행하는 것은 아니다. server module import
중 `loadPortfolioSource()`가 구조와 관계를 다시 검사하지만, filesystem 자산 검사와
placeholder 전체 순회는 command gate에 남아 있다. 기본 template build가 성공했다는
사실도 production 콘텐츠 준비를 뜻하지 않는다.

## 검증 뒤 정규화되는 값

`src/lib/portfolio/content.ts`는 검증된 source를 화면용 canonical content로 바꾼다.

- project group은 숫자 `order`로 정렬한다.
- project에는 group label에서 얻은 `category`를 붙인다.
- project 목록은 `projects.items`의 배열 순서를 그대로 보존한다.
- journey는 `date`, 같은 날짜에서는 `title`의 문자열 순서로 정렬한다.
- disabled project와 link를 제외하고 project link 배열을 새로 만든다.

project의 `order`는 중복되지 않는 non-empty 문자열로만 검증된다. 현재 코드에는 이를
기준으로 project를 정렬하는 로직이 없으며, 일부 renderer가 화면 번호로 표시할 뿐이다.
따라서 project 표시 순서는 `order`가 아니라 JSON 배열 순서가 정한다.

또한 `presentation.pages.projects.groups`는 schema상 입력이지만 canonical
presentation을 만들 때 `projects.groups`의 label과 description으로 덮어쓴다. 받을 수
있는 값과 실제 화면의 기준값을 구분해야 한다.

## 확인된 URL·consumer 계약의 빈틈

`contentHrefSchema`는 허용 접두사를 검사하고, `external`은 독립된 optional boolean로
받는다. 둘의 일치 여부는 검증하지 않는다. 이 때문에 schema를 통과한 같은 link도
renderer에 따라 다르게 동작할 수 있다.

- 공용 `ContentLinkView`는 `external`만 보고 `<a>`와 Next `Link`를 고른다.
- Editorial은 root-relative path를 먼저 판별한다.
- Cinematic은 HTTP(S) 주소면 `external` 값과 무관하게 새 탭을 연다.
- Brutalist도 scheme을 일부 추론한다.

현재 checked-in JSON의 scheme과 `external` 값은 서로 맞아 기본 화면에서는 차이가
드러나지 않는다. 하지만 이 일치를 강제하는 loader 규칙과 renderer 간 일관성을
검증하는 반례 테스트는 없다.

그 밖의 남은 입력 경계는 다음과 같다.

| 입력 | 현재 보장 | 남은 경계 |
| --- | --- | --- |
| `contentHref` | 허용 접두사 | 모든 URL의 완전한 parse·도달성은 보장하지 않음 |
| project/contact 공개 URL | HTTP(S), placeholder·일부 예약 host 검사 | localhost·사설망·인증 정보·실제 응답을 모두 거부하지 않음 |
| Journey 날짜 | 비어 있지 않은 문자열 | 달력 유효성 없이 문자열로 정렬·일부 slice |
| Classic terminal commands | 원소 구조 | 최소 길이가 없어 빈 배열이 renderer에서 실패 |
| `skills.groups[].items` | 문자열 배열 | tech ID 참조 무결성을 검사하지 않음 |
| image·PDF | 허용 prefix와 경로 존재 | decode·문서 유효성은 확인하지 않음 |

빈 terminal 입력의 실제 실패는
[04. 브라우저 상태와 타이머](./04-browser-resource-lifetimes.md), 비활성 page와 고정
CTA의 불일치는 [05. App Router 경계](./05-app-router-vertical-slice.md)에서 이어서
다룬다.

## 테스트가 확인하는 범위

현재 Vitest는 정상 source, 중복 ID, 누락 design, 지원하지 않는 내부 route, 비활성
참조와 없는 자산을 반례로 검사한다. production readiness test는 template 허용,
필수 입력 누적 보고와 일부 잘못된 `SITE_URL`을 확인한다.

다음 항목은 자동 검증 밖에 남아 있다.

- 첫 구조 오류 뒤에 있는 다른 파일의 구조 오류 수집
- 외부 URL의 소유권과 실제 접속 가능 여부
- 날짜 형식과 terminal 최소 길이
- scheme과 `external` flag의 일치
- schema와 수기 TypeScript 타입의 모든 drift

검사가 존재한다는 사실과 모든 consumer 전제가 검증된다는 주장을 구분해야 한다.
