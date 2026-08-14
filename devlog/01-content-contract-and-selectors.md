# 타입과 선택 정책을 분리하기

## 근거 커밋

| 커밋 | 확인한 변화 |
| --- | --- |
| `7d3a3d5`, `957651c` | Zod 의존성과 실행 시 콘텐츠 검증을 도입했다. |
| `170f25e`, `9aeefe8`, `9739fc0` | 프로젝트 그룹·지표, 링크 배치, 페이지 활성 상태를 콘텐츠 계약에 넣었다. |
| `aa91745` | 하나의 큰 모듈을 타입, 정규화, 선택 함수로 나눴다. |
| `f6e2682` | 디자인·디버그 상태를 보존하는 URL 조립을 순수 함수로 분리했다. |

## 하나의 문자열에 여러 의미를 싣지 않기

현재 `ContentLink`는 링크의 목적, 이동 방식, 노출 상태를 별도 필드로 표현한다.

```ts
export type ContentLink = {
  id?: string;
  type: LinkType;
  label: string;
  href: string;
  external?: boolean;
  enabled?: boolean;
};
```

`href`가 GitHub 주소처럼 보인다는 이유로 소스 공개 링크라고 추측하지 않는다.
`type`은 콘텐츠의 의미, `external`은 브라우저 이동 정책, `enabled`는 표시 여부를
담당한다. 서로 다른 판단을 한 문자열 분석에 맡기면 렌더러마다 결과가 달라진다.

프로젝트의 `id`, `order`, 배열 순서도 역할이 다르다. `id`는
Resume·Journey·Curation 등 다른 파일이 참조하는 안정된 식별자다. 현재 화면의
프로젝트 순서는 `projects.items` 배열 순서를 따르며, 정규화 과정은 `order`로
정렬하지 않는다. `order`는 중복을 금지한 표시용 번호로 일부 렌더러가 출력할 뿐이다.
배열 위치를 식별자로 사용하지 않으므로 중간 항목을 삽입해도 기존 참조의 의미는
바뀌지 않는다.

## 정적 타입은 입력 검사가 아니다

초기 구현은 JSON import 결과에 타입을 단언했다.

```ts
const projects = projectsJson as PortfolioProject[];
```

이 코드는 값을 변환하거나 검사하지 않는다. 예를 들어
`deployment.status`에 허용되지 않은 문자열이 들어가도 `as` 자체는 실패하지
않는다. TypeScript는 이후 코드가 선언된 모양을 일관되게 사용하는지만 확인한다.

현재는 `content-loader.ts`가 JSON을 Zod 스키마로 파싱한 뒤 파일 간 참조를
검사한다. 그 결과를 `portfolio/content.ts`가 화면에서 사용할 형태로 정규화한다.
다만 Zod 스키마와 수기 도메인 타입이 모두 남아 있는 부분이 있어 한쪽만 수정될
가능성은 여전히 있다. 실행 시 검증의 자세한 경계는
[06. 실행 시 콘텐츠 검증](./06-runtime-content-boundaries.md)에서 다룬다.

## 참조한 쪽의 순서를 보존하기

Resume가 프로젝트 ID를 `second`, `first` 순서로 선언했다면 결과도 그 순서를
따라야 한다. 전체 프로젝트 배열을 먼저 `filter()`하면 원본 배열의 순서가 남는다.
현재 선택 함수는 ID별 조회 표를 만든 뒤 참조 배열을 앞에서부터 읽는다.

```ts
const byId = new Map(
  content.projects.map((project) => [project.id, project]),
);

return content.resume.projectIds
  .map((projectId) => byId.get(projectId))
  .filter((project): project is PortfolioProject => Boolean(project));
```

이 함수는 찾지 못한 ID를 조용히 제외한다. 정상 제품 경로에서는 로더가 누락
참조를 먼저 거부하므로 두 책임이 맞물린다.

- 로더는 잘못된 생산자 입력을 실패시킨다.
- 선택 함수는 검증된 입력을 화면 순서로 바꾼다.
- 테스트나 외부 호출자가 손으로 만든 객체를 넘기면 로더의 전제를 우회할 수 있다.

방어 코드가 있다는 이유로 입력 검증이 필요 없다고 보지 않는 이유다.

## 모듈 경계가 바뀐 이유

초기 `src/lib/portfolio.ts`는 타입 선언, JSON 적재·정규화, 조회 정책을 모두
담았다. `aa91745`에서 책임을 다음처럼 나눴다.

```text
portfolio/types.ts      정적 어휘
portfolio/content.ts    검증된 원본의 정규화
portfolio/selectors.ts  조회·필터·표시 정책
portfolio.ts            기존 import를 위한 공개 진입점
```

공개 진입점을 남겨 소비자 변경을 줄였지만, 모든 기능을 한 진입점에서 가져오면
어떤 코드가 서버 전용 콘텐츠 적재까지 끌어오는지 가릴 수 있다. 그래서 URL
계산처럼 브라우저에서도 필요한 로직은 `template-href.ts`로 더 좁게 분리했다.

## URL 상태를 보존하는 순수 함수

내부 링크는 현재 디자인(`view`)과 콘텐츠 위치 표시(`debug=content`)를 이어 가야
한다. `template-href.ts`는 외부 URL과 `//` URL은 건드리지 않고, 내부 경로의
쿼리와 해시를 분리한 뒤 두 상태를 조정한다.

이 계산을 콘텐츠 적재 모듈에서 떼어 낸 효과는 두 가지다.

1. 링크와 디자인 선택기가 같은 URL 정책을 사용한다.
2. 클라이언트 코드가 URL 하나를 만들기 위해 서버 콘텐츠 모듈을 import하지 않는다.

이 분리가 특정 바이트 절감을 만들었다는 단계별 측정 자료는 없다. 구조적 의존성을
줄였다는 사실과 성능 효과를 구분해야 한다.

## 현재 남은 위험

- `template-href.ts`는 `split("?", 2)`를 사용한다. 쿼리 값에 두 번째 `?`가
  들어가는 `/search?q=why?now` 같은 입력은 뒤쪽이 사라질 수 있으며, 이 반례를
  고정한 검사는 없다.
- 선택 함수는 검증된 원본을 전제로 한다. 직접 만든 객체를 넘기는 호출 경로에서는
  누락 ID가 조용히 제거될 수 있다.
- 스키마와 수기 타입에 같은 필드를 중복 선언한 곳은 변경 누락 위험이 있다.
- 링크의 `external` 값과 실제 URL scheme이 항상 일치하는지 로더가 완전히
  대조하지 않는다. 이동 정책의 최종 위험은
  [03. 공통 UI와 문서 구조](./03-shared-ui-and-landmarks.md)에서 이어진다.

정적 타입, 실행 시 검증, 선택 함수를 한 층으로 합치지 않아야 각 실패가 입력 문제인지,
계산 정책 문제인지, 표현 문제인지 정확히 찾을 수 있다.
