## build(next): 실행 가능한 애플리케이션 골격 구성

콘텐츠만 있는 골격이 아니라 실제로 실행할 수 있는 Next.js 애플리케이션으로 저장소를 구성한다. Next.js 16, React 19, strict TypeScript, 경로 별칭, Tailwind/PostCSS, Next.js ESLint 설정을 기준으로 기본 런타임 및 검증 계약을 확정하고, 개발·프로덕션 빌드·lint·타입 검사용 스크립트를 각각 정의한다.

이러한 요소를 초기 애플리케이션 경계에 함께 두면 이후 UI와 콘텐츠 작업이 하나의 일관된 환경을 기준으로 컴파일된다. 생성된 lockfile은 해석된 의존성 그래프를 기록하며, 애플리케이션의 빌드 및 검사 방식을 결정하는 핵심 엔지니어링 기준은 manifest, compiler, lint, framework 설정이다.

## feat(content): 사이트와 프로필 콘텐츠 기반 추가

사이트 메타데이터와 프로필 정보를 명시적인 TypeScript 계약이 뒷받침하는 구조화된 JSON으로 정의한다. 기존에는 페이지 컴포넌트에 직접 포함되던 navigation, footer 문구, 식별 정보, 원칙, 선택적 프로필 이미지가 이제 하나의 공통 표현을 갖는다.

이를 통해 편집용 데이터와 렌더링 코드를 분리한다. 컴포넌트는 안정적인 콘텐츠 구조에 의존하고, 프로필이나 사이트 문구는 레이아웃 로직을 다시 작성하지 않고 변경할 수 있다. 선택적 미디어도 renderer가 추론하지 않고 모델에 명시하므로, 미디어가 없는 상태 역시 유효하고 의도적인 상태로 취급된다.

## feat(content): 링크와 프로젝트 도메인 정의

카탈로그에 실제 데이터를 채우기 전에 포트폴리오 링크와 프로젝트 case study를 위한 도메인 모델을 정의한다. 계약에서는 링크 목적, 배치 위치, 외부 링크 동작, 활성화 여부, 배포 상태, screenshot, architecture 설명, 기술 스택, 결정, trade-off, 결과를 구분한다.

소스 저장소, live demo, case-study route는 수명 주기와 노출 규칙이 서로 다르므로 배포 상태와 링크 사용 가능 여부를 명시적으로 표현하는 것이 중요하다. 빈 JSON 컬렉션을 유효한 초기 상태로 두면서 이후 loader와 component가 사용할 용어를 먼저 확정해, 형태가 느슨한 객체를 대상으로 임시 조건 검사를 반복하지 않도록 한다.

## feat(content): 디자인 홈 표현 모델 추가

디자인 중심 홈 페이지의 presentation 계약을 추가한다. 여기에는 template metadata, hero action, 통계, section 선택, 대표 프로젝트 문구가 포함된다. 계산된 값을 콘텐츠에 직접 저장하는 대신 이름이 지정된 count key를 사용한다.

이 구조는 presentation 설정을 선언적으로 유지하면서 파생된 프로젝트 합계는 애플리케이션이 관리하도록 한다. 페이지는 표시할 section과 label을 선택할 수 있지만 프로젝트 데이터나 집계 로직의 소유자가 될 수 없다. 이 경계 덕분에 이후 동일한 도메인 콘텐츠를 여러 시각적 표현에서 재사용할 수 있다.

## feat(content): 클래식과 공용 홈 표현 추가

presentation 모델에 classic 홈 variant와 두 홈 디자인이 공유하는 section을 추가한다. Terminal command는 template 전용으로 유지하고, work-map, technical-focus, stack, journey, contact 문구는 공통 계약을 사용한다.

이 분리는 실제 시각적 차이는 보존하면서 도메인에 대응하는 section 정의의 중복은 피한다. 두 template 모두 동일한 project, skill, journey 데이터를 사용할 수 있으며 각자 자신의 hero와 framing은 독립적으로 제어한다. 즉, presentation variant를 별도 사이트가 아니라 하나의 콘텐츠 소스를 렌더링하는 서로 다른 renderer로 정의한다.

## feat(content): 프로젝트 목록 표현 계약 정의

design과 classic 프로젝트 인덱스를 위한 별도의 presentation 계약을 정의한다. hero 문구, group 설명, terminal framing, 선택 프로젝트 section, 지원하는 제한된 count key 집합을 포함한다.

count key를 알려진 파생 지표로 제한하면 presentation JSON이 임의의 속성명을 지정하거나 오래된 합계를 보관하는 문제를 막을 수 있다. project, curriculum, source-only 개수 계산은 계속 route가 담당하고, 콘텐츠 계층은 해당 값을 선택하고 label만 붙인다. 따라서 데이터 경계를 약화하지 않으면서 표시 설정의 유연성을 유지한다.

## feat(content): 프로젝트 목록 화면 문구 추가

두 시각 variant의 프로젝트 인덱스 presentation 데이터를 채운다. 앞서 정의한 계약에 필요한 hero, 통계, group 설명, terminal label, 선택/그룹 section 문구를 추가한다.

이 변경은 의도적으로 콘텐츠 중심으로 구성된다. 두 프로젝트 목록 화면을 렌더링하기 위해 페이지 컴포넌트에 포트폴리오 문구를 하드코딩할 필요가 없다. 문구를 presentation source에 두면 project record나 집계 코드를 바꾸지 않고도 각 디자인 variant의 텍스트를 수정할 수 있다.

## feat(content): 보조 페이지 표현 계약 정의

프로젝트 상세, About, Resume, Contact 페이지의 presentation 계약을 추가한다. 프로젝트 상세에는 problem, solution, architecture, screenshot, stack, decision, trade-off, result를 위한 이름 있는 section을 정의하고, 보조 페이지에는 각자의 hero 및 section 문구를 정의한다.

이 route들을 구현하기 전에 페이지 구조와 편집 가능한 label을 완전히 분리한다. 프로젝트마다 실제 콘텐츠 양이 달라도 상세 페이지는 안정적인 정보 계층을 유지해야 하므로, 여기서는 완전한 section key 집합이 유용하다.

## feat(content): 상세 소개 이력 연락 문구 추가

프로젝트 상세와 About, Resume, Contact 페이지의 presentation source를 채운다. 이전 변경에서 도입한 계약에 필요한 label과 section title을 추가한다.

문자열을 중앙화하면 보조 route도 홈과 프로젝트 인덱스와 같은 방식을 유지할 수 있다. 컴포넌트가 페이지별 문구를 직접 소유하는 대신 타입이 지정된 콘텐츠를 렌더링한다. 변경 자체는 기계적이지만, 이후 route 구현에 필요한 편집 가능한 presentation 계층을 완성한다.

## feat(content): 기술과 여정 콘텐츠 모델 추가

experience, journey, skill, canonical technology stack의 source file과 계약을 추가한다. technology에는 안정적인 identifier와 제한된 icon name을 부여하고, nullable end date를 통해 진행 중인 journey 항목을 허용하며, journey 항목에서 관련 project와 source path를 참조할 수 있도록 한다.

안정적인 참조를 사용하면 여러 view가 표시 데이터를 복제하지 않고 동일한 technology와 journey record를 재사용할 수 있다. 선택적 관계를 명시적으로 모델링하면 모든 timeline 항목에 project, 종료일, provenance metadata가 있다고 renderer가 가정하는 문제도 막을 수 있다.

## feat(content): 연락과 이력 집계 모델 완성

contact와 resume 데이터에 필요한 나머지 콘텐츠 계약을 완성하고, 애플리케이션이 사용하는 통합 `PortfolioContent` 구조를 정의한다. 또한 환경에서 제공되는 링크 override와 route가 사용하는 비동기 search parameter 구조도 모델에 포함한다.

하나의 통합 계약을 두면 selector와 page가 서로 무관한 JSON import를 각각 조정할 필요 없이 일관된 입력 경계를 사용할 수 있다. 배포 설정은 일부 링크만 override할 수 있으므로 환경 값은 부분적으로 유지하고, 저장소에 커밋된 콘텐츠를 fallback source로 사용한다.

## feat(content): 정적 포트폴리오 콘텐츠 로딩

커밋된 JSON source를 import하고 타입이 지정된 content module을 통해 노출하는 최초의 static loader를 추가한다. 페이지 컴포넌트가 각자 JSON을 import하고 type assertion을 적용하는 대신 raw file과 애플리케이션 나머지 부분 사이에 하나의 통합 지점을 만든다.

이 단계의 loader는 아직 runtime validation 대신 TypeScript assertion에 의존하지만, 경계 자체는 의미가 있다. 이후 normalization, filtering, validation을 한 곳에 도입해도 consumer는 동일한 도메인 API에 계속 의존할 수 있다.

## feat(content): 여정 정렬과 콘텐츠 인덱스 구성

콘텐츠 로딩에 결정적인 journey 정렬, technology lookup index, 활성 링크 filtering을 추가한다. 정렬 전에 journey 항목을 복사하므로 import된 source array를 직접 변경하지 않으며, 동률에는 안정적인 보조 비교 기준을 적용한다.

technology map은 반복적인 identifier 탐색을 직접 조회로 바꾸고, technology ID를 project 및 skill 콘텐츠가 사용하는 join key로 확립한다. 링크 filtering은 명시적으로 disabled인 경우에만 제외해 기존 항목의 하위 호환성 있는 opt-in 동작을 유지한다.

## feat(content): 환경 링크를 반영한 콘텐츠 집계

환경 기반 링크를 해석하고 비활성 project와 link를 걸러 전체 portfolio aggregate를 구성한다. 환경 값은 trim한 뒤 비어 있지 않을 때만 사용하고, 그렇지 않으면 커밋된 URL을 기준으로 유지한다.

project를 외부에 노출하기 전에 override를 해석하므로 모든 consumer가 동일한 최종 링크를 사용하고 route별 배포 로직도 피할 수 있다. 또한 콘텐츠 경계에서 filtering하면 component가 flag 검사를 빠뜨렸다는 이유만으로 비활성 record가 다시 나타나는 문제를 막는다.

## feat(navigation): 템플릿 URL과 쿼리 해석 추가

홈 template 선택, content-debug mode 활성화, 상태를 보존하는 내부 URL 생성을 위한 canonical query-state utility를 추가한다. query 값은 scalar 또는 array 입력 모두에서 정규화하고, 알 수 없는 template ID는 설정된 기본값으로 fallback하며, debug mode는 지원되는 값일 때만 활성화한다.

URL builder는 root-relative 애플리케이션 경로를 허용하되 protocol-relative 입력은 거부하며, 기존 query parameter나 fragment를 버리지 않고 `view`와 `debug`를 갱신한다. 이 동작을 중앙화하면 link, template 전환, 중첩 route가 navigation state를 서로 다르게 해석하거나 외부 URL처럼 보이는 값을 내부 URL로 잘못 취급하는 문제를 막을 수 있다.

## feat(portfolio): 기술과 프로젝트 조회기 추가

technology 조회, 대표 project 선택, ID 기반 project 조회, resume project 해석을 위한 집중된 selector를 추가한다. 누락된 technology metadata에는 제어된 fallback을 사용하고, 알 수 없는 project는 명시적으로 null을 반환하며, resume 항목은 설정된 ID를 활성 project 집합에 대조해 생성한다.

이 selector를 통해 관계 해석을 renderer 밖으로 이동한다. 페이지는 array를 반복 탐색하거나 오래된 reference를 암묵적으로 렌더링하는 대신 해석된 record와 의도적인 부재 상태를 사용할 수 있어 home, project, resume view의 콘텐츠 join 동작이 일관된다.

## feat(portfolio): 연락과 프로젝트 링크 선택기 추가

선호 contact link, project별 link, card에 적합한 action, 외부 anchor attribute 선택을 중앙화한다. live demo 노출은 link 자체와 project의 실제 live 배포 상태를 모두 만족해야 하며, disabled이거나 잘못 배치된 link는 공통 규칙으로 제외한다.

외부 링크 helper는 URL을 분류하는 동일한 경계에서 적절한 target과 relationship attribute를 적용한다. 이로써 보안 및 사용 가능 여부 검사의 중복을 줄이고, 모든 renderer가 contact 우선순위, 배포 상태, link placement를 동일하게 해석한다.

## style(theme): 포트폴리오 기본 디자인 토큰 추가

포트폴리오에서 사용하는 전역 color, surface, border, typography, spacing 어휘를 정의하고 이를 Tailwind utility에 노출한다. 기본 document, selection, font 동작도 동일한 token 집합에 맞춘다.

페이지별 literal color 대신 semantic token을 사용하면 이후 template가 component markup을 다시 작성하지 않고도 표현을 바꿀 수 있다. 또한 공용 component는 설명되지 않은 literal 값이 아니라 foreground, muted text, surface, line, accent 같은 역할을 참조하므로 안정적인 시각 계약을 갖게 된다.

## feat(ui): 핵심 방향 및 상태 아이콘 추가

핵심 방향 및 상태 기호를 위한 재사용 가능한 SVG component를 추가한다. 각 icon은 일반 SVG prop을 받고 `currentColor`를 통해 색상을 상속하며, 장식용으로 사용될 때는 assistive technology에서 숨긴다.

이 방식은 반복적인 inline SVG markup을 피하면서 icon 크기와 styling을 caller가 제어할 수 있게 한다. 장식 icon을 일관되게 처리하면 시각 기호가 접근 가능한 콘텐츠에 불필요하거나 오해를 부르는 이름을 추가하는 문제도 막을 수 있다.

## feat(ui): 확인 외부 링크 보안 아이콘 추가

동일한 prop 전달 및 장식용 접근성 계약을 적용해 confirmation, external-link, shield 기호를 공용 icon 집합에 추가한다.

변경 자체는 작지만, 이후 link·deployment·trust 관련 UI에서 하나의 icon interface를 유지하는 것이 중요하다. caller는 일회성 SVG 동작이나 서로 다른 접근성 처리를 새로 만들지 않고 이 기호들을 조합할 수 있다.

## feat(ui): 콘텐츠 이미지 프리미티브 추가

콘텐츠 source hint, 프로필 사진, 프로젝트 screenshot을 위한 공용 primitive를 추가한다. 프로필 이미지는 즉시 필요한 자산으로 취급하고, screenshot은 명시적으로 priority를 선택할 수 있게 하되 기본적으로는 lazy loading을 유지한다. 안정적인 aspect-ratio container를 사용해 미디어 로딩 중 레이아웃 이동도 방지한다.

Debug hint는 content-debug mode에서만 source path를 표시해 provenance tooling을 일반 presentation과 분리한다. 이미지 동작을 한곳에 모으면 각 페이지가 서로 다른 loading, sizing, empty-state 규칙을 독자적으로 선택하는 문제를 막을 수 있다.

## feat(ui): 뷰포트 진입 공개 효과 추가

`IntersectionObserver` 기반의 client-side reveal primitive를 추가한다. 요소가 viewport에 들어오면 표시하고, 일회성 transition이 끝나면 observer 연결을 해제하며, component unmount 시 cleanup에서 observation을 정리한다. observer를 지원하지 않는 환경에서는 콘텐츠를 숨겨 둔 채로 두지 않고 즉시 표시한다.

대응하는 CSS에서는 reduced motion을 요청한 사용자에 대해 reveal transition과 smooth scrolling도 비활성화한다. 따라서 progressive enhancement 규칙이 명확해진다. animation은 페이지를 보강할 수 있지만 콘텐츠 표시와 navigation이 브라우저 지원 여부나 motion preference에 의존해서는 안 된다.

## feat(ui): 내부 외부 콘텐츠 링크 렌더링

타입이 지정된 content link를 위한 단일 renderer를 만든다. 외부 destination은 일반 anchor와 공용 security attribute를 사용하고, 내부 destination은 Next.js navigation을 사용하면서 선택된 home template와 content-debug 상태를 보존한다.

이로써 URL 분류와 상태 전파가 각 caller가 기억해야 하는 관례가 아니라 component 수준의 invariant가 된다. link label과 destination은 계속 콘텐츠가 소유하지만, 실제 이동 방식은 link contract에 따라 애플리케이션이 결정한다.

## feat(shell): 브랜드와 주 탐색 헤더 추가

brand link, profile identity, primary navigation, 접근 가능한 navigation label을 포함하는 지속적인 site header를 추가한다. 내부 destination은 공용 template/debug-aware URL helper를 통해 생성한다.

이 header는 이후 모든 페이지의 공통 navigation 경계가 된다. 링크에 routing state를 유지하므로 home route를 벗어나도 활성 visual template나 content-debug mode가 예기치 않게 사라지지 않는다.

## feat(shell): 홈 디자인 전환 탐색 추가

설정된 home template 목록을 보여주고 활성 항목을 `aria-current`로 표시하며, 현재 path에 명시적인 `view` URL을 생성하는 선택적 design switcher를 추가한다. 각 대안으로 이동할 때 content-debug 상태도 함께 보존한다.

switcher는 template를 local component state가 아니라 route state로 취급하므로 선택 결과를 URL로 직접 접근하고 공유할 수 있으며 server-rendered page 사이에서도 일관된다. 설정이 제공될 때만 렌더링해 여러 디자인을 노출하지 않는 context에서도 기본 shell을 그대로 사용할 수 있다.

## feat(shell): 공용 푸터와 페이지 셸 추가

footer와 `PageShell` composition boundary를 추가해 공용 page frame을 완성한다. shell은 header, 선택적 template switcher, main content, footer를 결합하고 활성 template를 main element의 data attribute로 기록한다.

이 data attribute 덕분에 개별 component에 template conditional을 넣지 않고도 theme CSS에서 scope selector를 사용할 수 있다. frame을 중앙화하면 navigation state, footer content, debug 동작이 home, index, detail route에 동일하게 적용되는 것도 보장한다.

## feat(home): 디자인 홈 소개 영역 구성

통합 content model을 기반으로 design home route의 소개 section을 구현한다. profile identity, headline, summary, 선택적 photo, 설정된 call to action을 공용 shell, image, link, debug-hint primitive를 통해 렌더링한다.

call to action은 하드코딩한 link ID가 아니라 선언된 placement로 선택하고, photo는 콘텐츠 존재 여부에 따라 조건부로 표시한다. 따라서 route는 composition과 visual hierarchy만 소유하고, 데이터와 availability rule은 계속 content 및 selector 계층이 담당한다.

## feat(home): 대표 프로젝트 쇼케이스 추가

design home에 featured-project showcase를 추가하고 활성 project 집합에서 통계를 파생한다. 첫 번째 featured project를 lead case로 사용하고 나머지는 secondary 영역에 배치하며, lead project가 없으면 showcase 전체를 생략한다.

이를 통해 비어 있는 hero card를 억지로 만들지 않고 image priority를 가장 중요한 근거에 집중한다. project link와 deployment state는 계속 공용 project contract를 통해 전달되므로 showcase가 availability를 별도로 해석하지 않는다.

## style(home): 디자인 히어로 시각 계층 구성

gradient, 움직이는 grid, frame이 적용된 media, 보조 장식 요소를 사용해 design home의 layered hero presentation을 구성한다. 장식 layer는 pointer input을 가로채지 않아 상위의 실제 콘텐츠와 계속 상호작용할 수 있다.

animation rule에는 reduced-motion override를 포함하므로 지속적인 움직임이 없어도 visual hierarchy가 유지된다. 강한 시각 효과는 CSS에 한정하고 home component의 content와 semantic structure는 변경하지 않는다.

## feat(app): 콘텐츠 기반 디자인 홈 연결

애플리케이션 진입점을 content-backed design home에 연결한다. root layout에서 document language, metadata, font, global styling, favicon asset을 제공하고, root page는 aggregate를 로드해 design route를 렌더링한다.

이로써 앞서 만든 model과 primitive가 기본 실행 화면으로 연결된다. metadata와 language는 페이지 콘텐츠 내부에서 반복하지 않고 Next.js가 일관되게 적용할 수 있는 application boundary에서 설정한다.

## feat(home): 애니메이션 터미널 상호작용 추가

classic terminal을 명시적인 typing state machine으로 구현한다. 설정된 command output은 placeholder 치환을 지원하고, 이후 typing, holding, erasing, cycling phase를 순환하며 cleanup 시 timer를 취소한다.

reduced-motion mode에서는 timer 기반 animation을 건너뛰고 안정적인 콘텐츠를 바로 노출한다. command data는 외부에, transition state는 내부에 두어 편집 가능한 terminal 문구와 lifecycle mechanics를 분리하고, cleanup을 통해 unmount된 component를 오래된 timer가 갱신하는 문제를 막는다.

## style(home): 터미널 프레임과 부유 장식 추가

terminal의 visual frame, title bar, body treatment, sheen, floating decoration을 추가한다. 이 style은 terminal state나 content contract를 바꾸지 않으면서 classic template에 장치와 같은 framing을 제공한다.

reduced-motion preference에서는 지속적인 장식 animation을 비활성화한다. 따라서 motion을 사용할 수 없거나 원하지 않는 경우에도 component의 읽기 가능한 구조는 그대로 유지된다.

## style(home): 터미널 출력과 커서 동작 추가

terminal output, command bullet, entry transition, line wrapping, animated caret를 스타일링한다. 동적으로 입력되는 콘텐츠가 다양한 line length에서도 읽히도록 하고 command state와 output state를 시각적으로 구분한다.

caret와 entry animation은 기존 reduced-motion 정책의 적용을 받는다. terminal metaphor는 유지하되 텍스트를 이해하기 위해 animation이 필요하지 않도록 한다.

## feat(home): 클래식 홈 히어로 구성

design home과 동일한 profile, link, project count, page shell을 사용해 classic home route를 구현한다. hero에서는 animated terminal과 classic 전용 문구를 조합하면서 공용 availability 및 navigation rule은 유지한다.

결과적으로 의도한 template 경계가 드러난다. domain data와 routing state는 공통이지만 layout과 visual language는 크게 달라질 수 있다. classic 경험을 위해 별도의 content store는 만들지 않는다.

## style(home): 클래식 홈 테마 적용

shell의 template data attribute 아래에 classic template의 dark palette와 hero/photo treatment를 적용한다. scope를 제한해 이 override가 design home이나 다른 활성 template으로 렌더링된 보조 페이지에 누출되지 않도록 한다.

template-aware CSS를 사용하면 공용 component markup을 유지하면서도 독립적인 visual system을 구현할 수 있다. 따라서 component tree를 분기하지 않고 token과 selector를 통해 presentation을 확장한다.

## feat(home): 쿼리 기반 디자인 전환 연결

root page에서 `view`와 debug query parameter를 해석하고 server에서 classic 또는 design home으로 dispatch한다. 선택된 template는 shell의 switcher configuration에도 전달한다.

server-side selection을 사용하므로 첫 render부터 URL이 권위 있는 template state가 되며 client-only flash나 두 번째 source of truth를 만들지 않는다. 지원하지 않는 값은 계속 공용 resolver의 fallback을 거치므로 routing과 rendering이 동일한 validation rule을 적용한다.

## feat(project): 프로젝트 배포 상태 배지 추가

알려진 project state를 visual tone으로 매핑하고 콘텐츠가 제어하는 `showBadge` flag를 따르는 재사용 가능한 deployment badge를 추가한다. live indicator는 project의 의미상 deployment state가 실제로 live일 때만 표시한다.

표시 label은 유연하게 유지하면서 임의의 문구만 보고 시각적 “live” 상태를 추론하는 것은 막는다. 알 수 없는 tone mapping은 card나 detail page를 깨뜨리지 않고 neutral presentation으로 fallback한다.

## feat(stack): 기술 스택 아이콘 매핑 추가

portfolio technology icon identifier에서 `simple-icons` 정의로 이어지는 타입이 지정된 partial mapping을 추가한다. 콘텐츠 어휘에는 적절한 third-party brand glyph가 없는 개념도 포함되므로 mapping은 의도적으로 부분적이다.

이 map을 adapter로 취급해 package 전용 icon object가 content model로 들어오지 않도록 한다. technology record는 안정적인 내부 identifier를 유지하고 presentation 계층은 명시적 mapping이 있을 때만 외부 asset을 사용한다.

## feat(stack): 기술 스택 폴백 아이콘 추가

`simple-icons`에서 지원하지 않는 identifier를 위한 내부 SVG variant와 generic fallback을 포함하는 technology-icon renderer를 추가한다. third-party icon과 local symbol을 하나의 component contract로 제공한다.

이로써 vendor coverage가 불완전한 상태도 rendering failure가 아니라 지원되는 상태가 된다. content catalog는 icon package와 독립적으로 domain concept를 표현할 수 있고, 현재 또는 향후의 모든 항목이 결정적인 visual marker를 갖게 된다.

## feat(stack): 공용 기술 스택 목록 추가

rendering boundary에서 technology ID를 해석하고 선택적 item limit을 적용하며 각 technology의 설정된 color와 icon을 사용해 일관된 chip을 렌더링하는 공용 stack-list component를 만든다.

해석 로직을 중앙화하면 card, resume, detail page가 누락된 ID를 서로 다르게 처리하지 않는다. 선택적 limit은 underlying project stack을 변경하지 않고 compact context를 지원하므로 전체 technology list에 대한 하나의 source of truth를 유지한다.

## feat(project): 프로젝트 링크 그룹 추가

공용 availability rule을 기반으로 project detail의 link group을 구현한다. case-study link는 detail action 집합에서 제외하고, live demo는 project가 실제 live deployment 상태일 때만 노출한다. 표시할 수 있는 action이 하나도 없으면 component는 wrapper 자체를 렌더링하지 않는다.

demo action은 가장 강하게 강조하고, source 및 기타 destination은 공용 link renderer를 통해 기존의 internal/external icon과 security behavior를 유지한다. 따라서 이 component는 설정된 URL을 무조건 나열하지 않고 project lifecycle state를 반영한다.

## feat(project): 프로젝트 카드 링크 추가

project card에서 사용하는 compact action 집합을 추가하고, link는 중앙화된 card-link selector에서 가져온다. 내부 case-study navigation, 외부 target, debug state, active-template 전파는 전체 project link와 동일한 규칙을 유지한다.

card용 subset을 전체 detail action group과 분리하면 작은 surface에 과도한 action이 노출되는 것을 막으면서 availability logic을 중복하지 않을 수 있다.

## feat(project): 프로젝트 카드 프리미티브 추가

detail navigation, screenshot, deployment badge, summary, stack, highlight, debug provenance, card action을 조합하는 재사용 가능한 project-card primitive를 추가한다. featured variant는 project contract를 바꾸지 않고 강조 수준과 보조 정보량만 조정한다.

이 component는 home과 project-index view에서 공통으로 사용하는 근거 surface가 된다. 이미 해석된 project와 route state를 입력받으므로 card는 presentation에만 집중하고, link eligibility는 selector가, record availability는 content loader가 계속 담당한다.

## feat(ui): 공용 섹션 제목 추가

title, 선택적 body copy, 선택적 content-source hint를 위한 공통 section-heading primitive를 추가한다. 앞으로 추가될 home section에서 반복되는 semantic 구조와 spacing을 이 component로 고정한다.

heading은 여러 template에서 반복되지만 텍스트 자체는 content-driven이므로 이 정도의 작은 공용 경계가 적절하다. 시각적으로 다른 section을 하나의 거대한 component로 합치지 않으면서 markup drift를 줄인다.

## feat(home): 디자인 대표 프로젝트 섹션 추가

공용 heading, reveal, project-card primitive를 사용해 design home의 설정 가능한 featured-project section을 추가한다. 첫 featured 항목은 lead 위치를 차지하고 이후 항목은 보조 grid를 채우며, image priority는 가장 중요한 case에만 부여한다.

section은 presentation configuration과 선택된 featured-project 집합으로 제어되므로 비활성화되거나 데이터가 없을 때 깔끔하게 사라진다. 기존 card를 재사용해 deployment, link, stack, accessibility 동작도 다른 화면과 동일하게 유지한다.

## feat(home): 클래식 대표 프로젝트 섹션 추가

classic home에 compact한 single-lead featured-project section을 추가한다. design variant와 동일하게 선택된 project와 공용 card primitive를 사용하되, classic route의 composition과 section copy를 적용한다.

이 구현은 renderer 경계를 다시 확인한다. template 전용 layout을 만들기 위해 project 동작까지 template별로 분리할 필요는 없다. 빈 데이터와 비활성 section도 유효한 상태이며 placeholder card를 만들지 않는다.

## feat(home): 작업 지표 섹션 추가

공용 work-map section을 추가하고 표시할 count를 presentation JSON에 저장하는 대신 portfolio content에서 파생한다. 각 설정 card는 이름이 지정된 count key로 curriculum, reliability, product 계열 집계를 선택한다.

두 home variant는 동일한 계산값을 사용하면서 section 활성화 여부를 독립적으로 결정할 수 있다. 이를 통해 문구 설정이 두 번째 data source가 되는 것을 막고, 실제 활성 project와 통계가 항상 동기화되도록 한다.

## feat(stack): 기술 스택 마키 프리미티브 추가

canonical technology list의 제한된 subset으로 stack marquee의 semantic structure를 만든다. 끊김 없는 loop를 위해 visual track을 복제하지만, 복제본은 assistive technology에서 숨겨 technology 목록이 한 번만 읽히도록 한다.

안정적인 key와 항목별 color variable을 사용해 CSS animation을 순수 presentation으로 유지한다. 또한 항목 수에 상한을 두어 technology catalog가 커질수록 장식용 home 요소가 무한히 확장되는 것을 막는다.

## style(stack): 기술 스택 마키 동작 추가

marquee의 masked overflow, max-content track, 연속 이동, hover pause를 구현한다. keyframe은 정확히 한 track 폭과 gap만큼 이동해 복제된 구조와 맞물리므로 loop 경계에서 시각적으로 튀지 않는다.

reduced-motion preference에서는 animation을 끄고 technology list를 정적인 layout으로 그대로 읽을 수 있게 한다. 정보 콘텐츠는 보존하고 motion만 선택적인 시각 강화 요소로 취급한다.

## feat(home): 기술 집중 영역 추가

구조화된 skill focus area를 기반으로 공용 technical-focus section을 추가하고, 각 home template의 section configuration을 통해 연결한다. 각 focus item은 debug mode에서 content provenance를 유지하고 공용 reveal 동작에도 참여할 수 있다.

component는 presentation data에 별도의 목록을 복제하지 않고 domain-level skill model을 사용한다. 따라서 설명 중심의 focus area를 template 간에 재사용하면서 각 home route는 표시 여부와 위치만 독립적으로 결정한다.

## feat(home): 선택 기술 스택 영역 추가

설정된 skill group이 참조하는 technology ID를 수집하고 canonical technology catalog를 해당 집합으로 filtering해 selected-stack home section을 추가한다. section은 marquee와 grouped stack list를 조합하며 두 home template에서 각각 독립적으로 활성화할 수 있다.

참조 관계에서 visible catalog를 파생하므로 실제 skill group과 어긋날 수 있는 별도 “featured technologies” 목록을 관리할 필요가 없다. label, color, icon의 source는 계속 canonical technology metadata이고, presentation은 section의 존재 여부와 문구만 제어한다.

## feat(journey): 여정 날짜와 카드 프리미티브 추가

단일 날짜, 기간, 진행 중 상태, category label, description, 선택적 project link를 일관되게 처리하는 journey formatting 및 card primitive를 추가한다. 내부 link는 active template와 content-debug state를 보존하고, pair chunking은 작은 layout helper로 제공한다.

이로써 timeline의 의미 해석을 특정 visual arrangement와 분리한다. compact와 centerline renderer가 같은 날짜 해석과 card behavior를 공유하므로, 종료일이 없는 항목이나 project reference가 없는 상태도 모든 화면에서 동일하게 처리된다.

## feat(journey): 중앙선 여정 목록 추가

paired centerline journey layout을 semantic ordered list로 구현한다. 첫 항목이 timeline의 시작을 고정하고, 이후 항목은 중앙선을 기준으로 pair로 묶으며, 마지막에 짝이 없는 항목이 남으면 명시적인 single-row 형태로 처리한다. 선택적 reveal wrapper는 항목 순서를 바꾸지 않는다.

홀수 길이 입력을 구조적으로 처리하므로 placeholder card를 추가하거나 콘텐츠 순서를 바꿀 필요가 없다. renderer는 spatial arrangement만 담당하고, journey card는 date, category, body, project-link presentation을 계속 소유한다.

## feat(journey): 여정 목록 변형 연결

compact와 paired-centerline variant 및 명시적인 animation option을 제공하는 단일 `JourneyList` interface를 노출한다. compact path는 단순한 ordered list를 유지하고, centerline path는 paired renderer에 위임한다.

페이지마다 timeline 선택 로직을 복제하는 것보다 variant 경계를 두는 편이 낫다. About과 home route는 같은 ordered journey record와 card semantics를 사용하면서 원하는 density와 motion policy만 선택할 수 있다.

## style(journey): 여정 타임라인 시각 계층 추가

compact journey list에 연속 guide line, node, card hierarchy, reveal transition을 적용한다. 실제 읽기 순서를 담당하는 ordered-list 구조는 바꾸지 않고 CSS만으로 시간적 관계를 드러낸다.

visual line과 node는 계속 장식 요소이며 journey content는 이 표현과 독립적으로 접근할 수 있다. motion은 전역 reduced-motion policy를 그대로 상속한다.

## style(journey): 데스크톱 중앙선 여정 구성

paired centerline timeline의 desktop geometry를 추가한다. 중앙 guide, 시작 node, 3-column pair row, 마지막 unpaired card의 중앙 정렬 처리, template-aware card surface를 포함한다.

layout은 pair를 시각적으로 대칭 배치하되 DOM의 source order는 유지한다. single row를 명시적으로 처리해 비대칭을 해소한다는 이유로 콘텐츠를 복제하거나 이동하지 않으며, template scope를 적용해 동일 component를 두 home design에 맞출 수 있다.

## style(journey): 모바일 중앙선 여정 구성

paired journey layout을 왼쪽 guide가 있는 single-column mobile timeline으로 변환한다. desktop용 중앙 node는 숨기고 pair row는 source order대로 접으며, 좁은 viewport에 맞게 card surface를 단순화한다.

이 responsive 변환은 desktop의 시각적 교차 배치를 억지로 유지해 읽기 순서를 훼손하지 않고 chronology를 보존한다. 따라서 같은 semantic list를 breakpoint 전반에서 그대로 사용할 수 있다.

## feat(home): 공용 여정 섹션 추가

paired animated journey renderer를 사용하는 공용 home journey section을 추가하고 두 template configuration에 연결한다. section copy는 presentation content에 유지하고, 항목은 정규화된 journey source에서 가져오며 link에는 active template state를 전달한다.

두 home variant가 timeline 조립을 중복하지 않고 동일한 chronology를 보여준다. 데이터가 없거나 section이 disabled이면 깔끔하게 생략해 기존 content-driven composition model을 유지한다.

## feat(home): 연락 미리보기 추가

현재 availability 문구와 portfolio domain helper가 선택한 preferred contact link를 결합한 공용 contact-preview section을 추가한다. 공용 link renderer가 internal/external behavior, security attribute, active route state를 적용한다.

contact preference와 enablement rule을 home template 밖에 유지할 수 있다. design과 classic view는 preview 포함 여부를 각자 결정하면서도 동일한 source data를 해석하는 전용 Contact page와 동작을 일치시킨다.

## feat(projects): 프로젝트 그룹 정렬 규칙 추가

project-index data를 결정적으로 grouping하고 ordering하는 규칙을 추가한다. 알려진 category는 presentation content에 선언된 명시적 순서를 따르고, 설정에 없는 category도 버리지 않고 알려진 group 뒤에 남겨 서로 간에는 일관되게 정렬한다.

새 category를 추가해도 누락되지 않으면서 기존 category의 editorial ordering은 유지할 수 있다. 이 규칙을 중앙화하면 layout이 달라도 design과 classic index가 동일한 project taxonomy를 제시한다.

## feat(projects): 디자인 프로젝트 소개 영역 추가

활성 project collection을 기반으로 design project index의 hero와 통계를 구현한다. 표시 가능한 항목, curriculum project, source-only project 개수는 route-facing data layer에서 계산하고 presentation이 소유한 label로 렌더링한다.

따라서 페이지는 수동으로 관리하는 총계가 아니라 사용자가 실제로 탐색할 수 있는 record 수를 표시한다. hero를 개별 project-card 구현에 결합하지 않은 채 debug provenance와 공용 shell도 그대로 사용할 수 있다.

## feat(projects): 디자인 대표 프로젝트 목록 추가

공용 project card와 첫 항목에 우선순위를 둔 media를 사용하는 design index의 featured-project section을 추가한다. 다른 화면과 동일한 featured selection을 사용하며 생성되는 모든 link에서 template/debug state를 보존한다.

card를 재사용하므로 deployment status, stack limit, screenshot, action이 home showcase와 일관된다. index는 section composition과 visual priority만 결정한다.

## feat(projects): 디자인 프로젝트 그룹 목록 추가

중앙화된 grouping 결과에 따라 design index의 나머지 project를 렌더링한다. category description은 presentation content에서 가져오고, group에는 교차되는 visual treatment를 적용하며, 각 section은 공용 card를 렌더링하기 전에 자체 count를 표시한다.

featured와 grouped collection을 분리해 동일한 case가 중복 노출되는 것을 막으면서 모든 활성 non-featured project에는 계속 접근할 수 있다. grouping utility가 결정적인 fallback order를 제공하므로 알 수 없는 category도 표시할 수 있다.

## feat(projects): 클래식 프로젝트 소개와 터미널 추가

classic project index의 hero, 타입이 지정된 통계, terminal 형태의 group snapshot을 구현한다. 통계 configuration은 지원되는 파생 count key만 선택하고, terminal은 presentation content 설정에 따라 표시하는 group 수를 제한한다.

실제 count와 grouping에 대한 권한은 route가 유지하고 classic renderer는 표현 방식만 바꾼다. terminal output에 상한을 두어 장식용 요약이 전체 project index를 대체하거나 압도하지 않도록 한다.

## feat(projects): 클래식 대표 프로젝트 추가

하나의 lead project와 공용 featured card를 사용해 classic index의 selected-project 영역을 추가한다. featured project가 있을 때만 section을 렌더링하고 빈 frame은 만들지 않는다.

별도의 project semantics를 만들지 않으면서 간결한 classic presentation을 제공한다. link eligibility, deployment status, media, technology rendering은 계속 공용 card boundary에서 상속한다.

## feat(projects): 클래식 그룹 인덱스 추가

category 문구, group별 count, deployment badge, summary, 제한된 stack list, 내부 detail link를 포함하는 classic project의 밀도 높은 grouped index를 추가한다. detail URL은 active template와 content-debug state를 보존한다.

compact index는 의도적으로 design variant보다 card 장식을 줄이지만 동일한 grouped record를 사용한다. 따라서 taxonomy와 navigation은 같게 유지하면서 classic template는 scan density에 맞게 최적화할 수 있다.

## feat(projects): 프로젝트 목록 route 연결

`/projects`를 통합 content 및 query-state model에 연결한다. route에서 active template와 debug flag를 해석하고 featured/non-featured project를 분리한 뒤 나머지를 grouping한다. 이어 visible, curriculum, source-only count를 계산하고 공용 shell 안에서 해당 index renderer로 dispatch한다.

이 collection을 route boundary에서 한 번만 계산하면 두 visual variant의 eligibility나 total이 서로 달라지는 것을 막을 수 있다. Projects navigation 항목도 추가해 완성된 route를 content-driven site navigation에서 접근할 수 있게 한다.

## feat(project): 상세 화면 섹션 프리미티브 추가

project detail page를 위한 재사용 가능한 title, two-column, list section primitive를 추가한다. section별 문구와 record를 입력받으면서 반복되는 heading/content 관계를 일정하게 유지한다.

추상화 범위는 의도적으로 좁다. problem, solution, architecture, result 같은 서로 다른 콘텐츠를 하나의 불투명 renderer에 감추지 않고 semantic hierarchy와 spacing만 표준화한다. 따라서 긴 case-study page를 지원하면서도 각 section의 책임이 드러난다.

## feat(project): 프로젝트 상세 소개 추가

상태를 보존하는 back navigation, category, period, role, deployment status, summary, description, 허용된 action, priority가 지정된 primary screenshot을 포함하는 project-detail introduction을 구성한다. content-debug hint는 underlying project source를 표시한다.

view는 내부에서 project를 lookup하지 않고 이미 해석된 project를 전달받으며, link 노출도 공용 deployment-aware selector를 계속 사용한다. 이로써 detail component는 case-study presentation에 집중하면서 route 및 content boundary를 보존한다.

## feat(project): 프로젝트 문제와 해결 설명 추가

공용 two-column primitive를 사용해 project detail view에 독립적인 problem 및 solution section을 추가한다. 본문은 project record에서 직접 가져오고 section heading은 presentation content에서 제공한다.

이 개념을 introduction summary와 분리해 각 case study에 안정적인 reasoning structure를 부여한다. constraint와 response가 card 수준의 marketing copy로 합쳐지지 않으며, 공통 hierarchy 덕분에 실제 설명을 획일화하지 않고도 project끼리 비교할 수 있다.

## feat(project): 프로젝트 구조와 증거 갤러리 추가

project detail에 architecture section과 screenshot evidence gallery를 추가한다. architecture는 summary와 명시적인 item으로 표현하고, 설정된 모든 screenshot은 공용 media primitive를 통해 렌더링한다.

이를 통해 구현 구조를 일반 solution prose와 구분하고 screenshot을 장식 배경이 아니라 supporting evidence로 취급한다. project가 소유한 array를 사용하므로 case study별 정보 깊이가 달라도 page component를 수정할 필요가 없다.

## feat(project): 프로젝트 기술과 의사결정 추가

전체 technology stack과 decision, trade-off, result를 각각 분리한 list로 구성해 주요 case-study body를 완성한다. stack rendering은 canonical technology resolution을 재사용하고 나머지 section은 공용 list hierarchy를 사용한다.

decision과 trade-off를 구분하면 무엇을 선택했는지와 그 선택에 따른 비용을 별도로 기록할 수 있다. result도 별도의 outcome 계층으로 유지해 구현 선택 자체를 성공의 근거처럼 제시하지 않도록 한다.

## feat(project): 프로젝트 상세 route 연결

dynamic project-detail route를 추가하고 활성 project collection으로부터 static parameter를 생성한다. route는 비동기 parameter와 query state를 해석하고 공용 selector로 project를 조회하며, 알 수 없는 identifier에는 Next.js `notFound`를 반환하고 state-aware shell 안에서 detail view를 렌더링한다.

static generation과 runtime lookup이 동일한 content source를 사용하므로 사전 생성된 route 집합과 실제 유효한 record 집합이 어긋날 수 없다. switcher에는 구체적인 detail path를 전달해 visual template를 바꿔도 선택한 project route를 유지한다.

## feat(about): 프로필과 원칙 소개 추가

profile 및 presentation content로 About route를 만든다. page에서 template/debug query state를 해석하고 공용 shell 안에 identity와 summary를 렌더링하며, 구조화된 principle을 개별 article로 매핑한다. debug mode에서는 content provenance도 표시한다.

이 route는 home page에서 이미 사용하는 profile fact를 복제하지 않고 같은 record를 더 자세한 설명 layout으로 보여준다. template 전환은 URL 기반으로 유지하며 `/about` 위치도 보존한다.

## feat(about): 여정 요약 추가

기존 `JourneyList` abstraction을 통해 portfolio journey를 About page에 추가한다. section title은 presentation content에서 제공하고, 정규화된 journey collection과 active template, debug state는 공용 renderer에 직접 전달한다.

compact 기본 variant를 재사용해 About만을 위한 두 번째 timeline 구현을 만들지 않는다. 따라서 date, ongoing entry, 선택적 project link, chronology가 home journey section과 일관된다.

## feat(about): 기술 그룹 소개 추가

공용 stack-list renderer로 grouped technical skill을 About page에 추가하고 완성된 route를 site navigation에 노출한다. 각 group은 debug mode에서 source hint를 유지하며 technology metadata는 canonical catalog로 해석한다.

page component에 label, color, icon data를 복사하지 않고 skill grouping을 표현한다. navigation도 content source에 추가해 기존 Home 및 Projects link와 동일한 편집 가능한 site configuration이 reachability를 관리하도록 한다.

## feat(resume): 이력 소개와 요약 추가

profile identity, presentation이 소유한 hero copy, 선택적 download action, 구조화된 summary paragraph를 갖는 Resume route를 만든다. query에서 선택된 template와 debug state는 공용 shell을 통해 처리한다.

download control은 URL이 있을 때만 렌더링하므로 생성된 resume가 없는 상태도 유효한 content state다. summary content는 project record와 분리해, 근거 목록을 보여주기 전에 지원자의 범위를 소개할 수 있게 한다.

## feat(resume): 선택 프로젝트 경력 추가

설정된 resume project ID를 공용 selector로 해석해 Resume page에 selected project evidence를 추가한다. 각 항목은 period, summary, 제한된 technology list, full case study로 이어지는 state-preserving link를 표시한다.

project snapshot을 별도로 복제하지 않고 reference를 해석하므로 resume content가 project catalog와 달라지는 것을 막는다. invalid 또는 disabled reference는 selector boundary에서 처리하고 page는 유효한 domain record만 렌더링한다.

## feat(resume): 교육 과정 요약 추가

구조화된 training entry를 Resume page에 추가하고 route를 content-driven site navigation에 노출한다. 각 record는 name, period, description과 debug source hint를 표시한다.

training은 project category에서 추론하지 않고 독립적인 resume concern으로 유지해 교육 이력을 직접 서술할 수 있다. navigation 변경으로 menu markup을 하드코딩하지 않고도 완성된 route에 접근할 수 있다.

## feat(contact): 연락 페이지 소개 추가

profile identity와 contact 전용 title 및 introductory text를 사용해 Contact route를 만든다. 다른 보조 route와 동일하게 query-state resolution, 공용 shell, debug provenance 동작을 사용한다.

개별 contact method를 추가하기 전에 route를 먼저 구성해 introductory availability context를 link rendering과 분리한다. 문구의 권위 있는 source는 계속 content source다.

## feat(contact): 선호 연락 수단과 안내 추가

availability 상세 정보, preferred contact link, 설명 note를 추가해 Contact page를 완성하고 route를 site navigation에 등록한다. preferred link는 domain helper로 선택하고 공용 internal/external link component를 통해 렌더링한다.

따라서 enablement, preference order, URL classification, external-link security rule을 중복 구현하지 않고 그대로 준수한다. note는 구조화된 콘텐츠로 유지해 contact-link catalog와 독립적으로 운영 안내를 변경할 수 있다.

## style(project): 프로젝트 카드 상호작용 추가

hover 시 project card와 screenshot에 lift 및 layered highlight feedback을 추가한다. pseudo-element는 상호작용하지 않도록 유지하고 card child를 명시적으로 그 위에 배치해 효과가 link나 content를 가리지 않도록 한다.

reduced-motion rule에서는 motion card의 transform과 transition을 제거하되 모든 정보와 action은 그대로 유지한다. hover feedback을 순수 presentation으로 남기고 움직임이 card의 기능적 계약에 포함되지 않도록 한다.

## style(a11y): 동적 목록의 모션 감소 지원

reduced-motion override 범위를 technology chip과 experience 및 journey list의 animated guide 요소까지 확장한다. reveal과 card motion뿐 아니라 이 요소들의 transform과 transition도 비활성화한다.

기존 accessibility policy의 coverage gap을 보완한다. motion reduction이 눈에 띄는 hero animation뿐 아니라 페이지 전반에 반복되어 더 방해가 될 수 있는 list와 timeline effect에도 적용된다.

## build(content): runtime 콘텐츠 검증 의존성 추가

Zod를 runtime dependency로, `tsx`를 개발 시 TypeScript runner로 추가하고 생성된 lockfile을 갱신해 플랫폼별 전체 의존성 해석 결과를 기록한다.

두 의존성은 validation boundary에서 상호 보완적인 역할을 한다. Zod는 import된 JSON에 적용할 schema를 표현하고 실행하며, `tsx`는 별도의 JavaScript build를 먼저 만들지 않고도 TypeScript validation tooling을 실행할 수 있다. 의미 있는 결정은 package manifest에 기록되고, 큰 lockfile 변경은 재현 가능한 설치를 뒷받침하는 기계적 결과다.

## feat(content): 콘텐츠 경로와 기본 식별자 schema 추가

non-empty string, 안정적인 content identifier, 6자리 color, 지원되는 link, local asset path, navigation item을 위한 재사용 가능한 schema로 runtime content validation을 시작한다. link 값은 root-relative, fragment, HTTP(S), email, telephone 형식으로 제한하고, local asset은 public content 또는 template namespace 아래에 있어야 한다.

이 primitive는 이전까지 TypeScript type과 component behavior에만 암묵적으로 존재하던 가정을 실행 가능한 규칙으로 옮긴다. strict navigation object는 우발적인 field를 거부하고, 초기 path validation은 배포에서 제공하지 않는 임의의 local location을 콘텐츠가 가리키지 못하게 한다.

## feat(content): 사이트와 프로필 schema 추가

site 및 profile source를 위한 runtime schema를 추가한다. 필수 identity, metadata, navigation, footer, profile text, principle, 선택적 photo field를 검증하며, 앞서 정의한 asset-path rule도 적용한다.

profile은 구조가 명확하므로 strict contract를 사용하고, site는 현재 애플리케이션이 의존하는 핵심 영역을 검증하면서 향후 page capability를 단계적으로 추가할 수 있도록 validated core 바깥의 passthrough field를 허용한다. 이 선택은 현재 필요한 값의 validation을 유지하면서 호환 가능한 site-level extension을 막지 않는다.

## feat(content): 링크와 배포 상태 schema 추가

content link, link placement, deployment status, project image를 위한 runtime enum과 strict object schema를 추가한다. 선택적 ID, enablement, external behavior, placement list를 selector와 renderer가 사용하는 유한한 vocabulary에 맞춰 검증한다.

이를 통해 오타가 난 link type이나 deployment state가 availability logic을 통과해 UI에서 서로 다르게 동작하는 문제를 막는다. project image에도 제어된 local-asset path와 non-empty alternative text 요구사항을 적용한다.

## feat(content): 프로젝트 분류와 지표 schema 추가

ordered project group과 declarative project metric을 위한 strict schema를 추가한다. metric filter는 project ID, group ID, tag, featured state, deployment status를 대상으로 할 수 있으며, 비어 있지 않은 filter array를 요구해 선택 조건처럼 보이지만 구조적으로 아무 것도 매칭하지 않는 설정을 막는다.

metric aggregation은 project 또는 highlight count로 제한한다. presentation 수준의 통계 표현력은 유지하면서 임의의 실행 가능한 query나 알 수 없는 aggregation mode가 content format에 들어오는 것은 차단한다.

## feat(content): 프로젝트 사례 schema 추가

project case-study source와 이를 포함하는 project catalog의 전체 runtime schema를 정의한다. 안정적인 ID, ordering, grouping, tag, lifecycle flag, narrative field, deployment metadata, screenshot, stack reference, link, architecture, decision, trade-off, result를 하나의 strict record로 검증한다.

최소 하나의 group과 project를 요구해 최소 유효 catalog를 정하고, 선택적인 feature 및 enablement flag는 기존 기본 동작을 유지한다. schema는 list와 detail consumer 모두의 가정을 반영해 type cast에 의존하던 공통 전제를 실행 가능한 input contract로 바꾼다.

## feat(content): 홈 표현 식별자 schema 추가

presentation configuration에서 사용하는 유한한 identifier를 추가한다. 지원하는 site design, 공용 home section, variant별 section order, work-map count key, project-page count key를 정의한다. Editorial, Brutalist, Cinematic section array는 비어 있지 않아야 하며 중복도 허용하지 않는다.

이 constraint를 통해 ordering은 선언적으로 유지하면서 존재할 수 없는 section이나 중복 section은 막는다. 열거된 count key는 presentation content가 애플리케이션이 실제로 파생할 수 있는 값만 선택하도록 보장한다.

## feat(content): 프로젝트 목록 표현 schema 추가

design, classic, editorial, brutalist, cinematic variant 전체에 대해 project-index presentation model의 runtime validation을 추가한다. schema는 group copy, hero field, 지원 통계, terminal configuration, archive label, variant별 framing을 검사한다.

renderer가 고정된 contract를 갖는 내부 object는 strict하게 검증해 field 오타를 잡고, 바깥 page object는 이후 section을 호환되게 확장할 수 있도록 허용한다. 양수 numeric limit과 타입이 지정된 count key로 terminal 및 statistics renderer의 잘못된 설정을 막는다.

## feat(content): 표현 공용 UI schema 추가

기본 template registry와 shared UI copy를 위한 top-level presentation schema를 구성한다. template identity, accessibility label, switcher text, project 및 journey action template, current-time label, route 전반에서 사용하는 이름 있는 empty state를 검증한다.

accessibility와 empty-state 문자열을 필수 콘텐츠로 취급해, 비시각적 navigation context나 failure-state copy가 빠진 visual template이 유효하다고 판정되는 것을 막는다. 상위 수준에서는 passthrough를 허용해 이후 template별 section을 점진적으로 추가할 수 있다.

## feat(content): Design과 Classic 홈 표현 schema 추가

presentation schema 안에서 Design 및 Classic home configuration을 검증한다. Design은 hero label, 타입이 지정된 statistic, enabled section ID, featured copy를 검사하고, Classic은 여기에 terminal title, boot line, prompt, command, command output array까지 추가로 검증한다.

두 variant는 같은 공용 section vocabulary와 work-map count key를 공유한다. 따라서 schema는 각자의 framing 차이는 보존하면서도 home renderer가 이미 구현한 mechanism만 참조하도록 강제한다.

## feat(content): Editorial 홈 표현 schema 추가

Editorial shell과 home presentation에 runtime validation을 추가한다. shell framing, 중복 없는 ordered section list, hero issue 및 action label, lead-project copy, featured heading, current-work action text를 필수로 요구한다.

Editorial 전용 field는 Design 및 Classic configuration과 분리하므로 새 variant를 추가해도 기존 contract가 느슨해지지 않는다. 명시적인 section order는 editorial composition을 content-driven으로 유지하면서 중복된 structural region을 막는다.

## feat(content): Brutalist 홈 표현 schema 추가

Brutalist shell과 home configuration에 대한 runtime validation을 추가한다. debug framing, stamp 및 signal text, ordered section, primary/secondary hero action, featured-project copy, system 설명, journey action, contact action을 포함한다.

component constant로 옮기지 않고도 이 variant의 의도적으로 다른 vocabulary를 schema에 명시한다. section list는 앞서 정의한 uniqueness rule을 사용하므로 content editor가 region 순서를 바꿔도 결정적인 page structure를 유지한다.

## feat(content): Cinematic 홈 표현 schema 추가

Cinematic shell subtitle과 home composition에 runtime validation을 추가한다. 고유한 section order, 두 개의 hero action, statement 및 focus label, contact action, case-study action을 필수 field로 검사한다.

이 contract를 다른 presentation schema와 나란히 두면 모든 template이 하나의 validated source를 공유하면서도 각각 독립된 필수 field를 유지할 수 있다. Cinematic renderer는 section마다 부분적으로 설정된 콘텐츠를 방어하지 않고 필요한 narrative control이 존재한다고 가정할 수 있다.

## feat(content): 공용 홈 섹션 schema 추가

template 간 공유하는 home section의 validation을 완성한다. work-map card에는 stable ID, label, description, 지원 count key를 요구하고, technical focus, stack, journey, contact에는 필요한 section 및 action copy를 요구한다.

이로써 variant 수준의 section 선택과 그 section이 참조하는 공용 content 사이의 간극을 닫는다. configuration이 공용 section을 지정하면서 렌더링에 필요한 문구를 누락할 수 없고, work-map statistic도 알려진 파생 값에 계속 묶인다.

## feat(content): About과 Contact 표현 schema 추가

About 및 Contact presentation content에 runtime schema를 추가한다. About은 핵심 section title, curation structure, editorial/brutalist label을 검증하고, Contact는 availability, note, variant별 hero framing을 검증한다.

page object는 호환 가능한 확장을 허용하지만 현재 실제로 사용하는 nested structure는 모두 검사한다. 이로써 서로 무관한 visual variant를 하나의 평평한 label 집합으로 합치지 않으면서 보조 page에도 home 및 project index와 같은 runtime guarantee를 제공한다.

## feat(content): Interview Map 표현 schema 추가

Interview Map page의 hero, track navigation, question/answer label, depth 및 reference metadata, empty state, item-count template, gap-section accessibility copy에 runtime validation을 추가한다.

schema는 화면에 보이는 label뿐 아니라 map의 grouped structure에 필요한 ARIA context까지 포함한다. 해당 field를 presentation content에 두어 page vocabulary를 편집 가능하게 유지하면서 navigation, 빈 결과, 매핑되지 않은 gap에 renderer가 기대하는 문구가 항상 존재하도록 한다.

## feat(content): Journey 표현 schema 추가

presentation schema에 journey page의 semantic structure를 확장한다.

page는 hero framing, decision narrative를 설명하는 문구, prior state·reason·result에 대한 명시적 label, timeline framing, current-direction section의 project-link label을 제공해야 한다. 이 개념들을 개별적으로 검증하면 chronological entry와 decision analysis의 구분을 유지할 수 있으며, page-level extensibility를 통해 필수 공용 contract를 약화하지 않고 이후 design 전용 field를 추가할 수 있다.

## feat(content): 프로젝트 상세 표현 schema 추가

presentation schema에 project-detail interface 전체 계약을 추가한다.

configuration은 navigation 및 case label, project unavailable 상태, project fact, frame 및 outro copy, editorial decision framing, problem부터 result까지 모든 case-study section label을 검증한다. 알려진 nested block을 모두 요구하므로 잘못된 presentation data 때문에 renderer가 특정 section을 조용히 누락하는 문제를 막고, page-level passthrough로 추가 design 전용 field를 넣을 여지는 남긴다. project evidence 자체는 project source에 유지하며 이 schema는 해당 evidence를 어떻게 framing할지만 규정한다.

## feat(content): Resume 표현 schema 추가

presentation schema에 résumé page의 전체 interface contract를 추가한다.

page는 hero 및 download copy, summary·selected project·training·experience·education·note label, identity field label, design별 hero framing을 제공해야 한다. 알려진 개별 block은 strict하게 검증해 label 오타가 validation failure가 되도록 하고, 바깥 presentation schema를 통해 page 자체는 확장 가능하게 유지한다. 이 구조는 résumé fact와 여러 visual design에서 이를 정리하고 렌더링하는 문구를 분리한다.

## feat(content): 기술과 경력 schema 추가

technology registry, skill presentation, experience history를 위한 runtime schema를 정의한다.

technology entry는 임의의 이름을 받는 대신 안정적인 identifier, 검증된 color, renderer가 지원하는 asset과 일치하는 유한한 icon vocabulary를 사용한다. skill은 설명 중심의 focus area와 technology reference의 이름 있는 group을 구분하고, experience는 period, title, description record의 간결한 sequence로 유지한다. strict object로 지원하지 않는 metadata를 조기에 거부하고 display identity를 page content 곳곳에 반복하지 않고 technology registry에 중앙화한다.

## feat(content): 여정과 연락 schema 추가

chronological journey entry, global link, contact content의 runtime contract를 정의한다.

journey record에는 date, title, category, description을 요구하되 종료 시점이 없는 period와 canonical project 또는 source path를 향하는 선택적 link를 허용한다. global link는 공용 link schema를 재사용하고 contact preference는 availability 및 note와 함께 해당 link를 identifier로 참조한다. 이를 통해 timeline fact, 재사용 가능한 destination, contact-page composition을 분리하면서 각 collection이 UI에 도달하기 전에 strict shape를 갖도록 한다.

## feat(content): Resume 콘텐츠 schema 추가

résumé content를 위한 strict runtime schema를 정의한다.

계약은 선택적 local download asset을 허용하고, summary 및 note entry는 의미 있는 문자열이어야 하며, selected project는 안정적인 content identifier로 참조하고, training과 education은 동일한 name–period–description 구조로 모델링한다. document를 strict하게 만들어 우발적인 field가 조용히 허용되는 것을 막으면서 nullable asset path를 통해 résumé PDF가 아직 없어도 유효한 portfolio 상태를 지원한다.

## feat(content): 여정 narrative schema 추가

portfolio의 decision-oriented journey narrative를 위한 strict schema를 정의한다.

각 milestone은 stable identifier, date, title, prior state, decision reason, resulting change, 0개 이상의 anchor-project identifier를 가져야 하며 별도의 current-position summary가 뒤따른다. 이 표현은 journey가 구조 없는 timeline으로 변하는 것을 막는다. development transition을 설명하는 데 필요한 context, reasoning, outcome, evidence relationship을 content contract 자체가 요구한다.

## feat(content): Interview Map 콘텐츠 schema 추가

interview-evidence content를 위한 strict runtime schema를 정의한다.

document는 introduction, label이 있는 reference repository, stable identifier를 갖는 topic track, source link가 있는 개별 question, 명시적인 evidence depth를 갖는 project-backed answer, unsupported topic section을 요구한다. 공용 URL 및 content-identifier schema를 재사용해 외부 reference와 project relationship을 나머지 content system과 호환되게 유지한다. 이 구조로 question, source, supporting evidence, known gap의 차이를 ingestion 단계에서 강제할 수 있다.

## feat(content): 큐레이션 schema와 타입 export 추가

portfolio-curation content를 위한 strict schema를 정의하고 schema에서 파생한 project type을 노출한다.

curation contract는 introduction, 이름 있는 selection criterion, project identifier와 rationale를 갖는 category, 명시적 omission, next-review statement를 요구한다. nested object는 선언되지 않은 field를 거부하고 의미 있는 text는 비어 있을 수 없다. project group, metric, filter, source record, projects document, presentation content도 이제 각 schema에서 직접 export한다. 따라서 runtime validation과 TypeScript consumer가 병렬 정의를 유지하는 대신 하나의 권위 있는 표현을 공유한다.

## refactor(content): 프로젝트 컬렉션 migration 경계 추가

`projects.json`을 flat array에서 object-backed catalog로 migration하기 위한 compatibility boundary를 추가한다.

content facade는 legacy array와 새 `{ items }` 표현을 모두 받아 route와 selector가 이미 사용하는 `PortfolioProject[]`로 정규화한다. file format 전환을 rendering layer와 분리해 group 및 metric을 도입하더라도 같은 commit에서 모든 기존 consumer를 함께 바꿀 필요가 없다. 이 경계는 의도적으로 좁으며 migration이 완료되면 이후 schema-validated loading으로 대체된다.

## feat(content): 사이트와 프로필 starter 콘텐츠 구성

일반 placeholder를 일관된 starter identity, site map, contact policy, experience record로 교체한다.

site content는 새 journey 및 interview route의 선택적 page availability와 navigation을 선언하고, profile content에는 portrait, working principle, location, availability, 사실에 충실한 starter copy를 포함한다. contact preference는 URL을 복제하지 않고 global link identifier를 참조하며, setup note는 안전하지 않은 placeholder를 교체할 때까지 disabled 상태로 유지한다. 이로써 site configuration, personal fact, contact routing, career history의 경계를 분명히 유지하면서 사용 가능한 기본 portfolio를 제공한다.

## feat(content): 링크와 기술 starter 콘텐츠 구성

starter의 global link, technical focus, skill group, technology registry를 채운다.

link에는 stable identifier, semantic type, enabled state, internal/external behavior, hero·contact·footer context의 명시적 placement를 부여하고 placeholder email은 설정될 때까지 disabled 상태로 둔다. skill group은 display metadata를 반복하지 않고 technology identifier를 참조하며, label, icon, color는 technology registry가 소유한다. 이를 통해 재사용 가능한 technology identity를 page grouping과 분리하고 하나의 link record가 여러 presentation surface에 안전하게 참여할 수 있다.

## feat(content): 프로젝트 starter 분류와 지표 구성

project source를 flat array에서 명시적 group과 declarative metric을 가진 catalog로 변경한다.

group은 stable identifier, order, label, description을 갖고, metric은 aggregate와 group·featured state·deployment status에 따른 선택적 filter를 정의한다. project statistic을 route별 heuristic에서 분리해 starter의 product, archive, reliability, source-only count를 content로 설명할 수 있게 한다. 이후 item collection은 stable identifier를 통해 classification 및 measurement rule을 참조할 수 있다.

## feat(content): 프로젝트 starter 상세 구성

portfolio의 전체 case-study model을 모두 사용하는 완전한 starter project를 추가한다.

record 하나에 canonical identifier를 기준으로 grouping, tag, deployment state, media, technology reference, placement-aware link, highlight, problem/solution narrative, architecture, decision, trade-off, result를 정의한다. source link는 의도적으로 disabled하고 artwork는 placeholder evidence임을 명확히 표시하므로 실제 deployment를 암시하지 않고 안전하게 렌더링된다. end-to-end record 하나를 제공해 cross-file reference와 다섯 visual template을 모두 동일한 content shape로 테스트할 수 있다.

## feat(content): Resume와 여정 starter 콘텐츠 구성

résumé 및 journey source에 완전한 starter record를 채운다.

résumé는 사실에 기반한 summary line, project reference, training entry, setup note를 보여주며 optional download와 education data의 부재도 명시적으로 유지한다. timeline entry는 예시 project를 chronological history에 연결하고, 새 journey narrative는 현재 방향을 기록하기 전에 decision을 state, reason, result, supporting project identifier로 모델링한다. 이 예시는 résumé selection과 historical claim이 case-study content를 복제하지 않고 canonical project를 재사용해야 하는 방식을 보여준다.

## feat(content): Interview Map과 큐레이션 starter 콘텐츠 구성

interview-evidence map과 portfolio-curation rationale을 위한 starter data를 추가한다.

interview map은 topic, external reference, project identifier, evidence-depth statement가 어떻게 하나의 추적 가능한 answer를 이루는지 보여주고, gap list에는 지원하지 않는 claim을 명시적으로 기록한다. curation source는 selection criterion, rationale가 있는 category, omission, future review trigger를 모델링한다. 완전한 예시를 통해 의도한 authoring contract를 확립하고 evidence coverage에 대한 정직성을 비공식 관례가 아니라 portfolio data의 일부로 만든다.

## feat(content): 공용 UI 표현 콘텐츠 구성

design과 route 전반에서 사용하는 shared interface-copy contract를 도입한다.

presentation source가 skip-link, navigation, menu, design-switcher, project-action, terminal, marquee, journey label과 interpolation template, 명시적 empty-state message를 소유한다. template description도 의미 있는 design summary로 교체한다. visible 및 assistive text를 중앙화해 재사용 component가 언어를 하드코딩하는 것을 막고 zero-data state를 우연한 빈 출력이 아니라 content model의 일부로 만든다.

## feat(content): Design과 Classic 홈 표현 콘텐츠 구성

기존 Design 및 Classic home variant의 presentation content를 완성한다.

두 variant 모두 전체 shared-section sequence를 선언하고 placeholder action 및 featured-work copy를 evidence-oriented language로 교체한다. classic terminal은 고정된 개인 값을 사용하지 않고 interpolation token을 통해 identity, indexed project, focused tool, contact availability를 요약하는 content-driven 요소가 된다. 이로써 terminal의 visual metaphor를 canonical portfolio data와 동기화하면서 두 home layout이 동일한 section model을 공유한다.

## feat(content): 확장 디자인 홈 표현 콘텐츠 구성

editorial, brutalist, cinematic design을 위한 완전한 home-page presentation contract를 추가한다.

각 design은 자체 section order와 browsing metaphor에 필요한 label을 선언한다. editorial에는 issue와 cover-story 언어를, brutalist에는 signal, numbered work, system, journey, contact framing을, cinematic에는 archive, statement, focus, case-study action을 사용한다. design 전용 shell copy도 route content와 함께 추가한다. section sequencing과 wording을 데이터에 두어 renderer가 명시적인 composition contract를 사용하면서 underlying portfolio evidence는 그대로 공유하도록 한다.

## feat(content): 공용 홈 섹션 표현 콘텐츠 구성

여러 design이 공유하는 home section의 placeholder copy를 완전한 문구로 교체한다.

work map은 product case study, learning archive, reliability practice를 각각 evidence-oriented description으로 구분하고 technical focus, stack, journey, contact section에도 완전한 설명 문구를 제공한다. archive card identifier도 metric key는 그대로 둔 채 curriculum에서 archive로 일반화해 더 넓은 presentation category와 underlying count를 분리한다. 언어를 중앙화함으로써 서로 다른 home composition에서도 공용 section의 의미를 안정적으로 유지한다.

## feat(content): 프로젝트 목록 표현 콘텐츠 구성

지원되는 모든 design의 projects-index presentation content를 완성한다.

placeholder copy를 project를 evidence로 framing하는 설명으로 교체하고, classic archive에는 terminal, statistic, lead-project, grouped-index 문구를 명시적으로 추가하며 editorial, brutalist, cinematic renderer에는 각자의 hero와 archive label을 추가한다. project-group description도 canonical group data에서 이후 파생할 content shape를 확립한다. 따라서 route의 information model은 안정적으로 유지하면서 design마다 다른 browsing metaphor를 표현할 수 있다.

## feat(content): 프로젝트 상세 표현 콘텐츠 구성

project-detail presentation content를 완전한 case-file contract로 확장한다.

configuration은 project unavailable message, role 및 deployment fact, frame numbering, return/outro action, editorial decision-spread title, 별도의 highlights section을 포함한다. 기존 section language도 visual evidence, technology, decision, constraint, outcome을 구분하도록 다듬는다. 이 label을 content로 옮기면 normal, missing, design-specific detail state가 route component에 editorial terminology를 하드코딩하지 않고 하나의 semantic structure를 공유할 수 있다.

## feat(content): About과 Journey 표현 콘텐츠 구성

about 및 journey route의 presentation model을 확장한다.

about page는 experience와 별도 journey narrative를 구분하고, criteria·category·omission·review timing으로 portfolio curation을 framing하며 editorial 및 brutalist layout용 renderer 전용 label을 제공한다. journey page에는 hero, decision-milestone, timeline, current-direction 문구와 state·reason·result·supporting case study label을 명시적으로 추가한다. 이를 통해 서로 다른 개념을 일반적인 section title로 뭉개지 않고 authored evidence와 framing을 일관되게 표현할 수 있다.

## feat(content): Interview Map과 Resume 표현 콘텐츠 구성

résumé 및 interview-evidence route의 presentation content를 확장한다.

résumé contract는 placeholder text에 의존하지 않고 summary, selected project, training, experience, education, note, identity label, design-specific hero copy를 각각 구분한다. interview map에는 track navigation, question reference, supporting project, evidence depth, count, empty state, known gap을 위한 별도 framing을 추가한다. 이 label과 template를 구조화된 presentation data에 유지하면 여러 renderer가 동일한 information architecture를 공유하면서도 interface text를 하드코딩하지 않고 composition을 달리할 수 있다.

## feat(content): Contact 표현 콘텐츠와 최종 문서 형식 구성

contact-page presentation contract를 완성하고 `presentation.json`을 최종 schema-oriented grouping으로 정규화한다.

Contact copy에는 notes section을 명시적으로 이름 붙이고, editorial 및 brutalist renderer를 위한 design-specific hero framing을 추가한다. 여기에는 location-aware editorial template도 포함된다. 기존 shared UI, design-shell, home-shared, journey, interview-map block은 의미를 바꾸지 않고 위치만 옮겨 document가 schema의 top-level 및 page 구성을 따르도록 한다. renderer별 wording을 content에 두면 alternate design이 component에 copy를 직접 넣지 않아도 되고, 정규화된 layout은 큰 configuration을 contract와 대조해 검증하기 쉽게 만든다.

## feat(content): 콘텐츠 validation 오류 모델 추가

runtime content validation을 위한 구조화된 error model과 source inventory를 도입한다.

각 issue는 source file, path, message를 가지며 `PortfolioContentError`는 전체 issue array를 보존하고 하나의 실행 가능한 failure message로 렌더링한다. loader module은 schema-backed content source를 모두 명명하고 이후 검사를 위한 override 가능한 input, supported design, navigable page도 정의한다. 따라서 malformed 또는 inconsistent content를 일반적인 위치 없는 exception으로 축소하지 않고 고유한 failure type으로 구분하며, validator가 관련 문제를 한 번에 누적할 수 있다.

## feat(content): JSON 경로 진단 추가

schema error path를 결정적인 형식으로 표시하는 formatter를 추가한다.

숫자 segment는 array index로, identifier로 안전한 property name은 dot notation으로, 특수한 key는 bracket notation 안의 JSON-quoted key로 표현하고 document root는 `$`로 표시한다. parser path를 익숙한 JSON path로 변환하면 source file을 직접 수정할 수 있을 만큼 진단 위치가 정확해지고 이후 validation layer도 하나의 일관된 location format을 사용할 수 있다.

## feat(content): JSON schema 파싱 경계 추가

raw JSON을 타입이 보장된 application data로 바꾸는 schema-parsing boundary를 추가한다.

`parseContentFile`은 `safeParse`를 사용해 한 파일의 모든 Zod issue를 원본 filename과 JSON-style path를 포함한 portfolio의 structured error format으로 변환한다. parse에 성공하면 schema의 output type을 반환하므로 downstream code는 unchecked assertion 대신 검증된 transformation과 default에 의존할 수 있다. malformed-content 처리를 rendering code 곳곳에 방어 로직으로 분산하지 않고 ingestion 단계에 집중한다.

## feat(content): 중복과 참조 진단 helper 추가

중복 값과 해석되지 않는 identifier를 위한 공용 diagnostics를 추가한다.

같은 값이 세 번 이상 나타나더라도 duplicate detection은 각 반복 값을 한 번만 기록하고, 두 helper 모두 즉시 throw하지 않고 source-aware issue를 누적한다. 이를 통해 독립된 collection 전반의 complete validation report를 만들고 이후 referential check에서도 일관된 message shape를 사용할 수 있다. detection과 policy를 분리했으므로 caller는 error construction을 중복하지 않고 어떤 identifier가 unique하거나 resolvable해야 하는지 정의할 수 있다.

## feat(content): 내부 route 참조 검증 추가

content에 선언된 internal URL을 검증하는 재사용 validator를 추가한다.

helper는 external 및 protocol-relative destination을 무시하고 `URL`을 통해 internal path를 정규화하며 site root와 등록된 top-level page 또는 단일 project detail route만 허용한다. 지원하지 않는 path, disabled page로 향하는 route, decode한 identifier가 unknown 또는 disabled인 project link를 보고한다. 이 logic을 개별 content collection 밖에 두어 navigation, global link, project link가 모두 같은 route-validity contract를 적용하도록 한다.

## feat(content): 콘텐츠 파일 schema 파싱 연결

모든 portfolio content file을 하나의 loader에서 대응하는 runtime schema에 연결한다.

`loadPortfolioSource`는 기본 JSON module을 구성하고 validation scenario를 위한 targeted override를 받으며, 각 source를 자체 filename과 schema로 parse한 뒤 검증된 값만 반환한다. export된 singleton과 return type은 이 loader를 untrusted JSON과 application model 사이의 권위 있는 경계로 확립한다. source-aware parsing을 한곳에 두어 malformed data가 selector나 route에 도달하기 전에 실패하고, diagnostic이 문제를 일으킨 파일을 명확히 가리키도록 한다.

## feat(content): 콘텐츠 식별자 중복 검증 추가

다른 content record가 의존하는 identifier와 ordering key에 대해 저장소 전체 uniqueness check를 추가한다.

loader는 중복 project group 및 group order, metric identifier, project identifier 및 display order, technology/link identifier, journey milestone, interview track, curation category, design identifier, navigation destination을 탐지한다. 모든 충돌은 loading 실패 전에 source collection과 함께 누적한다. referential check보다 먼저 uniqueness를 보장하면 이후 검사 결과가 결정적이 된다. 하나의 identifier는 최대 하나의 semantic record로만 해석되고 ordered content가 같은 위치를 두고 조용히 경쟁할 수 없다.

## feat(content): 지원 디자인 구성 검증 추가

presentation template와 애플리케이션의 supported design registry 사이에 양방향 validation을 추가한다.

설정된 default는 template list에 포함되어야 하고, 모든 configured template identifier는 code에서 지원해야 하며, 모든 supported design은 presentation entry를 가져야 한다. 양방향 모두 검사해 렌더링할 수 없는 content option과 selector copy나 metadata가 빠진 구현 design을 모두 막고, 정확한 content path를 통해 configuration failure를 수정하기 쉽게 만든다.

## feat(content): 사이트와 링크 route 참조 검증 추가

global navigation entry와 content link에 internal-route validation을 적용한다.

각 configured URL은 enabled page flag와 enabled project route 집합에 대조해 검사하고 external URL은 이 internal contract 밖에 둔다. source file과 정확한 array path를 기록하므로 invalid navigation이 runtime dead link가 아니라 content-load error가 된다. navigation과 일반 link에서 같은 helper를 사용해 두 surface의 route availability rule을 일치시킨다.

## feat(content): 프로젝트 내부 참조 검증 추가

각 project record 내부의 structural 및 referential validation을 추가한다.

모든 project는 선언된 group을 참조해야 하고 technology identifier는 존재해야 하며 duplicate tag 또는 stack entry는 정확한 content path에 보고한다. project link도 internal-route validator를 거치므로 disabled page나 unknown project route를 향하는 link가 schema loading을 통과할 수 없다. 이 검사는 inconsistent source data가 derived category, stack rendering, metric, navigation layer를 오염시키는 것을 막는다.

## feat(content): 지표와 Resume 참조 검증 추가

metric filter와 résumé project selection에 대한 referential check를 추가한다.

metric의 project identifier는 enabled project로, group identifier는 선언된 group으로, tag filter는 실제 project content에 존재하는 tag로 해석되어야 한다. résumé project identifier도 동일한 enabled-project set에 대해 검증한다. 이를 통해 typo 때문에 declarative filter가 오해를 부르는 0 값을 만들거나 résumé evidence가 hidden 또는 removed work를 참조하는 문제를 막는다.

## feat(content): 여정과 Interview 참조 검증 추가

journey 및 interview data에서 사용하는 모든 project reference로 content integrity check를 확장한다.

선택적 journey entry, milestone anchor list, nested interview answer는 이제 enabled project identifier로 해석되어야 한다. validator는 각 failure의 정확한 file과 array path를 기록하고 모든 issue를 누적한 뒤 throw한다. 따라서 narrative와 interview evidence가 portfolio에서 disabled되거나 제거된 project를 가리킬 수 없다.

## feat(content): 큐레이션과 연락 참조 검증 추가

curation project reference와 preferred contact-link reference까지 cross-file validation을 확장한다.

모든 curation category는 enabled project를 가리켜야 하고 모든 preferred contact identifier는 enabled global link로 해석되어야 한다. failure는 JSON-style path를 통해 정확한 source file과 array position을 보존하며 loader의 다른 issue와 함께 누적한다. optional presentation data가 dead project card나 누락된 contact action을 조용히 만드는 문제를 방지한다.

## refactor(content): schema 기반 핵심 콘텐츠 타입 연결

병렬로 hand-written page shape를 유지하는 대신 검증된 content schema를 기반으로 portfolio의 핵심 TypeScript contract를 다시 정의한다.

home 및 page presentation type은 이제 `PresentationContentSource`를 직접 index하고, project group, metric, source type은 schema module에서 다시 export한다. runtime model에는 optional page flag와 social imagery, link placement, project group identifier 및 tag, 등록된 전체 design identifier 집합을 추가한다. 이로써 큰 drift risk를 제거한다. schema 변경이 route-facing type으로 직접 전파되므로 중복 interface를 별도로 갱신할 필요가 없다.

## feat(content): 여정과 큐레이션 콘텐츠 타입 추가

journey narrative, interview evidence, portfolio curation을 위한 runtime-facing content contract를 정의한다.

journey milestone은 state, reason, result, anchor-project identifier를 명시적으로 갖고, interview topic은 external reference와 project-backed answer 및 depth note를 묶으며, curation은 selection criterion, grouped project rationale, omission, review checkpoint를 기록한다. 이 개념들을 분리해서 모델링하면 서로 다른 evidence relationship을 보존하고 route가 느슨한 JSON object 대신 정확한 type을 받을 수 있다.

## refactor(content): 검증된 콘텐츠를 portfolio facade에 연결

portfolio facade를 direct JSON import와 unchecked type assertion에서 validated `portfolioSource` 기반으로 전환한다.

project group은 한 번 정렬한 뒤 각 project의 display category와 projects-page group copy를 모두 파생하는 데 사용해 파일 간 label 복제 대신 group identifier를 canonical relationship으로 만든다. facade는 project metric, journey narrative, interview-map, curation data도 하나의 `PortfolioContent` object로 노출한다. presentation layer에서 environment-key URL substitution을 제거하고 validated content link를 authoritative source로 삼으며, legacy function argument는 compatibility를 위해 받되 의도적으로 무시한다. 이로써 schema validation에서 selector와 route consumption까지 하나의 단일 pipeline을 확립한다.

## feat(content): 페이지 활성화 selector 추가

사이트의 선택적 page flag를 위한 타입이 지정된 selector를 추가한다.

configuration이 명시적으로 `false`가 아닌 한 page를 enabled로 간주해 새 map이 없는 기존 content file과의 backward compatibility를 유지한다. 이 default-on policy를 portfolio facade를 통해 export하면 navigation과 route guard가 absent flag를 component마다 다르게 처리하지 않고 하나의 해석을 공유한다.

## feat(content): 프로젝트 지표 selector 추가

content-defined project metric을 평가하는 공용 evaluator를 추가한다.

metric filter는 identifier, group, 모든 tag 일치, featured state, deployment status로 project를 제한할 수 있다. selector는 matching project 수를 세거나 해당 highlight record를 합산하며, 알 수 없는 metric identifier에는 0을 반환한다. 이 규칙을 중앙화해 dashboard 및 page statistic이 view마다 project-specific heuristic을 중복하는 대신 선언된 metric schema에서 파생되도록 한다.

## feat(project): 카드 링크를 콘텐츠 배치 기준으로 선택

project-card action이 각 link에 선언된 `card` placement를 따르도록 변경한다.

selector는 더 이상 GitHub와 case-study type만 card-compatible action으로 하드코딩하지 않는다. 이제 content placement가 eligibility를 결정하고 demo link에는 project가 live여야 한다는 추가 조건만 유지한다. presentation context를 link semantics와 분리해 selector code를 바꾸지 않고도 새로운 action type을 card에 노출할 수 있다.

## refactor(content): schema type import 경계 정리

portfolio type facade에서 사용하지 않는 `ProjectMetricFilter` import를 제거한다.

export된 schema contract와 runtime behavior는 그대로 유지하면서 type boundary에는 module이 실제 사용하는 symbol만 남긴다.

## feat(metadata): 콘텐츠 기반 site metadata 추가

정적인 layout metadata를 validated portfolio content에서 생성하는 request-aware metadata로 교체한다.

layout은 forwarded host와 protocol header에서 base URL을 구하고 local development용 default를 명시한 뒤 canonical, Open Graph, Twitter image URL을 해당 origin 기준으로 해석한다. title, description, language, 선택적 social imagery가 렌더링된 애플리케이션과 동일한 site content source를 사용하므로 metadata와 화면 문구가 어긋나는 것을 막는다. root layout에는 확장된 visual system이 사용하는 Korean serif variable도 등록하고 document-level smooth scrolling을 명시한다.

## feat(content): 저장소 자산 참조 경계 검증

portfolio content가 참조하는 모든 local asset에 repository-boundary validation을 추가한다.

validator는 social image, profile portrait, résumé download, 모든 project screenshot을 원본 file 및 JSON path와 함께 수집한다. 각 public URL을 설정된 `public` root 아래로 resolve하고 root를 벗어나거나 absolute path가 되면 거부하며 실제 파일 존재 여부도 검사한다. 첫 missing file에서 중단하지 않고 모든 failure를 기존 structured content error에 누적해 editor가 한 번에 수정할 수 있는 report를 제공하는 동시에 path traversal과 broken build-time asset을 막는다. 커밋된 portrait placeholder는 새 profile-photo reference의 유효한 기본값을 제공한다.

## build(content): 콘텐츠 검사 명령 추가

독립적으로 실행할 수 있는 content-validation entry point를 추가하고 `content:check`로 노출한다.

script는 canonical source data를 로드하고 repository의 `public` directory를 대상으로 production과 동일한 asset-aware validation을 수행한 뒤 전체 검사가 성공한 경우에만 검증된 project 및 design count를 출력한다. production loader와 validator를 재사용해 별도의 verification model을 만들지 않으며, 명시적 command를 통해 application server와 독립적으로 content integrity를 검사할 수 있다.

## build(content): 콘텐츠 검사를 prebuild에 연결

content validation command를 package의 `prebuild` lifecycle에 연결한다.

structured portfolio content가 repository validation rule을 위반하면 production build는 Next.js compilation 전에 실패한다. validation을 자동 prerequisite로 만들면 broken reference나 지원되지 않는 content shape가 포함된 채 build가 성공하는 경우를 막을 수 있고, `content:check`는 계속 독립적으로 실행 가능한 verification command로 유지한다.

## feat(journey): 여정 route 소개 추가

portfolio의 표준 page lifecycle을 사용하는 선택적 route로 journey narrative를 도입한다.

route는 rendering 전에 feature flag를 검사하고 design 및 content-debug parameter를 일관되게 해석하며, design switching이 현재 route를 보존하도록 current path를 공용 shell에 전달한다. page framing은 presentation copy가 담당하고 introduction은 journey narrative data에서 가져와 route wording과 historical content를 독립적으로 관리한다.

## feat(journey): 결정 milestone 목록 추가

journey route에 ordered milestone narrative를 도입한다.

각 milestone에는 stable content identifier, chronological index, date, title을 부여하고 card에 source-level debug metadata를 붙인다. `MilestoneCard`를 추출해 decision record를 위한 집중된 boundary를 만들고, 이후 rationale 및 project-evidence 추가에 필요한 surrounding content, design, label, debug context를 전달한다.

## feat(journey): milestone 결정 근거 추가

각 journey milestone을 title만 있는 항목에서 명시적인 state–reason–result record로 확장한다.

semantic definition list가 presentation에서 제공한 label과 milestone의 structured field를 연결해 transition과 그 rationale를 하나의 단위로 읽을 수 있게 한다. 이 표현은 다루려는 상태, decision logic, 관찰된 outcome을 구조 없는 narrative로 압축하지 않고 서로 구분한다.

## feat(journey): milestone 프로젝트 근거 연결

journey milestone을 이를 뒷받침하는 project에 연결한다.

milestone project identifier를 canonical project collection에 대조해 해석하고 unresolved reference는 invalid route를 만들지 않도록 filtering한다. 생성된 link는 active design과 content-debug state를 보존하므로 독자는 context를 잃지 않고 narrative claim에서 case-study evidence로 이동할 수 있다. project가 하나도 해석되지 않을 때는 link list를 생략해 순수 설명형 milestone도 유효하게 유지한다.

## feat(journey): 전체 여정 타임라인 추가

paired-centerline timeline variant를 사용해 전체 journey collection을 전용 route에 추가한다.

route는 해석된 design 및 content-debug state를 공용 list에 전달하므로 case-study link가 현재 presentation context를 유지하고 개별 entry도 source data까지 추적할 수 있다. 공용 `JourneyList`를 재사용해 다른 journey summary와 chronology 표현을 일치시키면서 이 page에서는 더 밀도 높은 full-history layout을 선택할 수 있다.

## feat(journey): 현재 방향 요약 추가

journey route의 마지막에 current-position summary를 추가한다.

section heading은 page presentation copy에서, title과 narrative는 journey 전용 content source에서 읽어 interface framing과 authored history의 기존 분리를 유지한다. timeline 뒤에 current direction을 배치해 individual journey entry를 수정하거나 과부하하지 않고 chronological record를 present-state explanation으로 마무리한다.

## feat(interview-map): 근거 route 소개 추가

interview-evidence map을 선택적이면서 독립적으로 주소를 가질 수 있는 route로 도입한다.

page는 rendering 전에 enablement flag를 강제하고 나머지 portfolio와 동일한 route contract로 active design 및 debug state를 해석하며, external reference repository에는 안전한 new-tab attribute를 적용해 연결한다. presentation copy를 interview-map data와 분리해 source material을 component에 직접 넣지 않고 evidence model을 framing할 수 있다.

## feat(interview-map): 인터뷰 주제 인덱스 추가

interview map 탐색을 위한 presentation-driven topic index를 추가한다.

각 track은 stable section fragment를 향하는 in-page link가 되어 긴 evidence map을 route definition을 중복하지 않고 빠르게 탐색할 수 있다. navigation은 명시적인 accessible label과 source track collection의 content-debug hint를 가지므로 wayfinding과 provenance가 모두 structured data에 연결된다.

## feat(interview-map): 근거 공백 목록 추가

interview map에 전용 evidence-gap section을 추가한다.

section은 구조화된 gap data를 heading, explanation, 개별 missing-evidence item에 사용하고 content-debug mode에서는 source path를 노출한다. gap을 명시적으로 렌더링해 map이 interview coverage를 완전한 것처럼 보이지 않게 하고, 지원되는 claim과 아직 portfolio evidence가 없는 영역을 구분할 수 있게 한다.

## feat(interview-map): 주제 track 소개 추가

각 interview-map track을 위한 전용 section boundary를 도입한다.

모든 track은 stable fragment identifier, source-level debug hint, presentation-driven item count, label, description을 갖고 긴 page를 빠르게 훑을 수 있도록 section background를 교차 적용한다. `TrackSection`을 추출해 content, design, debug state를 포함한 track별 rendering context를 확립하고 이후 question 및 evidence row가 route concern을 data model로 옮기지 않고 재사용할 수 있게 한다.

## feat(interview-map): 주제와 외부 참조 표 추가

각 interview track에 topic과 external reference를 짝지은 구조화된 question table을 추가한다.

table header와 row cell을 사용해 이후 evidence column이 확장할 수 있는 안정적인 비교 구조를 만든다. reference link는 `noreferrer`를 사용해 portfolio 밖에서 열고 visible label은 계속 presentation-driven으로 유지한다. track description은 question row와 분리해 category context와 item-level source의 차이를 보존한다.

## feat(interview-map): 프로젝트 답변 근거 연결

interview question을 answer record에 선언된 project evidence 및 depth note와 연결한다.

project lookup map은 각 track에서 answer reference를 한 번만 해석하고 성공적으로 매칭된 항목은 active design 및 content-debug state를 보존하는 link가 된다. unresolved identifier는 사라지지 않고 text로 남아 broken content reference를 관찰할 수 있게 한다. answer와 depth를 별도 column에 두어 각 question의 evidence source와 주장하는 discussion level이 대응하도록 한다.

## feat(content): 프로젝트 지표를 화면에 적용

route-level project statistic을 공용 metric selector에 연결하고 detail view에 project highlight를 노출한다.

projects page와 work-map section은 더 이상 asset path, 특정 project identifier, local filter로 curriculum, product, reliability, source-only count를 추론하지 않는다. `getProjectMetricValue`를 통해 선언된 metric definition을 읽어 모든 view가 같은 계산 규칙을 사용한다. detail page도 presentation heading과 함께 구조화된 `highlights` collection을 렌더링해 해당 metric이 사용하는 visible evidence를 완성한다.

## feat(content): 링크 배치 selector 추가

link placement를 공용 `LinkPlacement` type으로 공식화하고 site-level 및 project-level link selector를 추가한다.

`getProjectLinksForPlacement`를 card와 detail helper가 공유하는 구현으로 만들어 placement check와 기존 link-eligibility rule이 view마다 달라질 수 없게 한다. `getContentLinksByPlacement`는 global link에 같은 boundary를 제공한다. 이 selector를 portfolio facade로 export해 route component가 array filtering logic을 반복하지 않고 content semantics에 의존하도록 한다.

## refactor(project): 상세 링크를 배치 기준으로 선택

runtime visibility와 선택적 case-study exclusion을 적용하기 전에 project-detail action을 `getProjectDetailLinks`를 통해 선택하도록 변경한다.

component는 더 이상 project에 연결된 모든 link가 detail page에 적합하다고 가정하지 않는다. placement selection을 content helper에 중앙화해 card와 detail context를 link schema와 일치시키고, component에는 state-dependent visibility와 local `excludeCaseStudy` option만 남긴다.

## feat(content): 홈 링크를 배치 기준으로 선택

두 home design의 call to action 선택 기준을 하드코딩한 link type 집합에서 각 link에 선언된 `hero` placement로 변경한다.

placement metadata는 해당 link가 GitHub, résumé, website 중 무엇을 의미하는지와 독립적으로 어디에 표시될지를 나타낸다. content author가 route code를 바꾸지 않고 hero action을 추가하거나 제거할 수 있고, semantic link category가 presentation rule까지 겸하는 문제를 막는다.

## feat(content): 공용 UI 접근성 문구 적용

하드코딩된 공용 interface 및 accessibility text를 presentation UI contract의 값으로 교체한다.

journey case-study link, animated terminal label, technology-marquee label은 이제 route나 section owner가 명시적인 copy를 전달하고 모든 component layer가 이를 그대로 넘긴다. 재사용 component에 영어를 직접 넣지 않고 visible label과 assistive description을 동일한 content source에서 설정할 수 있다. project action link의 최소 높이도 44px로 높여 pointer target을 갱신된 accessibility boundary에 맞춘다.

## feat(contact): 연락 링크 빈 상태 추가

contact channel에 명시적인 empty state를 추가하고 각 link를 최소 touch target 크기로 정규화한다.

preferred-link resolver가 항목을 하나도 반환하지 않으면 빈 column을 조용히 남기는 대신 presentation content로 부재 이유를 설명한다. 항목이 있을 때의 link renderer는 변경하지 않아 design 및 debug routing behavior를 유지하면서 zero-item state를 의도적이고 이해 가능한 상태로 만든다.

## feat(routes): 비활성 페이지 route 차단

about, contact, projects, project detail, resume의 route boundary에서 page-enablement setting을 강제한다.

disabled page는 URL을 직접 입력해도 Next.js `notFound()`로 처리한다. navigation만 숨기는 것으로는 underlying route 접근을 막을 수 없기 때문이다. project detail은 projects gate를 상속해 collection과 모든 child를 하나의 availability decision 아래 둔다. content를 로드한 직후 검사하므로 렌더링할 수 없는 route에서 template state를 불필요하게 해석하지도 않는다.

## style(theme): 디자인 속성을 site shell로 승격

active design marker를 home-content selector에서 공용 site shell로 끌어올린다.

Classic theme variable과 component override는 이제 `data-site-design`을 대상으로 하고, `data-home-template`은 home 전용 동작을 위해 그대로 남긴다. design identity를 shell boundary에 두면 palette와 visual override가 home `<main>`의 descendant에만 제한되지 않고 header, footer, non-home route까지 적용된다.

## style(a11y): 모바일 헤더와 동작 감소 보강

전역 reduced-motion contract를 강화하고 mobile header effect를 단순화한다.

`prefers-reduced-motion`이 활성화되면 모든 animation과 transition을 거의 0에 가까운 duration의 단일 iteration으로 줄이고 smooth scrolling을 비활성화하며 terminal wrapper와 hover transform card도 명시적으로 포함한다. 넓은 범위의 이 규칙은 새로 추가된 motion이 수동 selector list를 우회하는 것을 막는다. 작은 화면에서는 header backdrop filter도 제거해 가장 제약이 큰 layout에서 비용이 큰 visual effect에 의존하지 않는다.

## feat(about): 프로필 사진 소개 추가

공용 `ProfilePhoto` component를 통해 optional profile photograph를 about hero에 추가한다.

photo metadata가 있을 때만 hero가 responsive text-and-media grid가 되므로 이미지가 없는 content variant는 기존 text-only structure를 그대로 유지한다. debug hint에 photo path도 포함해 주변 identity copy와 동일한 profile source로 visual asset을 추적할 수 있게 하고, 나머지 변경은 formatting 정리에 한정한다.

## feat(about): 기술 집중 영역 추가

about page의 skills section을 확장해 technical focus area와 구체적인 tool group을 구분한다.

focus area를 설명형 card로 먼저 렌더링하고 기존 stack list를 그 뒤에 배치한다. 상위 수준의 engineering concern과 이를 해결하는 데 사용하는 technology를 분리해 capability와 implementation tool이 평평한 inventory에서 섞이는 문제를 피한다. 두 schema path 모두 content-debug hint를 유지한다.

## feat(about): 경력 목록 추가

about page에 chronological experience list를 추가한다.

ordered list를 사용해 sequence를 document structure의 일부로 만들고, 각 item은 period, title, 설명 text를 하나의 단위로 유지한다. section은 canonical experience collection을 재사용하고 debug mode에서 source hint를 제공해 동일한 career history의 about 전용 복사본을 만들지 않는다.

## feat(about): 큐레이션 기준 소개 추가

about route에 curation section을 도입하고 site의 page-enablement policy로 gating한다.

section은 presentation copy와 구조화된 curation introduction 및 criterion을 결합하고, 개별 criterion record까지 content-debug hint를 유지한다. 이를 `CurationSection`으로 분리해 optional feature에 명확한 rendering boundary를 부여하고, 데이터가 로드되어 있다는 이유만으로 disabled curation content가 page에 노출되는 것을 막는다.

## feat(about): 큐레이션 프로젝트 범주 추가

about page에 project-backed curation category를 추가한다.

각 category는 저장된 project identifier를 canonical project collection에서 해석하고 unresolved reference를 방어적으로 filtering하며, project가 하나 이상 남을 때만 link를 렌더링한다. link는 selected design과 content-debug state를 모두 보존해 curation rationale에서 supporting case study로 이동해도 presentation context가 초기화되지 않는다. category card를 추출해 reference resolution과 route generation을 parent section의 layout loop 밖으로 분리한다.

## feat(about): 큐레이션 공백과 재검토 추가

명시적인 omission과 next review checkpoint를 추가해 curation narrative를 완성한다.

route는 portfolio에서 의도적으로 제외한 항목과 그 이유를 함께 보여주고, 다음 planned reassessment를 별도 content block으로 기록한다. omission과 review criterion을 structured data로 다뤄 현재 project set이 완전하거나 영구적인 것처럼 보이지 않도록 curation boundary를 드러낸다.

## feat(resume): 프로필 위치와 가용성 추가

profile location과 availability를 두 field의 definition list로 resume hero에 노출한다.

값은 profile data에서 가져오고 label은 resume presentation copy에서 가져와 재사용 identity fact와 route-specific wording을 구분한다. `<dl>`, `<dt>`, `<dd>`를 사용해 이 정보를 장식 card로만 보여주지 않고 label-value 관계를 명시한다. 나머지 diff는 formatting cleanup뿐이다.

## feat(resume): 경력 이력 추가

resume route에 조건부 experience-history section을 추가한다.

각 entry는 title, period, narrative를 하나의 semantic article 안에 유지하고, responsive header에서는 날짜가 이동해도 role과 분리되지 않는다. collection은 `content.experience`에서 직접 렌더링하며 비어 있으면 section 자체가 사라져 career history 구성이 다른 portfolio도 같은 route implementation으로 지원한다.

## feat(resume): 교육 이력 추가

resume route에 조건부 education section을 추가한다.

각 education record는 institution 또는 program, period, description을 함께 유지하는 semantic article로 렌더링하고, schema에서 사용 가능한 content identity를 반영한 composite key를 사용한다. collection이 비어 있으면 section을 생략해 formal education history가 있거나 없는 portfolio를 동일한 route component로 지원한다.

## feat(resume): Resume 안내 기록 추가

structured content를 직접 사용하는 optional resume notes section을 추가한다.

note가 있을 때만 section을 렌더링해 guidance가 없는 content variant에 빈 heading이나 장식 container가 생기지 않게 한다. title은 page presentation copy에, note item은 resume data에 유지해 interface wording과 resume fact의 기존 분리를 보존하면서 각 note를 개별적으로 빠르게 읽을 수 있는 record로 제시한다.

## feat(designs): site design 정의 registry 추가

사이트에서 사용할 수 있는 visual design과 preview palette를 위한 단일 registry를 구축한다.

ordered `SITE_DESIGNS` collection이 design iteration 및 selector swatch의 authoritative source가 되고, 파생 identifier list는 두 번째 enumeration을 별도로 유지하지 않고 validation을 지원한다. `getSiteDesignDefinition`은 identifier가 일치하지 않을 때 첫 등록 design으로 fallback해 caller에 결정적인 presentation을 제공한다.

## feat(designs): route renderer 계약 추가

portfolio route 전체를 렌더링하는 design의 공용 input contract를 정의한다.

`PortfolioRouteId`는 지원하는 모든 route shape를 열거하고, `DesignRouteProps`는 해석된 content, debug state, current path, detail page용 optional project를 전달한다. 이미 해석된 domain data를 넘기므로 design renderer는 routing이나 content loading이 아니라 composition에 집중할 수 있고, route discriminator를 사용해 URL parsing에 의존하지 않고 하나의 renderer가 전체 site를 처리할 수 있다.

## refactor(designs): 확장 renderer lazy registry 추가

design별 route renderer를 위한 registry boundary를 도입한다.

registry는 design identifier를 asynchronous module loader에 매핑하고 capability detection과 rendering operation을 별도로 노출한다. 따라서 route는 모든 design implementation을 미리 import하지 않고도 특정 design이 full-page renderer를 소유하는지 확인할 수 있으며, 지원하지 않는 design은 기존 route component로 계속 처리한다. 이 단계에서는 concrete renderer를 등록하기 전에 extension contract를 먼저 정의하기 위해 loader table을 의도적으로 비워 둔다.

## style(designs): 디자인 선택기 기본 메뉴 구성

design selector의 기본 desktop presentation을 anchored disclosure menu 형태로 구성한다.

trigger는 현재 design과 순서를 표시하고, panel은 각 option을 palette swatch, 설명 copy, 순번으로 배치한다. hover, keyboard focus, active state에 같은 high-contrast treatment를 적용해 pointer와 keyboard 사용자가 동일한 selection feedback을 받도록 한다. style을 component-scoped module에 두어 여러 design을 전환하는 이 공용 control을 각 visual system과 분리한다.

## style(designs): 모바일 디자인 선택 sheet 구성

design selector를 modal backdrop, 제한된 scrolling, safe-area를 고려한 padding을 갖는 mobile bottom sheet로 변환한다.

좁은 화면에서는 panel을 header가 아니라 viewport edge에 고정해 긴 design list가 page navigation을 밀어내거나 확장시키지 않도록 한다. `overscroll-behavior: contain`과 viewport-relative maximum height로 scroll을 sheet 내부에 제한하고, 별도 sheet header와 큰 close target으로 touch device에서 사용하기 쉽게 만든다.

## feat(designs): 디자인 선택기 상태와 trigger 추가

route를 보존하는 design switcher의 client-side state와 trigger를 도입한다.

component는 `SITE_DESIGNS`를 authoritative design order로 사용하고 presentation template는 사용자에게 보일 label과 description에만 사용한다. 안정적인 active fallback을 파생하고 content가 제공한 template로 index와 total을 formatting하며 localized summary label로 현재 선택을 노출한다. native `<details>/<summary>`를 기반으로 control을 만들어 selection panel을 추가하기 전부터 disclosure semantics와 keyboard behavior를 확보한다.

## feat(designs): 디자인 선택 목록과 닫기 동작 추가

등록된 design의 ordered list, active-state semantics, palette preview, 명시적인 close behavior를 추가해 design-switcher sheet를 완성한다.

link는 current path에서 생성하므로 design을 바꿔도 사용자의 route나 content-debug state가 사라지지 않는다. active design은 `aria-current`로 표시하고, close button은 native `<details>`의 open state를 제거한 뒤 summary trigger로 focus를 되돌린다. overlay만 시각적으로 닫고 keyboard focus를 이동하지 않으면 사용자가 숨겨진 control에 남게 되므로 focus 복원이 중요하다.

## feat(shell): 현재 navigation 상태와 모바일 메뉴 추가

global navigation을 route-aware하게 만들고 keyboard로 조작할 수 있는 mobile menu를 추가한다.

`isCurrentNavigation`은 home route는 exact match로, 다른 navigation root는 descendant path까지 active로 판단해 desktop과 mobile link 모두 `aria-current="page"`를 일관되게 노출한다. responsive header는 안전하게 wrap할 수 있고 작은 화면에서는 native `<details>/<summary>` disclosure semantics를 사용한다. 또한 기존 header의 inline template-button group을 mobile navigation으로 교체해 design selector를 독립 component로 다시 도입하기 전까지 shell의 역할을 primary wayfinding에 한정한다.

## feat(shell): 디자인 선택기를 공용 shell에 연결

design switcher를 공용 site header에 통합하고 shell 수준의 interface text를 presentation content에서 가져오도록 한다.

모든 route가 동일한 `ui` contract를 `PageShell`에 제공하고 shell은 이를 desktop/mobile navigation label, menu text, skip-link label에 사용한다. outer wrapper와 semantic `<main>` landmark를 분리해 header, footer, keyboard skip target이 올바르게 구조화되도록 한다. switcher와 accessibility label을 이 boundary에 중앙화해 navigation behavior나 하드코딩 copy를 중복하지 않고 모든 page에서 alternate design을 사용할 수 있다.

## refactor(routes): 확장 디자인 renderer 위임 경계 추가

모든 public route에서 App Router page 외부에 등록된 design-specific renderer로 위임하는 공통 boundary를 추가한다.

각 page는 계속 content, template selection, debug mode, route validity를 해석한 뒤 current path, route kind, 필요 시 resolved project로 구성된 작은 route context를 `renderDesignRoute`에 전달한다. dedicated renderer가 없는 design은 기존 classic 또는 design implementation으로 처리한다. URL, loading, not-found 책임은 route layer에 유지하면서 확장된 visual system이 각 route에 template conditional을 중복하지 않고 지원 page 전체의 composition을 소유할 수 있게 한다.

## style(editorial): 지면과 masthead 토큰 구성

scoped color token, paper texture, focus treatment, reset, skip-link behavior, masthead geometry를 포함하는 editorial design의 기반 stylesheet를 만든다.

palette와 normalization을 route root 아래에 한정해 alternate design의 style이 다른 portfolio theme로 누출되지 않게 한다. 강하게 커스텀된 presentation에서도 visible focus outline과 복구 가능한 skip link로 keyboard navigation을 유지하고, masthead grid는 이후 rule이 채울 brand, navigation, control region을 확립한다.

## style(editorial): wordmark와 navigation 계층 구성

editorial shell의 wordmark, desktop navigation, design-switcher slot, footer의 주요 call to action을 정의한다.

navigation은 명시적인 hover inversion을 가진 border 및 equal-width strip으로 처리해 global wayfinding을 brand block과 switcher control에서 분리한다. footer는 더 큰 serif display language를 반복해 contact를 명확한 terminal action으로 만들면서 design 전반의 ink, paper, vermilion hierarchy를 유지한다.

## style(editorial): footer와 hero 활자 체계 구성

editorial typography primitive와 home hero 상단 구조를 확립한다.

section kicker, overline, standfirst, footer fine print, debug annotation에 명시적인 typographic role을 부여한다. home hero는 bounded viewport-relative height와 balanced headline wrapping을 가진 12-column grid에 배치해 issue metadata와 primary title의 위치를 예측 가능하게 유지하면서 type scale이 viewport에 연속적으로 반응하도록 한다.

## style(editorial): hero spread 레이아웃 구성

editorial hero의 하단 절반을 완성하고 주요 content section에 공용 spread spacing을 도입한다.

summary, byline, portrait fallback, primary action을 명시적인 12-column span에 배치해 text length가 달라도 상호 관계를 유지한다. 이후 공용 section padding과 border로 story, principle, experience, evidence, decision, highlight, milestone에 재사용 가능한 vertical rhythm을 제공하고 route별 spacing rule의 반복을 피한다.

## style(editorial): lead story와 매체 표현 구성

editorial lead-story treatment와 frame media의 공통 동작을 정의한다.

lead copy는 큰 serif headline, standfirst, supporting fact, animated underline을 조합하되 해당 효과를 route markup에 결합하지 않는다. 공용 image-frame rule은 crop, caption, muted default color, 절제된 hover emphasis를 강제해 intrinsic width와 responsive height를 보존하면서 모든 project visual에 동일한 media contract를 제공한다.

## style(editorial): 이미지 프레임과 feature 열 구성

image placeholder, project-index row, split feature column을 위한 재사용 가능한 editorial treatment를 추가한다.

project index는 명시적인 multi-column grid를 사용해 ordinal, title, summary, metadata, navigation을 하나의 빠르게 읽을 수 있는 record로 정렬하고 hover feedback은 개별 fragment가 아니라 row 전체에 적용한다. asset이 없을 때 neutral placeholder frame으로 layout dimension을 보존하고, feature-column primitive는 primary narrative content와 supporting material 사이에 일관된 경계를 제공한다.

## style(editorial): 원칙 목록과 contact strip 구성

principle card, sidebar feature, text tag, cross-page contact strip의 editorial treatment를 추가한다.

two-column principle grid와 bordered sidebar가 long-form explanation과 supporting metadata를 분리하고, high-contrast contact strip은 일관된 terminal call to action을 제공한다. 공용 annotation selector는 이 section을 resume 및 skills layout과 연결해 구조가 비슷한 content를 제시하는 route 사이의 visual drift를 줄인다.

## style(editorial): contact와 archive 지면 구성

editorial contact strip을 완성하고 공용 page 및 archive layout primitive를 확립한다.

secondary page에는 3-column hero를, archive에는 4-column overview를 적용하고 각 archive category를 고정된 descriptive rail과 유연한 content column으로 분리한다. 이 structural rule을 재사용해 contact와 archive route가 page별로 고립된 composition이 되지 않고 나머지 editorial design과 동일한 typography, spacing, border rhythm을 유지하도록 한다.

## style(editorial): archive group과 case link 구성

editorial archive group과 project case study 도입부의 structural styling을 추가한다.

archive heading은 entry 옆에서 sticky하게 유지하고 case study는 metadata rail, 절제된 description, 큰 serif title, 전용 link column을 갖는 3-column hero를 사용한다. route의 semantic region과 editorial grid 사이에 안정적인 대응 관계를 만들어 navigation, context, narrative content를 시각적으로 분리한다.

## style(editorial): case link와 dark section 구성

bordered link row, 제한 없는 cover image, 3-column narrative spread, drop-cap typography, dark architecture section을 추가해 editorial case-study stylesheet를 확장한다.

공용 selector는 narrative, decision, architecture, result section의 heading과 editorial annotation을 정렬해 case-study route가 각 block에 presentation을 개별 인코딩하지 않고 하나의 visual hierarchy를 재사용하도록 한다. fractional grid와 `clamp()` 기반 spacing으로 magazine-style composition을 유지하면서 viewport size에 따라 확장·축소할 수 있게 한다.

## style(editorial): dark section과 decision 열 구성

architecture evidence, image pair, paired decision section을 위한 Editorial desktop composition을 stylesheet에 추가한다. 명시적인 grid column, hairline border, 기존 dark-theme token으로 narrative copy와 supporting fact를 분리하면서 light/dark background 모두에서 evidence row의 구조를 일관되게 유지한다. 이 selector 집합을 하나의 visual vocabulary로 확립해 route component가 JSX에 presentation rule을 넣지 않고 reasoning과 proof를 표현할 수 있게 한다.

## style(editorial): 결과 spread와 profile facts 구성

result summary, case-study exit navigation, missing-project feedback, profile hero를 위한 Editorial layout을 추가한다. asymmetric grid는 중요한 result 및 identity content에 더 넓은 공간을 배정하고, wrapping fact list와 44px outro link는 content나 viewport width가 달라져도 metadata와 navigation을 사용할 수 있게 한다. missing-page treatment도 invalid project route에 의도적인 recovery path를 제공해 불완전한 render와 시각적으로 구분한다.

## style(editorial): profile summary와 skill group 구성

bounded portrait, 3-column principles grid, split skills spread를 추가해 profile 및 skills composition을 완성한다. image crop과 grayscale treatment로 다양한 portrait dimension을 Editorial frame에 맞추고, 반복되는 bordered card와 grouped focus area를 사용해 prose, principle, technology list를 서로 다른 정보 계층으로 읽을 수 있게 한다. visual positioning metadata를 route data에 넣지 않고 CSS에서 이러한 concern을 처리한다.

## style(editorial): 기술 그룹과 curation 본문 구성

technology group과 experience entry에 재사용할 row structure를 정의하고 asymmetric curation spread를 도입한다. 고정된 semantic column으로 길이가 다른 entry에서도 label, narrative, ordinal을 정렬하고, skill list는 wrapping해 콘텐츠를 억지로 table 형태에 맞추지 않는다. curation split은 selection criterion에 안정적인 introduction column을 제공하고 더 긴 evidence-oriented body가 확장될 공간을 남긴다.

## style(editorial): curation panel과 프로젝트 목록 구성

numbered panel header, 2-column criterion grid, category 및 omission card, wrapping project link로 상세 curation presentation을 구성한다. 공용 typography와 border rule로 subsection 간 시각적 관계를 유지하면서 criterion, exclusion, evidence의 역할은 구분한다. `minmax(0, 1fr)`와 `min-width: 0`을 사용해 긴 content가 paired panel을 grid boundary 밖으로 밀어내지 않도록 한다.

## style(editorial): curation link와 resume 도입부 구성

touch-sized project link와 dark next-review panel로 curation 영역을 마무리하고 resume header 및 2-column body를 구성한다. resume identity column을 sticky하게 만들어 긴 record를 scroll하는 동안에도 안정적인 personal metadata를 계속 볼 수 있고, download/reference link에는 명시적인 interaction target을 부여한다. dark review treatment는 inverted section 전용 markup을 따로 만들지 않고 같은 panel structure에 contrast만 조정해 재사용한다.

## style(editorial): resume identity와 프로젝트 행 구성

compact identity definition list, numbered section grid, 반복되는 project/training row로 resume의 information hierarchy를 정의한다. ordinal, section label, content를 전용 column으로 분리해 description 길이가 크게 달라도 scanning pattern을 예측 가능하게 유지한다. project와 training entry는 공용 row rule을 사용해 하나의 document rhythm을 유지하면서 semantic difference는 보존한다.

## style(editorial): resume 사례와 contact 본문 구성

resume entry에 case-study link treatment를 추가하고 contact page의 hero, availability summary, contact channel, supporting note를 구성한다. 3-column desk layout이 availability, primary action, context의 책임을 분리하고, 44px link와 visible hover change로 action row를 장식이 아니라 실제 조작 가능한 요소로 유지한다. contact card는 안정적인 index/content/arrow grid를 사용해 channel name 길이가 달라도 label 정렬을 유지한다.

## style(editorial): contact note와 milestone link 구성

contact note를 compact supporting list로 스타일링하고 journey milestone spread를 date/story composition으로 구성한다. 2-column milestone row가 chronology와 narrative evidence를 분리하고 definition-list pair는 challenge와 learning detail을 prose로 평평하게 합치지 않고 정렬한다. wrapping milestone link를 사용해 각 event에서 관련 project evidence로 직접 이동할 수 있다.

## style(editorial): milestone과 현재 방향 지면 구성

secondary journey timeline과 high-contrast current-position panel을 추가한다. timeline은 짧은 historical entry에 제한된 2-column card matrix를 사용해 큰 milestone narrative와 시각적 무게를 중복하지 않고 보완한다. touch-sized project link와 전용 current-position grid로 historical evidence와 present direction을 구분하면서 연결한다.

## style(editorial): 현재 방향과 interview track 구성

current-position typography를 완성하고 interview map에 sticky horizontal-scroll chapter navigator를 추가한다. 각 interview track은 persistent local header가 있는 자체 anchor section을 가져 긴 question collection을 scroll할 때도 context를 유지한다. `scroll-margin-top`과 sticky navigation height를 맞춰 anchor target이 chapter bar 뒤에 가려지지 않도록 한다.

## style(editorial): interview 답변과 근거 표현 구성

interview ledger를 paired question/evidence column으로 정의한다. question은 stable numbering과 선택적 source link를 유지하고, 각 answer의 supporting evidence는 vermilion rule과 명시적 label로 시각적으로 grouping한다. claim과 proof를 구분하고 여러 evidence record를 읽기 쉽게 하면서 presentation decision을 content model에 넣지 않는다.

## style(editorial): 공백 목록과 중형 화면 경계 구성

dark unresolved-gaps spread를 도입하고 1180px boundary에서 Editorial shell의 중간 화면 대응을 시작한다. gap section은 missing evidence를 의도적으로 first-class content로 보여주고, medium-width rule은 tablet size에 도달하기 전에 navigation과 project-index density를 줄인다. 모든 desktop column을 압축하는 대신 secondary label과 metadata를 숨겨 primary route 및 project information을 보존한다.

## style(editorial): tablet masthead와 hero 재배치

tablet width에서 desktop navigation을 native disclosure menu로 교체하고 home hero를 8-column grid에 재배치한다. disclosure menu는 client-side menu state 없이 navigation 기능을 유지하고 visible open treatment를 제공하며 flyout을 viewport 안에 제한한다. 각 hero block을 명시적 column에 다시 배치해 desktop grid가 좁아져도 editorial hierarchy를 유지한다.

## style(editorial): tablet route 지면 재배치

주요 route spread를 tablet에 맞는 single-column flow로 접고 hierarchy상 필요한 곳만 선택적으로 2-column 관계를 유지한다. 줄어든 viewport와 경쟁하기 시작하는 시점에는 sticky side rail을 끄고, 새 reading order에 맞게 vertical border를 horizontal separator로 옮긴다. profile portrait, resume identity, case-study narrative, contact note에는 generic stack에 의존해 semantic grouping을 잃지 않도록 각자 구체적인 placement rule을 적용한다.

## style(editorial): tablet 세부 간격 정리

tablet journey timeline의 introductory column을 읽기 좋은 폭으로 제한한다. 작은 제약이지만 이제 stack된 lead copy가 container 전체 폭을 차지하는 것을 막아 넓은 layout에서 확립한 text rhythm을 유지한다.

## style(editorial): mobile navigation과 hero 구성

masthead metadata를 단순화하고 주요 route grid를 stack하며 home hero를 linear flex flow로 바꾸는 첫 mobile breakpoint를 구성한다. project-index row는 number, title, summary, action을 유지하면서 desktop 전용 metadata를 제거하고, multi-column principle, evidence, decision structure는 single-column sequence로 전환한다. desktop composition을 단순히 축소하는 대신 content order와 interaction target을 보존한다.

## style(editorial): mobile 본문과 표 구성

page hero, case metadata, archive fact, profile content, resume section, milestone, curation panel, interview question의 mobile reflow를 완성한다. stack으로 바꾼 뒤 inherited grid-column assignment를 제거하고 desktop grid가 암묵적으로 제공하던 border를 필요한 위치에 다시 적용한다. table-like desktop structure가 linear reading flow로 바뀔 때 orphaned column이나 누락된 separator가 생기지 않도록 한다.

## style(editorial): mobile footer와 동작 감소 구성

small-screen spacing 조정을 마무리하고 Editorial renderer에 repository-wide reduced-motion contract를 추가한다. mobile rule은 불필요한 ordinal을 제거하고 남은 definition grid를 평평하게 하며 chapter 및 interview section을 fixed height 없이 읽을 수 있게 한다. `prefers-reduced-motion`에서는 scrolling, transition, animation, hover transform을 사실상 비활성화해 motion-sensitive 사용자가 장식 움직임을 감수하지 않아도 content와 interaction을 그대로 사용할 수 있다.

## feat(editorial): route 계약과 navigation helper 추가

closed route-name union과 content, optional project detail, current path, debug mode를 위한 공용 props contract로 Editorial renderer의 route boundary를 확립한다. 중앙 helper는 내부 link 생성 시 active design과 debug query를 보존하고, nested path에 대해 parent route를 active로 표시하며, display ordinal과 제한된 tag set을 정규화한다. 이후 route implementation이 page마다 path semantics를 다시 구현하지 않고 하나의 일관된 navigation 및 presentation contract를 사용하게 한다.

## feat(editorial): debug note와 이미지 프레임 추가

두 개의 집중된 presentation primitive를 도입한다. opt-in debug source note와 semantic project image frame이다. debug annotation은 content-debug mode가 아니면 완전히 사라지고, image component는 `<figure>` 안에서 Next.js image sizing, priority, alternative text, caption fallback을 중앙화한다. 이 concern을 작은 component 뒤에 두어 route마다 accessibility와 responsive image behavior가 달라지는 것을 막는다.

## feat(editorial): 콘텐츠 링크와 방향 표식 추가

internal application path와 external destination을 구분하는 content-aware link renderer를 추가한다. 내부 link는 Editorial URL helper를 거쳐 navigation 후에도 selected design과 debug mode를 보존하고, 외부 link는 설정된 destination을 그대로 사용하되 external로 표시된 경우에만 new-tab 및 `noreferrer` attribute를 적용한다. 장식용 arrow는 assistive technology에서 숨겨 link label이 accessible name으로 유지되도록 한다.

## feat(editorial): masthead와 footer shell 추가

content-driven desktop/mobile navigation, design switching, main-content targeting, footer link를 중심으로 공용 Editorial page shell을 구성한다. active route는 `aria-current`로 노출하고 skip link로 keyboard에서 main region에 바로 접근할 수 있게 하며, mobile menu는 disclosure state를 별도로 구현하지 않고 native `<details>` semantics를 사용한다. 모든 internal navigation은 renderer-aware URL helper를 통해 생성해 site 전체에서 active design과 debug context를 보존한다.

## feat(editorial): 섹션 표식과 프로젝트 인덱스 추가

section numbering과 project-index row를 재사용 가능한 Editorial component로 추출한다. 각 project row는 category, title, summary, deployment metadata, 제한된 tag list, 명시적 label이 있는 detail action을 공용 content model에 연결한다. row contract를 중앙화해 home과 archive list를 일관되게 유지하고 assistive label을 icon에서 추론하지 않고 설정된 template에서 생성한다.

## feat(editorial): 홈 hero spread 추가

Editorial home route를 content-directed section dispatcher로 시작하고 hero spread를 구현한다. featured flag가 하나도 없을 때는 결정적인 fallback으로 project를 선택하고, hero의 identity, availability, location, current year는 renderer 전용 복사본을 넣지 않고 shared content에서 파생한다. optional profile image가 없어도 photo fallback과 renderer-aware project navigation으로 hero를 완전한 상태로 유지한다.

## feat(editorial): 홈 lead story 추가

첫 selected project를 full narrative feature로 사용하는 lead-project section을 추가한다. renderer는 category, period, summary, description, highlight, priority-loaded screenshot을 하나의 case-study entry point로 결합하고 project가 없을 때는 명시적인 empty state를 유지한다. visual link에는 title별 accessible label을 부여해 arrow나 layout에 의존하지 않고도 image-led action의 의미를 이해할 수 있게 한다.

## feat(editorial): 홈 대표 프로젝트 목록 추가

lead story에 이미 사용한 project를 제외한 나머지 selected project를 공용 index-row component로 렌더링한다. home page에서 같은 project가 중복으로 강조되는 것을 막고 목록을 의도한 editorial length로 제한하며, candidate가 없을 때는 설정된 empty-state copy를 유지한다. index component를 재사용해 metadata와 accessible detail link를 archive view와 맞춘다.

## feat(editorial): 홈 원칙과 기술 sidebar 추가

profile principle을 primary narrative로, current journey와 technology stack을 supporting context로 제시하는 2-part home section을 추가한다. renderer는 각 concern을 authoritative content collection에서 읽고 stack preview는 compact subset으로 제한하며, 전체 journey는 renderer state를 보존하는 route link 뒤에 둔다. 지속적인 working principle과 일시적인 status 및 tool inventory를 분리하면서 시각적으로는 연관되게 보여준다.

## feat(editorial): 홈 contact strip 추가

compact contact call-to-action으로 home section dispatcher를 완성한다. strip은 content layer의 preferred-link order를 사용하고 preview를 세 channel로 제한하며, 각각을 content-aware link component로 렌더링해 internal/external behavior를 올바르게 유지한다. availability, title, action이 dedicated contact route와 동기화되고 renderer 안에 별도 복사되지 않는다.

## feat(editorial): 프로젝트 archive route 추가

Editorial project archive를 content-driven route로 추가한다. project를 configured `projectGroups`와 join하고 빈 group은 제거하며 남은 group은 모두 공용 project-index row를 재사용한다. 따라서 taxonomy는 visual order에서 재구성하지 않고 content model이 계속 소유한다. route는 `getProjectMetricValue`로 overview metric도 파생하고 명시적인 archive empty state를 제공하며, 함께 추가한 `EvidenceList`는 이후 case-study evidence를 위한 ordered/unordered 공통 표현을 확립한다.

## feat(editorial): 프로젝트 상세 서사와 구조 추가

recoverable missing-project state, project fact, canonical detail link, cover media, problem/solution narrative, architecture evidence, stack label을 포함하는 첫 완전한 Editorial case-study route를 구현한다. supporting screenshot은 cover source와 비교해 중복 evidence를 제거하고, stack identifier는 공용 technology catalog에서 해석하되 identifier fallback을 두어 catalog data가 불완전해도 project 정보를 잃지 않는다. route recovery, link normalization, content join을 renderer boundary에 유지해 underlying content contract를 약화하지 않고도 page robustness를 확보한다.

## feat(editorial): 프로젝트 증거와 결과 spread 추가

highlight, 선택적 supporting-image gallery, 분리된 decision/trade-off column, project result, archive로 돌아가는 route를 추가해 case-study narrative를 완성한다. 각 collection은 공용 evidence primitive와 명시적 empty-state behavior를 사용하고, cover가 아닌 screenshot이 없으면 gallery를 생략한다. decision, trade-off, outcome을 source-backed section으로 구분해 모든 project material을 일반적인 feature list로 평평하게 만들지 않고 각각의 설명 역할을 보존한다.

## feat(editorial): About 정체성과 원칙 소개 추가

shared profile model을 사용해 Editorial About route의 identity 및 principles section을 추가한다. hero는 headline, summary, availability, location, bilingual name data, optional portrait를 결합하며 photo가 없을 때 임의의 fallback content를 만들지 않는다. principle은 ordered semantic collection으로 렌더링해 personal identity fact와 working principle을 독립적으로 접근할 수 있게 하면서 design 간에는 하나의 content source를 공유한다.

## feat(editorial): About 기술과 경력 소개 추가

About route에 focus area, grouped skill, chronological experience record를 추가한다. renderer는 설명 중심 focus area, 구체적 skill inventory, 날짜가 있는 experience entry의 source model 차이를 유지하고 하나에서 다른 하나를 파생하지 않는다. 각 정보 유형에 적합한 semantic list를 사용하고 시각적 관계는 stylesheet가 제어한다.

## feat(editorial): About 큐레이션 기준 추가

curation page capability가 enabled일 때만 About route에 curation criterion을 노출한다. section은 `aria-labelledby`로 label을 연결하고 introduction, title, criterion card를 curation 및 presentation model에서 직접 읽어 optional portfolio material도 navigation과 동일한 page-availability contract를 따르게 한다. route boundary의 conditional rendering으로 renderer가 layout을 구현했다는 이유만으로 disabled content가 계속 접근 가능한 상태로 남지 않도록 한다.

## feat(editorial): About 큐레이션 범주 추가

configured project identifier를 canonical project record로 다시 해석하는 curation category를 추가한다. missing identifier는 type guard로 filtering하고 하나 이상의 reference가 해석될 때만 project link를 렌더링해 broken content relationship이 invalid case-study navigation을 만들지 않게 한다. link는 계속 Editorial URL helper를 거치므로 selected design과 debug mode가 cross-reference 이동 후에도 유지된다.

## feat(editorial): About 큐레이션 공백과 재검토 추가

명시적인 omission record와 next-review section으로 curation narrative를 완성한다. excluded material과 reevaluation criterion을 first-class content로 다뤄 visible project를 이유 설명 없는 완전한 집합처럼 제시하지 않는다. route는 현재 archive와 해당 archive가 변경될 조건을 모두 전달한다.

## feat(editorial): Resume 정체성과 프로젝트 경력 추가

optional download action, profile identity fact, narrative summary, `getResumeProjects`가 선택한 project를 포함하는 Editorial résumé route를 도입한다. project entry는 period, role, tag, renderer-aware case-study link를 보존하고 selected project가 없는 résumé에는 명시적 empty state를 사용한다. 공용 project-selection helper를 재사용해 view에서 filtering policy를 복제하지 않고 résumé evidence set을 content model과 일치시킨다.

## feat(editorial): Resume 경력과 교육 기록 추가

résumé body를 experience, training, education, notes section으로 분리해 완성한다. 각 source collection은 자체 label과 chronology를 유지하고 free-form note는 공용 evidence-list behavior를 사용해 빈 list도 의도적인 상태로 표현한다. employment history, structured program, formal education, supplementary qualification을 서로 합치지 않는다.

## feat(editorial): Contact desk route 추가

공용 preferred-contact ordering을 기반으로 Editorial contact route를 추가한다. hero, current availability, actionable channel, contact note는 모두 content model에서 가져오고 internal/external channel은 `EditorialContentLink`를 통과하며 contact method가 없을 때는 전용 empty state를 제공한다. contact page를 두 번째 하드코딩 address 집합이 아니라 하나의 authoritative contact configuration을 표현하는 projection으로 만든다.

## feat(editorial): Journey milestone spread 추가

Journey route의 milestone narrative를 도입한다. 각 milestone은 state, reason, result를 보존하고 optional anchor project identifier를 canonical project로 해석한 뒤 unresolved reference는 navigation을 만들기 전에 조용히 버린다. timeline을 단순 chronology가 아니라 explanation으로 만들고 stale cross-reference가 broken link가 되는 것을 막으며 milestone이 하나도 없는 경우에도 명시적인 empty state를 유지한다.

## feat(editorial): Journey timeline과 현재 방향 추가

Journey route를 더 넓은 dated archive와 current-position statement로 확장한다. timeline entry는 date range, category, project collection에서 해석되는 선택적 project reference를 지원하며, reference가 없거나 해석되지 않으면 entry 자체를 무효화하지 않고 action만 생략한다. historical archive와 current-position summary를 분리해 기록된 progression과 portfolio의 현재 방향을 구분한다.

## feat(editorial): Interview Map 소개와 chapter 추가

Interview Map의 introduction, external reference repository, configured interview track에서 생성한 in-page chapter index를 추가한다. stable track identifier가 anchor target이 되고, reference link는 `noreferrer`와 함께 명시적으로 새 browsing context를 사용한다. route는 이후 evidence layer를 위해 project lookup map도 구성해 interview prompt와 portfolio case study를 잇는 join key로 project identity를 확립한다.

## feat(editorial): Interview 답변 근거와 공백 추가

track, question, source reference, project-backed answer, 선언된 evidence gap을 렌더링해 Interview Map을 완성한다. answer의 project identifier는 canonical lookup으로 해석하며, unresolved mapping은 사라지거나 잘못된 link가 되지 않고 요청된 depth와 함께 no-evidence state로 남는다. answer, track-item, track 수준의 명시적 empty state로 missing evidence를 rendering failure와 구분하고, 마지막 gaps section은 limitation을 portfolio data의 일부로 기록한다.

## feat(editorial): route dispatcher 추가

하나의 exhaustive dispatcher에서 지원하는 모든 Editorial route를 전용 renderer에 연결한 뒤 선택된 route를 공용 `EditorialShell` 안에 배치한다. route selection을 중앙화해 masthead, navigation, debug state, footer behavior를 일관되게 유지하면서 각 page component는 자신의 content projection에만 집중할 수 있다. 동일한 route props를 변경 없이 전달해 project-detail context와 renderer-aware navigation에도 하나의 contract를 유지한다.

## style(editorial): 반응형 media rule 정렬

selector와 declaration은 바꾸지 않고 indentation을 정규화하고 인접한 media-query block을 통합한다. 각 breakpoint의 rule을 문법적으로 하나의 일관된 block에 모아 이후 responsive edit가 의도한 boundary 밖에 들어갈 가능성을 줄이면서 기존 tablet 및 mobile behavior는 그대로 유지한다.

## feat(editorial): renderer를 디자인 registry에 활성화

완성된 Editorial renderer를 site의 selectable design contract에 등록한다. metadata와 swatch를 등록하고 lazy route-module loader 및 public export를 추가하며 content validation이 identifier를 허용하도록 하고 Editorial을 기본 home template로 지정한다. presentation data, runtime loading, validation, design configuration을 함께 갱신해 interface에는 표시되지만 로드할 수 없는 design이나 loader는 받지만 content validation이 거부하는 design이 생기지 않게 한다.

## style(brutalist): 화면 토큰과 brand mark 구성

Brutalist renderer의 scoped visual token, typography, sizing model, 초기 shell element를 확립한다. root에 palette와 box-sizing boundary를 두어 이 design의 전제가 다른 renderer에 누출되지 않도록 하고, high-contrast focus outline과 keyboard에서 드러나는 skip link로 의도적으로 거친 visual treatment도 pointer 없이 사용할 수 있게 한다. header와 animated brand mark는 navigation semantics를 CSS로 옮기지 않으면서 일관된 interaction language의 시작점을 만든다.

## style(brutalist): header 상태와 home hero 구성

명시적인 status, design-switcher, navigation, debug, home-hero region을 중심으로 desktop shell을 구성한다. navigation은 fixed-minimum column이 가로로 흐르는 구조를 사용해 content-defined menu가 커져도 예측 불가능하게 wrap되지 않고 접근 가능하게 유지하며, `aria-current`에도 hover와 같은 강한 state treatment를 적용한다. debug banner와 hero grid는 서로 다른 structural row에 배치해 operational context가 primary navigation과 경쟁하지 않게 한다.

## style(brutalist): hero stamp와 action row 구성

home hero의 stamp, copy column, oversized title, summary, 유연한 action row를 정의한다. fluid type과 `overflow-wrap`을 사용해 content가 소유한 name이나 headline이 고정된 영어 단어 길이를 가정하지 않고도 확장되며, split grid는 summary information을 primary identity statement와 분리한다. action은 고정 개수에 의존하지 않고 group 단위로 wrap한다.

## style(brutalist): 주요 action과 section 경계 구성

공용 high-contrast action vocabulary, 4-column metric band, animated signal strip, 일관된 section boundary를 추가한다. primary와 secondary action은 dimension과 keyboard-visible structure를 공유하면서 emphasis만 달리하고, definition-list metric은 visual grid 안에서도 label/value semantics를 유지한다. signal strip은 decorative motion으로 분리해 이후 reduced-motion 처리 시 주변 content를 바꿀 필요가 없도록 한다.

## style(brutalist): section header와 프로젝트 지표 구성

numbered section-header grid와 재사용 가능한 project-index row를 도입한다. 각 project는 ordinal, main content, metadata, action 전용 column을 가진 하나의 큰 link로 표현해 전체 card가 명확한 navigation target이면서 내부 information hierarchy도 드러나도록 한다. minimum-width guard, fluid heading, alternating offset으로 다양한 project copy를 수용하면서 grid child가 boundary를 넘지 않게 한다.

## style(brutalist): 프로젝트 지표와 card 번호 구성

project-index metadata, tag chip, action affordance, 첫 principle-card system을 완성한다. 긴 summary는 index에서 의도적으로 clamp하되 detail route는 전체 source를 유지해 model에서 content를 삭제하지 않고 scanability를 확보한다. 공용 chip style은 project 및 stack identifier에 하나의 visual grammar를 부여하고, full-width archive action은 개별 case-study link와 시각적으로 구분한다.

## style(brutalist): 원칙 카드와 contact band 구성

읽기 쉬운 principle card, wrapping technology wall, 구조화된 compact timeline, 큰 contact band로 home composition을 확장한다. timeline은 sequence, date, title, explanation을 별도 column으로 고정해 chronology와 narrative를 독립적으로 빠르게 읽을 수 있게 한다. fluid contact typography와 3-part grid는 availability, message, action에 공간을 확보하면서 wide display에서도 content가 자연스럽게 확장되게 한다.

## style(brutalist): contact 링크와 프로젝트 group 구성

contact-band action styling을 완성하고 공용 page-hero, inline-metric, grouped-project archive layout을 확립한다. definition-list metric은 page introduction 옆에서 compact하게 유지하고 각 project group은 지속적인 taxonomy 및 count를 member list와 분리한다. 큰 heading에는 fluid sizing과 emergency wrapping을 적용해 content-defined route title이 고정된 desktop width를 전제로 하지 않도록 한다.

## style(brutalist): 교차 group과 상세 lead 구성

교차되는 project group을 시각적으로 구분하고 case-study lead layout을 도입한다. group header는 descriptive context와 count를 소유하며 compact member list에서는 이미 분류된 group 안에 archive 수준의 density를 반복하지 않도록 secondary tag column을 숨긴다. detail hero는 한쪽의 navigation 및 narrative copy와 다른 쪽 project media를 명확히 구분하고, back action은 copy column 상단에서 계속 접근 가능하게 유지한다.

## style(brutalist): 상세 fact와 소개 본문 구성

case-study fact grid, 재사용 media frame, placeholder treatment, introductory narrative band를 추가한다. screenshot이 장식 crop이 아니라 evidence로 남도록 image에는 `object-fit: contain`을 사용하고 figure caption도 media contract에 연결해 둔다. image가 없을 때 전용 placeholder가 layout과 설명 context를 보존하며, label이 있는 fact와 introduction은 서로 다른 semantic role을 유지한다.

## style(brutalist): 상세 본문과 gallery grid 구성

반복되는 labeled section, numbered list, 2-column gallery를 중심으로 긴 case-study evidence를 구조화한다. offset content column과 central guide line으로 안정적인 reading rhythm을 만들고 list variant는 markup을 바꾸지 않고 neutral, highlighted, primary evidence를 구분한다. 세 번째마다 gallery frame이 두 column을 차지하게 해 서로 다른 evidence scale을 허용하면서 figure는 하나의 responsive grid 안에 유지한다.

## style(brutalist): 다음 프로젝트와 focus card 구성

case-study continuation 및 recovery state를 추가하고 About route의 identity, portrait, skills 기반을 구성한다. missing-project view는 아무 style 없는 부재 상태가 아니라 의도적인 minimum-height layout과 primary recovery action을 갖는다. profile fact, optional portrait media, focus area, skill group을 각각 분리된 bounded component로 표현해 portrait data가 없어도 identity ledger가 흔들리지 않는다.

## style(brutalist): focus card와 criteria grid 구성

focus 및 skill card를 완성하고 numbered criterion을 갖는 dark curation section을 도입한다. skill inventory는 compact token으로 wrap하고 focus card는 explanatory prose를 유지해 capability와 그에 대한 reasoning을 구분한다. curation grid는 contrast를 교차시키되 일관된 border와 minimum height를 유지해 copy 길이가 달라도 selection criterion에 같은 structural weight를 부여한다.

## style(brutalist): criteria 본문과 재검토 영역 구성

category card, omission record, bounded next-review panel로 curation presentation을 완성한다. visible project만 evidence로 취급하지 않고 selected category, 의도적으로 제외한 material, future reevaluation을 각각 별도 information class로 유지한다. category narrative 안에서 project reference는 시각적으로 보조 역할을 유지하고, dark section의 명시적인 white/yellow boundary로 copy 길이가 달라도 readability를 보존한다.

## style(brutalist): 재검토와 resume entry 구성

review panel을 마무리하고 résumé의 반복 section 및 entry grammar를 확립한다. 각 résumé section은 지속적으로 표시되는 heading rail과 content를 분리하고, summary, dated entry, selected project는 하나의 일반 card list가 아니라 각각 독립된 구조를 사용한다. 이로써 chronology, narrative summary, project evidence가 독립적으로 달라져도 안정적인 reading order를 유지한다.

## style(brutalist): resume 본문과 contact hero 구성

résumé project row와 note를 완성하고 Contact route의 blue hero를 도입한다. selected project는 sequence, evidence summary, case-link action을 위한 별도 column을 확보하고, résumé note는 experience record에 합치지 않고 독립적인 highlighted contract로 유지한다. contact hero는 page-label semantics를 재사용하면서 design 전용 contrast treatment를 적용한다.

## style(brutalist): contact 상태와 note 목록 구성

contact availability badge, channel grid, 재사용 가능한 note-list 기반을 구성한다. contact method는 ordinal, label, direction affordance를 분리한 full-row action으로 표현하고, empty-state selector는 populated row에서 사용하는 overlapping-border treatment를 피한다. availability motion은 작은 status marker에만 한정해 이후 reduced-motion 처리에서 underlying text를 바꾸지 않고 비활성화할 수 있다.

## style(brutalist): note 목록과 anchor link 구성

note 및 evidence-gap row를 완성하고 Journey milestone card를 정의한다. milestone은 sequence, date, title, state, reason, result를 서로 다른 semantic position에 유지하며 선택적 project anchor는 wrapping link로 표현한다. 이 구조는 milestone을 단순 chronology가 아니라 explanation으로 만들고 missing 또는 additional evidence를 위한 별도 list grammar도 제공한다.

## style(brutalist): archive timeline과 track navigation 구성

더 넓은 journey archive, current-position callout, Interview Map track navigation용 shell을 추가한다. archive entry는 sequence, date, category, narrative, 선택적 project action을 보존하고 current state는 historical record와 시각적으로 분리한다. track-navigation grid는 site의 primary navigation과 섞이지 않는 label이 있는 in-page index를 확립한다.

## style(brutalist): track 목록과 question prompt 구성

in-page track index를 완성하고 Interview Map의 track 및 question hierarchy를 확립한다. track header는 ordinal, title, description, question count를 노출하고 각 question은 prompt/reference 영역과 answer-evidence 영역을 분리한다. `scroll-margin-top`을 적용해 chapter anchor가 viewport edge에 바짝 붙지 않고 사용할 수 있는 landing position을 갖게 한다.

## style(brutalist): 답변 근거와 footer lead 구성

question reference와 answer evidence를 완성하고 명시적인 empty-answer presentation 및 footer lead를 추가한다. 여러 evidence record는 하나의 answer column 안에서 project와 title을 명확히 강조해 stack하고, mapping이 없는 상태는 rendering failure와 시각적으로 구분한다. footer는 큰 closing statement를 metadata와 분리해 global exit information이 route evidence와 경쟁하지 않도록 한다.

## style(brutalist): footer metadata와 blink 동작 구성

footer metadata를 완성하고 공용 dashed empty-state block과 두 renderer animation을 추가한다. empty-state presentation을 중앙화해 모든 route가 absent content를 의도적으로 표현하도록 한다. crawl과 blink keyframe은 좁은 scope에 한정해 이후 reduced-motion media query가 layout에 영향을 주지 않고 decorative motion만 제거할 수 있게 한다.

## style(brutalist): tablet grid 재배치

Brutalist desktop grid를 tablet width에 맞게 재배치한다. 주요 split route는 1-column으로 바꾸고 metric은 2×2 grid로, 밀도 높은 project tag는 index row에서 제거하며 3-column card set은 2-column으로 줄인다. type만 축소하는 대신 hierarchy 자체를 변경해 좁은 중간 폭에서 공간이 부족한 desktop column을 그대로 유지하는 문제를 막는다.

## style(brutalist): mobile header와 hero 구성

desktop navigation을 native `<details>` mobile menu로 교체하고 좁은 폭에서 header의 status와 debug content를 stack한다. disclosure marker는 open/closed state를 전달하고 mobile menu 안에서도 current-route styling을 유지한다. native summary semantics를 유지해 client component에서 menu state를 다시 구현하지 않고 keyboard 및 no-JavaScript disclosure behavior를 제공한다.

## style(brutalist): mobile 프로젝트와 상세 화면 구성

home metric, section header, project row, principle, skill, curation card, gallery를 mobile reading order로 접는다. secondary project summary는 밀도 높은 index view에서만 숨기고 canonical detail content는 그대로 사용할 수 있게 한다. alternating offset과 multi-column span을 제거해 작은 화면의 visual composition rule이 semantic order를 바꾸지 않도록 한다.

## style(brutalist): mobile profile과 resume 구성

page hero, project detail, curation, résumé, contact, current-position section까지 mobile reflow를 확장한다. multi-column fact 및 narrative structure를 single column으로 바꾸고 왼쪽 offset evidence를 normal flow로 되돌리며 gallery spanning을 제거한다. grid가 접힌 뒤 desktop coordinate에 의존하지 않고 source order와 읽기 쉬운 border를 보존한다.

## style(brutalist): mobile 여정과 interview 구성

journey milestone, archive entry, interview track, footer metadata, missing-page recovery의 narrow-screen 처리를 완성한다. definition-list milestone evidence와 question prompt/answer pair를 명시적인 vertical sequence로 바꾸고 track navigation은 full-width row로 확장한다. footer와 recovery state도 desktop split boundary를 제거해 content가 하나의 일관된 reading stream으로 이어지게 한다.

## style(brutalist): 소형 화면과 인쇄 경계 구성

가장 작은 viewport, reduced-motion, print boundary를 강화한다. compact grid로 430px 이하에서도 project, detail, résumé, note content를 사용할 수 있게 하고, reduced-motion query는 transition과 두 decorative animation을 억제하며, print에서는 global navigation과 debug chrome을 제거하고 흰 배경의 검은 text를 복원한다. 이들은 서로 다른 output constraint이므로 명시적으로 분리해 print나 motion preference를 단순한 다른 screen width처럼 취급하지 않는다.

## style(brutalist): 반응형 media rule 정렬

반복된 720px media query를 하나의 block으로 통합하고 declaration을 바꾸지 않은 채 indentation을 정규화한다. mobile override 전체를 하나의 boundary에 모아 cascade를 audit하기 쉽게 하고, 논리적으로 같은 breakpoint 사이에 이후 rule이 잘못 삽입될 위험을 줄인다.

## feat(brutalist): 콘텐츠와 탐색 조회 도우미 추가

Brutalist renderer의 content 및 navigation adapter layer를 확립한다. helper는 link에서 design/debug state를 보존하고 canonical content에서 compact metric과 grouped project를 해석하며, stack fallback과 함께 tag density를 제한하고, 타입이 지정된 copy-template token을 적용하며 exact home navigation과 nested route match를 구분한다. 이 join을 page markup 밖에 모아 route component를 선언적으로 유지하고 view마다 자체 fallback이나 active-route rule을 만들지 않게 한다.

## feat(brutalist): route 레이블과 기본 shell 구성

공용 Brutalist shell과 exhaustive route-label resolver를 도입한다. shell은 design/debug boundary, keyboard skip link, renderer state를 보존하는 brand link, route/location status, design switcher, main landmark를 소유하고 label은 configured navigation copy를 우선 사용하되 page별 fallback을 제공한다. individual page renderer가 shell이나 labeling policy를 중복하지 않고 모든 route에서 global navigation context를 일관되게 유지한다.

## feat(brutalist): 주 탐색과 모바일 메뉴 추가

canonical site navigation을 desktop 및 native mobile control에 모두 연결하고 모든 internal route에서 selected renderer와 content-debug query를 보존한다. active-route detection 결과는 `aria-current`에 반영하고 configured accessible name으로 primary 및 mobile navigation을 구분한다. 같은 commit에서 external HTTP link와 mail address는 일반 anchor로, 내부 destination은 Next.js로 보내는 link boundary를 추가해 design-state propagation이 external URL에 누출되지 않게 한다.

## feat(brutalist): footer와 홈 히어로 연결

공용 footer와 첫 Home section을 canonical portfolio content에 연결한다. footer action은 placement metadata로 선택해 internal/external link boundary에 위임하고, hero는 content model에서 identity, availability, call to action, 계산된 첫 네 metric을 파생한다. configured section order에 따라 section을 렌더링해 하나의 monolithic page sequence를 하드코딩하지 않고 view를 확장할 수 있게 한다.

## feat(brutalist): 홈 섹션 공용 프리미티브 추가

Brutalist home 및 archive view에서 반복되는 visual/routing unit을 추출한다. decorative signal strip, numbered section header, renderer state를 보존하는 project row, contact band, 명시적 empty state를 포함한다. 이 primitive가 numbering, project metadata, link construction, absence handling을 중앙화하므로 이후 route section이 presentation contract를 중복하지 않고 canonical content를 조합할 수 있다. signal strip은 decorative로 표시하고 empty state message는 정보를 전달하므로 status semantics를 사용한다.

## feat(brutalist): 대표 작업과 작업 원칙 구성

configured Home sequence에 signal, featured-project, system section을 추가하고 Projects route hero를 구성한다. featured selection은 명시적으로 표시된 project를 우선하되 feature flag가 하나도 없으면 일반 project 순서로 fallback해 showcase가 비는 것을 막는다. principle과 제한된 technology wall은 project evidence와 별도로 유지하고, empty-state 및 total-count 처리를 통해 sparse content에서도 archive entry point가 유효하게 남는다.

## feat(brutalist): 홈 여정과 프로젝트 archive 구성

가장 최근 journey record 네 개와 contact band를 추가해 Home sequence를 완성하고 canonical project group으로 Projects archive를 렌더링한다. 최근 history는 underlying stored order를 바꾸지 않고 journey collection 끝에서 선택한 뒤 newest-first presentation을 위해 reverse한다. group section은 description과 count를 노출하고 빈 group은 생략하며, 해석 가능한 project가 하나도 없는 content set에는 명시적 archive empty state를 제공한다.

## feat(brutalist): 프로젝트 상세 표시 프리미티브 추가

project case study에 필요한 재사용 primitive를 추가한다. optimized image frame, ordered project action, text/list section shell, page label, curation heading을 포함한다. project action은 기존 internal/external link boundary를 보존하고 첫 action만 시각적으로 강조하며, media는 source alt text와 responsive sizing을 유지한다. optional label과 empty-list handling으로 누락된 content를 만들어내지 않고 서로 다른 깊이의 project evidence를 같은 structural component가 지원한다.

## feat(brutalist): 프로젝트 상세 hero와 소개 구성

project-detail route의 valid 및 missing-project path를 확립한다. identifier가 없거나 유효하지 않으면 content-defined recovery view를 통해 archive로 돌아가게 하고, 유효한 project에는 deeper evidence 전에 canonical metadata, deployment state, detail action, priority media, case introduction을 제공한다. 이 boundary는 detail component가 absent data를 dereference하지 못하게 하고 project navigation과 recovery link가 동일하게 renderer state를 보존하도록 한다.

## feat(brutalist): 프로젝트 상세 본문과 gallery 구성

problem, solution, architecture, screenshot, resolved stack data로 주요 project case study를 구성한다. 재사용 list section은 list semantics를 바꾸지 않고 optional eyebrow/intro copy, 명시적 empty evidence, 제어된 blue/yellow emphasis를 지원한다. screenshot gallery는 비어 있으면 생략하고 stack identifier는 canonical technology catalog에서 해석해 project record를 authoritative source로, presentation label을 중앙화된 상태로 유지한다.

## feat(brutalist): 프로필과 기술 소개 구성

canonical profile content로 About route의 identity, principle, focus area, skill group을 구현한다. optional portrait는 media가 있을 때만 렌더링하므로 사진이 없어도 identity ledger가 유효하다. principle, 설명형 focus area, compact skill inventory는 각각 operating value, concentration area, concrete capability라는 다른 질문에 답하므로 서로 다른 structure를 사용한다.

## feat(brutalist): 큐레이션과 경력 소개 구성

About을 experience history와 feature-gated curation archive로 확장한다. curation은 site-page policy가 enabled일 때만 렌더링하고 category project identifier를 방어적으로 해석한 뒤 link를 만든다. criterion, selected category, omission, next review를 별도 evidence class로 유지해 project list를 자기 정당화된 결과처럼 제시하지 않고 inclusion과 exclusion decision을 모두 설명한다.

## feat(brutalist): 이력 hero와 경력 요약 구성

identity 및 availability context, optional download action, numbered summary statement, dated experience entry를 갖는 Résumé route를 구성한다. download는 실제 URL이 있을 때만 렌더링하고 공용 link boundary를 재사용해 inert control을 노출하지 않는다. 간결한 summary evidence를 chronological experience와 분리해 experience collection이 비어 있어도 안정적인 route hierarchy를 유지한다.

## feat(brutalist): 프로젝트 결과와 의사결정 구성

highlight, decision, trade-off, result를 추가해 project case-study evidence sequence를 완성한다. 네 영역 모두 기존 list-section contract와 동일한 명시적 empty state를 사용하되 trade-off와 result에는 서로 다른 tone을 적용해 positive outcome과 unresolved cost가 시각적으로 합쳐지지 않게 한다. numbered progression으로 detail page를 단순 media showcase가 아니라 judgment와 consequence까지 포함하는 engineering narrative로 만든다.

## feat(brutalist): 선택 프로젝트와 이력 세부 구성

selected project evidence, training, education, additional note를 추가해 Résumé를 완성한다. résumé의 project identifier는 canonical project에 대조해 해석하고 unresolved reference는 rendering 전에 제거해 broken case link를 막는다. accessible case-study label은 icon-only action에서도 project context를 보존하고, 정의된 notes empty state는 optional supplementary information의 부재를 rendering omission과 구분한다.

## feat(brutalist): 연락 수단과 안내 구성

preferred communication channel을 중심으로 Contact route를 구현하되 placement-based fallback을 제공한다. preference metadata가 있으면 명시된 순서를 보존하고 없어도 유효한 contact link를 노출한다. 각 method는 공용 link boundary를 통과하며 availability는 text와 decorative status marker로 표현하고, link가 0개인 configuration에도 empty-state row를 제공해 빈 section이 되지 않게 한다.

## feat(brutalist): 여정 milestone 구성

Journey route의 explanatory milestone model을 구성한다. 각 milestone은 record를 date와 title로 축소하지 않고 state, reason, result를 definition list로 렌더링하며 optional anchor project identifier는 link 생성 전에 해석한다. chronology를 transition과 consequence의 evidence로 취급하고 milestone이 없을 때는 명시적 fallback을 제공한다.

## feat(brutalist): 여정 archive와 인터뷰 map 머리말 구성

full chronological archive와 current-position statement로 Journey를 완성한 뒤 Interview Map hero와 track index를 구성한다. project lookup map을 통해 timeline entry에 반복 탐색 없이 optional case-study link를 제공하고 unresolved reference는 단순히 unlinked 상태로 남긴다. interview track anchor는 renderer/debug state를 보존하고 external reference repository와 분리해 in-site evidence navigation과 source material 사이의 경계를 명확히 한다.

## feat(brutalist): 인터뷰 근거 archive 구성

Interview Map을 project evidence가 뒷받침하는 question track으로 렌더링한다. project identifier는 lookup map으로 해석하고 유효한 answer만 linked evidence card가 되며, 해석 가능한 evidence가 없는 question은 조용히 사라지지 않고 전용 empty message를 보여준다. stable track anchor, configured item count, external reference, recorded answer depth를 통해 interview topic과 구체적인 case study 사이의 관계를 audit할 수 있게 한다.

## feat(brutalist): 인터뷰 근거 공백 구성

Interview Map에 전용 evidence-gap section을 추가한다. gap은 canonical content model에서 가져오고 자체 accessible list label을 가지며 mapped answer와 시각적으로 분리한다. missing evidence를 first-class content로 기록해 portfolio가 complete coverage를 암시하지 않도록 하고 향후 추가될 evidence와 현재 검증된 mapping을 구분한다.

## refactor(brutalist): 내부 helper 공개 범위 정리

content adapter, visual primitive, individual view를 module-private로 바꿔 Brutalist module의 public API를 route renderer 하나로 줄인다. behavior는 바뀌지 않는다. caller가 내부 composition에 의존하지 않고 renderer를 하나의 unit으로 선택한다는 계약을 코드로 명시해 incidental helper에 대한 cross-module compatibility obligation 없이 route section을 자유롭게 재구성할 수 있게 한다.

## feat(brutalist): 모든 route를 renderer에 통합

단일 `BrutalistRoute` entry point를 도입하고 공용 shell을 적용하기 전에 모든 supported route를 이곳에서 dispatch한다. exhaustive route switch는 optional project, current path 같은 route-specific input을 전달하고 individual view 및 shell은 private implementation detail이 된다. design registry가 기대하는 renderer contract를 확립하고 navigation, debug state, footer, landmark가 모든 Brutalist route를 일관되게 감싸도록 보장한다.

## feat(designs): Brutalist renderer 활성화

selectable renderer에 필요한 모든 registry boundary에서 Brutalist를 활성화한다. presentation metadata, module entry point, palette swatch, lazy route loading, design identifier에 대한 content-loader support를 추가한다. 관련 source를 함께 갱신해 사용자에게 노출되는 design은 type system이 인식하고 실제로 load 가능하며 content 또는 query state에서 요청할 때도 허용된다는 invariant를 유지한다.

## style(cinematic): 암실 palette와 shell 기초 구성

Cinematic renderer의 root visual 및 accessibility contract를 확립한다. design-scoped color variable로 darkroom palette를 정의하고 selection color, inherited link color, visible keyboard focus, focus 시 드러나는 skip link를 제공해 pointer 없이도 visual system을 사용할 수 있게 한다. sticky translucent header와 초기 desktop/mobile navigation structure는 Cinematic token을 다른 renderer에 누출하지 않고 안정적인 shell을 제공한다.

## feat(cinematic): 링크와 chapter 표기 프리미티브 추가

route composition을 시작하기 전에 Cinematic navigation과 반복 chapter markup을 중앙화한다. internal path는 `getTemplateHref`를 거쳐 renderer selection과 content-debug state를 navigation 후에도 유지하고, non-local destination은 적절한 경우에만 new-tab 및 `noreferrer`를 적용한 일반 anchor로 남긴다. disabled content link를 한 곳에서 filtering하고 zero-padded chapter label을 표준화해 이후 모든 route가 동일한 link 및 sequencing contract를 따르게 한다.

## style(cinematic): 모바일 탐색과 hero 매체 구성

shell의 mobile disclosure를 완성하고 image 중심 hero composition을 확립한다. native `details` menu는 active-link treatment를 갖는 bounded scrollable overlay가 되어 긴 navigation이 viewport 밖으로 벗어나는 것을 막고, footer와 2-column hero는 renderer의 primary content hierarchy를 정의한다. action link와 media caption은 dark palette 위에서도 읽기 쉽게 유지하며 Home route가 사용하는 layout primitive를 제공한다.

## feat(cinematic): 공용 frame과 media 추가

모든 route에서 사용하는 공용 Cinematic frame과 media boundary를 도입한다. frame은 skip target, canonical navigation, current-page state, design switcher, mobile disclosure, main landmark, placement metadata로 선택된 footer link를 소유하므로 route view는 page content만 제공한다. media primitive는 필수 alternative text, responsive sizing, 선택적 priority와 함께 image를 `next/image`로 렌더링해 hero, archive, detail view의 image loading behavior를 일치시킨다.

## feat(cinematic): 프로젝트 chapter 추가

sticky evidence summary와 visual asset을 결합하는 재사용 가능한 project chapter를 추출한다. textual action과 image link 모두 Cinematic renderer를 보존하고, media link에는 project별 accessible label을 부여하며 첫 chapter는 priority loading을 선택할 수 있다. Home과 project archive가 project category, title, summary, destination, screenshot에 대해 하나의 canonical representation을 사용하게 한다.

## style(cinematic): chapter와 archive 지면 구성

Cinematic renderer가 사용하는 long-form chapter 및 archive layout을 정의한다. project entry는 sticky copy와 큰 media를 짝지어 배치하고 statement 및 focus section에는 의도적인 asymmetric grid를 사용하며, image hover treatment는 content semantics를 바꾸지 않고 visual hierarchy를 강화한다. route마다 독립적으로 styling하지 않고 project list, detail evidence, profile essay, résumé section에 재사용할 page geometry를 확립한다.

## feat(cinematic-home): 소개와 대표 프로젝트 구성

canonical portfolio content로 Cinematic Home page를 구성하면서 presentation data가 section order를 제어하도록 한다. 타입이 지정된 map이 각 configured section identifier를 rendered node에 연결하므로 `sections` array 순서만 바꿔도 content를 복제하거나 허용 identifier 집합을 느슨하게 하지 않고 composition을 변경할 수 있다. featured project가 lead image와 chapter를 결정하되 available project를 대상으로 한 결정적 fallback을 제공하고, resulting collection에 맞춰 chapter numbering도 조정한다.

## feat(cinematic-projects): 프로젝트 archive 구성

모든 canonical project에 공용 project-chapter representation을 재사용해 완전한 Cinematic project archive를 추가한다. heading은 실제 collection size를 표시하고 첫 archive image에만 priority loading을 부여해 전체 visual list를 eager load하지 않으면서 initial viewport를 최적화한다. 같은 chapter component를 사용해 route-preserving link, accessible image action, project summary를 Home과 일치시킨다.

## style(cinematic): 상세와 이력 grid 구성

case-study evidence, profile essay, résumé content를 위한 grid system을 확립한다. 큰 route heading 뒤에 bounded 2-column section을 배치하고 identity fact는 semantic definition-list styling을 사용하며 gallery와 biography block에는 각 content density에 맞는 다른 layout을 적용한다. 공용 geometry로 이후 route implementation이 data-mapping code에 layout decision을 넣지 않고 상세 evidence를 표현할 수 있게 한다.

## feat(cinematic-project): 상세 hero와 매체 구성

유효한 project와 unresolved project를 모두 명시적으로 처리하는 Cinematic project-detail boundary를 만든다. missing record는 archive로 돌아갈 수 있는 recoverable route state를 렌더링하고, valid record는 category, period, summary, description, role, deployment status, priority lead image를 노출한다. lookup failure를 renderer 내부에서 처리해 route composition이 absent content를 dereference하지 못하게 하고 각 design에 제어된 not-found experience를 제공한다.

## feat(cinematic-project): 상세 서사와 gallery 구성

project detail을 hero에서 완전한 evidence narrative로 확장한다. optional text/list section은 project가 실제 data를 제공할 때만 렌더링하고 stack identifier는 canonical technology catalog에서 identifier fallback과 함께 해석하며 project action은 공용 detail-link selector에서 가져온다. supporting screenshot은 source 기준으로 lead image를 제외해 중복 media를 막고 나머지는 gallery로 유지한다. 이 규칙으로 sparse project와 rich project 모두 하나의 renderer에서 유효하게 처리한다.

## style(cinematic): 프로필과 콘텐츠 section 구성

profile fact, long-form content section, chronology, evidence link, contact information, interview gap에 필요한 재사용 visual structure를 추가한다. compact metadata와 explanatory prose를 분리하고 timeline 및 evidence record에 안정적인 reading order를 제공하면서 route별 content를 하드코딩하지 않는다. 이후 Cinematic route가 일관된 density, spacing, link affordance를 공유할 기반을 마련한다.

## feat(cinematic-about): 프로필과 경력 소개 구성

canonical profile, skill, experience model로 Cinematic About route를 구현한다. identity block은 profile image를 optional로 취급하고 principle과 technical focus를 서로 다른 conceptual group으로 유지하며, skill catalog와 experience record는 각 source collection에서 직접 렌더링한다. biography presentation을 renderer-specific copy와 분리하면서 identity에서 practice, work history로 이어지는 명확한 progression을 보존한다.

## feat(cinematic-about): 큐레이션 archive 구성

공용 site-page enablement contract 아래에서 Cinematic About route에 optional curation archive를 추가한다. criterion, category, omission, next review는 curation model의 서로 다른 section으로 유지하고 category project identifier는 renderer-aware link를 만들기 전에 해석하고 filtering한다. 전체 block을 `isSitePageEnabled`로 gating해 hidden content가 design-specific implementation을 통해 새어 나오지 않도록 하고 broken reference가 invalid project card를 만들지 않게 한다.

## style(cinematic): 여정 timeline과 답변 근거 구성

narrative milestone, chronological archive entry, current-position summary, interview evidence의 visual grammar를 정의한다. milestone의 state, reason, result는 병렬 fact로 제시하고 answer record는 별도의 evidence treatment를 사용해 linked project와 explanatory depth를 구분한다. curated turning point와 complete archive라는 서로 관련되지만 다른 두 history를 하나의 일반 list로 평평하게 만들지 않고 지원한다.

## feat(cinematic): 이력과 연락 route 구성

명시적인 reference resolution과 fallback을 갖는 Cinematic résumé 및 contact route를 구현한다. résumé project identifier는 link를 렌더링하기 전에 canonical project collection에서 해석하고 optional download와 note는 조건부로 유지하며, experience, training, education은 content model에서 각각 독립적으로 소유한다. contact link는 configured identifier를 우선 사용하되 preference list가 비어 있으면 contact placement link로 fallback해 route를 계속 사용할 수 있게 한다.

## style(cinematic): 인터뷰 근거와 반응형 동작 구성

Cinematic renderer 전체의 interaction 및 responsive behavior를 완성한다. 넓은 multi-column composition은 tablet/phone breakpoint에서 접고, viewport 제약상 부적절해지는 sticky project copy는 static으로 바꾸며, navigation은 native mobile disclosure로 전환하고 밀도 높은 evidence grid는 single-column reading flow가 된다. reduced-motion query는 transition, animation, smooth scrolling, image scaling을 제거해 visual treatment가 사용자의 motion preference를 덮어쓰지 않도록 한다.

## feat(cinematic-journey): 여정 archive 구성

Cinematic journey route를 서로 보완하는 두 history와 current-state conclusion으로 구현한다. curated milestone은 state, reason, result, evidence link를 렌더링하기 전에 anchor project identifier를 해석하고, archive는 모든 dated journey entry와 선택적 project navigation을 보여준다. milestone interpretation과 chronological record를 분리해 하나의 표현에 두 역할을 강요하지 않고 narrative meaning과 source completeness를 모두 보존한다.

## feat(cinematic-interview): 인터뷰 근거 map 구성

answer record를 canonical project와 join해 Cinematic interview-evidence map을 구현한다. 각 track은 source reference를 유지하고 question은 기록된 depth와 함께 mapped project evidence를 렌더링하며 unresolved identifier는 공용 no-evidence state로 처리한다. 빈 track이나 gap collection에도 명시적 fallback을 제공한다. 하나의 project lookup map으로 반복 join을 결정적으로 처리하고 마지막 gaps section에서 missing evidence를 숨기지 않고 드러낸다.

## feat(designs): Cinematic renderer 활성화

Cinematic을 완전한 selectable renderer로 활성화하고 module API를 route entry point로 제한한다. `CinematicRoute`는 공용 frame 안에서 모든 supported route를 dispatch하며 presentation metadata, palette swatch, lazy loading, module export, content-loader support가 모든 필수 boundary에서 같은 identifier를 등록한다. 이 contract를 함께 갱신해 노출되는 모든 Cinematic selection이 인식되고 load 가능하며 전체 route set을 렌더링할 수 있도록 한다.

## test(content): Vitest 기반 콘텐츠 계약 검증 추가

Vitest, jsdom, Testing Library를 사용해 portfolio content model에 실행 가능한 test boundary를 도입한다. suite는 source validation, identifier uniqueness, 완전한 5-design registry, asset-location rule, disabled/unresolved reference, internal-route validity, generic project metric, selection helper, chronological journey data, renderer/debug query propagation을 검증한다. 이를 data 및 selector contract로 테스트해 rendering 전에 inconsistency를 잡고, lockfile은 behavior를 정의하는 것이 아니라 추가된 test dependency resolution을 기록한다.

## test(routes): 홈과 route presentation 계약 검증

hard-coded snapshot 대신 canonical content와 presentation shell을 비교하는 route-level characterization test를 추가한다. Home은 다섯 design, default 및 invalid design selection, 공용 featured content, debug-state-preserving navigation을 모두 검사하고 Journey는 content-owned accessibility 및 milestone label을 검증한다. route matrix는 Classic shell, current-path-aware design link, 반복 query parameter의 first-value semantics도 고정해 renderer별 markup 차이는 허용하면서 공용 routing contract를 보호한다.

## test(ui): 디자인 선택과 프로젝트 링크 계약 검증

design selector와 project-link component의 interaction contract를 고정한다. selector test는 content-owned label, explicit close control과 navigation을 통한 native `details` 닫힘, focus 복원을 검증한다. project-link test는 source ordering, internal link의 renderer/debug propagation, external-link safety attribute, deployment 및 placement filtering, 빈 wrapper 생략을 검증한다. renderer-specific visual에 의존하지 않고 UI refactoring 중 잃기 쉬운 behavior를 보호한다.

## test(e2e): 다섯 디자인의 route matrix 검증

desktop 및 mobile Chromium에서 전체 5-design enabled-route matrix를 browser 수준으로 검증한다. Playwright suite는 navigation 성공, renderer root, shared content evidence, load된 project media, horizontal overflow 부재, route-preserving design switch, invalid-design fallback, reduced-motion behavior, mobile touch-target size, keyboard focus visibility, 제한된 design/navigation sheet를 검사한다. 두 device project가 동시에 cold route를 요청할 때 development compiler invalidation이 발생하지 않도록 worker 하나만 사용해 속도 대신 결정적인 route compilation을 선택하며, 생성된 dependency 변경은 Playwright 설치 결과만 기록한다.

## test(portfolio): selector와 presentation 회귀 계약 보강

public portfolio module surface와 ownership boundary를 위한 regression contract를 추가한다. test는 의도한 selector export를 열거해 우발적인 API 확장 또는 제거를 드러내고, 각 content read가 fresh project, project-link, global-link structure를 반환하는 한편 stable source collection은 shared 상태를 유지하는지 검증한다. caller가 안전하게 로컬에서 파생하거나 변경할 수 있는 data와 referential identity를 유지해야 하는 canonical validated content를 구분한다.

## refactor(routes): 홈 page context 통합

`resolvePortfolioPageContext`를 공통 page initialization의 단일 owner로 도입하고 Home을 이 경계로 migration한다. 타입이 지정된 current-path union, asynchronous query resolution, design fallback, debug parsing, content acquisition, 완전한 shell/switcher props를 한곳에서 구성한다. 이 boundary를 중앙화해 renderer/debug state 보존 방식이 route마다 달라지는 것을 막으면서 page-specific validation이 필요할 때 이미 로드된 content object를 caller가 주입할 수 있게 한다.

## refactor(projects): 프로젝트 page context 통합

project archive와 project-detail route를 모두 공용 page-context resolver로 migration한다. 각 route는 projects-page enablement check와 자체 project/metric 작업을 계속 수행하지만 design selection, debug parsing, shell construction, switcher current path는 하나의 source에서 가져오며 detail path에는 resolved project identifier를 포함한다. 앞서 로드한 content를 resolver에 전달해 두 번째 derived content graph를 만들지 않고 request 전체에서 reference를 일관되게 유지한다.

## refactor(routes): 소개와 학습 route context 통합

About, Journey, Interview Map에 공용 page-context boundary를 적용한다. route는 page-enable check, dedicated-renderer dispatch, 특화 curation/evidence logic을 그대로 유지하고 중복 query parsing과 `PageShell` construction만 제거한다. 서로 다른 domain content는 합치지 않으면서 site의 profile 및 learning-evidence route 전반에서 renderer selection과 current-path-aware design switching을 통일한다.

## refactor(routes): 이력과 연락 context 통합

Resume 및 Contact의 page-context migration을 완성한다. 두 route는 page availability 확인 후 selected project 또는 preferred contact link를 자체적으로 계속 해석하지만 다른 모든 route와 동일한 active design, debug state, shell props를 사용한다. route별 selection logic은 의도적으로 context helper 밖에 남겨 공통 request setup과 page-domain decision을 분리한다.

## refactor(ui): 프로젝트 링크 렌더링 중복 제거

detail 및 card link collection용 내부 `ProjectLinkList` renderer 하나를 추출하되 각 caller의 selection rule은 그대로 유지한다. empty collection, demo link의 visual priority, external/internal icon, focus style, renderer/debug propagation이 이제 하나의 구현을 공유한다. `ProjectLinks`와 `ProjectCardLinks`가 가진 서로 다른 filtering 책임을 합치지 않고 presentation drift만 제거한다.

## fix(ui): hydration 중 native details 상태 보존

native design-switcher `details` element를 의도적인 hydration boundary로 표시한다. server markup 도착 후 React가 attach되기 전에 사용자나 browser가 open state를 바꿀 수 있으므로 이 일시적인 DOM state를 server/client mismatch로 취급하면 오해를 부르는 diagnostic을 내거나 유효한 native state를 reset하도록 유도할 수 있다. owning element에서 warning만 억제해 disclosure의 현재 상태를 보존하고 hydration 이후 ref 기반 close 및 focus behavior는 그대로 유지한다.

## test(ui): details hydration 경쟁 조건 검증

design-switcher hydration race를 직접 재현하고 의도한 invariant를 고정한다. test는 component를 server-render한 뒤 hydration 전에 native `details`를 열고 같은 tree를 hydrate하며 mismatch diagnostic을 수집한 다음 open attribute가 유지되고 hydration error가 없는지 검증한다. 명시적인 unmount, spy restoration, DOM cleanup으로 regression test를 격리하고 이전 fix가 다룬 browser/React handoff를 정확히 확인한다.

## chore(runtime): 지원 Node.js와 npm 버전 고정

`.node-version`, `.nvmrc`, `packageManager`, package engines, lockfile metadata 전반에서 지원 runtime과 package manager version을 일관되게 고정한다. 모든 tool-discovery boundary에 Node.js 24.18.0과 npm 11.16.0을 선언해 local install, package resolution, automated verification이 우연히 설치된 version이 아니라 동일한 runtime contract로 수렴하도록 한다.

## test(e2e): production server 검증 경로 추가

development compiler가 아니라 최적화된 production artifact를 실행하는 end-to-end path를 추가한다. 새 command는 먼저 build한 뒤 격리된 port에서 `next start`를 실행하고 관계없는 server 재사용을 막으며 기존 desktop/mobile Playwright matrix를 해당 process에 대해 수행한다. 별도 production configuration을 유지해 local iteration용 빠른 development-server 설정은 보존하면서 build-time 및 production-serving failure를 드러낸다.

## ci: 기본 배포 품질 검사 추가

저장소에 고정된 toolchain을 사용해 deployment-quality CI gate를 구축한다. push와 pull request는 `npm ci`로 dependency를 재현 가능하게 설치한 뒤 lint, type check, content validation, production build, Chromium end-to-end suite의 성공을 요구한다. read-only permission, job timeout, superseded run 취소로 workflow 권한과 resource 사용을 제한하면서 local에서 검증한 동일한 production path를 integration 전에 강제한다.

## feat(content): 콘텐츠 mode와 readiness 오류 모델 추가

template content와 production-ready content를 구분하는 type 및 error model을 도입한다. mode가 없거나 비어 있거나 명시적으로 `template`이면 보수적으로 template contract로 해석하고 정확히 `production`일 때만 production mode를 활성화하며 지원하지 않는 값은 추측하지 않고 즉시 실패한다. structured readiness issue는 file 및 JSON-path context를 보존하고 aggregate error가 모든 failure를 formatting하며, discriminated result는 production mode에서만 parsed site URL을 요구한다. 이 commit은 이후 readiness check가 채울 protocol만 정의하고 실제 검사 자체는 아직 구현하지 않는다.

## feat(content): template placeholder 탐색 경계 추가

JSON source-to-file mapping을 중앙화하고 production content를 위한 recursive placeholder scanner를 추가한다. scanner는 array와 object를 순회하면서 JSON-style path를 기록해 readiness failure가 file 수준이 아니라 정확한 field를 가리키도록 한다. marker vocabulary와 traversal을 readiness layer에 두어 모든 content document에서 starter copy를 거부하는 하나의 재사용 boundary를 확립한다.

## feat(content): public origin과 자산 경계 검증 추가

public origin과 locally served asset에 production-specific validation을 추가한다. `SITE_URL`은 local도 아니고 credential도 포함하지 않으며 example용으로 예약된 host도 아닌 absolute HTTP(S) origin이어야 하고, production asset은 `public/content` 아래에 있어야 한다. 형식적으로는 valid한 build가 placeholder metadata나 development environment에서만 동작하는 reference를 publish하는 것을 막는다.

## feat(content): 공개 URL과 연락 링크 검증 추가

deploy 가능한 public URL과 contact link를 위한 재사용 predicate를 정의한다. public link는 placeholder text, malformed URL, non-HTTP protocol, reserved example host를 거부하고 contact link는 여기에 `mailto:`와 `tel:` scheme을 추가로 허용한다. predicate를 분리해 이후 readiness check가 public-origin rule을 느슨하게 하지 않고 project link와 contact channel에 각각 맞는 protocol policy를 적용할 수 있게 한다.

## feat(content): production readiness 기본 검사 추가

aggregate production-readiness validator를 도입한다. public site origin을 검증하고 모든 authoritative content file에서 template marker를 scan하며 전체 issue를 누적한 뒤 complete content set이 통과한 경우에만 discriminated production result를 반환한다. 하나의 failure에 모든 issue collection을 보고해 build gate를 실제 수정 가능하게 만들면서 production mode는 반드시 verified `URL`을 산출한다는 invariant를 유지한다.

## feat(content): 필수 자산과 프로젝트 readiness 추가

generic placeholder detection에서 portfolio-specific completeness까지 production readiness를 확장한다. production build는 public content boundary 아래의 social, profile, résumé asset과 최소 하나의 enabled project, production-hosted project screenshot, publish되는 모든 project에 대한 enabled public link를 요구한다. disabled project는 예외로 두어 editorial staging이 deployment를 막지 않게 하면서 모든 visible project는 사용 가능한 presentation asset과 exit path를 갖도록 보장한다.

## feat(content): 연락 수단과 build readiness 연결

production에서 enabled 상태이면서 placeholder가 아닌 contact method를 최소 하나 요구하고 mode-aware build-readiness entry point 하나를 노출한다. template mode에서는 publication requirement를 적용하지 않고 반환하며 production mode만 full validator에 위임한다. 동시에 internal helper를 module-private로 바꿔 public API를 content-mode resolver, production URL resolver, error type, build validation contract로 제한한다.

## build(content): readiness 검사를 prebuild에 연결

schema validation 이후 content readiness를 필수 prebuild gate로 만든다. 전용 script는 authoritative JSON source를 로드하고 선택된 content mode와 environment를 검증한 뒤 resolved mode 또는 production origin을 출력하며, readiness issue가 있으면 process를 실패 상태로 종료한다. template-mode development는 막지 않으면서 publication completeness를 선택적 검사에서 일반 build lifecycle의 일부로 옮긴다.

## feat(seo): 콘텐츠 mode별 metadata 정책 추가

validated site content와 선택된 content mode를 입력으로 하는 순수 metadata factory를 추가한다. 하나의 base URL에서 canonical, Open Graph, Twitter, 선택적 social-image metadata를 파생하고 indexing은 production mode에서만 활성화한다. 정책을 test 가능한 helper에 두어 starter/template deployment가 index되는 것을 막고 모든 absolute social URL이 같은 origin 계산을 사용하도록 한다.

## feat(seo): 콘텐츠 mode별 robots 정책 추가

readiness 및 metadata와 동일한 content-mode contract를 사용해 `robots.txt`를 생성한다. template deployment는 모든 crawler를 차단하고 production deployment는 명시적으로 검증된 host를 알리며 indexing을 허용한다. production URL이 없으면 programming error로 취급한다. 서로 무관한 static configuration에 의존하지 않고 crawler policy를 page-level robots metadata와 일치시킨다.

## feat(seo): layout metadata를 콘텐츠 mode에 연결

root layout을 mode-aware metadata policy에 연결한다. production metadata는 proxy/request header에 의존하지 않고 validated `SITE_URL`에서 base를 가져오며, template mode에서는 local preview를 위해 request-derived origin을 유지한다. metadata factory에 생성을 위임해 canonical, social, indexing behavior를 build-readiness decision과 일치시킨다.

## test(content): readiness와 indexing 계약 검증

전체 readiness 및 indexing contract에 regression coverage를 추가한다. test는 permissive template mode와 strict production mode를 구분하고 validation이 서로 독립적인 여러 content category의 문제를 한 번에 보고하는지 확인하며, 완전히 준비된 source는 허용하고 malformed 또는 non-public origin은 거부한다. page metadata와 `robots.txt` policy의 일치도 검증한다. 저장소의 template에서 production-ready fixture를 만들어 두 mode 사이의 의도한 전환도 확인한다.

## test(e2e): 콘텐츠 mode별 metadata와 robots 검증

metadata helper만 테스트하지 않고 실제 실행 중인 애플리케이션을 통해 indexing policy를 검증한다. browser assertion은 렌더링된 robots meta tag를, HTTP assertion은 `robots.txt`를 검사하고 active content mode에 따라 기대값을 선택한다. environment configuration, Next.js metadata route, crawler가 최종적으로 보는 response 사이의 integration을 보호한다.

## fix(font): 빌드용 글꼴과 출처를 저장소에서 제공

build-time Google Font fetching을 저장소가 소유하는 WOFF2 asset과 `next/font/local` 등록 방식으로 교체한다. layout은 기존 CSS variable을 유지하면서 관련 Korean serif face에 Source Han Serif KR을 사용해 design style의 기존 contract를 보존한다. upstream version, checksum, OFL notice를 기록해 offline build를 재현 가능하게 만들고 재배포 조건을 binary와 함께 저장한다.

## test(font): 로컬 글꼴과 license 경계 검증

self-contained font build contract를 고정한다. test는 root layout의 모든 Google Fonts dependency를 거부하고 설정된 asset이 실제 WOFF2 file인지 확인하며 해당 SIL OFL notice가 저장소에 계속 존재하는지 검증한다. 이후 styling 변경이 network-dependent build를 다시 들여오거나 재배포 font와 license를 분리하는 것을 막는다.

## fix(build): production build에 webpack compiler 고정

production build가 local development에서 이미 사용하는 webpack compiler를 명시적으로 선택하도록 한다. script boundary에서 compiler를 고정해 framework default에 의존하지 않고 프로젝트의 기존 configuration 및 asset에 대해 development와 production compilation path를 일치시킨다.

## feat(seo): route별 검색 metadata 정책 추가

route별 canonical, Open Graph, Twitter metadata를 위한 공용 factory를 도입한다. non-root page에는 brand-qualified title과 명시적인 canonical path를 부여하고 home page는 site title과 root URL을 유지한다. 이 정책을 중앙화해 route마다 title composition, social image, content type, canonical identity가 달라지는 것을 막는다.

## feat(seo): 홈과 프로젝트 route metadata 연결

공용 metadata policy를 home page, project index, statically generated project detail에 적용한다. project metadata는 rendering에서 사용하는 enabled-page 및 project lookup rule과 동일한 규칙으로 파생하므로 disabled route와 unknown project identifier는 고아 search metadata를 publish하지 않고 계속 `notFound`가 된다. detail page는 stable project ID에 연결된 canonical URL을 가진 article로 표현한다.

## feat(seo): 프로필 route metadata 연결

about, contact, resume route에 content-derived metadata를 추가한다. 각 generator는 먼저 route의 enabled-page gate를 강제하고 그다음 page의 authoritative profile, contact, presentation copy를 title과 description에 재사용한다. 별도의 static SEO string 집합을 유지하지 않고 search presentation을 route가 실제 렌더링할 수 있는 내용과 일치시킨다.

## feat(seo): 여정과 근거 route metadata 연결

journey 및 interview-map route를 공용 metadata factory에 연결한다. description은 narrative 및 evidence content model에서 가져오고 해당 site page가 enabled일 때만 출력한다. availability contract를 우회하지 않고 같은 canonical 및 title policy를 특화 route까지 확장한다.

## feat(seo): 공개 route sitemap 생성

validated production origin과 현재 content configuration이 실제로 노출하는 route를 사용해 `sitemap.xml`을 생성한다. template mode에서는 entry를 하나도 반환하지 않고 disabled optional page는 제외하며 project detail URL은 enabled project ID에서 파생한다. production `robots.txt`도 생성된 sitemap을 알린다. 고정되어 오래될 수 있는 route 목록 대신 rendering 및 indexing과 동일한 publication boundary를 crawl discovery에 적용한다.

## feat(seo): JSON-LD 안전 직렬화 경계 추가

JSON-LD를 embed하기 위한 전용 component와 serializer를 추가한다. structured data는 한 번만 serialize하고 script element에 할당하기 전에 `<`, `>`, `&`를 escape해 content가 주변 HTML script context를 종료하거나 변조하지 못하게 한다. 안전 규칙을 재사용 component 뒤에 두어 route마다 임시 `JSON.stringify`를 반복하지 않게 한다.

## feat(seo): 사이트 소유자 JSON-LD 모델 추가

portfolio owner와 website를 연결된 Schema.org graph로 모델링한다. stable fragment identifier가 `WebSite`의 author를 `Person`과 연결하고 name, role, summary, language, image, canonical URL은 validated portfolio content에서만 가져온다. optional profile field는 존재할 때만 출력해 structured representation이 누락된 claim을 임의로 만들지 않는다.

## feat(seo): production layout에 사이트 JSON-LD 연결

production content에서만 root layout에 site-level structured-data graph를 embed한다. layout은 canonical metadata와 동일한 validated public origin을 해석하고 template mode에서는 JSON-LD를 완전히 생략해 starter identity가 machine-readable fact로 노출되는 것을 막는다. graph를 layout boundary에서 한 번만 배치해 route마다 owner 및 website entity를 중복하지 않는다.

## feat(seo): 프로젝트 CreativeWork JSON-LD 모델 추가

authoritative project 및 site model에서 파생한 project-level `CreativeWork` 표현을 추가한다. record는 canonical project URL과 fragment ID를 사용하고 site owner로 다시 연결되며 summary, screenshot, language, tag, title처럼 content source가 지원하는 field만 담는다. rating, award 등 원문 content에 없는 사실을 주장하지 않고 route별 structured data를 제공한다.

## feat(seo): 프로젝트 상세에 JSON-LD 연결

dedicated-design 및 fallback project-detail view 모두에 project `CreativeWork` JSON-LD를 함께 렌더링한다. structured data는 page availability와 project 존재 여부가 검증된 뒤에만 만들고, configured public origin을 사용하는 production mode에서만 생성한다. 두 rendering branch를 동일하게 감싸 selected visual implementation과 관계없이 하나의 machine-readable contract를 유지한다.

## test(seo): route metadata export 검증

공용 factory만 테스트하지 않고 모든 public route의 실제 metadata export를 검증한다. suite는 canonical path, content-derived title/description, 실제 project ID를 key로 한 project-detail metadata를 검사한다. helper 자체가 올바르더라도 page가 metadata export를 중단하거나 잘못된 route의 content를 공급하는 wiring regression을 잡는다.

## test(seo): route metadata와 sitemap 계약 검증

canonical route metadata와 sitemap publication에 집중된 coverage를 추가한다. test는 query가 없는 canonical path를 요구하고 template mode가 sitemap entry를 publish하지 않는지 확인하며, production output에는 enabled page와 project detail이 포함되고 disabled route는 제외되는지 검증한다. search discovery를 애플리케이션이 사용하는 동일한 content-availability configuration에 고정한다.

## test(seo): JSON-LD 계약과 직렬화 검증

structured data의 semantics와 embedding safety를 함께 보호한다. test는 연결된 `Person` 및 `WebSite` record를 검사하고 project `CreativeWork` data가 지원되지 않는 claim을 포함하지 않도록 하며, closing-script payload를 재현해 markup에 의미가 있는 문자가 escape되는지 확인한다. schema drift와 script-context injection regression을 모두 막는다.

## feat(site): 사용자 정의 404 페이지 추가

home page로 돌아가는 명시적 route를 갖는 portfolio-styled not-found page를 제공한다. 공용 shell과 현재 content identity를 재사용해 invalid 또는 disabled route에서도 site의 navigation context를 유지하고, page-level robots metadata로 error page 자체는 indexing되지 않게 한다.

## test(site): 404 복귀 동선 검증

custom not-found page가 primary heading으로 error를 전달하고 `/`로 돌아가는 semantic link를 노출하는지 검증한다. presentation detail보다 recovery path를 보호해 이후 redesign에서도 invalid route에 사용자가 고립되지 않도록 한다.

## refactor(content): 홈 route view model 경계 추가

content boundary에서 presentation-ready selection을 한 번만 계산하는 전용 home-route view model을 도입한다. featured fallback, lead project, metric value, current year, recent journey entry, placed link, preferred contact를 design마다 재계산하지 않고 중앙에서 파생한다. 관련 없는 root collection을 비우기 시작해 home renderer가 소비할 수 있는 범위를 제한하고, route discriminant로 route-specific rendering의 type-level 기반을 마련한다.

## refactor(content): 프로젝트 목록 파생 모델 추가

rendering 전에 featured/archive partition, project group, metric value를 해석하는 projects-route view model을 추가한다. configured group order와 metadata는 authoritative하게 유지하고 빈 configured group은 생략하며, 설정되지 않은 group ID를 가진 project도 조용히 버리지 않고 결정적인 fallback group으로 보존한다. 이 projection을 중앙화해 모든 design에 동일한 project taxonomy를 제공한다.

## refactor(content): 상세와 소개 파생 모델 추가

route-model boundary를 project detail과 about page로 확장한다. project detail은 action link, unknown ID에 안전한 fallback이 있는 stack metadata, secondary screenshot을 해석하고 unknown project에는 `null`을 반환한다. About curation은 indexed lookup으로 project reference를 해석하고 missing reference를 생략한다. 이 builder가 cross-file identifier를 하나의 제어된 boundary에서 renderer-ready object로 변환한다.

## refactor(content): 이력과 연락 파생 모델 추가

resume 및 contact route projection을 추가하고 route model을 discriminated union으로 결합한다. Resume project ID는 존재하는 project object로 해석하고, contact link precedence는 한 번만 계산해 preferred link를 우선 사용하고 contact placement link를 fallback으로 제공한다. 생성된 union으로 이후 API가 각 route literal을 해당 route에 정확히 필요한 data shape와 연결할 수 있다.

## refactor(routes): renderer view model 요청 타입 추가

각 route literal을 대응하는 view-model variant와 짝지은 typed migration request를 도입한다. registry는 새 discriminated request 또는 legacy renderer props를 모두 받고, detail route에서만 project를 추출하는 방식까지 포함해 view model을 기존 component contract로 다시 adapt한다. 이 compatibility layer로 route-to-model type correlation을 잃지 않고 renderer를 점진적으로 migration할 수 있다.

## refactor(renderers): footer 링크 파생 모델을 호환

route view model이 precomputed `footerLinks`를 제공하면 Brutalist, Cinematic, Editorial shell이 이를 사용하도록 하고 raw content에 대한 legacy filtering path도 유지한다. 이 작은 adapter는 staged migration 중 현재 rendering을 보존하고 projected content가 사용 가능해진 뒤 각 design이 동일한 placement rule을 다시 계산하지 않게 한다.

## refactor(home): 공용 홈에서 파생 view model 사용

route boundary에서 home view model을 만들고 공용 Classic 및 Design home component가 파생 field를 사용하도록 migration한다. featured project, hero/contact link, metric value, project count를 개별 component가 더 이상 재계산하지 않는다. rendered behavior를 유지하면서 home selection semantics의 단일 owner를 route projection으로 만든다.

## refactor(renderers): 홈 renderer 파생 값을 연결

home view model을 design registry를 통해 전달하고 dedicated Brutalist, Cinematic, Editorial renderer가 featured-project fallback, metric, recent journey entry, preferred link, count, capture한 year를 사용하도록 수정한다. 계산을 renderer implementation 밖으로 이동해 모든 design의 결과를 일치시키고 time-dependent output을 model construction 시점에 명시적으로 만든다.

## refactor(projects): 프로젝트 목록 파생 모델 사용

`/projects` route에서 project-index view model을 구성하고 shared renderer가 featured/archive grouping 및 metric projection을 사용하도록 한다. route가 grouping 또는 metric selector logic을 더 이상 반복하지 않으므로 fallback template과 dedicated design 모두 동일한 resolved project set과 count를 소비한다.

## refactor(renderers): 프로젝트 목록 파생 값을 연결

project-index view model을 dedicated renderer에 전달하고 각 renderer의 local grouping 및 metric derivation을 제거한다. Brutalist와 Editorial은 이제 model의 resolved group 및 metric value를 렌더링해 configured ordering, fallback group, count를 renderer마다 재해석하지 않고 design 전반에서 동일하게 유지한다.

## refactor(projects): 상세 route 파생 데이터를 준비

route boundary에서 `createProjectDetailViewModel`을 통해 project detail을 해석한다. missing project는 model의 명시적인 `null` 결과를 따라 404 path로 이동하고, downstream rendering과 metadata는 같은 resolved project 및 page copy를 공유한다. 모든 renderer에 하나의 일관된 projection을 전달할 준비를 한다.

## refactor(renderers): 상세 프로젝트 근거 데이터를 연결

project-detail view model을 registry로 전달하고 dedicated renderer가 model에서 해석된 link, stack item, supporting image를 사용하도록 migration한다. 반복적인 identifier lookup과 stack match가 반드시 non-null이라는 위험한 가정을 제거한다. 모든 design은 이제 같은 fallback label과 lead image를 supporting gallery에서 제외하는 동일한 규칙을 공유한다.

## refactor(about): 큐레이션 파생 모델을 route에 적용

route boundary에서 about view model을 만들고 shared/dedicated renderer가 해석된 curation category를 사용하도록 migration한다. project-reference lookup과 missing-reference filtering을 각 design 내부에서 독립적으로 수행하지 않아 category order와 membership이 하나의 content-layer rule을 따른다.

## refactor(routes): 이력과 연락 파생 데이터를 연결

resume 및 contact projection을 각 route boundary에 적용하고 모든 renderer로 전달한다. Resume project ordering과 unknown-reference omission, preferred-contact fallback behavior를 visual design마다 다시 구현하지 않고 한 번만 계산한다. registry에서 남은 raw-content request는 아직 migration하지 않은 route로 범위를 좁힌다.

## test(content): route view model 파생 규칙 검증

모든 route projection에 집중된 test를 추가한다. suite는 중복 없는 configured project-group order, missing-project behavior, stack/image resolution, curation/resume reference filtering, reference order 보존, contact fallback precedence, home model의 명시적 time injection을 고정한다. 특정 renderer implementation이 아니라 semantic boundary를 보호한다.

## test(design): view model 기반 renderer matrix 검증

migration한 여섯 route를 사용 가능한 다섯 design 전체에 compatibility matrix로 렌더링한다. 각 case는 요청된 design boundary와 의미 있는 page heading을 유지해야 하며, route-model migration이 registry, route selection, 어떤 design의 기본 HTML contract도 깨뜨리지 않았는지 integration 수준에서 검증한다.

## build: standalone server 산출물 생성

Next.js가 standalone server bundle을 생성하도록 설정한다. build output에 전체 development dependency tree를 포함하지 않고도 애플리케이션을 시작하는 데 필요한 traced runtime file이 들어가며, 이후 container 및 deployment check가 사용하는 artifact boundary를 확립한다.

## test(build): standalone 산출물 완전성 검증

standalone server entry point와 static asset directory에 대한 명시적 post-build check를 추가한다. 둘 중 하나라도 없으면 실패하도록 해 deployment layout을 암묵적인 Next.js 가정에서 검증 가능한 build contract로 바꾼다.

## ci: standalone 산출물 검증 추가

production end-to-end build 이후 CI에서 standalone artifact check를 실행한다. deployment completeness를 local opt-in 검사에서 필수 pipeline property로 승격한다.

## fix(a11y): 디자인별 색상 대비 보정

light 및 dark surface 모두에서 accent text를 구분할 수 있도록 shared 및 Editorial color token을 조정한다. dark-surface vermilion을 일반 text token과 분리해 한 context를 개선하면서 다른 context를 악화시키지 않고 evidence, architecture, curation, gap label에 수정 사항을 일관되게 적용한다.

## fix(a11y): skip link focus target 복원

각 main-content landmark에 `tabIndex={-1}`을 적용해 programmatically focusable하게 만든다. skip link가 viewport만 scroll하는 것이 아니라 keyboard focus도 실제 main landmark로 이동할 수 있어 shared, Cinematic, Editorial shell 전반에서 기대되는 navigation behavior를 복원하면서 landmark는 normal tab order에 들어가지 않는다.

## fix(a11y): Brutalist 지표의 definition semantics 수정

Brutalist metric block에서 모든 descriptive value를 관계없는 paragraph 대신 definition list 내부의 `<dd>`로 표현하도록 수정한다. 대응 selector도 강한 value typography를 상속하지 않고 해당 semantic description을 명시적으로 스타일링한다. shell의 main landmark도 programmatically focusable하게 만들어 visual presentation은 유지하면서 이 design의 skip-link focus contract를 완성한다.

## test(a11y): 디자인×route WCAG 행렬 추가

design 다섯 개에서 모든 enabled route를 실행하는 end-to-end accessibility matrix를 추가한다. 각 case는 성공 response, selected design boundary, 정확히 하나씩의 banner/main/content-info landmark, configured WCAG 2.x A/AA rule set에 대한 clean Axe scan을 검증한다. 별도 keyboard path는 skip link가 tab order의 첫 항목이고 main landmark로 focus를 이동하는지 확인한다. 공용 design 및 route fixture로 기존 site matrix와 suite를 맞추며 lockfile은 새 Axe integration dependency만 기록한다.

## refactor(content): 여정 근거 view model 추가

renderer에 도달하기 전에 content reference를 해석하는 journey-specific view model을 도입한다. milestone anchor identifier는 존재하는 project로 변환하고 unknown reference는 생략하며, optional timeline project는 matching project 또는 명시적인 `null`로 해석한다. route projection에서 전체 project collection을 제외해 journey renderer가 global content lookup이 아니라 실제 소유한 evidence relationship에만 의존하도록 한다.

## refactor(content): 인터뷰 근거 view model 추가

track, question, answer hierarchy를 보존하면서 각 answer의 project identifier를 project object 또는 `null`로 해석하는 interview-map view model을 도입한다. cross-reference 처리를 renderer마다 반복하지 않고 content projection layer가 담당하며 unsafe assertion 없이 missing evidence도 표현할 수 있다. route model에서 raw project collection을 제외해 consumer가 prepared evidence boundary를 우회하지 못하게 한다.

## style(designs): route renderer 디자인 토큰 확장

design token layer를 color에서 display typography, body scale, section rhythm, motion timing, navigation stacking, content width까지 확장한다. 값은 `data-site-design`으로 scope를 제한해 component-level conditional 없이 공용 route-renderer markup이 다섯 개의 독립적인 visual system을 표현할 수 있다. route-renderer width override가 이 넓어진 token contract를 처음 사용한다.

## refactor(shell): 디자인 renderer 셸 경계 추가

공용 `design` 및 `classic` renderer를 위한 prepared shell-props boundary를 추가한다. helper는 route view model에서 profile, site, presentation, switcher, debug state를 파생하고 page shell에 active route-renderer identity를 표시한다. 개별 route가 같은 framing contract를 다시 조립하지 않도록 shell assembly를 중앙화하고 design-scoped CSS에 안정적인 boundary를 제공한다.

## feat(design-home): 홈과 대표 프로젝트 행동 동선 추가

design home route의 hero 및 featured-project boundary에서 project index로 가는 명시적인 navigation을 추가한다. 두 link 모두 template-aware URL helper를 사용해 internal navigation 후에도 selected design과 content-debug mode를 보존한다. landing page의 주요 presentation 영역을 portfolio의 상세 evidence로 들어가는 일관된 entry point로 만든다.

## feat(design-home): 작업 지표 지도 추가

work-map presentation을 design home renderer 내부로 이동하고 home view model이 미리 계산한 metric value로 구동한다. card configuration은 계속 content가 소유하고 renderer는 각 declared count key를 numeric value에 매핑하되 보수적인 0 fallback을 사용한다. composition을 local로 유지해 view에서 raw project counting을 다시 도입하지 않고 route 전용 visual treatment를 적용할 수 있다.

## feat(design-home): 기술 집중 영역 추가

technical-focus section을 design home renderer 내부로 이동하고 validated focus-area content로 구성한다. 각 card는 content-debug mode에서 source hint를 유지하고 route의 reveal sequence에도 참여한다. 실제 technical claim은 content model에 남겨 둔 채 renderer가 layout과 interaction을 local에서 제어할 수 있게 한다.

## feat(design-home): 선택 기술 스택 구성

selected-stack composition을 design home renderer 내부로 이동한다. marquee는 configured skill group이 참조하는 technology로 제한하고 각 group은 공용 stack list로 ordered identifier를 렌더링하며 content debug hint를 보존한다. group configuration에서 visible set을 파생해 관련 없는 catalog entry가 나타나는 것을 막고 section을 portfolio에 선언된 skill taxonomy와 일치시킨다.

## feat(design-home): 여정 근거 영역 추가

journey evidence section을 design home renderer 내부로 이동하고 prepared home journey item으로 구성한다. route는 paired centerline presentation을 선택하고 template-aware case-study link를 유지하며 공용 journey list를 통해 content-debug source hint를 전달한다. timeline behavior를 중복하지 않고도 design renderer가 section framing을 제어할 수 있다.

## feat(design-home): 연락 미리보기 동선 추가

contact preview를 design home renderer로 이동하고 view model의 preferred contact link를 primary action으로 사용한다. section은 current availability와 direct contact method를 결합하고 full contact route로 가는 template-aware link를 제공하며 navigation 전반에서 content-debug hint와 selected design을 보존한다.

## refactor(design-home): 홈 섹션 순서를 콘텐츠로 연결

알려진 section을 hard-coded component order로 검사하지 않고 content의 validated section identifier를 순회해 design-home section을 렌더링한다. 타입이 지정된 `HomeSection` dispatcher는 각 identifier를 해당 renderer에 매핑하고 지원하지 않는 값에는 아무 것도 반환하지 않는다. section inclusion과 ordering을 하나의 content-owned contract로 만들면서 실제 rendering implementation은 명시적으로 유지한다.

## refactor(routes): Design 홈 renderer로 위임

design home implementation을 공용 prepared route contract를 받는 route renderer로 전환한다. discriminated view model을 `home`으로 좁히고 공용 shell props를 한곳에서 파생하며, shell state를 내부에서 조립하지 않고 page boundary로부터 current path를 받는다. page는 route loading 및 selection 책임을 유지하고 presentation은 design module에 위임한다.

## refactor(design-home): renderer 선언 순서 정리

rendered structure나 data flow를 바꾸지 않고 design-home declaration 순서를 재배치하고 일부 line break를 정규화한다. 관련 helper 및 section implementation이 route의 composition order를 따르도록 해 큰 renderer를 탐색하기 쉽게 만든다.

## refactor(routes): Design 프로젝트 목록 renderer로 위임

design project-index route의 조립을 renderer module로 이동한다. renderer는 route view model을 좁히고 shell, page copy, grouped archive entry, featured project, metric fallback을 내부에서 파생하며 Next.js page는 공용 route contract로 위임만 한다. loading과 not-found behavior는 page layer에 남기고 presentation-specific composition은 design module이 소유하도록 한다.

## feat(design-project): 프로젝트 상세 히어로 추가

template를 보존하는 return link, source hint, project availability, summary, description, external link, priority screenshot을 포함하는 design project-detail hero를 추가한다. 사용자는 이미 해당 route에 있으므로 project action에서는 case-study self-link를 의도적으로 제외한다. evidence section을 구성하기 전에 detail page의 identity 및 navigation contract를 확립한다.

## feat(design-project): 상세 섹션 프리미티브 추가

title이 있는 2-column narrative section과 반복 evidence list를 위한 작은 presentation primitive를 추가한다. eyebrow/title hierarchy와 list-card structure를 중앙화해 각 content category를 semantic section 또는 list로 유지하면서 project-detail body의 시각적 일관성을 확보한다. layout markup을 중복하지 않고 여러 project evidence field를 처리할 준비를 한다.

## feat(design-project): 프로젝트 근거 본문 구성

project의 problem, solution, architecture, screenshot, stack, decision, highlight, trade-off, result로 design project-detail body를 구성한다. presentation label은 route copy에서, evidence는 selected project에서 가져오고 combined content hint가 두 source를 모두 기록한다. section primitive와 공용 stack/screenshot component를 재사용해 서로 다른 evidence type을 일반 prose로 합치지 않고 long-form case study를 구조화한다.

## refactor(routes): Design 프로젝트 상세 renderer로 위임

design project-detail module을 완전한 route renderer로 만든다. discriminated model을 좁히고 shell state와 project-detail copy를 파생하며 hero/body composition을 소유한다. Next.js page는 JSON-LD output과 route-level not-found handling을 유지하면서 renderer에 위임한다. 내부 section helper는 renderer private로 바꿔 routing, structured metadata, visual presentation 사이의 경계를 강화한다.

## refactor(design-project): renderer 선언 순서 정리

project-detail renderer의 private declaration을 재배치해 route, hero, body가 supporting section primitive보다 먼저 나타나도록 한다. 동시에 import order와 compact prop signature를 정규화한다. rendered output과 data flow는 변경하지 않는다.

## feat(design-about): 큐레이션 프로젝트 카드 추가

각 category의 rationale와 about view model에서 이미 해석된 project를 함께 보여주는 curation-category card를 추가한다. 빈 category도 유효하며 project-list markup만 생략하고, populated category는 template-aware URL helper를 통해 link하면서 content-debug mode를 유지한다. reference resolution은 renderer 밖에 두고 card는 curation presentation만 담당한다.

## feat(design-about): 큐레이션 기준과 범주 구성

validated curation data와 route-specific presentation copy로 about page의 curation section을 구성한다. selection criterion과 categorized project evidence를 분리하고 prepared category view model을 재사용하며 두 content layer 모두 source hint를 보존한다. renderer는 어떤 project를 보여주는지만이 아니라 그 project를 선택한 policy까지 설명한다.

## feat(design-about): 큐레이션 생략과 재검토 기준 추가

curation section에 명시적인 omission reason과 next review condition을 추가한다. absent project를 설명하지 않은 채 두는 대신 non-selection과 future reconsideration을 curation model의 first-class 요소로 만든다. renderer는 current exclusion을 criterion list로, next review를 하나의 review boundary로 두어 두 개념을 시각적으로 분리한다.

## feat(design-about): 소개와 개발 원칙 구성

route discriminator, shared shell assembly, profile hero, optional photo, development-principle card를 갖는 Design about-route renderer를 만든다. content claim은 profile data에 유지하고 heading 및 section label은 about-page presentation copy에서 가져오며 debug hint로 두 source를 모두 보여준다. 나머지 evidence section을 연결하기 전에 route identity와 shell boundary를 확립한다.

## feat(design-about): 여정과 기술 역량 구성

Design about route를 evidence-oriented journey 및 skills section으로 확장한다. journey는 prepared cross-content projection을 사용해 case-study link가 template/debug context를 유지하고, skill focus area와 grouped stack은 validated skill data에서 직접 렌더링한다. narrative copy, source hint, resolved route data를 분리해 component에서 reference를 해석하지 않고도 progression과 현재 technical capability를 함께 설명한다.

## refactor(routes): Design 소개 renderer로 위임

application page에는 content loading과 template dispatch 책임을 남기고 Design about page의 presentation을 dedicated route renderer에 위임한다. renderer에 experience history와 site page-availability policy로 보호되는 curation section을 추가해 disabled optional content가 우발적으로 노출되지 않게 한다. route module은 전체 Design presentation을 소유하고 내부 curation helper는 implementation private로 유지한다.

## feat(design-resume): 이력서 소개와 요약 구성

prepared resume view model과 공용 shell contract를 기반으로 Design resume renderer를 만든다. hero는 presentation copy와 profile identity, location, availability, optional download action을 결합하고 resume summary를 source까지 추적 가능한 statement로 렌더링한다. route discriminator가 incompatible projection 소비를 막고 optional download는 asset이 없을 때 dead action이 생기는 것을 방지한다.

## feat(design-resume): 대표 프로젝트와 교육 과정 추가

Design resume에 selected-project 및 training evidence를 추가한다. project는 resume view model에서 이미 해석된 reference를 사용하고 제한된 stack preview를 보여주며 template/debug state를 잃지 않고 case study로 연결한다. training은 독립적인 structured resume data로 유지한다. resume를 간결하게 유지하면서 요약 claim에서 더 자세한 project evidence로 이동할 경로를 제공한다.

## refactor(routes): Design 이력 renderer로 위임

Design resume page를 dedicated renderer에 위임하고 optional experience, education, notes section으로 route를 완성한다. 각 collection은 data가 있을 때만 렌더링해 빈 heading을 만들지 않으면서 work history, formal education, training, supplemental note의 차이를 보존한다. application route는 content preparation과 design selection을 유지하고 Design-specific composition은 renderer가 소유한다.

## feat(design-contact): 연락 가능성과 링크 구성

profile-aware introduction, availability statement, preferred contact action, contextual note를 갖는 Design contact route를 만든다. preferred link는 contact view model이 제공하고 공용 content-link component로 렌더링해 internal/external target의 기존 behavior를 유지한다. preferred link가 없으면 사용할 수 없는 contact surface를 보여주는 대신 명시적 empty state를 표시한다.

## refactor(routes): Design 연락 renderer로 위임

application route에서 page availability, content, template, debug context를 해석한 뒤 Design contact page를 dedicated renderer에 위임한다. 다른 template이 사용하는 fallback renderer path는 변경하지 않으면서 generic route에서 Design-specific composition을 제거한다.

## feat(design-journey): 여정 마일스톤 카드 추가

prepared journey narrative model을 위한 milestone card를 추가한다. 각 entry는 state, reasoning, result를 definition list로 표현해 label과 evidence의 semantic relationship을 보존하고, optional anchor project를 해석한 뒤 template-aware case-study link를 렌더링한다. project evidence가 없는 milestone도 유효하며 link list만 생략한다.

## feat(design-journey): 여정 서사와 근거 목록 구성

narrative introduction과 ordered milestone evidence를 중심으로 Design journey route를 만든다. renderer는 journey-specific projection을 소비하고 shared shell construction을 사용하며 presentation order에 따라 milestone을 numbering한다. project-reference resolution은 view model에 맡긴다. 상위 career narrative와 재사용 가능한 milestone-card representation을 분리한다.

## refactor(routes): Design 여정 renderer로 위임

명시적으로 생성한 journey view model을 사용해 Design journey page를 dedicated renderer에 위임한다. detailed timeline과 current-position section을 추가해 route를 완성하고 chronological evidence에는 paired-centerline journey list를 재사용하며 milestone helper는 private로 유지한다. page route는 data preparation과 presentation selection을, renderer는 전체 Design narrative를 소유한다.

## feat(design-interview): 인터뷰 트랙 표 구조 추가

각 interview-evidence track을 표현하는 semantic table structure를 도입한다. track metadata, item count, source hint 옆에 question, answer, depth 관계를 정의하는 column header를 가진 table을 배치한다. 비어 있는 body는 answer row를 연결하기 전에 presentation contract 자체를 먼저 명확히 확립한다.

## feat(design-interview): 프로젝트 답변과 심화 근거 추가

interview-track table에 source reference, project-backed answer, depth explanation을 채운다. resolved project는 template 및 debug state를 보존한 채 case study로 연결하고, unresolved identifier는 사라지지 않고 그대로 표시해 incomplete evidence를 명확히 드러낸다. 각 table row에서 answer와 depth list를 정렬해 question을 뒷받침하는 project와 주장하는 detail level의 대응 관계를 유지한다.

## feat(design-interview): 트랙 탐색과 근거 페이지 구성

introduction, external reference repository, in-page track index, prepared evidence table을 갖는 Design interview-map route를 만든다. stable track ID가 index와 section anchor를 연결하고 route discriminator와 shared shell이 renderer를 기존 design contract 안에 유지한다. UI에서 project-reference resolution을 중복하지 않고 topic별로 page를 빠르게 탐색할 수 있다.

## refactor(routes): Design 인터뷰 renderer로 위임

interview-specific view model을 기반으로 Design interview-map page를 dedicated renderer에 위임한다. 명시적으로 label이 붙은 gaps section을 추가해 project-backed answer와 함께 unsupported 또는 incomplete area를 보여주고 complete coverage를 암시하지 않도록 evidence page를 완성한다. route module은 content preparation과 renderer selection을 유지하고 track composition은 Design implementation private로 둔다.

## refactor(design): Design route dispatcher 추가

route discriminator를 대응하는 dedicated renderer에 매핑하는 단일 Design route dispatcher를 추가한다. Design template의 route surface를 하나의 component contract 뒤에 통합하고 supported route union 전체에 대한 switch를 exhaustive하게 만든다. project-list renderer도 동일한 flat module boundary로 이동해 모든 Design route를 일관된 방식으로 import할 수 있게 한다.

## refactor(classic-home): 홈 renderer를 독립 모듈로 이동

다른 design과 같은 prepared route contract를 받는 dedicated route renderer 뒤로 Classic home composition을 이동한다. renderer가 shell construction, content-driven section ordering, 그리고 기존 global portfolio component로 노출되던 Classic 전용 contact, journey, stack, focus, work-map section을 소유한다.

이 presentation detail을 Classic module 안에 유지해 application page의 template-specific coupling을 제거하면서 기존 section visibility와 navigation behavior는 보존한다.

## refactor(classic-projects): 프로젝트 목록 renderer를 이동

prepared projects view model에서 shell, copy, metric, featured project, archive group을 파생하는 route-level renderer 뒤로 Classic projects page를 이동한다. application route는 더 이상 이 값을 Classic-specific prop으로 분해하지 않는다.

terminal, lead-project, archive presentation concern을 template private로 유지하면서 Classic을 다른 renderer와 동일한 discriminated route boundary에 맞춘다.

## refactor(classic-project): 상세 본문 프리미티브를 이동

Classic project-detail view와 section primitive를 Classic design module로 옮긴다. screenshot, link, badge, stack rendering 같은 공용 요소는 common component layer에 남기고 2-column 및 list-section composition은 이를 정의하는 template private로 만든다.

rendered project evidence를 바꾸지 않고 재사용 content primitive와 Classic-specific page structure를 분리한다.

## refactor(classic-project): 상세 renderer를 독립 모듈로 완성

route discrimination, shell construction, project hero/body composition을 design module이 담당하도록 해 Classic project-detail boundary를 완성한다. Next.js page는 project lookup과 structured-data emission을 유지하고 prepared detail view model 및 route context를 renderer에 전달한다.

renderer를 private hero/body section으로 분리해 metadata 및 JSON-LD 책임은 application route에 남기면서 presentation ownership을 Classic 내부에 유지한다.

## refactor(classic-about): 소개 renderer를 독립 모듈로 이동

완전한 Classic about 및 curation presentation을 application route에서 dedicated renderer로 이동한다. page는 이제 Classic 또는 Design implementation을 선택해 같은 prepared about view model을 전달하고, Classic module은 shell, profile, principle, journey, skill, experience, curation category, omission, review section을 소유한다.

routing layer에서 template-specific page implementation을 제거하면서 기존 page-enable 및 resolved-reference behavior는 유지한다.

## refactor(classic-resume): 이력 renderer를 독립 모듈로 이동

prepared resume view model을 소비하고 자체 shell을 구성하는 route renderer로 Classic resume presentation을 추출한다. application page는 Classic-specific identity, summary, project, training, experience, education, note markup을 직접 소유하는 대신 renderer를 선택한다.

route availability와 data preparation은 design 밖에 유지하고 optional section 및 template-aware project link를 포함한 모든 Classic resume composition을 renderer 책임으로 만든다.

## refactor(classic-contact): 연락 renderer를 독립 모듈로 이동

Classic contact page를 dedicated route renderer로 이동하고 application page는 template implementation 선택만 담당하도록 줄인다. renderer는 prepared contact model을 받아 shell을 구성하고 preferred link 또는 configured empty state를 렌더링하며 contact note를 template module 안에 유지한다.

resolved contact link와 fallback content의 구분은 바꾸지 않으면서 공용 route contract를 적용한다.

## refactor(classic-journey): 여정 renderer를 독립 모듈로 이동

Classic journey page를 dedicated renderer로 추출하고 Classic과 Design 모두 동일한 prepared journey view model을 사용하도록 한다. narrative milestone의 project reference는 rendering 전에 해석되므로 Classic module이 card를 만들면서 raw project collection을 더 이상 검색하지 않는다.

application route는 page availability와 view-model creation을 유지하고 renderer는 shell, narrative, timeline, current-position presentation을 소유한다. view-model layer가 확립한 reference-resolution boundary를 보존한다.

## refactor(classic-interview): 인터뷰 renderer를 독립 모듈로 이동

Classic interview map을 자체 route renderer로 옮기고 두 template variant 모두 prepared interview view model을 받도록 한다. answer-to-project reference는 Classic page 안에서 project lookup map을 다시 만드는 대신 중앙에서 해석한다.

renderer는 track navigation, evidence table, unresolved-reference fallback text, gap disclosure를 소유하고 application route는 page availability와 model preparation 책임을 유지한다.

## refactor(classic): Classic route dispatcher 추가

discriminated prepared-route contract 위에 단일 Classic dispatcher를 도입한다. 각 supported route를 dedicated Classic renderer에 매핑해 이미 Design template에 확립된 module boundary와 맞춘다.

dispatch를 중앙화해 registry가 사용할 design entry point를 하나로 만들고, route를 추가하거나 누락하는 사항이 application page 곳곳이 아니라 하나의 exhaustive switch에서 드러나게 한다.

## refactor(journey): 모든 renderer에 여정 view model 적용

모든 journey renderer가 raw portfolio dataset이 아니라 prepared journey view model을 사용하도록 한다. milestone anchor project와 timeline project reference는 model construction 중 한 번 해석한 뒤 Classic, Design, Brutalist, Cinematic, Editorial presentation에 직접 노출한다.

rendering code의 반복 identifier lookup을 제거하고 template 전반에서 하나의 missing-reference policy를 유지한다. route는 registry dispatch 전에 model을 생성해 모든 design이 같은 projection을 받게 한다.

## refactor(interview): 모든 renderer에 인터뷰 view model 적용

prepared interview-map view model을 모든 renderer에 적용한다. track answer가 resolved project 또는 null result를 직접 가지므로 template별 project map을 제거하고 unresolved reference는 presentation boundary에서 명시적으로 유지한다.

application route가 dispatch 전에 이 projection을 구성해 selected design과 관계없이 navigation, answer evidence, fallback behavior가 동일한 reference-resolution rule에서 파생되도록 한다.

## refactor(designs): renderer 입력을 route view model로 제한

공용 design contract를 완전한 portfolio content object에서 route view model의 discriminated union으로 변경한다. shell은 raw link에서 footer를 다시 해석하는 대신 명시적인 `footerLinks` projection에 의존하고 journey/interview route를 위한 임시 alternate request shape도 제거한다.

prepared route data를 유일하게 합법적인 registry input으로 만들어 renderer가 관련 없는 source collection에 조용히 접근하지 못하게 한다. compatibility type도 central design contract로 이동해 모든 template가 같은 boundary를 따르도록 한다.

## refactor(designs): 모든 route를 registry renderer로 위임

template를 해석하고 대응 view model을 만든 뒤 모든 application page를 design registry를 통해 renderer에 위임한다. Classic 및 Design의 direct import와 special-case selection을 제거하고, project-detail page는 rendered result를 감싸는 not-found handling 및 structured-data emission만 계속 소유한다.

모든 template과 route에 하나의 dispatch path를 확립한다. application layer는 framework concern과 data preparation을, registry는 template selection을, 각 renderer는 presentation을 소유한다.

## test(design): 독립 renderer와 design token 경계 검증

renderer matrix를 journey 및 interview route까지 확장하고 Classic과 Design implementation이 독립 renderer boundary를 노출하는지 검증한다. shared typography, spacing, breakpoint, motion, layer, content-width token family에 대한 stylesheet contract test도 추가하며 Classic 및 Design scope를 명시적으로 확인한다.

이 test는 refactor의 양쪽을 모두 보호한다. 모든 route는 모든 design을 통해 계속 렌더링 가능해야 하고 renderer-specific layout은 우발적인 global default가 아니라 선언된 token으로 계속 구동되어야 한다.

## refactor(content): 홈 view model 공개 필드 제한

home model이 complete portfolio object를 상속하던 구조를 shared shell data, home renderer가 사용하는 source section, 명시적 home derivation만 노출하는 scoped type으로 교체한다. 다른 모든 portfolio key는 사용할 수 없는 type으로 표시하고 runtime factory는 contact, journey, skill, technology, prepared metric/project reference만 복사한다.

route isolation을 compile-time contract로 만들고 structural compatibility만을 위해 home renderer가 관련 없는 source collection을 들고 있지 못하게 한다.

## refactor(content): 프로젝트 view model 공개 필드 제한

project-index 및 project-detail model의 범위를 실제 data dependency로 제한한다. index는 project collection, contact data, group, metric, prepared subset을 받고, detail model은 shared shell data 외에 selected project와 파생 link, stack entry, supporting image만 노출한다.

full-content base와 detail route의 기존 빈 `projects` placeholder를 제거해 관련 없는 collection을 type 수준에서 사용할 수 없게 하고 runtime에서도 운반하지 않는다.

## refactor(content): 소개·이력·연락 공개 필드 제한

scoped route-model contract를 about, resume, contact projection에 적용한다. 각 factory는 renderer에 필요한 source section과 이미 해석한 reference만 복사한다. about은 curation category, resume은 selected project, contact는 placement-filtered link를 보유한다.

full content object와 인위적인 빈 project array를 명시적 dependency로 교체해 optional-section 및 missing-reference behavior를 유지하면서 우발적인 cross-route coupling을 줄인다.

## refactor(content): 여정·인터뷰 공개 필드 제한

journey 및 interview model의 범위를 route-specific source data와 resolved reference로 제한한다. Journey는 narrative와 timeline, prepared milestone/project link를 유지하고 interview는 map과 resolved project를 포함한 answer track만 유지한다.

factory는 더 이상 complete portfolio object를 복사하거나 빈 project array를 삽입하지 않는다. 따라서 renderer는 raw project collection을 다시 얻을 수 없으며 중앙화된 reference-resolution 결과를 사용해야 한다.

## refactor(content): route view model 공용 경계 제한

공통 base를 presentation, profile, site, prepared footer link로 줄여 route-model isolation을 완성한다. factory는 complete content object를 spread하지 않고 link, group, metric을 위한 빈 compatibility array도 더 이상 만들지 않는다.

사용할 수 없는 source key는 `never` type으로 남겨 해당 값을 runtime model에 복사하지 않고도 legacy helper signature를 migration할 수 있게 한다. type-level compatibility와 실제 data ownership을 분리하고 shared payload를 의도적으로 작게 만든다.

## test(content): scoped view model과 연락처 회귀 검증

TypeScript declaration에만 의존하지 않고 runtime에서 route-view-model boundary를 고정한다. test는 각 route가 유지할 수 있는 source content field를 열거하고 shared shell field와 derived footer link를 요구하며 complete `PortfolioContent` object와 intersection하거나 이를 spread해 model을 재구성하는 implementation을 거부한다.

suite는 projection을 도입한 이유인 data-resolution behavior도 검증한다. project-list 및 about model은 renderer가 사용하는 contact data를 유지하고, journey milestone은 unresolved project reference를 버리며, interview answer는 missing reference에 대해 원래 identifier를 보존하면서 `null` project를 노출한다. payload scoping과 incomplete cross-reference에 대한 renderer contract를 함께 보호한다.

## refactor(ui): 디자인 선택기를 server markup으로 전환

design selector 자체를 client component에서 server-rendered markup으로 전환하고 실제 imperative behavior만 작은 `DesignSwitcherClose` client component로 격리한다. selector는 전체 panel에 React state나 ref를 hydrate하지 않고 native `<details>` structure와 navigation link를 렌더링할 수 있다.

close control은 event target에서 자신을 포함하는 `<details>` element를 찾고 native open attribute를 제거한 뒤 summary로 focus를 복원한다. design link는 navigation이 page 자체를 교체하므로 더 이상 `onClick` handler가 필요 없고, 생성된 URL이 content-debug query를 보존한다. explicit close의 keyboard focus restoration은 유지하면서 browser-side component boundary를 실제 JavaScript가 필요한 동작으로만 줄인다.

## test(ui): server 선택기와 focus 복원 검증

design-switcher source를 읽어 selector component의 top-level `"use client"` directive 또는 `useRef` state를 거부하는 structural regression check를 추가한다. server/client split을 우연한 implementation detail이 아니라 명시적 contract로 만들고 기존 rendering, native-open-state, explicit-close focus test를 보완한다.

함께 발생한 lockfile 변경은 transitive test dependency를 갱신할 뿐이며, 핵심 변경은 selector markup이 조용히 hydrated client component로 다시 커지는 것을 막는 test다.

## refactor(ui): reveal 콘텐츠를 server에서 즉시 표시

`Reveal`에서 client-side intersection-observer lifecycle을 제거하고 감싼 모든 element를 server에서 처음부터 visible state로 렌더링한다. polymorphic element와 transition-delay styling은 유지하되 hydration, observer registration, viewport callback이 완료될 때까지 content를 숨기지 않는다.

scroll-triggered reveal animation을 포기하는 대신 결정적인 first render, 더 적은 client JavaScript, observer cleanup 부담 제거를 얻는다. 더 중요한 점은 JavaScript가 지연되거나 비활성화되어도 content가 계속 제공되므로 presentation effect가 visibility나 interaction의 전제 조건이 될 수 없다는 것이다.

## refactor(navigation): 디자인 전환 URL 기본값 명시

configured default design을 모든 design-switcher instance의 명시적 input으로 만들고 `createTemplateHref`를 통해 switch link를 생성한다. URL helper는 의도적으로 선택한 non-default design과 default presentation을 구분해 필요할 때만 `view=<design>`을 유지하고 사용자가 default로 돌아오면 오래된 `view` parameter를 제거한다.

page context, shared shell props, dedicated renderer shell 전반에 `defaultId`를 전달해 숨겨진 global assumption이 아니라 content configuration을 기준으로 URL canonicalization을 수행한다. content-debug mode 같은 기존 query state는 같은 helper로 계속 보존한다.

## perf(font): route별 글꼴 로딩 비용 축소

root layout에서 무조건 수행하던 font 작업을 줄인다. primary sans face는 `next/font`를 통해 계속 사용할 수 있지만 mono face는 더 이상 preload하지 않고 작은 switcher label은 system monospace stack을 사용한다. Korean serif variable은 configured site language가 한국어일 때만 적용하고, 다른 언어에는 큰 CJK font를 로드하지 않는 명시적 system-serif CSS-variable fallback을 제공한다.

모든 local face는 `display: optional`로 바꿔 custom face가 browser의 짧은 optional-loading window를 놓쳤을 때 늦은 font swap 대신 적절한 fallback을 유지하게 한다. custom font가 제때 로드되지 않으면 platform font rendering을 허용하는 대가로 예측 가능한 first paint를 우선하고 route나 locale에 필요하지 않은 typography asset 전송을 피한다.

## perf(navigation): 유휴 route prefetch 비활성화

shell link, design switching, project card, call to action, route-specific renderer를 포함한 portfolio 내부 navigation surface 전반에서 Next.js automatic prefetch를 비활성화한다. route가 많고 다섯 presentation이 독립 bundle로 구성되므로 viewport/hover prefetch가 방문자가 실제로 열지 않을 route payload와 chunk까지 요청할 수 있다.

`prefetch={false}`를 일관되게 적용해 실제 user navigation을 route loading의 경계로 만들고 idle browsing이 network, parsing, cache 비용을 증폭시키지 않게 한다. 첫 click이 speculative route data의 이점을 받지 못할 수 있지만 모든 visible link에 그 비용을 미리 지불하지 않는 것을 선택한다.

## test(perf): 유휴 route 요청과 글꼴 경계 검증

모든 design의 home 및 project-detail route에 browser-level performance assertion을 추가한다. first paint 이후 idle period의 request를 기록하고 user interaction 전에 React Server Component request가 하나라도 발생하면 실패하게 해 no-prefetch policy를 source-code 관례가 아니라 관찰 가능한 network behavior로 만든다.

같은 matrix에서 emitted Geist Mono `@font-face` URL을 찾아 preload되지 않았는지 확인하고 해당 face를 사용하지 않는 design이 이를 download하지 않는지 검증한다. 실제 stylesheet, preload link, computed font user, network resource type을 검사해 bundling이 asset filename을 바꾸더라도 의도한 loading boundary를 보호한다.

## test(perf): 사용자 상호작용 지연 측정 추가

client-sensitive interaction을 위해 Chromium Event Timing API 기반 Playwright performance harness를 도입한다. `PerformanceObserver`를 설치하고 각 sample을 구분하며 browser-trusted click을 정확히 한 번 요구하고 `interactionId`별로 entry를 grouping한 뒤 다음 paint까지 기다리고 결과를 읽는다. observer의 16ms reporting threshold보다 짧은 event는 거짓으로 0이라고 보고하지 않고 해당 threshold 안에 있다고 처리한다.

모든 design에서 design-switcher close를 warm-up 후 세 번 sample하고 mobile project에서는 native menu open도 측정한다. median과 maximum upper bound 모두 200ms 이하여야 하며 state/focus assertion으로 빠른 측정이 실제 올바른 UI outcome을 만들었는지도 확인한다. 모든 sample을 log해 불안정한 단일 timing으로 pass/fail budget을 대체하지 않고 regression을 진단할 수 있게 한다.

## fix(perf): webpack route manifest parser 보강

generated JavaScript wrapper를 plain JSON처럼 취급하거나 evaluate하지 않고 Next.js client-reference manifest file 전용 parser를 도입한다. parser는 line break를 가로질러 `globalThis.__RSC_MANIFEST[...]` assignment를 찾고 serialize된 value만 잘라내며 예상되는 terminating semicolon을 요구한 뒤 `JSON.parse`에 validation을 위임한다.

malformed 또는 변경된 output은 오해를 부르는 bundle measurement 대신 manifest filename과 함께 실패한다. 대응 declaration file은 route-budget tooling이 사용하는 optional JavaScript/CSS entry map과 asset이 별도 transfer에 포함되는지를 결정하는 CSS inlining flag를 기록한다.

## test(build): compiler와 manifest parser 계약 검증

production measurement pipeline을 자신이 이해하는 build output에 고정한다. test는 project가 계속 webpack compiler로 Next.js를 실행하는지 확인해 눈에 띄지 않는 compiler 변경이 bundle-budget tooling 아래의 manifest format을 바꾸는 것을 막는다.

대표적인 compact manifest로 일반 page key와 square bracket을 포함하는 dynamic route를 모두 검증한다. 단순화된 JSON fixture가 아니라 실제 generated wrapper syntax에 대해 parser를 실행해 bundle accounting이 의존하는 route-key matching rule을 보호한다.

## fix(deps): Next.js runtime 보안 패치 적용

고정된 Next.js runtime과 대응 ESLint configuration을 16.2.4에서 16.2.11로 올리고 lockfile을 갱신해 framework environment package, lint plugin, 플랫폼별 SWC binary가 같은 patch line에서 해석되도록 한다. 서로 다른 release의 framework tooling과 compiler artifact가 섞이는 것을 막는다.

의도적으로 patch-level framework update만 수행해 application API와 architecture는 그대로 유지하면서 deployed runtime에 저장소가 선택한 security maintenance release를 적용한다. lockfile에는 Linux compiler binary의 GNU/musl constraint도 명시적으로 기록해 local 및 container environment 모두에서 올바른 native package가 선택되도록 한다.

## build(perf): route별 client asset 측정 추가

production build 결과에서 각 application route에 해당하는 client JavaScript와 non-inlined CSS를 보고하는 measurement를 추가한다. collector는 `app-paths-manifest.json`에서 public route를 파생하고 framework internal을 건너뛰며 각 page output을 client-reference manifest에 매핑한 뒤 route-specific JavaScript와 root shared chunk를 결합한다.

asset path는 실제 uncompressed file size를 읽기 전에 deduplicate해 같은 shared chunk가 한 route 안에서 두 번 계산되지 않도록 한다. inlined로 표시된 CSS entry는 별도의 client asset transfer를 만들지 않으므로 제외한다. source-file size나 bundler estimate가 아니라 실제 build output을 이후 route budget의 authoritative representation으로 만든다.

## build(perf): route bundle 성장 예산 평가 추가

route bundle growth를 커밋된 route별 JavaScript/CSS baseline과 비교하고 고정 5% allowance를 적용한다. expected route가 사라지거나 asset class가 반올림된 byte limit을 초과하거나 새로 emitted된 route에 baseline이 없으면 evaluator가 structured violation을 보고한다.

route coverage와 asset growth를 별도 failure category로 취급해 page가 조용히 사라지거나 추가되어도 green 결과가 되는 것을 막는다. structured record는 baseline, allowed, actual byte count를 보존해 진단 가능하게 하고 공용 literal/declaration type으로 script consumer 전반에서 5% policy를 일치시킨다.

## build(perf): bundle budget CLI 연결

route measurement와 budget evaluator를 두 개의 명시적인 package command로 노출한다. `bundle:baseline`은 현재 production measurement를 schema version, source description, 고정 5% policy와 함께 serialize하고, `bundle:check`는 커밋된 file을 읽어 policy 값을 검증한 뒤 모든 violation을 출력하고 실패 상태로 종료한다.

baseline 생성과 일상적인 check를 분리해 normal validation이 새 수치를 조용히 허용하지 못하게 한다. script의 command-line entry point도 guard해 measurement/evaluation function을 test에서 import할 때 filesystem 또는 process side effect가 실행되지 않도록 한다.

## chore(perf): route bundle 기준값 기록

webpack production output에서 생성한 첫 route-bundle baseline을 커밋한다. file에는 public route pattern 8개 전체와 각 route의 uncompressed client JavaScript/CSS byte count, schema version, `bundle:check`가 사용하는 5% growth policy를 기록한다.

byte 값 자체는 generated measurement지만 커밋된 snapshot은 operational configuration이다. 이후 build가 실패 여부를 판단할 accepted reference state와 route coverage를 정의한다. 따라서 일반 check의 side effect로 자동 갱신하지 않고 명시적으로 검토할 수 있는 commit을 통해서만 변경한다.

## build(perf): desktop Lighthouse 실행 경계 추가

다섯 design 모두에 대해 home page와 enabled project detail page 하나를 검사하는 재현 가능한 desktop Lighthouse CI matrix를 추가한다. configuration은 content에서 project identifier를 파생하고 전용 port에서 production server를 시작한 뒤 URL마다 headless run을 세 번 수행하고 median을 평가해 단일 noisy audit의 영향을 줄인다.

release threshold는 performance score 0.90 이상, accessibility score 0.95 이상을 요구하며 Largest Contentful Paint 2.5초, Total Blocking Time 200ms, Cumulative Layout Shift 0.1의 구체적 상한도 적용한다. package command와 ignore된 Lighthouse workspace를 통해 transient audit artifact를 커밋하지 않고 반복 가능한 validation boundary를 만든다.

## build(perf): Lighthouse 결과 요약기 추가

raw Lighthouse CI report를 위한 결정적인 summarizer를 추가한다. 각 LHR에서 다섯 release metric을 추출하고 최종 audited URL별로 run을 grouping하며 안정적인 output을 위해 route를 정렬하고, gate가 사용하는 모든 run 및 median value를 기록한다.

생성되는 baseline은 audit target과 중요한 execution context인 Chrome user agent, Node version, platform, architecture, CPU, logical core count, memory도 함께 저장해 performance 수치를 생성 환경과 분리하지 않는다. report가 하나도 없으면 실패하도록 해 비어 있거나 오래된 summary가 성공한 measurement처럼 보이는 것을 막는다.

## test(perf): 배포 성능 gate 규칙 검증

build-manifest check를 더 넓은 performance-gate contract로 통합한다. test는 실제 Lighthouse configuration을 검사해 production server, desktop preset, 3회 run, 모든 design의 home/project-detail coverage를 요구한 뒤 정확한 performance, accessibility, LCP, CLS, TBT threshold를 검증한다.

route-budget test는 generated-manifest parser case를 유지하고 policy boundary 자체도 검사한다. CSS와 JavaScript가 정확히 5% 성장하는 것은 허용하고 어느 한쪽이 1byte라도 초과하면 offending route 및 asset class를 식별하며 baseline에 없는 route는 fail-closed한다. configuration edit나 evaluator regression이 unit test 실패 없이 deployment gate를 약화시키는 것을 막는다.

## fix(build): Tailwind utility CSS 변환 복원

명시적인 PostCSS configuration에 `@tailwindcss/postcss`를 등록해 Tailwind의 build-time CSS transformation을 복원한다. dependency를 설치해 두는 것만으로는 충분하지 않으며 Next.js가 plugin을 실제 호출해야 Tailwind import와 utility usage가 production stylesheet로 확장된다.

이 integration을 일반적인 root configuration에 두어 local development, production build, Lighthouse audit, bundle measurement에 같은 transform을 적용한다. 없으면 React markup이 의존하는 utility layer 없이 source CSS만 컴파일되어 구조적으로는 valid하지만 시각적으로 깨진 artifact가 만들어질 수 있다.

## test(visual): 다섯 디자인 회귀 기준 추가

development 및 production Playwright configuration이 공유하는 결정적인 snapshot layout으로 다섯 design 전체에 visual regression coverage를 구축한다. home page는 desktop/mobile 모두 캡처하고 project detail은 desktop reference를 만들며, manifest test가 정확히 15개 baseline을 요구해 design snapshot의 추가 또는 누락이 조용히 발생하지 않게 한다.

각 capture 전에 reduced motion을 활성화하고 network idle을 기다린 뒤 document font와 모든 image가 안정될 때까지 대기한다. full-page comparison은 animation을 비활성화하고 최대 1% pixel difference를 허용한다. 임의의 delay에 의존하지 않고 snapshot readiness를 명시적으로 만들며, 커밋된 image는 test policy의 source가 아니라 generated evidence로 유지한다.

## ci: 검증된 bundle과 Lighthouse gate 활성화

production bundle 및 Lighthouse check를 local tooling에서 CI release path로 승격한다. workflow는 CI 전용 production E2E command로 한 번 build한 뒤 standalone output을 검증하고 모든 route를 커밋된 JS/CSS budget에 대조하며, Playwright가 설치한 Chromium을 browser binary로 노출해 production server에 Lighthouse를 실행한다.

visual snapshot case는 전체 production suite에서 계속 사용할 수 있지만 일반 CI E2E command에서는 제외해 커밋된 baseline을 별도 regression contract로 유지한다. 필수 deployment artifact, route-size limit, laboratory performance threshold가 권고 사항으로 남지 않고 automated build를 실제 실패시키도록 한다.

## build(docker): public 자산을 포함한 비루트 standalone image 추가

검증된 Next.js standalone artifact를 중심으로 multi-stage container build를 추가한다. 저장소에 고정된 Node/npm version으로 dependency를 설치하고 build time에 content mode와 public origin을 제공하며, runtime image를 만들기 전에 builder가 production build와 standalone-output verification을 모두 통과해야 한다.

최종 image는 권한이 없는 `node` user로 실행되고 standalone server, generated static asset, repository의 `public` directory만 포함한다. `public`은 standalone server bundle에 포함되지 않으므로 명시적으로 복사해야 한다. 함께 추가한 ignore rule은 source-control data, local dependency, test output, log, environment file을 Docker build context에서 제외한다.

## test(docker): runtime route와 public 자산 검증 자동화

image를 build하고 격리된 ephemeral port에서 시작해 readiness를 기다린 뒤 configured runtime user가 `node`인지 확인하는 end-to-end container contract를 추가한다. 이어 home page와 project-detail route를 요청해 packaged standalone server가 성공적인 non-empty HTML response를 반환하도록 요구한다.

public asset coverage는 중복 list를 별도로 관리하지 않고 authoritative content JSON에서 재귀적으로 파생한다. 참조되는 모든 content/template asset은 non-empty body와 extension에 맞는 MIME type으로 제공되어야 한다. unique image/container name으로 concurrent-run collision을 피하고 failure log를 진단에 남기며 `finally` cleanup이 두 resource를 모두 제거한다. CI에서 이 contract를 실행해 public-asset copy 및 non-root runtime boundary를 포함한 deployable image 자체를 검증한다.

## refactor(style): 공용 interaction 규칙 순서 정리

shared reveal, motion-card, project-card, screenshot interaction rule을 declaration 변경 없이 common base style 근처로 이동한다. 조직적 refactor로서 재사용 interaction behavior를 design-specific animation section보다 앞에 grouping해 기존 visual effect를 유지하면서 stylesheet의 ownership boundary를 더 쉽게 파악할 수 있게 한다.

## refactor(projects): 사용하지 않는 그룹 helper 제거

route view model이 grouped project data 준비를 담당하게 된 뒤 obsolete project-grouping helper와 export된 tuple type을 제거한다. 사용하지 않는 utility를 남기면 category ordering의 두 번째 비참조 구현이 유지되어 새 derivation boundary가 흐려지므로 삭제해 중앙화된 projection path만 해당 behavior의 단일 source로 남긴다.

## style(code): 정적 설정과 export 형식 정리

runtime behavior를 변경하지 않고 static configuration과 module formatting을 정규화한다. ESLint ignore list에는 `eslint-config-next`에서 상속되는 default를 대체한다는 점을 명시하고 public portfolio export 순서를 일관되게 정리하며 긴 selector signature를 repository formatting convention에 맞게 줄바꿈한다.

## test(docs): 엔지니어링 문서 계약 검증

독립된 `devlog` document set을 제거하면서 실행 가능한 documentation contract를 추가한다. Vitest suite는 남은 project Markdown을 재귀적으로 찾고 주요 guide가 title과 특정 architecture, content-mode, verification-command, evidence-boundary statement를 유지하도록 요구하며 빈 template claim이 case study에 다시 들어오는 것을 막는다.

local link는 prose assertion과 독립적으로 검사한다. validator는 fenced code를 제거하고 relative target을 resolve하며 path와 fragment를 decode하고 duplicate-heading suffix를 포함한 GitHub heading-anchor 생성을 근사해 missing file과 stale section link를 test failure로 만든다. 결과 tree에는 제거된 `devlog` path를 가리키는 문서 link가 아직 남아 있으므로 새 fail-closed link check는 test가 존재한다는 사실을 문서가 현재 통과한다는 증거로 취급하지 않고 실제로 조정해야 할 documentation mismatch를 드러낸다.

