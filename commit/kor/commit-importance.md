# 프로젝트 중요도 프로필

프로젝트: 42 Archive Portfolio (`web/portfolio`)
분야: 콘텐츠 기반 포트폴리오 게시, 엔지니어링 근거 제시, 멀티 디자인 웹 제공
주요 목적: 하나의 구조화된 근거 모델을 다섯 개의 완전한 시각 시스템과 여러 public route를 통해 표현하는, 검증 가능하고 접근성을 갖추며 검색 엔진에 노출할 수 있고 배포 가능한 Next.js 포트폴리오 구축.
확정된 커밋 범위: `cce7dd020563`부터 `aff0acdd4cf9`까지 이어지는 `web/portfolio`의 독립적이고 선형적인 root-to-head 전체 history로, 원본 커밋 476개로 구성된다. 분류에서는 원래 순서를 유지하며 commit-body 생성에서 제외된 세 커밋인 root 프로젝트 brief, 자동 생성된 최종 laboratory 측정 결과, 문서 통합 커밋도 포함한다.

## 핵심 기술 영역

- 구조화된 portfolio, presentation, journey, interview-evidence, résumé, curation, link, technology, project 콘텐츠 모델링.
- runtime schema parsing, source-aware 진단, uniqueness 검사, 파일 간 reference 검증, route 검증, 저장소 asset 검증.
- App Router state 해석, route 활성화 여부, canonical template/debug navigation, metadata, not-found 동작, static project 생성.
- 다섯 full-site renderer, 공용 route 계약, exhaustive dispatch, renderer별 shell을 갖춘 lazy design registry.
- 콘텐츠 간 reference를 해석하고 각 renderer가 준비된 route 전용 데이터만 사용하도록 제한하는 discriminated route view model.
- native disclosure control, focus 이동, landmark, reduced motion, semantic structure, touch target, WCAG regression scan 전반의 접근성.
- publication mode readiness, indexing policy, canonical metadata, sitemap 생성, 안전한 JSON-LD 직렬화.
- 고정된 runtime, local asset, standalone output, CI, Docker, non-root runtime 검증을 통한 재현 가능한 build 및 배포.
- prefetch/font 경계, route asset 측정, 커밋된 growth budget, Lighthouse gate, visual/browser matrix를 통한 production 성능 관리.

## 핵심 아키텍처

- authoritative JSON source는 strict Zod schema와 source-aware parsing을 거쳐 유입되며, 잘못된 record는 application data가 되지 못한다.
- 전체 저장소 validation은 파일별 schema 위에서 identifier uniqueness, enabled route 유효성, 파일 간 reference, local asset containment를 강제한다.
- 검증된 portfolio facade와 selector는 안정적인 도메인 관계, placement-aware link, metric, availability policy를 노출한다.
- App Router page가 page enablement, query parsing, `notFound`, metadata, JSON-LD, route별 view model 생성을 포함한 framework concern을 소유한다.
- route view model은 join을 한 번만 해석하고 presentation-ready collection을 계산한 뒤 해당 route가 사용할 수 있는 데이터만 노출한다.
- design registry가 lazy full-route renderer를 선택한다. 각 renderer는 composition과 shell presentation을 소유하지만 global content graph를 다시 로드하거나 독자적으로 재해석할 수 없다.
- build readiness는 허용적인 template 개발과 strict production publication을 분리하고, CI는 standalone 및 Docker 배포에서 사용하는 것과 동일한 production artifact를 검증한다.

## 핵심 불변 조건

- 모든 content source는 selector나 renderer가 사용하기 전에 parsing되며, validation report에는 문제가 발생한 file과 JSON path가 유지된다.
- identifier, ordering key, design registration, internal route, project relationship, 참조 asset은 unique하고 해석 가능하며 활성 상태이고 저장소 경계 안에 있어야 한다.
- 비활성 page와 project는 route boundary에서 접근할 수 없고 metadata, sitemap, production publication surface에서도 제외된다.
- content에서 제공하는 design은 code에서 지원되고 registry를 통해 load할 수 있으며 전체 route 집합을 렌더링할 수 있어야 한다.
- renderer는 전체 content graph가 아니라 준비된 route model을 받으며, cross-reference 해석에는 하나의 owner와 하나의 missing-reference policy만 존재한다.
- internal navigation은 선택된 design과 debug state를 보존하며, 설정된 기본 design으로 돌아가면 오래된 template state를 제거한다.
- template mode는 index 대상이 아니며, production mode에는 public origin, publication asset, 활성 project의 외부 이동 경로, 사용 가능한 contact method가 필요하다.
- JSON-LD는 script context를 종료하거나 변경할 수 없고, machine-readable claim은 검증된 production content에서만 생성된다.
- skip link는 focus를 이동하고, reduced-motion preference는 불필요한 motion을 제거하며, landmark는 유일하고, native disclosure control은 focus와 hydration state를 보존한다.
- 배포 가능한 standalone/container artifact는 static/public asset을 포함하고 root 권한 없이 실행되며 실제 HTTP request로 검증된다.
- performance budget은 생성된 production asset과 audit route를 측정하며, 일반 check가 baseline을 자동으로 갱신할 수 없다.

## 주요 엔지니어링 난점

- framework, selection, relationship logic을 중복하지 않으면서 시각적으로 독립된 다섯 full-site renderer의 모든 route에서 동작을 일관되게 유지하는 것.
- 이미 구현된 route를 깨뜨리지 않으면서 unchecked JSON과 광범위한 portfolio object에서 strict schema, aggregate validation, scoped route projection으로 이전하는 것.
- malformed value, duplicate identity, disabled reference, 지원하지 않는 internal route, 누락되거나 저장소 경계를 벗어나는 asset을 하나의 누적 report에서 실질적으로 수정 가능한 형태로 진단하는 것.
- 편집 가능한 template content와 게시 가능한 content를 구분해 local preview는 편리하게 유지하면서 production build는 fail-closed하도록 만드는 것.
- server rendering, hydration 이전 사용자 상호작용, 명시적 닫기, keyboard focus 복원 전반에서 native `<details>` 동작을 보존하는 것.
- compiler별 manifest, standalone packaging, local font, Tailwind 변환, route bundle cost, Lighthouse threshold, Docker asset serving을 포함한 실제 Next.js production output을 검증하는 것.

## 실무 엔지니어링 영역

- Fail-closed validation 및 오류 누적.
- 안정적인 content identifier와 명시적 reference resolution.
- route availability와 placement 기반 link policy.
- 안전한 external link 및 structured-data 처리.
- server-first rendering과 최소한의 client boundary.
- reduced motion, focus, semantic, responsive regression 방지.
- 재현 가능한 runtime, build, standalone, container boundary.
- production server, browser, accessibility, visual, performance, documentation 검증.
- 일반 check 중 자동으로 갱신되지 않고 명시적 review가 필요한 baseline.

## S 등급 기준

- 모든 route와 design에서 사용하는 프로젝트 전체 trust, dispatch, publication 또는 data-ownership architecture를 구축한다.
- 누락될 경우 unchecked content, 일관되지 않은 rendering, unsafe publication을 허용하게 되는 핵심 correctness invariant를 강제 가능하게 만든다.
- content ingestion, route preparation, registry selection, renderer composition 사이의 핵심 책임 분리를 완성한다.
- 최종 애플리케이션이 semantic drift 없이 다섯 full-site design을 지원할 수 있는 이유를 설명하는 데 반드시 필요하다.

## A 등급 기준

- 여러 route에 걸친 validation, routing, renderer, accessibility, SEO, performance 또는 deployment boundary를 구축하거나 실질적으로 강화한다.
- 소유 계층에서 쉽게 드러나지 않는 integration/build failure를 수정하거나 영향이 큰 regression을 차단한다.
- 실제 production artifact에 대한 중요한 검증을 추가하거나, 동작을 유지하면서 ownership을 좁히는 주요 compatibility refactor를 수행한다.
- publication safety, route projection, renderer integration, release quality의 중요하지만 프로젝트 전체를 규정하지는 않는 부분을 완성한다.

## 일반적인 B 등급 작업

- 이미 확립된 아키텍처 안에서 수행하는 일반적인 route, renderer, component, schema, selector, content, test 구현.
- 프로젝트 전체 계약을 바꾸지 않고 하나의 design을 완성하는 데 필요한 responsive/visual-system 구현.
- 기존 policy를 적용하는 보조 build, metadata, maintenance 작업.
- 여러 subsystem에 미치는 영향이 제한적인 local refactor 및 일반적인 regression coverage.

## 일반적인 C 등급 작업

- 문서 전용 커밋, 자동 생성된 결과 snapshot, formatting, declaration 순서 정리, 기계적 cleanup.
- 동작이나 구조에 거의 영향을 주지 않는 작은 visual primitive 또는 국소적인 polish.
- 제거해도 애플리케이션의 architecture, invariant, release model을 설명하는 데 실질적인 영향이 없는 변경.

## 프로젝트 전용 태그

ARCH — 프로젝트 전체 아키텍처 또는 핵심 책임 경계.
CONTENT — 구조화된 portfolio source, domain model, selector, route projection.
VALIDATION — runtime schema, 진단, uniqueness, reference, readiness 또는 asset integrity.
ROUTING — App Router 동작, navigation state, page availability, shell 또는 route dispatch.
RENDERER — full-site design system, renderer registry, composition 또는 responsive presentation.
SEO — canonical metadata, indexing, robots, sitemap 또는 structured data.
A11Y — accessibility semantic, focus, motion, landmark, touch target 또는 WCAG 검증.
PERF — client loading, asset budget, interaction latency 또는 Lighthouse performance.
DEPLOY — runtime, build, standalone, CI, font, compiler 또는 container delivery.
TEST — regression, integration, browser, production 또는 artifact 검증.
REFACTOR — 동작을 유지하면서 ownership이나 coupling을 바꾸는 중요한 구조 변경.
DEBUG — build, hydration, runtime 또는 integration defect의 root-cause 수정.

# 커밋 분류

| 커밋 | 제목 | 중요도 | 태그 | 요약 | 선정 이유 |
| --- | --- | --- | --- | --- | --- |
| `cce7dd020563` | docs(portfolio): 프로젝트 목적과 초기 규약 정의 | C | CONTENT | portfolio project brief와 초기 저장소 규약을 정의한다. | 문서 전용 작업이다. 맥락은 제공하지만 애플리케이션, 계약, verification boundary는 변경하지 않는다. |
| `448bc2510f34` | build(next): 실행 가능한 애플리케이션 골격 구성 | A | DEPLOY | 콘텐츠만 있는 골격이 아니라 실제로 실행할 수 있는 Next.js 애플리케이션으로 저장소를 구성한다. | local tooling만 조정하는 수준이 아니라 재현 가능한 production build 및 runtime boundary를 변경하거나 강화하므로 중요하다. |
| `efb1e2e26b74` | feat(content): 사이트와 프로필 콘텐츠 기반 추가 | B | CONTENT | 사이트 메타데이터와 프로필 정보를 명시적인 TypeScript 계약이 뒷받침하는 구조화된 JSON으로 정의한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `5eb01dfecabb` | feat(content): 링크와 프로젝트 도메인 정의 | B | CONTENT | 카탈로그에 실제 데이터를 채우기 전에 포트폴리오 링크와 프로젝트 case study를 위한 도메인 모델을 정의한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `7f5017b21d37` | feat(content): 디자인 홈 표현 모델 추가 | B | CONTENT | 디자인 중심 홈 페이지의 presentation 계약을 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `04a810bb0ab4` | feat(content): 클래식과 공용 홈 표현 추가 | B | CONTENT | presentation 모델에 classic 홈 variant와 두 홈 디자인이 공유하는 section을 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `d21d53591b5c` | feat(content): 프로젝트 목록 표현 계약 정의 | B | CONTENT | design과 classic 프로젝트 인덱스를 위한 별도의 presentation 계약을 정의한다. hero 문구, group 설명, terminal framing, 선택 프로젝트 section, 제한된… | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `d55a2017e725` | feat(content): 프로젝트 목록 화면 문구 추가 | B | CONTENT | 두 시각 variant의 프로젝트 인덱스 presentation 데이터를 채운다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `d6468cbea9e2` | feat(content): 보조 페이지 표현 계약 정의 | B | CONTENT | 프로젝트 상세, About, Resume, Contact 페이지의 presentation 계약을 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `da3941184155` | feat(content): 상세 소개 이력 연락 문구 추가 | B | CONTENT | 프로젝트 상세와 About, Resume, Contact 페이지의 presentation source를 채운다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `0d891d41cf4c` | feat(content): 기술과 여정 콘텐츠 모델 추가 | B | CONTENT | experience, journey, skill, canonical technology stack의 source file과 계약을 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `8661cc00c45d` | feat(content): 연락과 이력 집계 모델 완성 | B | CONTENT | contact와 resume 데이터에 필요한 나머지 콘텐츠 계약을 완성하고, 애플리케이션이 사용하는 통합 `PortfolioContent` 구조를 정의한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `a365b3d19118` | feat(content): 정적 포트폴리오 콘텐츠 로딩 | B | CONTENT | 커밋된 JSON source를 import하고 타입이 지정된 content module을 통해 노출하는 최초의 static loader를 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `0b134b1a6cf6` | feat(content): 여정 정렬과 콘텐츠 인덱스 구성 | B | CONTENT | 콘텐츠 로딩에 결정적인 journey 정렬, technology lookup index, 활성 링크 filtering을 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `7c95a6f387b4` | feat(content): 환경 링크를 반영한 콘텐츠 집계 | B | CONTENT | 환경 기반 링크를 해석하고 비활성 project와 link를 걸러 전체 portfolio aggregate를 구성한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `902eddcef875` | feat(navigation): 템플릿 URL과 쿼리 해석 추가 | A | ARCH, ROUTING | 홈 template 선택, content-debug mode 활성화, 상태를 보존하는 내부 URL 생성을 위한 canonical query-state utility를 추가한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `eb988f5e09e4` | feat(portfolio): 기술과 프로젝트 조회기 추가 | B | CONTENT | technology 조회, 대표 project 선택, ID 기반 project 조회, resume project 해석을 위한 집중된 selector를 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `ba8da56d3fcf` | feat(portfolio): 연락과 프로젝트 링크 선택기 추가 | A | CONTENT | 선호 contact link, project별 link, card에 적합한 action, 외부 anchor attribute 선택을 중앙화한다. | 현재 file이나 route를 넘어 영향을 미치는 공용 project contract를 확립하거나 보호하므로 중요하다. |
| `0a28cb050bc8` | style(theme): 포트폴리오 기본 디자인 토큰 추가 | B | RENDERER | 포트폴리오에서 사용하는 전역 color, surface, border, typography, spacing 어휘를 정의하고 이를 Tailwind utility에 노출한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `0369c21ca1f4` | feat(ui): 핵심 방향 및 상태 아이콘 추가 | C | - | 핵심 방향 및 상태 기호를 위한 재사용 가능한 SVG component를 추가한다. | 재사용 가능한 작은 visual primitive로, 브랜치 전체에서 보면 동작이나 아키텍처에 미치는 영향이 거의 없다. |
| `770a3bdabad9` | feat(ui): 확인 외부 링크 보안 아이콘 추가 | C | - | 동일한 prop 전달 및 장식용 접근성 계약을 적용해 confirmation, external-link, shield 기호를 공용 icon 집합에 추가한다. | 재사용 가능한 작은 visual primitive로, 브랜치 전체에서 보면 동작이나 아키텍처에 미치는 영향이 거의 없다. |
| `aa115c73ae30` | feat(ui): 콘텐츠 이미지 프리미티브 추가 | B | CONTENT | 콘텐츠 source hint, 프로필 사진, 프로젝트 screenshot을 위한 공용 primitive를 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `907d85b77bac` | feat(ui): 뷰포트 진입 공개 효과 추가 | B | - | `IntersectionObserver` 기반의 client-side reveal primitive를 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `f63c978c71c9` | feat(ui): 내부 외부 콘텐츠 링크 렌더링 | A | CONTENT | 타입이 지정된 content link를 위한 단일 renderer를 만든다. | 현재 file이나 route를 넘어 영향을 미치는 공용 project contract를 확립하거나 보호하므로 중요하다. |
| `e936c79b98bd` | feat(shell): 브랜드와 주 탐색 헤더 추가 | B | ROUTING | brand link, profile identity, primary navigation, 접근 가능한 navigation label을 포함하는 지속적인 site header를 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `a2fd51d4da44` | feat(shell): 홈 디자인 전환 탐색 추가 | B | ROUTING | 설정된 home template 목록을 보여주고 활성 항목을 `aria-current`로 표시하며, 현재 path에 명시적인 `view` URL을 생성하는 선택적 design switcher를 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `8e11443dc26d` | feat(shell): 공용 푸터와 페이지 셸 추가 | A | ARCH, ROUTING | footer와 `PageShell` composition boundary를 추가해 공용 page frame을 완성한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `3475ba3efdb2` | feat(home): 디자인 홈 소개 영역 구성 | B | RENDERER | 통합 content model을 기반으로 design home route의 소개 section을 구현한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b027f42669aa` | feat(home): 대표 프로젝트 쇼케이스 추가 | B | RENDERER | design home에 featured-project showcase를 추가하고 활성 project 집합에서 통계를 파생한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `115c8c588350` | style(home): 디자인 히어로 시각 계층 구성 | B | RENDERER | gradient, 움직이는 grid, frame이 적용된 media, 보조 장식 요소를 사용해 design home의 layered hero presentation을 구성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `03c4e1f7b439` | feat(app): 콘텐츠 기반 디자인 홈 연결 | B | CONTENT | 애플리케이션 진입점을 content-backed design home에 연결한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `f60d46857715` | feat(home): 애니메이션 터미널 상호작용 추가 | B | RENDERER | classic terminal을 명시적인 typing state machine으로 구현한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `1ff1da788f7a` | style(home): 터미널 프레임과 부유 장식 추가 | B | RENDERER | terminal의 visual frame, title bar, body treatment, sheen, floating decoration을 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `335a00fcf40c` | style(home): 터미널 출력과 커서 동작 추가 | B | RENDERER | terminal output, command bullet, entry transition, line wrapping, animated caret를 스타일링한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `cdb68fdf59f9` | feat(home): 클래식 홈 히어로 구성 | B | RENDERER | design home과 동일한 profile, link, project count, page shell을 사용해 classic home route를 구현한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `ba1f33c06f95` | style(home): 클래식 홈 테마 적용 | B | RENDERER | shell의 template data attribute 아래에 classic template의 dark palette와 hero/photo treatment를 적용한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `f4233f024890` | feat(home): 쿼리 기반 디자인 전환 연결 | A | ARCH, ROUTING, RENDERER | root page에서 `view`와 debug query parameter를 해석하고 server에서 classic 또는 design home으로 dispatch한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `53ca0860ef3a` | feat(project): 프로젝트 배포 상태 배지 추가 | B | RENDERER | 알려진 project state를 visual tone으로 매핑하고 콘텐츠가 제어하는 `showBadge` flag를 따르는 재사용 가능한 deployment badge를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `ebc245105c03` | feat(stack): 기술 스택 아이콘 매핑 추가 | B | RENDERER | portfolio technology icon identifier에서 `simple-icons` 정의로 이어지는 타입이 지정된 partial mapping을 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `3d9b847d8094` | feat(stack): 기술 스택 폴백 아이콘 추가 | B | RENDERER | `simple-icons`에서 지원하지 않는 identifier를 위한 내부 SVG variant와 generic fallback을 포함하는 technology-icon renderer를 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `6aa8ee3b90b1` | feat(stack): 공용 기술 스택 목록 추가 | B | RENDERER | rendering boundary에서 technology ID를 해석하고 선택적 item limit을 적용하며 각 technology의… | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `e37ea9c2819a` | feat(project): 프로젝트 링크 그룹 추가 | B | RENDERER | 공용 availability rule을 기반으로 project detail의 link group을 구현한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `1ef269fbdb49` | feat(project): 프로젝트 카드 링크 추가 | B | RENDERER | project card에서 사용하는 compact action 집합을 추가하고, link는 중앙화된 card-link selector에서 가져온다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b72c52a22690` | feat(project): 프로젝트 카드 프리미티브 추가 | B | RENDERER | detail navigation, screenshot, deployment badge, summary, stack, highlight, debug provenance, card action을 조합하는 재사용 가능한 project-card primitive를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `43f0b0cb2e06` | feat(ui): 공용 섹션 제목 추가 | B | - | title, 선택적 body copy, 선택적 content-source hint를 위한 공통 section-heading primitive를 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `07dd465dbe20` | feat(home): 디자인 대표 프로젝트 섹션 추가 | B | RENDERER | 공용 heading, reveal, project-card primitive를 사용해 design home의 설정 가능한 featured-project section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `33bec9cf6325` | feat(home): 클래식 대표 프로젝트 섹션 추가 | B | RENDERER | classic home에 compact한 single-lead featured-project section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `afaf5a393518` | feat(home): 작업 지표 섹션 추가 | B | RENDERER | 공용 work-map section을 추가하고 표시할 count를 presentation JSON에 저장하는 대신 portfolio content에서 파생한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `48559efebf68` | feat(stack): 기술 스택 마키 프리미티브 추가 | B | RENDERER | canonical technology list의 제한된 subset으로 stack marquee의 semantic structure를 만든다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `3b9c1a636356` | style(stack): 기술 스택 마키 동작 추가 | B | RENDERER | marquee의 masked overflow, max-content track, 연속 이동, hover pause를 구현한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `df26861cdc24` | feat(home): 기술 집중 영역 추가 | B | RENDERER | 구조화된 skill focus area를 기반으로 공용 technical-focus section을 추가하고, 각 home template의 section configuration을 통해 연결한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `e3aebedaa46b` | feat(home): 선택 기술 스택 영역 추가 | B | RENDERER | 설정된 skill group이 참조하는 technology ID를 수집하고 canonical technology catalog를 해당 집합으로 filtering해 selected-stack home section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `f60edf14dae0` | feat(journey): 여정 날짜와 카드 프리미티브 추가 | B | RENDERER | 단일 날짜, 기간, 진행 중 상태, category label, description, 선택적 project link를 일관되게 처리하는 journey formatting 및 card primitive를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `3c0a1154ba08` | feat(journey): 중앙선 여정 목록 추가 | B | RENDERER | paired centerline journey layout을 semantic ordered list로 구현한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b3182e35aed0` | feat(journey): 여정 목록 변형 연결 | B | RENDERER | compact와 paired-centerline variant 및 명시적인 animation option을 제공하는 단일 `JourneyList` interface를 노출한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `377fa128f82b` | style(journey): 여정 타임라인 시각 계층 추가 | B | RENDERER | compact journey list에 연속 guide line, node, card hierarchy, reveal transition을 적용한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `7995a3cf5435` | style(journey): 데스크톱 중앙선 여정 구성 | B | RENDERER | paired centerline timeline의 desktop geometry를 추가한다. 중앙 guide, 시작 node, 3-column pair row, 마지막 unpaired card의 중앙 정렬 처리, template-aware… | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `6394188022fd` | style(journey): 모바일 중앙선 여정 구성 | B | RENDERER | paired journey layout을 왼쪽 guide가 있는 single-column mobile timeline으로 변환한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `9a107fe185cf` | feat(home): 공용 여정 섹션 추가 | B | RENDERER | paired animated journey renderer를 사용하는 공용 home journey section을 추가하고 두 template configuration에 연결한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `bb8ccf341f39` | feat(home): 연락 미리보기 추가 | B | RENDERER | 현재 availability 문구와 portfolio domain helper가 선택한 preferred contact link를 결합한 공용 contact-preview section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `e3fc25f46b42` | feat(projects): 프로젝트 그룹 정렬 규칙 추가 | B | RENDERER | project-index data를 결정적으로 grouping하고 ordering하는 규칙을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `cd2eac06b220` | feat(projects): 디자인 프로젝트 소개 영역 추가 | B | RENDERER | 활성 project collection을 기반으로 design project index의 hero와 통계를 구현한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `e547aafcb77a` | feat(projects): 디자인 대표 프로젝트 목록 추가 | B | RENDERER | 공용 project card와 첫 항목에 우선순위를 둔 media를 사용하는 design index의 featured-project section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `8f67e1990157` | feat(projects): 디자인 프로젝트 그룹 목록 추가 | B | RENDERER | 중앙화된 grouping 결과에 따라 design index의 나머지 project를 렌더링한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `6d5b1dbbd3ae` | feat(projects): 클래식 프로젝트 소개와 터미널 추가 | B | RENDERER | classic project index의 hero, 타입이 지정된 통계, terminal 형태의 group snapshot을 구현한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b7ed48a4d77c` | feat(projects): 클래식 대표 프로젝트 추가 | B | RENDERER | 하나의 lead project와 공용 featured card를 사용해 classic index의 selected-project 영역을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `76a3155e757d` | feat(projects): 클래식 그룹 인덱스 추가 | B | RENDERER | category 문구, group별 count, deployment badge, summary, 제한된 stack list, 내부 detail link를 포함하는 classic project의 밀도 높은 grouped index를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `7571f1400065` | feat(projects): 프로젝트 목록 route 연결 | B | ROUTING, RENDERER | `/projects`를 통합 content 및 query-state model에 연결한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `e5b26b762c50` | feat(project): 상세 화면 섹션 프리미티브 추가 | B | RENDERER | project detail page를 위한 재사용 가능한 title, two-column, list section primitive를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `06fff9a6e93b` | feat(project): 프로젝트 상세 소개 추가 | B | RENDERER | 상태를 보존하는 back navigation, category, period, role, deployment status, summary, description, 허용된 action, priority가 지정된 primary… | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `9c0c37fa5c3c` | feat(project): 프로젝트 문제와 해결 설명 추가 | B | RENDERER | 공용 two-column primitive를 사용해 project detail view에 독립적인 problem 및 solution section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `cabf3a0e378f` | feat(project): 프로젝트 구조와 증거 갤러리 추가 | B | RENDERER | project detail에 architecture section과 screenshot evidence gallery를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `1eac524fc8ff` | feat(project): 프로젝트 기술과 의사결정 추가 | B | RENDERER | 전체 technology stack과 decision, trade-off, result를 각각 분리한 list로 구성해 주요 case-study body를 완성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `d4c7f742fb4d` | feat(project): 프로젝트 상세 route 연결 | B | ROUTING, RENDERER | dynamic project-detail route를 추가하고 활성 project collection으로부터 static parameter를 생성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `7fe913796acb` | feat(about): 프로필과 원칙 소개 추가 | B | RENDERER | profile 및 presentation content로 About route를 만든다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `edf8e75716a3` | feat(about): 여정 요약 추가 | B | RENDERER | 기존 `JourneyList` abstraction을 통해 portfolio journey를 About page에 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `bea99bce4478` | feat(about): 기술 그룹 소개 추가 | B | RENDERER | 공용 stack-list renderer로 grouped technical skill을 About page에 추가하고 완성된 route를 site navigation에 노출한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `e655951b0706` | feat(resume): 이력 소개와 요약 추가 | B | RENDERER | profile identity, presentation이 소유한 hero copy, 선택적 download action, 구조화된 summary paragraph를 갖는 Resume route를 만든다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b399ce0c7f84` | feat(resume): 선택 프로젝트 경력 추가 | B | RENDERER | 설정된 resume project ID를 공용 selector로 해석해 Resume page에 selected project evidence를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `4d17fd7ab81b` | feat(resume): 교육 과정 요약 추가 | B | RENDERER | 구조화된 training entry를 Resume page에 추가하고 route를 content-driven site navigation에 노출한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `bfcdf44eb34c` | feat(contact): 연락 페이지 소개 추가 | B | RENDERER | profile identity와 contact 전용 title 및 introductory text를 사용해 Contact route를 만든다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `f344a492043c` | feat(contact): 선호 연락 수단과 안내 추가 | B | RENDERER | availability 상세 정보, preferred contact link, 설명 note를 추가해 Contact page를 완성하고 route를 site navigation에 등록한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `4000a8657a62` | style(project): 프로젝트 카드 상호작용 추가 | B | RENDERER | hover 시 project card와 screenshot에 lift 및 layered highlight feedback을 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `29bb40579cb2` | style(a11y): 동적 목록의 모션 감소 지원 | B | RENDERER, A11Y | reduced-motion override 범위를 technology chip과 experience 및 journey list의 animated guide 요소까지 확장한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `a1977dc7f026` | build(content): runtime 콘텐츠 검증 의존성 추가 | B | CONTENT, VALIDATION, DEPLOY | Zod를 runtime dependency로, `tsx`를 개발 시 TypeScript runner로 추가하고 생성된 lockfile을 갱신해 플랫폼별 전체 의존성 해석 결과를 기록한다. | 확립된 release process 안에서 이루어진 보조 build 또는 maintenance 작업이다. 유용하지만 핵심 architecture나 correctness를 규정하는 결정은 아니다. |
| `51ceb76ad88a` | feat(content): 콘텐츠 경로와 기본 식별자 schema 추가 | B | CONTENT, VALIDATION | non-empty string, 안정적인 content identifier, 6자리 color, 지원되는 link, local asset path, navigation item을 위한 재사용 가능한 schema로 runtime content validation을 시작한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `c2f3d376e96b` | feat(content): 사이트와 프로필 schema 추가 | B | CONTENT, VALIDATION | site 및 profile source를 위한 runtime schema를 추가한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `857fa82a2030` | feat(content): 링크와 배포 상태 schema 추가 | B | CONTENT, VALIDATION | content link, link placement, deployment status, project image를 위한 runtime enum과 strict object schema를 추가한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `f1163dc120bc` | feat(content): 프로젝트 분류와 지표 schema 추가 | B | CONTENT, VALIDATION | ordered project group과 declarative project metric을 위한 strict schema를 추가한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `a944c73f0557` | feat(content): 프로젝트 사례 schema 추가 | A | CONTENT, VALIDATION | project case-study source와 이를 포함하는 project catalog의 전체 runtime schema를 정의한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `807214624c87` | feat(content): 홈 표현 식별자 schema 추가 | B | CONTENT, VALIDATION | presentation configuration에서 사용하는 유한한 identifier를 추가한다. 지원하는 site design, 공용 home section, variant별 section order, work-map count key, project-page count… | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `97ff48de55b8` | feat(content): 프로젝트 목록 표현 schema 추가 | B | CONTENT, VALIDATION | design, classic, editorial, brutalist, cinematic variant 전체에 대해 project-index presentation model의 runtime validation을 추가한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `42a81197af82` | feat(content): 표현 공용 UI schema 추가 | B | CONTENT, VALIDATION | 기본 template registry와 shared UI copy를 위한 top-level presentation schema를 구성한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `a3825a49a055` | feat(content): Design과 Classic 홈 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | presentation schema 안에서 Design 및 Classic home configuration을 검증한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `2a02781859b8` | feat(content): Editorial 홈 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | Editorial shell과 home presentation에 runtime validation을 추가한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `23d5297b42bd` | feat(content): Brutalist 홈 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | Brutalist shell과 home configuration에 대한 runtime validation을 추가한다. debug framing, stamp 및 signal text, ordered section, primary/secondary hero action,… | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `ad07ab4b31a9` | feat(content): Cinematic 홈 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | Cinematic shell subtitle과 home composition에 runtime validation을 추가한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `3c873e373bbb` | feat(content): 공용 홈 섹션 schema 추가 | B | CONTENT, VALIDATION | template 간 공유하는 home section의 validation을 완성한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `edcf1eaa6f71` | feat(content): About과 Contact 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | About 및 Contact presentation content에 runtime schema를 추가한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `4eb0db7b9656` | feat(content): Interview Map 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | Interview Map page의 hero, track navigation, question/answer label, depth 및 reference metadata, empty state, item-count template, gap-section… | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `7f3c16b50990` | feat(content): Journey 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | presentation schema에 journey page의 semantic structure를 확장한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `50b78a557344` | feat(content): 프로젝트 상세 표현 schema 추가 | B | CONTENT, VALIDATION | presentation schema에 project-detail interface 전체 계약을 추가한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `4e2454cfc9c4` | feat(content): Resume 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | presentation schema에 résumé page의 전체 interface contract를 추가한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `d93ec9730edd` | feat(content): 기술과 경력 schema 추가 | B | CONTENT, VALIDATION | technology registry, skill presentation, experience history를 위한 runtime schema를 정의한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `6fc79f058744` | feat(content): 여정과 연락 schema 추가 | B | CONTENT, VALIDATION | chronological journey entry, global link, contact content의 runtime contract를 정의한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `03aacfddc364` | feat(content): Resume 콘텐츠 schema 추가 | B | CONTENT, VALIDATION, RENDERER | résumé content를 위한 strict runtime schema를 정의한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `80152dae761f` | feat(content): 여정 narrative schema 추가 | B | CONTENT, VALIDATION | portfolio의 decision-oriented journey narrative를 위한 strict schema를 정의한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `51ce1c15a0e5` | feat(content): Interview Map 콘텐츠 schema 추가 | B | CONTENT, VALIDATION, RENDERER | interview-evidence content를 위한 strict runtime schema를 정의한다. | 확립된 schema architecture를 사용해 runtime content contract를 확장한다. 중요한 일반 구현이지만 ingestion이나 저장소 전체 integrity를 확립하는 커밋은 아니다. |
| `d0a62a7da4bd` | feat(content): 큐레이션 schema와 타입 export 추가 | A | CONTENT, VALIDATION | portfolio-curation content를 위한 strict schema를 정의하고 schema에서 파생한 project type을 노출한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `d717c35cf80c` | refactor(content): 프로젝트 컬렉션 migration 경계 추가 | B | CONTENT, REFACTOR | `projects.json`을 flat array에서 object-backed catalog로 migration하기 위한 compatibility boundary를 추가한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `6caa6debdb01` | feat(content): 사이트와 프로필 starter 콘텐츠 구성 | B | CONTENT | 일반 placeholder를 일관된 starter identity, site map, contact policy, experience record로 교체한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `f8ea6376c65c` | feat(content): 링크와 기술 starter 콘텐츠 구성 | B | CONTENT | starter의 global link, technical focus, skill group, technology registry를 채운다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `247ad421101a` | feat(content): 프로젝트 starter 분류와 지표 구성 | B | CONTENT | project source를 flat array에서 명시적 group과 declarative metric을 가진 catalog로 변경한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `c58a1be43009` | feat(content): 프로젝트 starter 상세 구성 | B | CONTENT | portfolio의 전체 case-study model을 모두 사용하는 완전한 starter project를 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `83bd41a353ce` | feat(content): Resume와 여정 starter 콘텐츠 구성 | B | CONTENT, RENDERER | résumé 및 journey source에 완전한 starter record를 채운다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `7ba62b311776` | feat(content): Interview Map과 큐레이션 starter 콘텐츠 구성 | B | CONTENT, RENDERER | interview-evidence map과 portfolio-curation rationale을 위한 starter data를 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `96c8ba5733f5` | feat(content): 공용 UI 표현 콘텐츠 구성 | B | CONTENT | design과 route 전반에서 사용하는 shared interface-copy contract를 도입한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `9a7d41edfad0` | feat(content): Design과 Classic 홈 표현 콘텐츠 구성 | B | CONTENT, RENDERER | 기존 Design 및 Classic home variant의 presentation content를 완성한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `2b9b35d4b8de` | feat(content): 확장 디자인 홈 표현 콘텐츠 구성 | B | CONTENT | editorial, brutalist, cinematic design을 위한 완전한 home-page presentation contract를 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `8886459d1b0d` | feat(content): 공용 홈 섹션 표현 콘텐츠 구성 | B | CONTENT | 여러 design이 공유하는 home section의 placeholder copy를 완전한 문구로 교체한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `61d1976cde0d` | feat(content): 프로젝트 목록 표현 콘텐츠 구성 | B | CONTENT | 지원되는 모든 design의 projects-index presentation content를 완성한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `a6c72a6b3b34` | feat(content): 프로젝트 상세 표현 콘텐츠 구성 | B | CONTENT | project-detail presentation content를 완전한 case-file contract로 확장한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `20dfc298375c` | feat(content): About과 Journey 표현 콘텐츠 구성 | B | CONTENT, RENDERER | about 및 journey route의 presentation model을 확장한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `13c8c52c54d9` | feat(content): Interview Map과 Resume 표현 콘텐츠 구성 | B | CONTENT, RENDERER | résumé 및 interview-evidence route의 presentation content를 확장한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `a7a2000ff462` | feat(content): Contact 표현 콘텐츠와 최종 문서 형식 구성 | B | CONTENT, RENDERER | contact-page presentation contract를 완성하고 `presentation.json`을 최종 schema-oriented grouping으로 정규화한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `70e49ea34194` | feat(content): 콘텐츠 validation 오류 모델 추가 | A | CONTENT, VALIDATION | runtime content validation을 위한 구조화된 error model과 source inventory를 도입한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `830f02688d63` | feat(content): JSON 경로 진단 추가 | B | CONTENT, VALIDATION | schema error path를 결정적인 형식으로 표시하는 formatter를 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `d50870c8b8c4` | feat(content): JSON schema 파싱 경계 추가 | A | CONTENT, VALIDATION | raw JSON을 타입이 보장된 application data로 바꾸는 schema-parsing boundary를 추가한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `f8a4aa2109e8` | feat(content): 중복과 참조 진단 helper 추가 | B | CONTENT, VALIDATION | 중복 값과 해석되지 않는 identifier를 위한 공용 diagnostics를 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `b380f56f5d90` | feat(content): 내부 route 참조 검증 추가 | A | ARCH, CONTENT, VALIDATION | content에 선언된 internal URL을 검증하는 재사용 validator를 추가한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `03d2c9be0a43` | feat(content): 콘텐츠 파일 schema 파싱 연결 | S | ARCH, CONTENT, VALIDATION | 모든 portfolio content file을 하나의 loader에서 대응하는 runtime schema에 연결한다. | 하나의 loader를 모든 content file의 authoritative trust boundary로 만들기 때문에 핵심적이다. 이 경계가 없으면 이후 integrity, route, build 보장도 여전히 unchecked JSON 위에 놓이게 된다. |
| `b9d74d8ccf08` | feat(content): 콘텐츠 식별자 중복 검증 추가 | A | CONTENT, VALIDATION | 다른 content record가 의존하는 identifier와 ordering key에 대해 저장소 전체 uniqueness check를 추가한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `b87da7ca505c` | feat(content): 지원 디자인 구성 검증 추가 | A | CONTENT, VALIDATION | presentation template와 애플리케이션의 supported design registry 사이에 양방향 validation을 추가한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `6b9e10289b64` | feat(content): 사이트와 링크 route 참조 검증 추가 | A | ARCH, CONTENT, VALIDATION | global navigation entry와 content link에 internal-route validation을 적용한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `08b4ac81739f` | feat(content): 프로젝트 내부 참조 검증 추가 | A | CONTENT, VALIDATION | 각 project record 내부의 structural 및 referential validation을 추가한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `6514b4e0bcff` | feat(content): 지표와 Resume 참조 검증 추가 | B | CONTENT, VALIDATION, RENDERER | metric filter와 résumé project selection에 대한 referential check를 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `805072d7b610` | feat(content): 여정과 Interview 참조 검증 추가 | B | CONTENT, VALIDATION, RENDERER | journey 및 interview data에서 사용하는 모든 project reference로 content integrity check를 확장한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `d5afc69ae9da` | feat(content): 큐레이션과 연락 참조 검증 추가 | B | CONTENT, VALIDATION | curation project reference와 preferred contact-link reference까지 cross-file validation을 확장한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `85df59454b46` | refactor(content): schema 기반 핵심 콘텐츠 타입 연결 | A | ARCH, CONTENT, VALIDATION | 병렬로 hand-written page shape를 유지하는 대신 검증된 content schema를 기반으로 portfolio의 핵심 TypeScript contract를 다시 정의한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `16bdf03ce979` | feat(content): 여정과 큐레이션 콘텐츠 타입 추가 | B | CONTENT | journey narrative, interview evidence, portfolio curation을 위한 runtime-facing content contract를 정의한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `508e0b71024b` | refactor(content): 검증된 콘텐츠를 portfolio facade에 연결 | S | ARCH, CONTENT, VALIDATION | portfolio facade를 direct JSON import와 unchecked type assertion에서 validated `portfolioSource` 기반으로 전환한다. | selector와 route가 사용하는 단일 검증 data pipeline을 완성하고 parallel import와 중복 관계를 하나의 canonical application model로 대체하므로 핵심적이다. |
| `3e2e95a3a28c` | feat(content): 페이지 활성화 selector 추가 | B | CONTENT, ROUTING | 사이트의 선택적 page flag를 위한 타입이 지정된 selector를 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `7c539b142d6d` | feat(content): 프로젝트 지표 selector 추가 | B | CONTENT | content-defined project metric을 평가하는 공용 evaluator를 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `daa6815a6dfa` | feat(project): 카드 링크를 콘텐츠 배치 기준으로 선택 | B | CONTENT, RENDERER | project-card action이 각 link에 선언된 `card` placement를 따르도록 변경한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b2e3a81e572f` | refactor(content): schema type import 경계 정리 | C | CONTENT, VALIDATION, REFACTOR | portfolio type facade에서 사용하지 않는 `ProjectMetricFilter` import를 제거한다. | 주로 formatting, declaration 순서 정리 또는 국소적인 maintenance에 해당한다. 동작, ownership, 프로젝트 전체 invariant를 실질적으로 바꾸지 않는다. |
| `1f4f93ad9a0f` | feat(metadata): 콘텐츠 기반 site metadata 추가 | A | CONTENT, SEO | 정적인 layout metadata를 validated portfolio content에서 생성하는 request-aware metadata로 교체한다. | 여러 route의 publication identity, indexing 또는 안전한 machine-readable output을 제어해 crawler에 노출되는 상태를 검증된 content와 일치시키므로 중요하다. |
| `ff2ecadf3489` | feat(content): 저장소 자산 참조 경계 검증 | A | CONTENT, VALIDATION | portfolio content가 참조하는 모든 local asset에 repository-boundary validation을 추가한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `0e0ed9e50323` | build(content): 콘텐츠 검사 명령 추가 | B | CONTENT, DEPLOY | 독립적으로 실행할 수 있는 content-validation entry point를 추가하고 `content:check`로 노출한다. | 확립된 release process 안에서 이루어진 보조 build 또는 maintenance 작업이다. 유용하지만 핵심 architecture나 correctness를 규정하는 결정은 아니다. |
| `28b0db56190f` | build(content): 콘텐츠 검사를 prebuild에 연결 | A | CONTENT, DEPLOY | content validation command를 package의 `prebuild` lifecycle에 연결한다. | local tooling만 조정하는 수준이 아니라 재현 가능한 production build 및 runtime boundary를 변경하거나 강화하므로 중요하다. |
| `0facaf123f29` | feat(journey): 여정 route 소개 추가 | B | ROUTING, RENDERER | portfolio의 표준 page lifecycle을 사용하는 선택적 route로 journey narrative를 도입한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `fa94b86ac46e` | feat(journey): 결정 milestone 목록 추가 | B | RENDERER | journey route에 ordered milestone narrative를 도입한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `e292451824ba` | feat(journey): milestone 결정 근거 추가 | B | RENDERER | 각 journey milestone을 title만 있는 항목에서 명시적인 state–reason–result record로 확장한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `ba8130c82d16` | feat(journey): milestone 프로젝트 근거 연결 | B | RENDERER | journey milestone을 이를 뒷받침하는 project에 연결한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `a1136f34f998` | feat(journey): 전체 여정 타임라인 추가 | B | RENDERER | paired-centerline timeline variant를 사용해 전체 journey collection을 전용 route에 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `694cf57b0162` | feat(journey): 현재 방향 요약 추가 | B | RENDERER | journey route의 마지막에 current-position summary를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `ddba753f7f51` | feat(interview-map): 근거 route 소개 추가 | B | ROUTING, RENDERER | interview-evidence map을 선택적이면서 독립적으로 주소를 가질 수 있는 route로 도입한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `cb161d118ddd` | feat(interview-map): 인터뷰 주제 인덱스 추가 | B | RENDERER | interview map 탐색을 위한 presentation-driven topic index를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `9704aa5f7b59` | feat(interview-map): 근거 공백 목록 추가 | B | RENDERER | interview map에 전용 evidence-gap section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `a3fb132d33f7` | feat(interview-map): 주제 track 소개 추가 | B | RENDERER | 각 interview-map track을 위한 전용 section boundary를 도입한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `cdcbbc937490` | feat(interview-map): 주제와 외부 참조 표 추가 | B | RENDERER | 각 interview track에 topic과 external reference를 짝지은 구조화된 question table을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `1cd28c140350` | feat(interview-map): 프로젝트 답변 근거 연결 | B | RENDERER | interview question을 answer record에 선언된 project evidence 및 depth note와 연결한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `383a3b86e119` | feat(content): 프로젝트 지표를 화면에 적용 | B | CONTENT | route-level project statistic을 공용 metric selector에 연결하고 detail view에 project highlight를 노출한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `119ff9a92090` | feat(content): 링크 배치 selector 추가 | B | CONTENT | link placement를 공용 `LinkPlacement` type으로 공식화하고 site-level 및 project-level link selector를 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `2d87b62dcce8` | refactor(project): 상세 링크를 배치 기준으로 선택 | B | RENDERER, REFACTOR | runtime visibility와 선택적 case-study exclusion을 적용하기 전에 project-detail action을 `getProjectDetailLinks`를 통해 선택하도록 변경한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `ee2c118a76d6` | feat(content): 홈 링크를 배치 기준으로 선택 | B | CONTENT | 두 home design의 call to action 선택 기준을 하드코딩한 link type 집합에서 각 link에 선언된 `hero` placement로 변경한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `bc651dd85e14` | feat(content): 공용 UI 접근성 문구 적용 | B | CONTENT, A11Y | 하드코딩된 공용 interface 및 accessibility text를 presentation UI contract의 값으로 교체한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `9e99c9531cb8` | feat(contact): 연락 링크 빈 상태 추가 | B | RENDERER | contact channel에 명시적인 empty state를 추가하고 각 link를 최소 touch target 크기로 정규화한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `50199be241c8` | feat(routes): 비활성 페이지 route 차단 | A | ARCH, ROUTING | about, contact, projects, project detail, resume의 route boundary에서 page-enablement setting을 강제한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `51806e1875e7` | style(theme): 디자인 속성을 site shell로 승격 | B | ROUTING, RENDERER | active design marker를 home-content selector에서 공용 site shell로 끌어올린다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `af9191fc15ad` | style(a11y): 모바일 헤더와 동작 감소 보강 | A | ARCH, RENDERER, A11Y | 전역 reduced-motion contract를 강화하고 mobile header effect를 단순화한다. | local presentation defect가 사이트 전체 문제로 이어질 수 있는 design/route 공통 accessibility invariant를 복원하거나 검증하므로 중요하다. |
| `a00a6bf1af58` | feat(about): 프로필 사진 소개 추가 | B | RENDERER | 공용 `ProfilePhoto` component를 통해 optional profile photograph를 about hero에 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `4b9c2894a756` | feat(about): 기술 집중 영역 추가 | B | RENDERER | about page의 skills section을 확장해 technical focus area와 구체적인 tool group을 구분한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `a7723eb193eb` | feat(about): 경력 목록 추가 | B | RENDERER | about page에 chronological experience list를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `924bcd75aade` | feat(about): 큐레이션 기준 소개 추가 | B | CONTENT, RENDERER | about route에 curation section을 도입하고 site의 page-enablement policy로 gating한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `80903ec6197f` | feat(about): 큐레이션 프로젝트 범주 추가 | B | CONTENT, RENDERER | about page에 project-backed curation category를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `a65f27363837` | feat(about): 큐레이션 공백과 재검토 추가 | B | CONTENT, RENDERER | 명시적인 omission과 next review checkpoint를 추가해 curation narrative를 완성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `f64763cffcff` | feat(resume): 프로필 위치와 가용성 추가 | B | RENDERER | profile location과 availability를 두 field의 definition list로 resume hero에 노출한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `3c113f1995ff` | feat(resume): 경력 이력 추가 | B | RENDERER | resume route에 조건부 experience-history section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `732ae5a6785c` | feat(resume): 교육 이력 추가 | B | RENDERER | resume route에 조건부 education section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `579ea168daa8` | feat(resume): Resume 안내 기록 추가 | B | RENDERER | structured content를 직접 사용하는 optional resume notes section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `418e7bc1d8bb` | feat(designs): site design 정의 registry 추가 | A | ARCH, RENDERER | 사이트에서 사용할 수 있는 visual design과 preview palette를 위한 단일 registry를 구축한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `e14202198948` | feat(designs): route renderer 계약 추가 | A | ARCH, ROUTING, RENDERER | portfolio route 전체를 렌더링하는 design의 공용 input contract를 정의한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `6fc28f4c6586` | refactor(designs): 확장 renderer lazy registry 추가 | A | ARCH, RENDERER, REFACTOR | design별 route renderer를 위한 registry boundary를 도입한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `cc13abb3b66f` | style(designs): 디자인 선택기 기본 메뉴 구성 | B | RENDERER | design selector의 기본 desktop presentation을 anchored disclosure menu 형태로 구성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `28dfc5087474` | style(designs): 모바일 디자인 선택 sheet 구성 | B | RENDERER | design selector를 modal backdrop, 제한된 scrolling, safe-area를 고려한 padding을 갖는 mobile bottom sheet로 변환한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `e43e8addd7f3` | feat(designs): 디자인 선택기 상태와 trigger 추가 | B | RENDERER | route를 보존하는 design switcher의 client-side state와 trigger를 도입한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `c69ef85c98b2` | feat(designs): 디자인 선택 목록과 닫기 동작 추가 | A | ARCH, RENDERER | 등록된 design의 ordered list, active-state semantics, palette preview, 명시적인 close behavior를 추가해 design-switcher sheet를 완성한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `7f77ec1912d6` | feat(shell): 현재 navigation 상태와 모바일 메뉴 추가 | B | ROUTING | global navigation을 route-aware하게 만들고 keyboard로 조작할 수 있는 mobile menu를 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `b9571c485013` | feat(shell): 디자인 선택기를 공용 shell에 연결 | A | ARCH, ROUTING | design switcher를 공용 site header에 통합하고 shell 수준의 interface text를 presentation content에서 가져오도록 한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `dc2cf72a768d` | refactor(routes): 확장 디자인 renderer 위임 경계 추가 | S | ARCH, ROUTING, RENDERER | 모든 public route에서 App Router page 외부에 등록된 design-specific renderer로 위임하는 공통 boundary를 추가한다. | 모든 public route에서 framework 책임과 full-site presentation을 분리해 loading, routing, not-found policy를 중복하지 않고 독립적인 visual system을 구현할 수 있게 하므로 핵심적이다. |
| `7546ac248334` | style(editorial): 지면과 masthead 토큰 구성 | B | RENDERER | scoped color token, paper texture, focus treatment, reset, skip-link behavior, masthead geometry를 포함하는 editorial design의 기반 stylesheet를 만든다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `80b86ed4a1ff` | style(editorial): wordmark와 navigation 계층 구성 | B | ROUTING, RENDERER | editorial shell의 wordmark, desktop navigation, design-switcher slot, footer의 주요 call to action을 정의한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `4d646fb2924a` | style(editorial): footer와 hero 활자 체계 구성 | B | RENDERER | editorial typography primitive와 home hero 상단 구조를 확립한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `6434531645b7` | style(editorial): hero spread 레이아웃 구성 | B | RENDERER | editorial hero의 하단 절반을 완성하고 주요 content section에 공용 spread spacing을 도입한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `a97066f07dfd` | style(editorial): lead story와 매체 표현 구성 | B | RENDERER | editorial lead-story treatment와 frame media의 공통 동작을 정의한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `a9674cf2fa94` | style(editorial): 이미지 프레임과 feature 열 구성 | B | RENDERER | image placeholder, project-index row, split feature column을 위한 재사용 가능한 editorial treatment를 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `4708ca281c16` | style(editorial): 원칙 목록과 contact strip 구성 | B | RENDERER | principle card, sidebar feature, text tag, cross-page contact strip의 editorial treatment를 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `ebe23d211852` | style(editorial): contact와 archive 지면 구성 | B | RENDERER | editorial contact strip을 완성하고 공용 page 및 archive layout primitive를 확립한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `931226268687` | style(editorial): archive group과 case link 구성 | B | RENDERER | editorial archive group과 project case study 도입부의 structural styling을 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `2cc074f728cb` | style(editorial): case link와 dark section 구성 | B | RENDERER | bordered link row, 제한 없는 cover image, 3-column narrative spread, drop-cap typography, dark architecture section을 추가해 editorial case-study stylesheet를 확장한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `34a9c958801c` | style(editorial): dark section과 decision 열 구성 | B | RENDERER | architecture evidence, image pair, paired decision section을 위한 Editorial desktop composition을 stylesheet에 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `13f49ab0c1f7` | style(editorial): 결과 spread와 profile facts 구성 | B | RENDERER | result summary, case-study exit navigation, missing-project feedback, profile hero를 위한 Editorial layout을 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `124f6a6fec62` | style(editorial): profile summary와 skill group 구성 | B | RENDERER | bounded portrait, 3-column principles grid, split skills spread를 추가해 profile 및 skills composition을 완성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `c28bb0a5eb01` | style(editorial): 기술 그룹과 curation 본문 구성 | B | RENDERER | technology group과 experience entry에 재사용할 row structure를 정의하고 asymmetric curation spread를 도입한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `4ce0333849cc` | style(editorial): curation panel과 프로젝트 목록 구성 | B | RENDERER | numbered panel header, 2-column criterion grid, category 및 omission card, wrapping project link로 상세 curation presentation을 구성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `586626a79cb1` | style(editorial): curation link와 resume 도입부 구성 | B | RENDERER | touch-sized project link와 dark next-review panel로 curation 영역을 마무리하고 resume header 및 2-column body를 구성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `21d63d1975b3` | style(editorial): resume identity와 프로젝트 행 구성 | B | RENDERER | compact identity definition list, numbered section grid, 반복되는 project/training row로 resume의 information hierarchy를 정의한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `543f4b1062e3` | style(editorial): resume 사례와 contact 본문 구성 | B | RENDERER | resume entry에 case-study link treatment를 추가하고 contact page의 hero, availability summary, contact channel, supporting note를 구성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `e988e97415af` | style(editorial): contact note와 milestone link 구성 | B | RENDERER | contact note를 compact supporting list로 스타일링하고 journey milestone spread를 date/story composition으로 구성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `1da39994d9e3` | style(editorial): milestone과 현재 방향 지면 구성 | B | RENDERER | secondary journey timeline과 high-contrast current-position panel을 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `0c3ba4ca1d48` | style(editorial): 현재 방향과 interview track 구성 | B | RENDERER | current-position typography를 완성하고 interview map에 sticky horizontal-scroll chapter navigator를 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `af5688dd1c3a` | style(editorial): interview 답변과 근거 표현 구성 | B | RENDERER | interview ledger를 paired question/evidence column으로 정의한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `0c7b77c2528a` | style(editorial): 공백 목록과 중형 화면 경계 구성 | B | RENDERER | dark unresolved-gaps spread를 도입하고 1180px boundary에서 Editorial shell의 중간 화면 대응을 시작한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `a854cb45cc22` | style(editorial): tablet masthead와 hero 재배치 | B | RENDERER | tablet width에서 desktop navigation을 native disclosure menu로 교체하고 home hero를 8-column grid에 재배치한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `3f82e8a7c308` | style(editorial): tablet route 지면 재배치 | B | ROUTING, RENDERER | 주요 route spread를 tablet에 맞는 single-column flow로 접고 hierarchy상 필요한 곳만 선택적으로 2-column 관계를 유지한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `10a442435e1a` | style(editorial): tablet 세부 간격 정리 | B | RENDERER | tablet journey timeline의 introductory column을 읽기 좋은 폭으로 제한한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `afaf24796399` | style(editorial): mobile navigation과 hero 구성 | B | ROUTING, RENDERER | masthead metadata를 단순화하고 주요 route grid를 stack하며 home hero를 linear flex flow로 바꾸는 첫 mobile breakpoint를 구성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `499c0e660caf` | style(editorial): mobile 본문과 표 구성 | B | RENDERER | page hero, case metadata, archive fact, profile content, resume section, milestone, curation panel, interview question의 mobile reflow를 완성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `f7a81e0fe1d3` | style(editorial): mobile footer와 동작 감소 구성 | B | RENDERER, A11Y | small-screen spacing 조정을 마무리하고 Editorial renderer에 repository-wide reduced-motion contract를 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `1c55d7422273` | feat(editorial): route 계약과 navigation helper 추가 | B | ROUTING, RENDERER | closed route-name union과 content, optional project detail, current path, debug mode를 위한 공용 props contract로 Editorial renderer의 route boundary를 확립한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `e078d79d24c8` | feat(editorial): debug note와 이미지 프레임 추가 | B | RENDERER | 두 개의 집중된 presentation primitive를 도입한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `1b353fe5ba7b` | feat(editorial): 콘텐츠 링크와 방향 표식 추가 | B | CONTENT, RENDERER | internal application path와 external destination을 구분하는 content-aware link renderer를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `794615a037d3` | feat(editorial): masthead와 footer shell 추가 | B | ROUTING, RENDERER | content-driven desktop/mobile navigation, design switching, main-content targeting, footer link를 중심으로 공용 Editorial page shell을 구성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b7fd9118025e` | feat(editorial): 섹션 표식과 프로젝트 인덱스 추가 | B | RENDERER | section numbering과 project-index row를 재사용 가능한 Editorial component로 추출한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `5c82371743ba` | feat(editorial): 홈 hero spread 추가 | B | RENDERER | Editorial home route를 content-directed section dispatcher로 시작하고 hero spread를 구현한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `96ba59901181` | feat(editorial): 홈 lead story 추가 | B | RENDERER | 첫 selected project를 full narrative feature로 사용하는 lead-project section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `4c8270522400` | feat(editorial): 홈 대표 프로젝트 목록 추가 | B | RENDERER | lead story에 이미 사용한 project를 제외한 나머지 selected project를 공용 index-row component로 렌더링한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `983131c5a266` | feat(editorial): 홈 원칙과 기술 sidebar 추가 | B | RENDERER | profile principle을 primary narrative로, current journey와 technology stack을 supporting context로 제시하는 2-part home section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `f01b60fc368e` | feat(editorial): 홈 contact strip 추가 | B | RENDERER | compact contact call-to-action으로 home section dispatcher를 완성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `4e69ba2ee361` | feat(editorial): 프로젝트 archive route 추가 | B | ROUTING, RENDERER | Editorial project archive를 content-driven route로 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `c722cdd08ef8` | feat(editorial): 프로젝트 상세 서사와 구조 추가 | B | RENDERER | 복구 가능한 missing-project state, project fact, canonical detail link, cover media, problem/solution… | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `f38556a17e8b` | feat(editorial): 프로젝트 증거와 결과 spread 추가 | B | RENDERER | highlight, 선택적 supporting-image gallery, 분리된 decision/trade-off column, project result, archive로 돌아가는 route를 추가해 case-study narrative를 완성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `cc1b2233287f` | feat(editorial): About 정체성과 원칙 소개 추가 | B | RENDERER | shared profile model을 사용해 Editorial About route의 identity 및 principles section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `5f0193979568` | feat(editorial): About 기술과 경력 소개 추가 | B | RENDERER | About route에 focus area, grouped skill, chronological experience record를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `5c95665ca9d2` | feat(editorial): About 큐레이션 기준 추가 | B | CONTENT, RENDERER | curation page capability가 enabled일 때만 About route에 curation criterion을 노출한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `4a7c3a3c9cde` | feat(editorial): About 큐레이션 범주 추가 | B | CONTENT, RENDERER | configured project identifier를 canonical project record로 다시 해석하는 curation category를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `c0d0004e9355` | feat(editorial): About 큐레이션 공백과 재검토 추가 | B | CONTENT, RENDERER | 명시적인 omission record와 next-review section으로 curation narrative를 완성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `119d19ab41b1` | feat(editorial): Resume 정체성과 프로젝트 경력 추가 | B | RENDERER | optional download action, profile identity fact, narrative summary, `getResumeProjects`가 선택한 project를 포함하는 Editorial résumé route를 도입한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `4df2710fa7f9` | feat(editorial): Resume 경력과 교육 기록 추가 | B | RENDERER | résumé body를 experience, training, education, notes section으로 분리해 완성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `61d6952850cd` | feat(editorial): Contact desk route 추가 | B | ROUTING, RENDERER | 공용 preferred-contact ordering을 기반으로 Editorial contact route를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `08fa527b9b65` | feat(editorial): Journey milestone spread 추가 | B | RENDERER | Journey route의 milestone narrative를 도입한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `96b66af4d5a7` | feat(editorial): Journey timeline과 현재 방향 추가 | B | RENDERER | Journey route를 더 넓은 dated archive와 current-position statement로 확장한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `5e2f37861d3d` | feat(editorial): Interview Map 소개와 chapter 추가 | B | RENDERER | Interview Map의 introduction, external reference repository, configured interview track에서 생성한 in-page chapter index를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `94deba32f56a` | feat(editorial): Interview 답변 근거와 공백 추가 | B | RENDERER | track, question, source reference, project-backed answer, 선언된 evidence gap을 렌더링해 Interview Map을 완성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `46e23d922c2e` | feat(editorial): route dispatcher 추가 | A | ARCH, ROUTING, RENDERER | 하나의 exhaustive dispatcher에서 지원하는 모든 Editorial route를 전용 renderer에 연결한 뒤 선택된 route를 공용 `EditorialShell` 안에 배치한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `ea073db5f785` | style(editorial): 반응형 media rule 정렬 | C | RENDERER | selector와 declaration은 바꾸지 않고 indentation을 정규화하고 인접한 media-query block을 통합한다. | 주로 formatting, declaration 순서 정리 또는 국소적인 maintenance에 해당한다. 동작, ownership, 프로젝트 전체 invariant를 실질적으로 바꾸지 않는다. |
| `c6acfe562694` | feat(editorial): renderer를 디자인 registry에 활성화 | A | ARCH, RENDERER | 완성된 Editorial renderer를 site의 selectable design contract에 등록한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `162542118ba4` | style(brutalist): 화면 토큰과 brand mark 구성 | B | RENDERER | Brutalist renderer의 scoped visual token, typography, sizing model, 초기 shell element를 확립한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `a2539ef309d1` | style(brutalist): header 상태와 home hero 구성 | B | RENDERER | 명시적인 status, design-switcher, navigation, debug, home-hero region을 중심으로 desktop shell을 구성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `1faf77ef9916` | style(brutalist): hero stamp와 action row 구성 | B | RENDERER | home hero의 stamp, copy column, oversized title, summary, 유연한 action row를 정의한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `75913149fe24` | style(brutalist): 주요 action과 section 경계 구성 | B | RENDERER | 공용 high-contrast action vocabulary, 4-column metric band, animated signal strip, 일관된 section boundary를 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `f4e53be5ea42` | style(brutalist): section header와 프로젝트 지표 구성 | B | RENDERER | numbered section-header grid와 재사용 가능한 project-index row를 도입한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `ebfe79d62e53` | style(brutalist): 프로젝트 지표와 card 번호 구성 | B | RENDERER | project-index metadata, tag chip, action affordance, 첫 principle-card system을 완성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `aaf26e755213` | style(brutalist): 원칙 카드와 contact band 구성 | B | RENDERER | 읽기 쉬운 principle card, wrapping technology wall, 구조화된 compact timeline, 큰 contact band로 home composition을 확장한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `16336e1dc469` | style(brutalist): contact 링크와 프로젝트 group 구성 | B | RENDERER | contact-band action styling을 완성하고 공용 page-hero, inline-metric, grouped-project archive layout을 확립한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `2660465c0904` | style(brutalist): 교차 group과 상세 lead 구성 | B | RENDERER | 교차되는 project group을 시각적으로 구분하고 case-study lead layout을 도입한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `4621b0a3cb1f` | style(brutalist): 상세 fact와 소개 본문 구성 | B | RENDERER | case-study fact grid, 재사용 media frame, placeholder treatment, introductory narrative band를 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `1d5445cc6f4a` | style(brutalist): 상세 본문과 gallery grid 구성 | B | RENDERER | 반복되는 labeled section, numbered list, 2-column gallery를 중심으로 긴 case-study evidence를 구조화한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `bb5008a8c7b3` | style(brutalist): 다음 프로젝트와 focus card 구성 | B | RENDERER, A11Y | case-study continuation 및 recovery state를 추가하고 About route의 identity, portrait, skills 기반을 구성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `8de2180bcc58` | style(brutalist): focus card와 criteria grid 구성 | B | RENDERER, A11Y | focus 및 skill card를 완성하고 numbered criterion을 갖는 dark curation section을 도입한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `a34cd7cd88bf` | style(brutalist): criteria 본문과 재검토 영역 구성 | B | RENDERER | category card, omission record, bounded next-review panel로 curation presentation을 완성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `5ca14417cf22` | style(brutalist): 재검토와 resume entry 구성 | B | RENDERER | review panel을 마무리하고 résumé의 반복 section 및 entry grammar를 확립한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `fad7f0216645` | style(brutalist): resume 본문과 contact hero 구성 | B | RENDERER | résumé project row와 note를 완성하고 Contact route의 blue hero를 도입한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `8175392db042` | style(brutalist): contact 상태와 note 목록 구성 | B | RENDERER | contact availability badge, channel grid, 재사용 가능한 note-list 기반을 구성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `6fa3a9dc8665` | style(brutalist): note 목록과 anchor link 구성 | B | RENDERER | note 및 evidence-gap row를 완성하고 Journey milestone card를 정의한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `242ba8e66e0b` | style(brutalist): archive timeline과 track navigation 구성 | B | ROUTING, RENDERER | 더 넓은 journey archive, current-position callout, Interview Map track navigation용 shell을 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `95e55eda6c51` | style(brutalist): track 목록과 question prompt 구성 | B | RENDERER | in-page track index를 완성하고 Interview Map의 track 및 question hierarchy를 확립한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `11f229d630e9` | style(brutalist): 답변 근거와 footer lead 구성 | B | RENDERER | question reference와 answer evidence를 완성하고 명시적인 empty-answer presentation 및 footer lead를 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `b170c73a36d0` | style(brutalist): footer metadata와 blink 동작 구성 | B | RENDERER, SEO | footer metadata를 완성하고 공용 dashed empty-state block과 두 renderer animation을 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `f810c49022be` | style(brutalist): tablet grid 재배치 | B | RENDERER | Brutalist desktop grid를 tablet width에 맞게 재배치한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `b57da6a41419` | style(brutalist): mobile header와 hero 구성 | B | RENDERER | desktop navigation을 native `<details>` mobile menu로 교체하고 좁은 폭에서 header의 status와 debug content를 stack한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `8168bc76c3e3` | style(brutalist): mobile 프로젝트와 상세 화면 구성 | B | RENDERER | home metric, section header, project row, principle, skill, curation card, gallery를 mobile reading order로 접는다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `5551f3fdbb94` | style(brutalist): mobile profile과 resume 구성 | B | RENDERER | page hero, project detail, curation, résumé, contact, current-position section까지 mobile reflow를 확장한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `7c08aea7a2f7` | style(brutalist): mobile 여정과 interview 구성 | B | RENDERER | journey milestone, archive entry, interview track, footer metadata, missing-page recovery의 narrow-screen 처리를 완성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `077ff3d49f30` | style(brutalist): 소형 화면과 인쇄 경계 구성 | B | RENDERER | 가장 작은 viewport, reduced-motion, print boundary를 강화한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `4e54f8fef892` | style(brutalist): 반응형 media rule 정렬 | C | RENDERER | 반복된 720px media query를 하나의 block으로 통합하고 declaration을 바꾸지 않은 채 indentation을 정규화한다. | 주로 formatting, declaration 순서 정리 또는 국소적인 maintenance에 해당한다. 동작, ownership, 프로젝트 전체 invariant를 실질적으로 바꾸지 않는다. |
| `3e6ec5262bdd` | feat(brutalist): 콘텐츠와 탐색 조회 도우미 추가 | B | CONTENT, ROUTING, RENDERER | Brutalist renderer의 content 및 navigation adapter layer를 확립한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `08a2b0c0998f` | feat(brutalist): route 레이블과 기본 shell 구성 | B | ROUTING, RENDERER | 공용 Brutalist shell과 exhaustive route-label resolver를 도입한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `cf2fdb36f9fc` | feat(brutalist): 주 탐색과 모바일 메뉴 추가 | B | ROUTING, RENDERER | canonical site navigation을 desktop 및 native mobile control에 모두 연결하고 모든 internal route에서 selected renderer와 content-debug query를 보존한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `5b44afbc46ef` | feat(brutalist): footer와 홈 히어로 연결 | B | RENDERER | 공용 footer와 첫 Home section을 canonical portfolio content에 연결한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b477ba477127` | feat(brutalist): 홈 섹션 공용 프리미티브 추가 | B | RENDERER | Brutalist home 및 archive view에서 반복되는 visual/routing unit을 추출한다. decorative signal strip, numbered section header, renderer state를 보존하는 project row, contact… | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b30b9b1c3505` | feat(brutalist): 대표 작업과 작업 원칙 구성 | B | RENDERER | configured Home sequence에 signal, featured-project, system section을 추가하고 Projects route hero를 구성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `85ea663aaf19` | feat(brutalist): 홈 여정과 프로젝트 archive 구성 | B | RENDERER | 가장 최근 journey record 네 개와 contact band를 추가해 Home sequence를 완성하고 canonical project group으로 Projects archive를 렌더링한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `d6b9a99e11ae` | feat(brutalist): 프로젝트 상세 표시 프리미티브 추가 | B | RENDERER | project case study에 필요한 재사용 primitive를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b8268f47e89a` | feat(brutalist): 프로젝트 상세 hero와 소개 구성 | B | RENDERER | project-detail route의 valid 및 missing-project path를 확립한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `05b838d52a8b` | feat(brutalist): 프로젝트 상세 본문과 gallery 구성 | B | RENDERER | problem, solution, architecture, screenshot, resolved stack data로 주요 project case study를 구성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `80724a26820b` | feat(brutalist): 프로필과 기술 소개 구성 | B | RENDERER | canonical profile content로 About route의 identity, principle, focus area, skill group을 구현한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `3399b55c3aee` | feat(brutalist): 큐레이션과 경력 소개 구성 | B | CONTENT, RENDERER | About을 experience history와 feature-gated curation archive로 확장한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `70cf13ef1715` | feat(brutalist): 이력 hero와 경력 요약 구성 | B | RENDERER | identity 및 availability context, optional download action, numbered summary statement, dated experience entry를 갖는 Résumé route를 구성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `1ea2a1345b76` | feat(brutalist): 프로젝트 결과와 의사결정 구성 | B | RENDERER | highlight, decision, trade-off, result를 추가해 project case-study evidence sequence를 완성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `5fa378250d64` | feat(brutalist): 선택 프로젝트와 이력 세부 구성 | B | RENDERER | selected project evidence, training, education, additional note를 추가해 Résumé를 완성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b535539ae016` | feat(brutalist): 연락 수단과 안내 구성 | B | RENDERER | preferred communication channel을 중심으로 Contact route를 구현하되 placement-based fallback을 제공한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `15a765ecb2aa` | feat(brutalist): 여정 milestone 구성 | B | RENDERER | Journey route의 explanatory milestone model을 구성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `388446b1a982` | feat(brutalist): 여정 archive와 인터뷰 map 머리말 구성 | B | RENDERER | full chronological archive와 current-position statement로 Journey를 완성한 뒤 Interview Map hero와 track index를 구성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `f3fc6200a45b` | feat(brutalist): 인터뷰 근거 archive 구성 | B | RENDERER | Interview Map을 project evidence가 뒷받침하는 question track으로 렌더링한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `da8e59d56783` | feat(brutalist): 인터뷰 근거 공백 구성 | B | RENDERER | Interview Map에 전용 evidence-gap section을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `e6268c4b7c74` | refactor(brutalist): 내부 helper 공개 범위 정리 | B | RENDERER, REFACTOR | content adapter, visual primitive, individual view를 module-private로 바꿔 Brutalist module의 public API를 route renderer 하나로 줄인다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `caa7df81d899` | feat(brutalist): 모든 route를 renderer에 통합 | A | ARCH, ROUTING, RENDERER | 단일 `BrutalistRoute` entry point를 도입하고 공용 shell을 적용하기 전에 모든 supported route를 이곳에서 dispatch한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `dd71d28143a8` | feat(designs): Brutalist renderer 활성화 | A | ARCH, RENDERER | selectable renderer에 필요한 모든 registry boundary에서 Brutalist를 활성화한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `74a27c95eb1c` | style(cinematic): 암실 palette와 shell 기초 구성 | B | ROUTING, RENDERER | Cinematic renderer의 root visual 및 accessibility contract를 확립한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `197c0781f1b9` | feat(cinematic): 링크와 chapter 표기 프리미티브 추가 | B | RENDERER | route composition을 시작하기 전에 Cinematic navigation과 반복 chapter markup을 중앙화한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `3b72294a0fd7` | style(cinematic): 모바일 탐색과 hero 매체 구성 | B | ROUTING, RENDERER | shell의 mobile disclosure를 완성하고 image 중심 hero composition을 확립한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `e2dbb1b7c7d0` | feat(cinematic): 공용 frame과 media 추가 | B | RENDERER | 모든 route에서 사용하는 공용 Cinematic frame과 media boundary를 도입한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `22c4593809bf` | feat(cinematic): 프로젝트 chapter 추가 | B | RENDERER | sticky evidence summary와 visual asset을 결합하는 재사용 가능한 project chapter를 추출한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `bb7a742122fd` | style(cinematic): chapter와 archive 지면 구성 | B | RENDERER | Cinematic renderer가 사용하는 long-form chapter 및 archive layout을 정의한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `29430d7dfe67` | feat(cinematic-home): 소개와 대표 프로젝트 구성 | B | RENDERER | canonical portfolio content로 Cinematic Home page를 구성하면서 presentation data가 section order를 제어하도록 한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `f417e3e70b1f` | feat(cinematic-projects): 프로젝트 archive 구성 | B | RENDERER | 모든 canonical project에 공용 project-chapter representation을 재사용해 완전한 Cinematic project archive를 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `1f4c35853502` | style(cinematic): 상세와 이력 grid 구성 | B | RENDERER | case-study evidence, profile essay, résumé content를 위한 grid system을 확립한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `2e9f70067daf` | feat(cinematic-project): 상세 hero와 매체 구성 | B | RENDERER | 유효한 project와 unresolved project를 모두 명시적으로 처리하는 Cinematic project-detail boundary를 만든다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `2f404402a2ea` | feat(cinematic-project): 상세 서사와 gallery 구성 | B | RENDERER | project detail을 hero에서 완전한 evidence narrative로 확장한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `95ee01decc8f` | style(cinematic): 프로필과 콘텐츠 section 구성 | B | CONTENT, RENDERER | profile fact, long-form content section, chronology, evidence link, contact information, interview gap에 필요한 재사용 visual structure를 추가한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `4eefc512d05c` | feat(cinematic-about): 프로필과 경력 소개 구성 | B | RENDERER | canonical profile, skill, experience model로 Cinematic About route를 구현한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `ee692d893a11` | feat(cinematic-about): 큐레이션 archive 구성 | B | CONTENT, RENDERER | 공용 site-page enablement contract 아래에서 Cinematic About route에 optional curation archive를 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `52f13fcc5a12` | style(cinematic): 여정 timeline과 답변 근거 구성 | B | RENDERER | narrative milestone, chronological archive entry, current-position summary, interview evidence의 visual grammar를 정의한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `7cc23349f59f` | feat(cinematic): 이력과 연락 route 구성 | B | ROUTING, RENDERER | 명시적인 reference resolution과 fallback을 갖는 Cinematic résumé 및 contact route를 구현한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `c3aba5da6a10` | style(cinematic): 인터뷰 근거와 반응형 동작 구성 | B | RENDERER | Cinematic renderer 전체의 interaction 및 responsive behavior를 완성한다. | 이미 확립된 visual system을 완성하는 데 필요한 renderer 및 responsive 구현이다. presentation 동작을 완성하지만 프로젝트 전체 architecture나 correctness를 다시 정의하지는 않는다. |
| `bddb3cc18eed` | feat(cinematic-journey): 여정 archive 구성 | B | RENDERER | Cinematic journey route를 서로 보완하는 두 history와 current-state conclusion으로 구현한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `2a0f0aadee1c` | feat(cinematic-interview): 인터뷰 근거 map 구성 | B | RENDERER | answer record를 canonical project와 join해 Cinematic interview-evidence map을 구현한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `b8de57f130eb` | feat(designs): Cinematic renderer 활성화 | A | ARCH, RENDERER | Cinematic을 완전한 selectable renderer로 활성화하고 module API를 route entry point로 제한한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `3353032ba23b` | test(content): Vitest 기반 콘텐츠 계약 검증 추가 | A | CONTENT, VALIDATION, TEST | Vitest, jsdom, Testing Library를 사용해 portfolio content model에 실행 가능한 test boundary를 도입한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `42bef4e5783c` | test(routes): 홈과 route presentation 계약 검증 | A | ARCH, VALIDATION, ROUTING | hard-coded snapshot 대신 canonical content와 presentation shell을 비교하는 route-level characterization test를 추가한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `09cec616f314` | test(ui): 디자인 선택과 프로젝트 링크 계약 검증 | A | VALIDATION, TEST | design selector와 project-link component의 interaction contract를 고정한다. | 일반적인 component coverage를 추가하는 데 그치지 않고 cross-cutting contract 또는 production에 영향을 주는 regression을 고정하므로 중요하다. |
| `31c438b52e4b` | test(e2e): 다섯 디자인의 route matrix 검증 | A | ARCH, VALIDATION, ROUTING | desktop 및 mobile Chromium에서 전체 5-design enabled-route matrix를 browser 수준으로 검증한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `dc07871c4d24` | test(portfolio): selector와 presentation 회귀 계약 보강 | A | CONTENT, TEST | public portfolio module surface와 ownership boundary를 위한 regression contract를 추가한다. | 일반적인 component coverage를 추가하는 데 그치지 않고 cross-cutting contract 또는 production에 영향을 주는 regression을 고정하므로 중요하다. |
| `1cf65b708476` | refactor(routes): 홈 page context 통합 | A | ARCH, ROUTING, REFACTOR | `resolvePortfolioPageContext`를 공통 page initialization의 단일 owner로 도입하고 Home을 이 경계로 migration한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `2075e54ff947` | refactor(projects): 프로젝트 page context 통합 | B | RENDERER, REFACTOR | project archive와 project-detail route를 모두 공용 page-context resolver로 migration한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `a9fdde29221d` | refactor(routes): 소개와 학습 route context 통합 | B | ROUTING, REFACTOR | About, Journey, Interview Map에 공용 page-context boundary를 적용한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `349317425bd2` | refactor(routes): 이력과 연락 context 통합 | B | ROUTING, REFACTOR | Resume 및 Contact의 page-context migration을 완성한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `44e4d062da50` | refactor(ui): 프로젝트 링크 렌더링 중복 제거 | B | VALIDATION, REFACTOR | detail 및 card link collection용 내부 `ProjectLinkList` renderer 하나를 추출하되 각 caller의 selection rule은 그대로 유지한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `c702b870d57a` | fix(ui): hydration 중 native details 상태 보존 | A | DEBUG | native design-switcher `details` element를 의도적인 hydration boundary로 표시한다. | 문제가 발생한 invariant를 소유하는 계층에서 쉽게 드러나지 않는 build, integration 또는 runtime failure를 수정하므로 중요하다. |
| `b6c0238ab8b8` | test(ui): details hydration 경쟁 조건 검증 | A | VALIDATION, TEST | design-switcher hydration race를 직접 재현하고 의도한 invariant를 고정한다. | 일반적인 component coverage를 추가하는 데 그치지 않고 cross-cutting contract 또는 production에 영향을 주는 regression을 고정하므로 중요하다. |
| `f66b880a8f97` | chore(runtime): 지원 Node.js와 npm 버전 고정 | B | DEPLOY | `.node-version`, `.nvmrc`, `packageManager`, package engines, lockfile metadata 전반에서 지원 runtime과 package manager version을 일관되게 고정한다. | 확립된 release process 안에서 이루어진 보조 build 또는 maintenance 작업이다. 유용하지만 핵심 architecture나 correctness를 규정하는 결정은 아니다. |
| `f81691072413` | test(e2e): production server 검증 경로 추가 | A | VALIDATION, DEPLOY, TEST | development compiler가 아니라 최적화된 production artifact를 실행하는 end-to-end path를 추가한다. | source-level test나 development-server test로 확인할 수 없는 영역을 보완해 production artifact 또는 release path 자체를 검증하므로 중요하다. |
| `9fd3541c11dc` | ci: 기본 배포 품질 검사 추가 | A | DEPLOY, TEST | 저장소에 고정된 toolchain을 사용해 deployment-quality CI gate를 구축한다. | source-level test나 development-server test로 확인할 수 없는 영역을 보완해 production artifact 또는 release path 자체를 검증하므로 중요하다. |
| `b3bd671a3243` | feat(content): 콘텐츠 mode와 readiness 오류 모델 추가 | A | CONTENT, VALIDATION | template content와 production-ready content를 구분하는 type 및 error model을 도입한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `741bbb4caab7` | feat(content): template placeholder 탐색 경계 추가 | B | CONTENT, ROUTING | JSON source-to-file mapping을 중앙화하고 production content를 위한 recursive placeholder scanner를 추가한다. | 확립된 content architecture 안에서 이루어진 일반적인 content model, selector 또는 source 구현이다. 기능을 확장하지만 전체 trust boundary를 다시 정의하지는 않는다. |
| `47b99d6256ef` | feat(content): public origin과 자산 경계 검증 추가 | A | CONTENT, VALIDATION | public origin과 locally served asset에 production-specific validation을 추가한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `428055be3e64` | feat(content): 공개 URL과 연락 링크 검증 추가 | A | CONTENT, VALIDATION | deploy 가능한 public URL과 contact link를 위한 재사용 predicate를 정의한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `002b642d52a3` | feat(content): production readiness 기본 검사 추가 | S | ARCH, CONTENT, VALIDATION | aggregate production-readiness validator를 도입한다. | fail-closed publication boundary를 확립하기 때문에 핵심적이다. 전체 source set에서 origin과 content readiness가 검증된 뒤에만 production mode가 성립한다. |
| `bcd87ed856bf` | feat(content): 필수 자산과 프로젝트 readiness 추가 | A | CONTENT, VALIDATION | generic placeholder detection에서 portfolio-specific completeness까지 production readiness를 확장한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `71e7ece7208f` | feat(content): 연락 수단과 build readiness 연결 | A | CONTENT, VALIDATION, DEPLOY | production에서 enabled 상태이면서 placeholder가 아닌 contact method를 최소 하나 요구하고 mode-aware build-readiness entry point 하나를 노출한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `37c0dbc079ff` | build(content): readiness 검사를 prebuild에 연결 | A | CONTENT, VALIDATION, DEPLOY | schema validation 이후 content readiness를 필수 prebuild gate로 만든다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `55b6061e0052` | feat(seo): 콘텐츠 mode별 metadata 정책 추가 | A | CONTENT, SEO | validated site content와 선택된 content mode를 입력으로 하는 순수 metadata factory를 추가한다. | 여러 route의 publication identity, indexing 또는 안전한 machine-readable output을 제어해 crawler에 노출되는 상태를 검증된 content와 일치시키므로 중요하다. |
| `cb61450ad922` | feat(seo): 콘텐츠 mode별 robots 정책 추가 | A | CONTENT, SEO | readiness 및 metadata와 동일한 content-mode contract를 사용해 `robots.txt`를 생성한다. | 여러 route의 publication identity, indexing 또는 안전한 machine-readable output을 제어해 crawler에 노출되는 상태를 검증된 content와 일치시키므로 중요하다. |
| `67aabeab1553` | feat(seo): layout metadata를 콘텐츠 mode에 연결 | A | CONTENT, SEO | root layout을 mode-aware metadata policy에 연결한다. | 여러 route의 publication identity, indexing 또는 안전한 machine-readable output을 제어해 crawler에 노출되는 상태를 검증된 content와 일치시키므로 중요하다. |
| `fb3d18fd660b` | test(content): readiness와 indexing 계약 검증 | A | CONTENT, VALIDATION, SEO | 전체 readiness 및 indexing contract에 regression coverage를 추가한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `166f05f7be06` | test(e2e): 콘텐츠 mode별 metadata와 robots 검증 | A | CONTENT, VALIDATION, SEO | metadata helper만 테스트하지 않고 실제 실행 중인 애플리케이션을 통해 indexing policy를 검증한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `7872e1214de7` | fix(font): 빌드용 글꼴과 출처를 저장소에서 제공 | A | DEPLOY, DEBUG | build-time Google Font fetching을 저장소가 소유하는 WOFF2 asset과 `next/font/local` 등록 방식으로 교체한다. | local tooling만 조정하는 수준이 아니라 재현 가능한 production build 및 runtime boundary를 변경하거나 강화하므로 중요하다. |
| `2f65f6a6fcb6` | test(font): 로컬 글꼴과 license 경계 검증 | A | VALIDATION, DEPLOY, TEST | self-contained font build contract를 고정한다. | source-level test나 development-server test로 확인할 수 없는 영역을 보완해 production artifact 또는 release path 자체를 검증하므로 중요하다. |
| `404a220e5d40` | fix(build): production build에 webpack compiler 고정 | B | DEPLOY, DEBUG | production build가 local development에서 이미 사용하는 webpack compiler를 명시적으로 선택하도록 한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `1c40645caead` | feat(seo): route별 검색 metadata 정책 추가 | A | ARCH, ROUTING, SEO | route별 canonical, Open Graph, Twitter metadata를 위한 공용 factory를 도입한다. | 여러 route의 publication identity, indexing 또는 안전한 machine-readable output을 제어해 crawler에 노출되는 상태를 검증된 content와 일치시키므로 중요하다. |
| `844ff4d7abcb` | feat(seo): 홈과 프로젝트 route metadata 연결 | B | ROUTING, SEO | 공용 metadata policy를 home page, project index, statically generated project detail에 적용한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `fd5ff532bfe9` | feat(seo): 프로필 route metadata 연결 | B | ROUTING, SEO | about, contact, resume route에 content-derived metadata를 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `5632c5df9b47` | feat(seo): 여정과 근거 route metadata 연결 | B | ROUTING, SEO | journey 및 interview-map route를 공용 metadata factory에 연결한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `70b69f04e8c7` | feat(seo): 공개 route sitemap 생성 | A | ARCH, ROUTING, SEO | validated production origin과 현재 content configuration이 실제로 노출하는 route를 사용해 `sitemap.xml`을 생성한다. | 여러 route의 publication identity, indexing 또는 안전한 machine-readable output을 제어해 crawler에 노출되는 상태를 검증된 content와 일치시키므로 중요하다. |
| `228e40a48d64` | feat(seo): JSON-LD 안전 직렬화 경계 추가 | A | SEO | JSON-LD를 embed하기 위한 전용 component와 serializer를 추가한다. | 여러 route의 publication identity, indexing 또는 안전한 machine-readable output을 제어해 crawler에 노출되는 상태를 검증된 content와 일치시키므로 중요하다. |
| `ee98415be696` | feat(seo): 사이트 소유자 JSON-LD 모델 추가 | B | SEO | portfolio owner와 website를 연결된 Schema.org graph로 모델링한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `ae4ec172e45a` | feat(seo): production layout에 사이트 JSON-LD 연결 | B | SEO | production content에서만 root layout에 site-level structured-data graph를 embed한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `7e09745d409e` | feat(seo): 프로젝트 CreativeWork JSON-LD 모델 추가 | B | SEO | authoritative project 및 site model에서 파생한 project-level `CreativeWork` 표현을 추가한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `f7bd33a8b403` | feat(seo): 프로젝트 상세에 JSON-LD 연결 | B | SEO | dedicated-design 및 fallback project-detail view 모두에 project `CreativeWork` JSON-LD를 함께 렌더링한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `4358bcd34f2e` | test(seo): route metadata export 검증 | B | VALIDATION, ROUTING, SEO | 공용 factory만 테스트하지 않고 모든 public route의 실제 metadata export를 검증한다. | 기존 동작을 위한 유용한 regression/characterization coverage이지만, 이 변경만으로 프로젝트를 규정하는 invariant를 확립하지는 않는다. |
| `adc392157f70` | test(seo): route metadata와 sitemap 계약 검증 | B | VALIDATION, ROUTING, SEO | canonical route metadata와 sitemap publication에 집중된 coverage를 추가한다. | 기존 동작을 위한 유용한 regression/characterization coverage이지만, 이 변경만으로 프로젝트를 규정하는 invariant를 확립하지는 않는다. |
| `c5938ea4b4f8` | test(seo): JSON-LD 계약과 직렬화 검증 | A | VALIDATION, SEO, TEST | structured data의 semantics와 embedding safety를 함께 보호한다. | 여러 route의 publication identity, indexing 또는 안전한 machine-readable output을 제어해 crawler에 노출되는 상태를 검증된 content와 일치시키므로 중요하다. |
| `154b7e6cb54b` | feat(site): 사용자 정의 404 페이지 추가 | B | - | home page로 돌아가는 명시적 route를 갖는 portfolio-styled not-found page를 제공한다. | 확립된 design 안에서 이루어진 적절한 구현이다. 완성된 제품을 진전시키지만 브랜치 전체 수준의 아키텍처 판단은 제한적이다. |
| `850e084b3911` | test(site): 404 복귀 동선 검증 | B | VALIDATION, TEST | custom not-found page가 primary heading으로 error를 전달하고 `/`로 돌아가는 semantic link를 노출하는지 검증한다. | 기존 동작을 위한 유용한 regression/characterization coverage이지만, 이 변경만으로 프로젝트를 규정하는 invariant를 확립하지는 않는다. |
| `4d6b4e6d564e` | refactor(content): 홈 route view model 경계 추가 | A | ARCH, CONTENT, ROUTING | content boundary에서 presentation-ready selection을 한 번만 계산하는 전용 home-route view model을 도입한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `44e3b80b297f` | refactor(content): 프로젝트 목록 파생 모델 추가 | A | ARCH, CONTENT, REFACTOR | rendering 전에 featured/archive partition, project group, metric value를 해석하는 projects-route view model을 추가한다. | 기존 동작을 유지하면서 여러 route와 renderer가 사용하는 boundary의 ownership 또는 coupling을 실질적으로 줄이므로 중요하다. |
| `d4ad7ecd0d08` | refactor(content): 상세와 소개 파생 모델 추가 | A | ARCH, CONTENT, REFACTOR | route-model boundary를 project detail과 about page로 확장한다. | 기존 동작을 유지하면서 여러 route와 renderer가 사용하는 boundary의 ownership 또는 coupling을 실질적으로 줄이므로 중요하다. |
| `0ca360c767f1` | refactor(content): 이력과 연락 파생 모델 추가 | A | ARCH, CONTENT, REFACTOR | resume 및 contact route projection을 추가하고 route model을 discriminated union으로 결합한다. | 기존 동작을 유지하면서 여러 route와 renderer가 사용하는 boundary의 ownership 또는 coupling을 실질적으로 줄이므로 중요하다. |
| `d7eaa1ac401d` | refactor(routes): renderer view model 요청 타입 추가 | A | ARCH, ROUTING, RENDERER | 각 route literal을 대응하는 view-model variant와 짝지은 typed migration request를 도입한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `fc5226b15f88` | refactor(renderers): footer 링크 파생 모델을 호환 | B | RENDERER, REFACTOR | route view model이 precomputed `footerLinks`를 제공하면 Brutalist, Cinematic, Editorial shell이 이를 사용하도록 하고 raw content에 대한 legacy filtering path도 유지한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `392928ca97ab` | refactor(home): 공용 홈에서 파생 view model 사용 | B | RENDERER, REFACTOR | route boundary에서 home view model을 만들고 공용 Classic 및 Design home component가 파생 field를 사용하도록 migration한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `50f5c4d306fc` | refactor(renderers): 홈 renderer 파생 값을 연결 | B | RENDERER, REFACTOR | home view model을 design registry를 통해 전달하고 dedicated Brutalist, Cinematic, Editorial renderer가 featured-project fallback, metric, recent journey… | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `47104ae2f228` | refactor(projects): 프로젝트 목록 파생 모델 사용 | B | RENDERER, REFACTOR | `/projects` route에서 project-index view model을 구성하고 shared renderer가 featured/archive grouping 및 metric projection을 사용하도록 한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `5d53478f6947` | refactor(renderers): 프로젝트 목록 파생 값을 연결 | B | RENDERER, REFACTOR | project-index view model을 dedicated renderer에 전달하고 각 renderer의 local grouping 및 metric derivation을 제거한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `1c24d0037d35` | refactor(projects): 상세 route 파생 데이터를 준비 | B | ROUTING, RENDERER, REFACTOR | route boundary에서 `createProjectDetailViewModel`을 통해 project detail을 해석한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `9f7bd0fd7b46` | refactor(renderers): 상세 프로젝트 근거 데이터를 연결 | B | RENDERER, REFACTOR | project-detail view model을 registry로 전달하고 dedicated renderer가 model에서 해석된 link, stack item, supporting image를 사용하도록 migration한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `4663104fba7a` | refactor(about): 큐레이션 파생 모델을 route에 적용 | B | CONTENT, ROUTING, RENDERER | route boundary에서 about view model을 만들고 shared/dedicated renderer가 해석된 curation category를 사용하도록 migration한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `05fd4e068ea2` | refactor(routes): 이력과 연락 파생 데이터를 연결 | B | ROUTING, REFACTOR | resume 및 contact projection을 각 route boundary에 적용하고 모든 renderer로 전달한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `b77b386b344e` | test(content): route view model 파생 규칙 검증 | A | ARCH, CONTENT, VALIDATION | 모든 route projection에 집중된 test를 추가한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `1598a87702f6` | test(design): view model 기반 renderer matrix 검증 | A | ARCH, VALIDATION, RENDERER | migration한 여섯 route를 사용 가능한 다섯 design 전체에 compatibility matrix로 렌더링한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `29508f4668ea` | build: standalone server 산출물 생성 | B | DEPLOY | Next.js가 standalone server bundle을 생성하도록 설정한다. | 확립된 release process 안에서 이루어진 보조 build 또는 maintenance 작업이다. 유용하지만 핵심 architecture나 correctness를 규정하는 결정은 아니다. |
| `c0f7434467a0` | test(build): standalone 산출물 완전성 검증 | A | VALIDATION, DEPLOY, TEST | standalone server entry point와 static asset directory에 대한 명시적 post-build check를 추가한다. | source-level test나 development-server test로 확인할 수 없는 영역을 보완해 production artifact 또는 release path 자체를 검증하므로 중요하다. |
| `c5e73853a1b6` | ci: standalone 산출물 검증 추가 | A | VALIDATION, DEPLOY, TEST | production end-to-end build 이후 CI에서 standalone artifact check를 실행한다. | source-level test나 development-server test로 확인할 수 없는 영역을 보완해 production artifact 또는 release path 자체를 검증하므로 중요하다. |
| `5a6fd8a802ff` | fix(a11y): 디자인별 색상 대비 보정 | A | A11Y, DEBUG | light 및 dark surface 모두에서 accent text를 구분할 수 있도록 shared 및 Editorial color token을 조정한다. | local presentation defect가 사이트 전체 문제로 이어질 수 있는 design/route 공통 accessibility invariant를 복원하거나 검증하므로 중요하다. |
| `a15e117cb51b` | fix(a11y): skip link focus target 복원 | A | A11Y, DEBUG | 각 main-content landmark에 `tabIndex={-1}`을 적용해 programmatically focusable하게 만든다. | local presentation defect가 사이트 전체 문제로 이어질 수 있는 design/route 공통 accessibility invariant를 복원하거나 검증하므로 중요하다. |
| `e1aac08e0e9e` | fix(a11y): Brutalist 지표의 definition semantics 수정 | A | ARCH, RENDERER, A11Y | Brutalist metric block에서 모든 descriptive value를 관계없는 paragraph 대신 definition list 내부의 `<dd>`로 표현하도록 수정한다. | local presentation defect가 사이트 전체 문제로 이어질 수 있는 design/route 공통 accessibility invariant를 복원하거나 검증하므로 중요하다. |
| `84c71d027630` | test(a11y): 디자인×route WCAG 행렬 추가 | A | ARCH, ROUTING, A11Y | design 다섯 개에서 모든 enabled route를 실행하는 end-to-end accessibility matrix를 추가한다. | local presentation defect가 사이트 전체 문제로 이어질 수 있는 design/route 공통 accessibility invariant를 복원하거나 검증하므로 중요하다. |
| `bc0a718e2052` | refactor(content): 여정 근거 view model 추가 | A | ARCH, CONTENT, REFACTOR | renderer에 도달하기 전에 content reference를 해석하는 journey-specific view model을 도입한다. | 기존 동작을 유지하면서 여러 route와 renderer가 사용하는 boundary의 ownership 또는 coupling을 실질적으로 줄이므로 중요하다. |
| `98f07b1c211d` | refactor(content): 인터뷰 근거 view model 추가 | A | ARCH, CONTENT, REFACTOR | track, question, answer hierarchy를 보존하면서 각 answer의 project identifier를 project object 또는 `null`로 해석하는 interview-map view model을 도입한다. | 기존 동작을 유지하면서 여러 route와 renderer가 사용하는 boundary의 ownership 또는 coupling을 실질적으로 줄이므로 중요하다. |
| `4732301a7d2c` | style(designs): route renderer 디자인 토큰 확장 | A | ARCH, ROUTING, RENDERER | design token layer를 color에서 display typography, body scale, section rhythm, motion timing, navigation stacking, content width까지 확장한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `969741c3469d` | refactor(shell): 디자인 renderer 셸 경계 추가 | A | ARCH, ROUTING, RENDERER | 공용 `design` 및 `classic` renderer를 위한 prepared shell-props boundary를 추가한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `aa5863b1ccc2` | feat(design-home): 홈과 대표 프로젝트 행동 동선 추가 | B | RENDERER | design home route의 hero 및 featured-project boundary에서 project index로 가는 명시적인 navigation을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `88abdd783520` | feat(design-home): 작업 지표 지도 추가 | B | RENDERER | work-map presentation을 design home renderer 내부로 이동하고 home view model이 미리 계산한 metric value로 구동한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `4904add9224b` | feat(design-home): 기술 집중 영역 추가 | B | RENDERER | technical-focus section을 design home renderer 내부로 이동하고 validated focus-area content로 구성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `4ead7f0df32b` | feat(design-home): 선택 기술 스택 구성 | B | RENDERER | selected-stack composition을 design home renderer 내부로 이동한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `f605e6263a36` | feat(design-home): 여정 근거 영역 추가 | B | RENDERER | journey evidence section을 design home renderer 내부로 이동하고 prepared home journey item으로 구성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `0d42bd9c8d4a` | feat(design-home): 연락 미리보기 동선 추가 | B | RENDERER | contact preview를 design home renderer로 이동하고 view model의 preferred contact link를 primary action으로 사용한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `92799407457e` | refactor(design-home): 홈 섹션 순서를 콘텐츠로 연결 | B | CONTENT, RENDERER, REFACTOR | 알려진 section을 hard-coded component order로 검사하지 않고 content의 validated section identifier를 순회해 design-home section을 렌더링한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `b8d35db40ed1` | refactor(routes): Design 홈 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | design home implementation을 공용 prepared route contract를 받는 route renderer로 전환한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `6fe74d2dd94d` | refactor(design-home): renderer 선언 순서 정리 | C | RENDERER, REFACTOR | rendered structure나 data flow를 바꾸지 않고 design-home declaration 순서를 재배치하고 일부 line break를 정규화한다. | 주로 formatting, declaration 순서 정리 또는 국소적인 maintenance에 해당한다. 동작, ownership, 프로젝트 전체 invariant를 실질적으로 바꾸지 않는다. |
| `29943a185465` | refactor(routes): Design 프로젝트 목록 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | design project-index route의 조립을 renderer module로 이동한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `946e8b16d42c` | feat(design-project): 프로젝트 상세 히어로 추가 | B | RENDERER | template를 보존하는 return link, source hint, project availability, summary, description, external link, priority screenshot을 포함하는 design project-detail hero를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `17acdcb96cdb` | feat(design-project): 상세 섹션 프리미티브 추가 | B | RENDERER | title이 있는 2-column narrative section과 반복 evidence list를 위한 작은 presentation primitive를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `91cacd385fc4` | feat(design-project): 프로젝트 근거 본문 구성 | B | RENDERER | project의 problem, solution, architecture, screenshot, stack, decision, highlight, trade-off, result로 design project-detail body를 구성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b76fa3f1d6be` | refactor(routes): Design 프로젝트 상세 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | design project-detail module을 완전한 route renderer로 만든다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `87ac2ce7b285` | refactor(design-project): renderer 선언 순서 정리 | C | RENDERER, REFACTOR | project-detail renderer의 private declaration을 재배치해 route, hero, body가 supporting section primitive보다 먼저 나타나도록 한다. | 주로 formatting, declaration 순서 정리 또는 국소적인 maintenance에 해당한다. 동작, ownership, 프로젝트 전체 invariant를 실질적으로 바꾸지 않는다. |
| `03f49d2c21c9` | feat(design-about): 큐레이션 프로젝트 카드 추가 | B | CONTENT, RENDERER | 각 category의 rationale와 about view model에서 이미 해석된 project를 함께 보여주는 curation-category card를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `e52850d5c19c` | feat(design-about): 큐레이션 기준과 범주 구성 | B | CONTENT, RENDERER | validated curation data와 route-specific presentation copy로 about page의 curation section을 구성한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `535763866c0b` | feat(design-about): 큐레이션 생략과 재검토 기준 추가 | B | CONTENT, RENDERER | curation section에 명시적인 omission reason과 next review condition을 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `46923601cba7` | feat(design-about): 소개와 개발 원칙 구성 | B | RENDERER | route discriminator, shared shell assembly, profile hero, optional photo, development-principle card를 갖는 Design about-route renderer를 만든다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `aade79395de4` | feat(design-about): 여정과 기술 역량 구성 | B | RENDERER | Design about route를 evidence-oriented journey 및 skills section으로 확장한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `e4feecdc7a04` | refactor(routes): Design 소개 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | application page에는 content loading과 template dispatch 책임을 남기고 Design about page의 presentation을 dedicated route renderer에 위임한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `5dc064bd733a` | feat(design-resume): 이력서 소개와 요약 구성 | B | RENDERER | prepared resume view model과 공용 shell contract를 기반으로 Design resume renderer를 만든다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `bedc74dd4e6f` | feat(design-resume): 대표 프로젝트와 교육 과정 추가 | B | RENDERER | Design resume에 selected-project 및 training evidence를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `43fac33fdda3` | refactor(routes): Design 이력 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | Design resume page를 dedicated renderer에 위임하고 optional experience, education, notes section으로 route를 완성한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `923e8a53c590` | feat(design-contact): 연락 가능성과 링크 구성 | B | RENDERER | profile-aware introduction, availability statement, preferred contact action, contextual note를 갖는 Design contact route를 만든다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b11a4e4a3d72` | refactor(routes): Design 연락 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | application route에서 page availability, content, template, debug context를 해석한 뒤 Design contact page를 dedicated renderer에 위임한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `cf203ca32a7f` | feat(design-journey): 여정 마일스톤 카드 추가 | B | RENDERER | prepared journey narrative model을 위한 milestone card를 추가한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `b4ccce345fe3` | feat(design-journey): 여정 서사와 근거 목록 구성 | B | RENDERER | narrative introduction과 ordered milestone evidence를 중심으로 Design journey route를 만든다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `8a0bd21f7557` | refactor(routes): Design 여정 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | 명시적으로 생성한 journey view model을 사용해 Design journey page를 dedicated renderer에 위임한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `caa4dbf9f625` | feat(design-interview): 인터뷰 트랙 표 구조 추가 | B | RENDERER | 각 interview-evidence track을 표현하는 semantic table structure를 도입한다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `60661e0d48d3` | feat(design-interview): 프로젝트 답변과 심화 근거 추가 | B | RENDERER | interview-track table에 source reference, project-backed answer, depth explanation을 채운다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `8ae69c1c544c` | feat(design-interview): 트랙 탐색과 근거 페이지 구성 | B | ROUTING, RENDERER | introduction, external reference repository, in-page track index, prepared evidence table을 갖는 Design interview-map route를 만든다. | 이미 확립된 content, routing, design 계약 안에서 이루어진 일반적인 route 또는 renderer 구현이다. 완성된 제품에 필요한 기능이지만 이 변경만으로 프로젝트 전체를 규정하지는 않는다. |
| `2fee9efda711` | refactor(routes): Design 인터뷰 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | interview-specific view model을 기반으로 Design interview-map page를 dedicated renderer에 위임한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `05e1cebd0b70` | refactor(design): Design route dispatcher 추가 | A | ARCH, ROUTING, RENDERER | route discriminator를 대응하는 dedicated renderer에 매핑하는 단일 Design route dispatcher를 추가한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `15ab994dabfd` | refactor(classic-home): 홈 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | 다른 design과 같은 prepared route contract를 받는 dedicated route renderer 뒤로 Classic home composition을 이동한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `91e44a4de72c` | refactor(classic-projects): 프로젝트 목록 renderer를 이동 | B | RENDERER, REFACTOR | prepared projects view model에서 shell, copy, metric, featured project, archive group을 파생하는 route-level renderer 뒤로 Classic projects page를 이동한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `0f362825f47f` | refactor(classic-project): 상세 본문 프리미티브를 이동 | B | RENDERER, REFACTOR | Classic project-detail view와 section primitive를 Classic design module로 옮긴다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `7a65f0522061` | refactor(classic-project): 상세 renderer를 독립 모듈로 완성 | B | RENDERER, REFACTOR | route discrimination, shell construction, project hero/body composition을 design module이 담당하도록 해 Classic project-detail boundary를 완성한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `25fa6b575c31` | refactor(classic-about): 소개 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | 완전한 Classic about 및 curation presentation을 application route에서 dedicated renderer로 이동한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `88fb0a09db5e` | refactor(classic-resume): 이력 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | prepared resume view model을 소비하고 자체 shell을 구성하는 route renderer로 Classic resume presentation을 추출한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `17e0a9ad0acb` | refactor(classic-contact): 연락 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | Classic contact page를 dedicated route renderer로 이동하고 application page는 template implementation 선택만 담당하도록 줄인다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `c44f91b0d40d` | refactor(classic-journey): 여정 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | Classic journey page를 dedicated renderer로 추출하고 Classic과 Design 모두 동일한 prepared journey view model을 사용하도록 한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `a5d8f288baa2` | refactor(classic-interview): 인터뷰 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | Classic interview map을 자체 route renderer로 옮기고 두 template variant 모두 prepared interview view model을 받도록 한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `6b193d084e69` | refactor(classic): Classic route dispatcher 추가 | A | ARCH, ROUTING, RENDERER | discriminated prepared-route contract 위에 단일 Classic dispatcher를 도입한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `8a48460df4c3` | refactor(journey): 모든 renderer에 여정 view model 적용 | A | ARCH, RENDERER, REFACTOR | 모든 journey renderer가 raw portfolio dataset이 아니라 prepared journey view model을 사용하도록 한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `aef265b9bd01` | refactor(interview): 모든 renderer에 인터뷰 view model 적용 | A | ARCH, RENDERER, REFACTOR | prepared interview-map view model을 모든 renderer에 적용한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `f8b0ab7b08aa` | refactor(designs): renderer 입력을 route view model로 제한 | S | ARCH, ROUTING, RENDERER | 공용 design contract를 완전한 portfolio content object에서 route view model의 discriminated union으로 변경한다. | renderer가 global content graph를 직접 사용하지 못하게 하고 준비된 discriminated route data만 유효한 design input으로 허용하므로 핵심적이다. |
| `380b2a025070` | refactor(designs): 모든 route를 registry renderer로 위임 | S | ARCH, ROUTING, RENDERER | template를 해석하고 대응 view model을 만든 뒤 모든 application page를 design registry를 통해 renderer에 위임한다. | 모든 route와 design에 대해 하나의 dispatch architecture를 완성하고 App Router page에는 framework concern, renderer에는 presentation ownership만 남기므로 핵심적이다. |
| `055b733cbb7e` | test(design): 독립 renderer와 design token 경계 검증 | A | ARCH, VALIDATION, RENDERER | renderer matrix를 journey 및 interview route까지 확장하고 Classic과 Design implementation이 독립 renderer boundary를 노출하는지 검증한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `f3850c4f508a` | refactor(content): 홈 view model 공개 필드 제한 | A | ARCH, CONTENT, REFACTOR | home model이 complete portfolio object를 상속하던 구조를 shared shell data, home renderer가 사용하는 source section, 명시적… | 기존 동작을 유지하면서 여러 route와 renderer가 사용하는 boundary의 ownership 또는 coupling을 실질적으로 줄이므로 중요하다. |
| `c59513d439b3` | refactor(content): 프로젝트 view model 공개 필드 제한 | A | ARCH, CONTENT, REFACTOR | project-index 및 project-detail model의 범위를 실제 data dependency로 제한한다. | 기존 동작을 유지하면서 여러 route와 renderer가 사용하는 boundary의 ownership 또는 coupling을 실질적으로 줄이므로 중요하다. |
| `dd0b0898fb18` | refactor(content): 소개·이력·연락 공개 필드 제한 | A | ARCH, CONTENT, REFACTOR | scoped route-model contract를 about, resume, contact projection에 적용한다. | 기존 동작을 유지하면서 여러 route와 renderer가 사용하는 boundary의 ownership 또는 coupling을 실질적으로 줄이므로 중요하다. |
| `dbb8e84ba0c3` | refactor(content): 여정·인터뷰 공개 필드 제한 | A | ARCH, CONTENT, REFACTOR | journey 및 interview model의 범위를 route-specific source data와 resolved reference로 제한한다. | 기존 동작을 유지하면서 여러 route와 renderer가 사용하는 boundary의 ownership 또는 coupling을 실질적으로 줄이므로 중요하다. |
| `5897b4b024da` | refactor(content): route view model 공용 경계 제한 | S | ARCH, CONTENT, ROUTING | 공통 base를 presentation, profile, site, prepared footer link로 줄여 route-model isolation을 완성한다. | route-level data ownership을 최종 확정하기 때문에 핵심적이다. shared payload는 의도적으로 작고 관련 없는 source collection은 runtime과 type 양쪽에서 사용할 수 없다. |
| `527b9f872333` | test(content): scoped view model과 연락처 회귀 검증 | A | CONTENT, VALIDATION, TEST | TypeScript declaration에만 의존하지 않고 runtime에서 route-view-model boundary를 고정한다. | 하나의 local component를 검증하는 데 그치지 않고 모든 route가 사용하는 공용 content trust boundary 또는 파일 간 invariant를 강화하므로 중요하다. |
| `a37cb8596733` | refactor(ui): 디자인 선택기를 server markup으로 전환 | A | ARCH, REFACTOR | design selector 자체를 client component에서 server-rendered markup으로 전환하고 실제 imperative behavior만 작은 `DesignSwitcherClose` client component로 격리한다. | 기존 동작을 유지하면서 여러 route와 renderer가 사용하는 boundary의 ownership 또는 coupling을 실질적으로 줄이므로 중요하다. |
| `1ac7813155c6` | test(ui): server 선택기와 focus 복원 검증 | A | VALIDATION, A11Y, TEST | design-switcher source를 읽어 selector component의 top-level `"use client"` directive 또는 `useRef` state를 거부하는 structural regression check를 추가한다. | local presentation defect가 사이트 전체 문제로 이어질 수 있는 design/route 공통 accessibility invariant를 복원하거나 검증하므로 중요하다. |
| `b8164cfdddbd` | refactor(ui): reveal 콘텐츠를 server에서 즉시 표시 | A | ARCH, CONTENT, REFACTOR | `Reveal`에서 client-side intersection-observer lifecycle을 제거하고 감싼 모든 element를 server에서 처음부터 visible state로 렌더링한다. | 기존 동작을 유지하면서 여러 route와 renderer가 사용하는 boundary의 ownership 또는 coupling을 실질적으로 줄이므로 중요하다. |
| `b669e04c0932` | refactor(navigation): 디자인 전환 URL 기본값 명시 | A | ARCH, ROUTING, REFACTOR | configured default design을 모든 design-switcher instance의 명시적 input으로 만들고 `createTemplateHref`를 통해 switch link를 생성한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `b09775ec17c3` | perf(font): route별 글꼴 로딩 비용 축소 | A | ARCH, ROUTING, PERF | root layout에서 무조건 수행하던 font 작업을 줄인다. | 반복적으로 발생하는 loading cost를 제거하거나 production performance를 측정·검토·강제 가능한 output constraint로 전환하므로 중요하다. |
| `2c0c9bb34b77` | perf(navigation): 유휴 route prefetch 비활성화 | A | ARCH, ROUTING, PERF | shell link, design switching, project card, call to action, route-specific… 요소를 포함한 portfolio internal navigation surface 전반에서 Next.js automatic prefetch를 비활성화한다. | 반복적으로 발생하는 loading cost를 제거하거나 production performance를 측정·검토·강제 가능한 output constraint로 전환하므로 중요하다. |
| `dfeb324572fa` | test(perf): 유휴 route 요청과 글꼴 경계 검증 | A | ARCH, VALIDATION, ROUTING | 모든 design의 home 및 project-detail route에 browser-level performance assertion을 추가한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `787478032d27` | test(perf): 사용자 상호작용 지연 측정 추가 | A | PERF, TEST | client-sensitive interaction을 위해 Chromium Event Timing API 기반 Playwright performance harness를 도입한다. | 반복적으로 발생하는 loading cost를 제거하거나 production performance를 측정·검토·강제 가능한 output constraint로 전환하므로 중요하다. |
| `c2fb8a7c238d` | fix(perf): webpack route manifest parser 보강 | A | ARCH, ROUTING, PERF | generated JavaScript wrapper를 plain JSON처럼 취급하거나 evaluate하지 않고 Next.js client-reference manifest file 전용 parser를 도입한다. | 반복적으로 발생하는 loading cost를 제거하거나 production performance를 측정·검토·강제 가능한 output constraint로 전환하므로 중요하다. |
| `c24c350ce42c` | test(build): compiler와 manifest parser 계약 검증 | A | VALIDATION, DEPLOY, TEST | production measurement pipeline을 자신이 이해하는 build output에 고정한다. | source-level test나 development-server test로 확인할 수 없는 영역을 보완해 production artifact 또는 release path 자체를 검증하므로 중요하다. |
| `5d903132306a` | fix(deps): Next.js runtime 보안 패치 적용 | B | DEPLOY, DEBUG | 고정된 Next.js runtime과 대응 ESLint configuration을 16.2.4에서 16.2.11로 올리고 lockfile을 갱신해 framework environment package, lint plugin, 그리고… | 확립된 release process 안에서 이루어진 보조 build 또는 maintenance 작업이다. 유용하지만 핵심 architecture나 correctness를 규정하는 결정은 아니다. |
| `605b64512edf` | build(perf): route별 client asset 측정 추가 | A | ARCH, ROUTING, PERF | production build 결과에서 각 application route에 해당하는 client JavaScript와 non-inlined CSS를 보고하는 measurement를 추가한다. | 반복적으로 발생하는 loading cost를 제거하거나 production performance를 측정·검토·강제 가능한 output constraint로 전환하므로 중요하다. |
| `518ff5b51ec5` | build(perf): route bundle 성장 예산 평가 추가 | A | ARCH, ROUTING, PERF | route bundle growth를 커밋된 route별 JavaScript/CSS baseline과 비교하고 고정 5% allowance를 적용한다. | 반복적으로 발생하는 loading cost를 제거하거나 production performance를 측정·검토·강제 가능한 output constraint로 전환하므로 중요하다. |
| `57a1b0876941` | build(perf): bundle budget CLI 연결 | B | PERF, DEPLOY | route measurement와 budget evaluator를 두 개의 명시적인 package command로 노출한다. | 확립된 release process 안에서 이루어진 보조 build 또는 maintenance 작업이다. 유용하지만 핵심 architecture나 correctness를 규정하는 결정은 아니다. |
| `6ac1ea4b5055` | chore(perf): route bundle 기준값 기록 | B | ROUTING, PERF | webpack production output에서 생성한 첫 route-bundle baseline을 커밋한다. | 확립된 release process 안에서 이루어진 보조 build 또는 maintenance 작업이다. 유용하지만 핵심 architecture나 correctness를 규정하는 결정은 아니다. |
| `1529ccf225c1` | build(perf): desktop Lighthouse 실행 경계 추가 | A | PERF, DEPLOY | 다섯 design 모두에 대해 home page와 enabled project detail page 하나를 검사하는 재현 가능한 desktop Lighthouse CI matrix를 추가한다. | 반복적으로 발생하는 loading cost를 제거하거나 production performance를 측정·검토·강제 가능한 output constraint로 전환하므로 중요하다. |
| `f1c72dfdd16a` | build(perf): Lighthouse 결과 요약기 추가 | B | PERF, DEPLOY | raw Lighthouse CI report를 위한 결정적인 summarizer를 추가한다. | 확립된 release process 안에서 이루어진 보조 build 또는 maintenance 작업이다. 유용하지만 핵심 architecture나 correctness를 규정하는 결정은 아니다. |
| `4e8f95249481` | test(perf): 배포 성능 gate 규칙 검증 | A | VALIDATION, PERF, TEST | build-manifest check를 더 넓은 performance-gate contract로 통합한다. | 반복적으로 발생하는 loading cost를 제거하거나 production performance를 측정·검토·강제 가능한 output constraint로 전환하므로 중요하다. |
| `1de3d36e3a48` | fix(build): Tailwind utility CSS 변환 복원 | A | DEPLOY, DEBUG | 명시적인 PostCSS configuration에 `@tailwindcss/postcss`를 등록해 Tailwind의 build-time CSS transformation을 복원한다. | local tooling만 조정하는 수준이 아니라 재현 가능한 production build 및 runtime boundary를 변경하거나 강화하므로 중요하다. |
| `882a2f9d753e` | test(visual): 다섯 디자인 회귀 기준 추가 | A | TEST | development 및 production Playwright configuration이 공유하는 결정적인 snapshot layout으로 다섯 design 전체에 visual regression coverage를 구축한다. | 일반적인 component coverage를 추가하는 데 그치지 않고 cross-cutting contract 또는 production에 영향을 주는 regression을 고정하므로 중요하다. |
| `abbd530368a0` | ci: 검증된 bundle과 Lighthouse gate 활성화 | A | VALIDATION, PERF, DEPLOY | production bundle 및 Lighthouse check를 local tooling에서 CI release path로 승격한다. | 반복적으로 발생하는 loading cost를 제거하거나 production performance를 측정·검토·강제 가능한 output constraint로 전환하므로 중요하다. |
| `a39856cf734a` | chore(perf): 최종 lab 성능 측정 결과 기록 | C | PERF | 자동 생성된 최종 laboratory performance 측정 결과를 기록한다. | 새로운 mechanism이나 enforcement decision이 아니라 자동 생성된 measurement evidence이므로 상대적 중요도가 낮다. |
| `b87a2b453741` | build(docker): public 자산을 포함한 비루트 standalone image 추가 | A | DEPLOY | 검증된 Next.js standalone artifact를 중심으로 multi-stage container build를 추가한다. | local tooling만 조정하는 수준이 아니라 재현 가능한 production build 및 runtime boundary를 변경하거나 강화하므로 중요하다. |
| `b94fa6dd0118` | test(docker): runtime route와 public 자산 검증 자동화 | A | ARCH, VALIDATION, ROUTING | image를 build하고 격리된 ephemeral port에서 시작해 readiness를 기다린 뒤 configured runtime user가 `node`인지 확인하는 end-to-end container contract를 추가한다. | 개별 page markup을 추가하는 수준이 아니라 여러 route에 걸친 design, navigation, shell 또는 dispatch boundary를 표준화하므로 중요하다. |
| `fd4380bf26e2` | refactor(style): 공용 interaction 규칙 순서 정리 | C | REFACTOR | shared reveal, motion-card, project-card, screenshot interaction rule을 declaration 변경 없이 common base style 근처로 이동한다. | 주로 formatting, declaration 순서 정리 또는 국소적인 maintenance에 해당한다. 동작, ownership, 프로젝트 전체 invariant를 실질적으로 바꾸지 않는다. |
| `e809bbb52101` | refactor(projects): 사용하지 않는 그룹 helper 제거 | B | RENDERER, REFACTOR | route view model이 grouped project data 준비를 담당하게 된 뒤 obsolete project-grouping helper와 export된 tuple type을 제거한다. | 확립된 아키텍처 안에서 이루어진 적절한 local 구조 개선이다. ownership은 더 명확해지지만 브랜치 전체 모델은 바뀌지 않는다. |
| `12b311703efc` | style(code): 정적 설정과 export 형식 정리 | C | RENDERER | runtime behavior를 변경하지 않고 static configuration과 module formatting을 정규화한다. | 주로 formatting, declaration 순서 정리 또는 국소적인 maintenance에 해당한다. 동작, ownership, 프로젝트 전체 invariant를 실질적으로 바꾸지 않는다. |
| `5be8d52d550f` | docs(project): 운영 문서와 개발 원장 통합 | C | RENDERER | project 운영 문서와 개발 기록을 통합한다. | 문서 전용 작업이다. 맥락은 제공하지만 애플리케이션, 계약, verification boundary는 변경하지 않는다. |
| `aff0acdd4cf9` | test(docs): 엔지니어링 문서 계약 검증 | B | VALIDATION, TEST | 독립된 `devlog` document set을 제거하면서 실행 가능한 documentation contract를 추가한다. | 기존 동작을 위한 유용한 regression/characterization coverage이지만, 이 변경만으로 프로젝트를 규정하는 invariant를 확립하지는 않는다. |

# 개발 흐름

## 흐름: Fail-closed 콘텐츠 입력

`a1977dc7f026` B — 실행 가능한 schema/tooling 전제 조건을 도입한다.
↓
`a944c73f0557` A — 가장 완전한 case-study source 계약을 정의한다.
↓
`70e49ea34194` A — source 위치를 포함해 누적되는 validation failure를 도입한다.
↓
`d50870c8b8c4` A — 하나의 parsing boundary에서 raw JSON을 schema output으로 변환한다.
↓
`03d2c9be0a43` S — 해당 boundary를 모든 source file의 authoritative 경계로 만든다.
↓
`b9d74d8ccf08` A — 저장소 전체 reference 해석을 결정적으로 만든다.
↓
`508e0b71024b` S — 모든 application consumer를 검증된 pipeline으로 이전한다.
↓
`ff2ecadf3489` A — integrity 검증 범위를 저장소가 제공하는 asset까지 확장한다.
↓
`28b0db56190f` A — 잘못된 content가 production build를 실패시키도록 한다.

**중요성**

프로젝트는 type assertion에 의존하던 JSON에서 fail-closed 입력 시스템으로 발전한다. file schema, aggregate diagnostics, global identity rule, facade integration, asset containment, prebuild enforcement를 차례로 도입하면서 잘못된 editorial data가 rendering까지 살아남을 수 있는 지점을 제거한다.

## 흐름: Full-site renderer 아키텍처

`418e7bc1d8bb` A — 하나의 authoritative design catalog를 정의한다.
↓
`e14202198948` A — route discriminator를 사용하는 full-site renderer 입력을 정의한다.
↓
`6fc28f4c6586` A — lazy capability detection과 loading을 도입한다.
↓
`dc2cf72a768d` S — 전체 page composition을 하나의 route delegation boundary 뒤로 이동한다.
↓
`c6acfe562694` A — 완전한 외부 renderer를 안전하게 선택할 수 있음을 입증한다.
↓
`dd71d28143a8` A — 동일한 registry invariant를 두 번째 확장 renderer에 적용한다.
↓
`b8de57f130eb` A — 다섯 design registry를 완성한다.
↓
`380b2a025070` S — direct template special case를 제거하고 하나의 dispatch path를 확립한다.

**중요성**

이 흐름은 단순히 시각 요소를 차례로 추가한 것이 아니다. App Router page는 framework 책임을 유지하면서 다섯 design이 전체 route composition을 소유할 수 있게 하는 아키텍처 mechanism을 정의한다. registry metadata, validation, lazy loading, exhaustive route contract, 최종 unified dispatch가 모두 서로 일치해야 한다.

## 흐름: Route projection과 renderer 데이터 소유권

`4d6b4e6d564e` A — presentation-ready 파생 값을 중앙화하고 route discriminator를 도입한다.
↓
`44e3b80b297f` A — project 분할과 fallback grouping을 content projection으로 이동한다.
↓
`d4ad7ecd0d08` A — rendering 전에 project 및 curation 관계를 해석한다.
↓
`d7eaa1ac401d` A — 각 route literal을 정확한 projection과 연결한다.
↓
`bc0a718e2052` A — journey renderer의 raw project lookup을 제거한다.
↓
`98f07b1c211d` A — 유효한 answer는 한 번만 해석하면서 unresolved evidence는 명시적으로 보존한다.
↓
`f8b0ab7b08aa` S — projected route data만 registry input으로 허용한다.
↓
`5897b4b024da` S — global content spread를 제거하고 작은 shared base를 완성한다.
↓
`527b9f872333` A — 허용된 runtime field와 missing-reference 동작을 검증한다.

**중요성**

초기의 multi-design system에서는 renderer가 여전히 넓은 content graph를 독자적으로 재해석할 수 있었다. route projection은 join, ordering, fallback, 시간 의존 값을 점진적으로 중앙화한다. 최종 type/runtime 제한을 통해 route ownership을 관례가 아니라 강제 가능한 계약으로 만든다.

## 흐름: Template preview에서 production publication까지

`b3bd671a3243` A — 보수적인 template mode와 명시적인 production mode를 정의한다.
↓
`47b99d6256ef` A — local, reserved, credential-bearing, 잘못 배치된 publication input을 거부한다.
↓
`002b642d52a3` S — origin 및 placeholder 검사를 discriminated production result로 집계한다.
↓
`bcd87ed856bf` A — 게시되는 모든 project에 실제 public evidence와 외부 이동 경로를 요구한다.
↓
`71e7ece7208f` A — 사용 가능한 contact method를 요구하고 하나의 mode-aware gate를 노출한다.
↓
`37c0dbc079ff` A — 일반 production build에서 publication completeness를 필수 조건으로 만든다.
↓
`55b6061e0052` A — page indexing을 검증된 content mode와 일치시킨다.
↓
`cb61450ad922` A — crawler policy를 동일한 mode contract와 일치시킨다.
↓
`70b69f04e8c7` A — 활성 production route와 project만 게시한다.

**중요성**

schema를 통과한 starter data라고 해서 반드시 게시해도 안전한 것은 아니다. 이 흐름은 더 엄격한 두 번째 publication contract를 추가하고 이를 canonical metadata, robots policy, sitemap discovery에 재사용한다. template identity나 불완전한 evidence가 실제 production claim으로 index되는 것을 막는다.

## 흐름: Native design switcher와 server-first interaction

`e43e8addd7f3` B — hydration되는 초기 native disclosure wrapper를 구현한다.
↓
`c69ef85c98b2` A — 명시적 닫기와 keyboard focus 복원을 추가한다.
↓
`c702b870d57a` A — hydration 이전의 native state를 유효한 상태로 인정한다.
↓
`b6c0238ab8b8` A — server/browser/React 사이의 race를 재현한다.
↓
`a37cb8596733` A — static disclosure markup을 server로 되돌리고 imperative close 동작만 분리한다.
↓
`1ac7813155c6` A — server boundary가 다시 조용히 hydrated component로 변하는 것을 막는다.

**중요성**

switcher는 native semantic을 기반으로 한 client component로 시작해 hydration race를 드러낸 뒤, server markup과 꼭 필요한 최소 client action으로 축소된다. 동작 구현에서 root-cause 수정, boundary 단순화로 이어지는 구체적인 발전 과정을 보여준다.

## 흐름: Production artifact와 성능 강제

`9fd3541c11dc` A — automation에서 재현 가능한 production check를 확립한다.
↓
`29508f4668ea` B — traced server artifact boundary를 정의한다.
↓
`c0f7434467a0` A — 필수 server/static output을 명시적인 계약으로 만든다.
↓
`605b64512edf` A — route별 generated JS와 non-inlined CSS를 측정한다.
↓
`518ff5b51ec5` A — 측정값을 fail-closed growth limit으로 전환한다.
↓
`1529ccf225c1` A — 반복 가능한 route/design laboratory threshold를 정의한다.
↓
`abbd530368a0` A — artifact, size, audit limit을 release path에 적용한다.
↓
`b87a2b453741` A — 검증된 artifact를 명시적 public asset 및 non-root runtime과 함께 package한다.
↓
`b94fa6dd0118` A — 최종 container를 실제 실행하고 authoritative content에서 asset coverage를 파생한다.

**중요성**

release 검증은 source validation에서 실제 생성 artifact 검증으로 확장된다. standalone check, route-size accounting, Lighthouse threshold, CI enforcement, container HTTP test는 서로 다른 공백을 막으며, 어느 하나도 development-server smoke test로 대체할 수 없다.

## 흐름: 접근성 정책에서 디자인 간 regression 근거까지

`29bb40579cb2` B — 초기 reduced-motion 적용 범위를 반복 요소까지 확장한다.
↓
`af9191fc15ad` A — selector별 적용을 global motion contract로 대체한다.
↓
`5a6fd8a802ff` A — shared 및 Editorial contrast token을 수정한다.
↓
`a15e117cb51b` A — shared shell에서 programmatic focus 이동을 복원한다.
↓
`e1aac08e0e9e` A — definition-list semantic과 남은 shell focus boundary를 수정한다.
↓
`84c71d027630` A — 모든 design의 모든 enabled route와 keyboard skip path를 검증한다.

**중요성**

접근성은 local motion rule에서 browser evidence로 뒷받침되는 design 공통 invariant로 발전한다. 이후 수정은 시각적 독립성이 semantic 및 contrast regression을 만들 수 있음을 보여주며, 최종 matrix는 전체 route/design 조합에서 landmark, Axe rule, keyboard focus를 검증한다.

# 가장 중요한 커밋

## feat(content): 콘텐츠 파일 schema 파싱 연결
커밋: `03d2c9be0a43`
중요도: S
태그: ARCH, CONTENT, VALIDATION

### 문제

저장소에는 타입이 지정된 JSON file이 많았지만, type만으로는 잘못된 runtime data가 selector와 route까지 도달하는 것을 막을 수 없었다.

### 결정

`loadPortfolioSource`가 모든 authoritative file을 각자의 schema 및 source name으로 parsing하고 schema output만 반환하도록 한다.

### 중요한 이유

validation을 선택적으로 적용하는 schema 모음이 아니라 유일한 ingestion path로 만든다. 이후의 uniqueness, reference, asset, readiness, build 보장은 모두 이 boundary에 의존한다.

### 변경 내용

모든 content module을 하나의 loader를 통해 구성한다. 이 loader는 validation test를 위한 targeted override를 지원하고 application consumer가 데이터를 사용하기 전에 file-local error를 보고한다.

### 프로젝트 이해에 중요한 이유

완성된 portfolio에서 trust가 시작되는 지점을 설명한다. untrusted input은 application model이 만들어지기 전에 거부되므로 renderer가 임의의 JSON을 방어할 필요가 없다.

## refactor(content): 검증된 콘텐츠를 portfolio facade에 연결
커밋: `508e0b71024b`
중요도: S
태그: ARCH, CONTENT, VALIDATION

### 문제

schema parsing이 존재한 뒤에도 portfolio facade는 여전히 JSON을 직접 import하고 중복 label, environment substitution, unchecked assertion을 유지하고 있었다.

### 결정

facade를 `portfolioSource` 기반으로 이전하고 group identifier를 canonical 관계로 만들며, 모든 domain collection을 하나의 검증된 aggregate를 통해 노출한다.

### 중요한 이유

마지막 parallel ingestion path를 제거하고 list grouping, detail record, metric, link, journey evidence, interview evidence, curation을 모두 같은 source of truth에 맞춘다.

### 변경 내용

direct JSON import와 presentation layer의 environment URL substitution을 검증된 source data 및 파생된 canonical 관계로 대체한다.

### 프로젝트 이해에 중요한 이유

이 커밋이 “content-driven”을 개별 page가 우회할 수 있는 관례가 아니라 아키텍처 사실로 만들기 때문에 이 프로젝트가 실제로 content-driven이라고 할 수 있다.

## refactor(routes): 확장 디자인 renderer 위임 경계 추가
커밋: `dc2cf72a768d`
중요도: S
태그: ARCH, ROUTING, RENDERER

### 문제

완전한 visual system을 각 App Router page 안에 직접 추가하면 design마다 query parsing, route validation, loading, not-found 동작을 중복하게 된다.

### 결정

framework 책임은 page에 남기고, migration 중에는 legacy fallback을 유지하면서 compact route context를 등록된 full-page renderer에 위임한다.

### 중요한 이유

Editorial, Brutalist, Cinematic이 별도의 routing 구현이 되지 않으면서 전체 site composition을 소유할 수 있게 하는 결정적인 분리다.

### 변경 내용

모든 public route가 `renderDesignRoute`를 동일하게 호출하고 route kind, path, debug state, content, 선택적으로 해석된 project를 전달하도록 한다.

### 프로젝트 이해에 중요한 이유

하나의 URL, content, availability, framework 계약을 유지하면서 presentation layer에서 서로 완전히 다른 다섯 site를 제공할 수 있는 구조를 설명한다.

## feat(content): production readiness 기본 검사 추가
커밋: `002b642d52a3`
중요도: S
태그: ARCH, CONTENT, VALIDATION

### 문제

schema-valid starter content에도 실제 claim으로 절대 index되어서는 안 되는 template marker, non-public origin, publication assumption이 남을 수 있다.

### 결정

public origin을 검증하고 모든 authoritative source를 scan하며 issue를 누적한 뒤 전체 검사를 통과해야만 production result를 반환하는 aggregate readiness validator를 만든다.

### 중요한 이유

구조적 validity보다 한 단계 높은 두 번째 trust level을 확립한다. content는 development에는 유효해도 publication에는 부적합할 수 있으며, 이 구분이 build, metadata, robots, sitemap, JSON-LD를 제어한다.

### 변경 내용

validator는 하나의 실질적으로 수정 가능한 issue set과, production branch에 검증된 URL이 반드시 포함되는 discriminated result를 생성한다.

### 프로젝트 이해에 중요한 이유

“production”이 renderer나 SEO helper가 가정하는 environment label이 아니라 검증된 상태이기 때문에 최종 portfolio를 안전하게 배포할 수 있다.

## refactor(designs): renderer 입력을 route view model로 제한
커밋: `f8b0ab7b08aa`
중요도: S
태그: ARCH, ROUTING, RENDERER

### 문제

full-site renderer가 여전히 전체 portfolio aggregate를 받아 각 design이 join, filtering, fallback, link selection을 독립적으로 다시 수행할 수 있었다.

### 결정

raw-content renderer prop을 준비된 route view model의 discriminated union으로 대체하고 `footerLinks` 같은 projected shell data를 명시적으로 요구한다.

### 중요한 이유

semantic consistency를 강제 가능한 계약으로 만든다. renderer는 composition을 다르게 할 수 있지만 project membership, evidence resolution, contact precedence, route statistic을 독자적으로 재해석할 수 없다.

### 변경 내용

registry contract, shell adapter, 남아 있던 compatibility request shape를 route-owned projection만 사용하도록 좁힌다.

### 프로젝트 이해에 중요한 이유

다섯 design의 일관성을 지탱하는 핵심 invariant를 보여준다. domain decision을 한 번 해석한 뒤에만 visual freedom을 허용한다.

## refactor(designs): 모든 route를 registry renderer로 위임
커밋: `380b2a025070`
중요도: S
태그: ARCH, ROUTING, RENDERER

### 문제

확장 design은 registry를 사용하게 되었지만 Classic과 Design은 여전히 direct page import와 special-case selection을 유지해 application에 두 가지 dispatch architecture가 남아 있었다.

### 결정

template resolution과 view-model construction 뒤 모든 page를 동일한 registry로 전달한다. App Router layer에는 not-found와 structured-data framing만 남긴다.

### 중요한 이유

renderer architecture를 완성하고 특권적인 template를 제거한다. 새 route 동작이나 design selection은 이제 하나의 integration path만 검증하면 된다.

### 변경 내용

모든 application page에서 direct template branch를 제거하고, 각 page가 대응하는 discriminated projection을 registry에 제공한다.

### 프로젝트 이해에 중요한 이유

최종 아키텍처를 균일하게 만든 커밋이다. 기존 design만 예외로 두지 않고 page는 준비하고, registry는 선택하며, renderer는 presentation을 담당한다.

## refactor(content): route view model 공용 경계 제한
커밋: `5897b4b024da`
중요도: S
태그: ARCH, CONTENT, ROUTING

### 문제

이전 view model은 여전히 넓은 common object를 상속하고 빈 compatibility collection을 생성했기 때문에 type compatibility가 의도하지 않은 runtime data ownership을 숨길 수 있었다.

### 결정

공용 route base를 site, profile, presentation, 준비된 footer link로 줄이고, 사용할 수 없는 key는 runtime object에 복사하지 않은 채 `never`로 표시한다.

### 중요한 이유

route isolation을 완성한다. renderer는 관련 없는 collection을 다시 얻을 수 없으며, compatibility를 위해 과도하게 큰 global content graph를 모든 route에 전달할 필요도 없다.

### 변경 내용

factory가 `PortfolioContent` 전체를 spread하지 않도록 하고 link, group, project, metric을 위한 synthetic array를 제거한다.

### 프로젝트 이해에 중요한 이유

최종 data boundary를 가장 잘 설명하는 커밋이다. 각 route가 자신에게 필요한 evidence와 shared shell context만 받으므로 ownership을 확인하고 검증할 수 있으며 우회하기도 어렵다.
