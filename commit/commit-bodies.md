## build(next): 실행 가능한 애플리케이션 골격 구성

Establish the repository as a runnable Next.js application rather than a content-only skeleton. The change fixes the baseline runtime and validation contract around Next.js 16, React 19, strict TypeScript, path aliases, Tailwind/PostCSS, and the Next.js ESLint configuration, with dedicated scripts for development, production builds, linting, and type checking.

Keeping those concerns in the initial application boundary makes later UI and content work compile against one consistent environment. The generated lockfile records the resolved dependency graph; the authoritative engineering decisions are the manifest, compiler, lint, and framework configuration that define how the application is built and checked.

## feat(content): 사이트와 프로필 콘텐츠 기반 추가

Introduce site metadata and profile information as structured JSON backed by explicit TypeScript contracts. Navigation, footer copy, identity fields, principles, and the optional profile image now have a shared representation instead of being embedded directly in page components.

This separates editorial data from rendering code. Components can depend on a stable content shape, while profile or site copy can change without rewriting layout logic. Optional media is represented in the model rather than inferred by the renderer, so absence remains a valid, deliberate state.

## feat(content): 링크와 프로젝트 도메인 정의

Define the domain model for portfolio links and project case studies before populating the catalogs. The contracts distinguish link purpose, placement, external behavior, enablement, deployment status, screenshots, architecture notes, technical stack, decisions, trade-offs, and results.

Representing deployment and link availability explicitly is important because a source repository, live demo, and case-study route do not have the same lifecycle or exposure rules. Empty JSON collections provide a valid starting state while fixing the vocabulary that later loaders and components use, avoiding ad hoc checks against loosely shaped objects.

## feat(content): 디자인 홈 표현 모델 추가

Add the presentation contract for the design-oriented home page, including template metadata, hero actions, statistics, section selection, and featured-project copy. The model uses named count keys rather than embedding computed values in content.

This makes presentation configuration declarative while keeping derived project totals under application control. The page can choose which sections and labels to show, but it cannot become the owner of project data or aggregation logic. That boundary allows the same domain content to support multiple visual treatments later.

## feat(content): 클래식과 공용 홈 표현 추가

Extend the presentation model with a classic home variant and the sections shared by both home designs. Terminal commands remain template-specific, while work-map, technical-focus, stack, journey, and contact copy use a common contract.

The split preserves genuine visual differences without duplicating domain-facing section definitions. Both templates can consume the same project, skill, and journey data, while each retains control over its own hero and framing. This establishes presentation variants as alternative renderers over one content source rather than separate sites.

## feat(content): 프로젝트 목록 표현 계약 정의

Define separate presentation contracts for the design and classic project indexes, including hero copy, group descriptions, terminal framing, selected-project sections, and the limited set of supported count keys.

Constraining count keys to known derived metrics prevents presentation JSON from naming arbitrary properties or carrying stale totals. The route remains responsible for computing project, curriculum, and source-only counts; the content layer only selects and labels those values. This keeps display configuration flexible without weakening the data boundary.

## feat(content): 프로젝트 목록 화면 문구 추가

Populate the project-index presentation data for both visual variants. The commit supplies the hero, statistics, group descriptions, terminal labels, and selected/grouped section copy required by the previously defined contract.

The change is intentionally content-driven: no page component needs hard-coded portfolio wording to render the two project-list experiences. Keeping this copy in the presentation source also makes the design variants editable without changing project records or aggregation code.

## feat(content): 보조 페이지 표현 계약 정의

Add presentation contracts for project details, About, Resume, and Contact pages. Project details receive named sections for the problem, solution, architecture, screenshots, stack, decisions, trade-offs, and results, while the auxiliary pages define their own hero and section copy.

This establishes a complete separation between page structure and editable labels before those routes are implemented. Exhaustive section keys are useful here because detail pages must preserve a stable information hierarchy even when individual project records differ in content.

## feat(content): 상세 소개 이력 연락 문구 추가

Populate the presentation source for project details and the About, Resume, and Contact pages. The added values provide the labels and section titles required by the contracts introduced in the preceding change.

Centralizing these strings keeps auxiliary routes consistent with the home and project indexes: components render typed content rather than owning page-specific wording. The commit is mechanically straightforward but completes the editable presentation layer needed by the upcoming routes.

## feat(content): 기술과 여정 콘텐츠 모델 추가

Introduce source files and contracts for experience, journey, skills, and the canonical technology stack. The model gives technologies stable identifiers and constrained icon names, allows an ongoing journey entry through a nullable end date, and permits journey items to reference related projects and source paths.

Stable references let different views reuse the same technology and journey records without copying display data. Making optional relationships explicit also prevents renderers from assuming that every timeline entry has a project, a terminal date, or provenance metadata.

## feat(content): 연락과 이력 집계 모델 완성

Complete the remaining content contracts for contact and resume data, then define the aggregate `PortfolioContent` shape consumed by the application. The model also records environment-provided link overrides and the asynchronous search-parameter shape used by routes.

A single aggregate contract gives selectors and pages one coherent input boundary instead of requiring each component to coordinate unrelated JSON imports. Environment values remain partial because deployment configuration may override only selected links, while the committed content remains the fallback source.

## feat(content): 정적 포트폴리오 콘텐츠 로딩

Add the first static loader that imports committed JSON sources and exposes them through typed content modules. This creates one integration point between raw files and the rest of the application instead of allowing page components to import and cast JSON independently.

At this stage the loader relies on TypeScript assertions rather than runtime validation, but the boundary is still valuable: later normalization, filtering, and validation can be introduced in one place while consumers continue to depend on the same domain-facing API.

## feat(content): 여정 정렬과 콘텐츠 인덱스 구성

Extend content loading with deterministic journey ordering, a technology lookup index, and enabled-link filtering. Journey entries are copied before sorting, so imported source arrays are not mutated, and ties receive a stable secondary comparison.

The technology map turns repeated identifier scans into direct lookup and establishes technology IDs as the join key used by project and skill content. Link filtering treats only an explicit disabled flag as exclusion, preserving backward-compatible opt-in behavior for existing entries.

## feat(content): 환경 링크를 반영한 콘텐츠 집계

Build the complete portfolio aggregate while resolving environment-backed links and filtering disabled projects and links. Environment values are trimmed and used only when non-empty; otherwise the committed URL remains authoritative.

Resolving overrides before exposing projects gives every consumer the same effective links and avoids route-specific deployment logic. Filtering at the content boundary also ensures that disabled records cannot reappear simply because a component forgot to check their flags.

## feat(navigation): 템플릿 URL과 쿼리 해석 추가

Introduce the canonical query-state utilities for selecting a home template, enabling content-debug mode, and constructing state-preserving internal URLs. Query values are normalized from either scalar or array input, unknown template IDs fall back to the configured default, and debug mode is enabled only by the supported value.

The URL builder accepts root-relative application paths while rejecting protocol-relative inputs, then updates `view` and `debug` without discarding existing query parameters or fragments. Centralizing this behavior prevents links, template switching, and nested routes from disagreeing about navigation state or accidentally treating an external-looking URL as internal.

## feat(portfolio): 기술과 프로젝트 조회기 추가

Add focused selectors for technology lookup, featured projects, project-by-ID access, and resume project resolution. Missing technology metadata receives a controlled fallback, unknown projects return an explicit null result, and resume entries are produced by resolving configured IDs against the enabled project set.

These selectors keep relationship handling out of renderers. Pages can consume resolved records and deliberate absence states instead of repeatedly scanning arrays or silently rendering stale references, which makes content joins consistent across home, project, and resume views.

## feat(portfolio): 연락과 프로젝트 링크 선택기 추가

Centralize selection of preferred contact links, project-specific links, card-safe actions, and external-anchor attributes. Live-demo exposure is tied to both the link and the project's live deployment state, while disabled or misplaced links are excluded through shared rules.

The external-link helper applies the appropriate target and relationship attributes at the same boundary that classifies the URL. This reduces duplicated security and availability checks and gives every renderer the same interpretation of contact preference, deployment status, and link placement.

## style(theme): 포트폴리오 기본 디자인 토큰 추가

Define the global color, surface, border, typography, and spacing vocabulary used by the portfolio, then expose those values to Tailwind utilities. Base document, selection, and font behavior are aligned with the same token set.

Using semantic tokens instead of page-local colors lets later templates change presentation without rewriting component markup. It also gives shared components a stable visual contract: they refer to roles such as foreground, muted text, surface, line, and accent rather than to unexplained literal values.

## feat(ui): 핵심 방향 및 상태 아이콘 추가

Add reusable SVG components for the core directional and status symbols. Each icon accepts ordinary SVG properties, inherits color through `currentColor`, and is hidden from assistive technology when it serves as decoration.

This keeps icon sizing and styling under the caller's control while avoiding repeated inline SVG markup. Treating decorative icons consistently also prevents the visual symbols from adding redundant or misleading names to accessible content.

## feat(ui): 확인 외부 링크 보안 아이콘 추가

Expand the shared icon set with confirmation, external-link, and shield symbols using the same prop-forwarding and decorative-accessibility contract.

The change is small, but preserving one icon interface matters for the upcoming link, deployment, and trust-related UI. Callers can compose these symbols without introducing one-off SVG behavior or inconsistent accessibility treatment.

## feat(ui): 콘텐츠 이미지 프리미티브 추가

Introduce shared primitives for content-source hints, profile photography, and project screenshots. The profile image is treated as immediately relevant, while screenshots expose an explicit priority choice and otherwise retain lazy loading; stable aspect-ratio containers prevent layout movement while media loads.

The debug hint makes the source path visible only when content-debug mode is active, keeping provenance tooling separate from normal presentation. Consolidating image behavior ensures that pages do not independently choose conflicting loading, sizing, or empty-state conventions.

## feat(ui): 뷰포트 진입 공개 효과 추가

Add a client-side reveal primitive driven by `IntersectionObserver`. Elements become visible once they enter the viewport, observers disconnect after the one-time transition, and cleanup releases observation when the component unmounts. Environments without observer support immediately show the content instead of leaving it hidden.

The CSS counterpart also disables reveal transitions and smooth scrolling for users who request reduced motion. The progressive-enhancement rule is therefore explicit: animation may enrich the page, but content visibility and navigation cannot depend on browser support or motion preferences.

## feat(ui): 내부 외부 콘텐츠 링크 렌더링

Create a single renderer for typed content links. External destinations use normal anchors and the shared security attributes, while internal destinations use Next.js navigation and preserve the selected home template and content-debug state.

This makes URL classification and state propagation a component-level invariant instead of a convention every caller must remember. Link labels and destinations remain content-owned, but transport behavior is selected by the application according to the link contract.

## feat(shell): 브랜드와 주 탐색 헤더 추가

Add the persistent site header with a brand link, profile identity, primary navigation, and an accessible navigation label. Internal destinations are generated through the shared template/debug-aware URL helper.

The header becomes the common navigation boundary for all subsequent pages. Keeping routing state in its links ensures that switching away from the home route does not unexpectedly discard the active visual template or content-debug mode.

## feat(shell): 홈 디자인 전환 탐색 추가

Introduce an optional design switcher that lists configured home templates, marks the active choice with `aria-current`, and creates explicit `view` URLs for the current path. Content-debug state is carried into each alternative.

The switcher treats a template as route state rather than local component state, so a selection remains addressable, shareable, and consistent across server-rendered pages. Rendering it only when configuration is supplied keeps the base shell usable in contexts that do not expose multiple designs.

## feat(shell): 공용 푸터와 페이지 셸 추가

Complete the shared page frame with a footer and a `PageShell` composition boundary. The shell wires the header, optional template switcher, main content, and footer together, and places the active template on the main element as a data attribute.

That data attribute gives theme CSS a scoped selector without coupling individual components to template conditionals. Centralizing the frame also guarantees that navigation state, footer content, and debug behavior are applied uniformly to home, index, and detail routes.

## feat(home): 디자인 홈 소개 영역 구성

Implement the design home route's introductory section from the aggregated content model. Profile identity, headline, summary, optional photo, and configured calls to action are rendered through the shared shell, image, link, and debug-hint primitives.

Calls to action are selected by their declared placement rather than by hard-coded link IDs, and the photo is conditional on content availability. The route therefore owns composition and visual hierarchy while the content and selector layers continue to own data and availability rules.

## feat(home): 대표 프로젝트 쇼케이스 추가

Add the design home's featured-project showcase and derive its statistics from the active project set. The first featured project becomes the lead case, supporting entries fill the secondary area, and the entire showcase is omitted when no lead project exists.

This avoids manufacturing an empty hero card and keeps image priority focused on the most prominent evidence. Project links and deployment state continue to flow through the shared project contracts, so the showcase does not introduce a second interpretation of availability.

## style(home): 디자인 히어로 시각 계층 구성

Establish the design home's layered hero presentation with gradients, a moving grid, framed media, and supporting decorative elements. Decorative layers do not intercept pointer input, preserving interaction with the actual content above them.

The animation rules include a reduced-motion override, so the visual hierarchy remains intact without continuous movement. The change confines high-impact presentation to CSS while leaving the home component's content and semantic structure unchanged.

## feat(app): 콘텐츠 기반 디자인 홈 연결

Connect the application entry points to the content-backed design home. The root layout now supplies document language, metadata, fonts, global styling, and favicon assets, while the root page loads the aggregate and renders the design route.

This turns the earlier models and primitives into the default executable experience. Metadata and language are set at the application boundary, where Next.js can apply them consistently, rather than being repeated inside page content.

## feat(home): 애니메이션 터미널 상호작용 추가

Implement the classic terminal as an explicit typing state machine. Configured command output supports placeholder substitution, then advances through typing, holding, erasing, and cycling phases with timers that are cancelled on cleanup.

Reduced-motion mode bypasses the timer-driven animation and exposes stable content instead. Keeping command data external and transition state internal separates editable terminal copy from lifecycle mechanics, while cleanup prevents obsolete timers from updating an unmounted component.

## style(home): 터미널 프레임과 부유 장식 추가

Add the terminal's visual frame, title bar, body treatment, sheen, and floating decorative elements. These styles provide the classic template's device-like framing without changing the terminal's state or content contract.

Continuous decorative animation is disabled under reduced-motion preferences. The component therefore keeps the same readable structure when motion is unavailable or undesirable.

## style(home): 터미널 출력과 커서 동작 추가

Style terminal output, command bullets, entry transitions, line wrapping, and the animated caret. The rules make dynamically typed content readable across line lengths while distinguishing command state from output state.

Caret and entry animations are covered by the existing reduced-motion policy, preserving the terminal metaphor without making animation a prerequisite for understanding the text.

## feat(home): 클래식 홈 히어로 구성

Implement the classic home route over the same profile, links, project counts, and page shell used by the design home. Its hero composes the animated terminal and classic-specific copy while retaining the shared availability and navigation rules.

The result demonstrates the intended template boundary: domain data and routing state are common, but layout and visual language can differ substantially. No parallel content store is introduced for the classic experience.

## style(home): 클래식 홈 테마 적용

Apply the classic template's dark palette and hero/photo treatment under the shell's template data attribute. The scope prevents these overrides from leaking into the design home or auxiliary pages rendered with another active template.

Template-aware CSS preserves shared component markup while allowing a distinct visual system. The change therefore extends presentation through tokens and selectors rather than forking the component tree.

## feat(home): 쿼리 기반 디자인 전환 연결

Resolve the `view` and debug query parameters in the root page and dispatch to the classic or design home on the server. The selected template is also passed into the shell's switcher configuration.

Server-side selection means the URL is the authoritative template state on the first render, avoiding a client-only flash or a second source of truth. Unsupported values continue to fall back through the shared resolver, so routing and rendering apply the same validation rule.

## feat(project): 프로젝트 배포 상태 배지 추가

Add a reusable deployment badge that maps known project states to visual tones and honors the content-controlled `showBadge` flag. The live indicator is shown only when the project's semantic deployment state is actually live.

This keeps display labels flexible while preventing visual “live” treatment from being inferred from arbitrary text. Unknown tone mappings degrade to a neutral presentation rather than breaking the card or detail page.

## feat(stack): 기술 스택 아이콘 매핑 추가

Introduce a typed, partial mapping from portfolio technology icon identifiers to `simple-icons` definitions. The mapping is intentionally partial because the content vocabulary includes concepts that do not have a suitable third-party brand glyph.

Treating the map as an adapter keeps package-specific icon objects out of the content model. Technology records retain stable internal identifiers, while the presentation layer can use an external asset only where an explicit mapping exists.

## feat(stack): 기술 스택 폴백 아이콘 추가

Add the technology-icon renderer with internal SVG variants and a generic fallback for identifiers not covered by `simple-icons`. Third-party icons and local symbols are exposed through one component contract.

This makes incomplete vendor coverage a supported state instead of a rendering failure. The content catalog can represent domain concepts independently of any icon package, and every known or future item still receives a deterministic visual marker.

## feat(stack): 공용 기술 스택 목록 추가

Create the shared stack-list component that resolves technology IDs at the rendering boundary, applies an optional item limit, and renders consistent chips with each technology's configured color and icon.

Centralizing resolution prevents cards, resumes, and detail pages from implementing different missing-ID behavior. The optional limit supports compact contexts without changing the underlying project stack, preserving one source of truth for the full technology list.

## feat(project): 프로젝트 링크 그룹 추가

Implement the project-detail link group from the shared availability rules. Case-study links are excluded from the detail action set, live demos are exposed only for live deployments, and the component returns no wrapper when no eligible actions remain.

Demo actions receive primary emphasis, while source and other destinations retain internal/external icon and security behavior through the common link renderer. The component therefore reflects project lifecycle state rather than blindly rendering every configured URL.

## feat(project): 프로젝트 카드 링크 추가

Add the compact action set used by project cards, sourcing its links from the centralized card-link selector. Internal case-study navigation, external targets, debug state, and active-template propagation all remain consistent with full project links.

Keeping the card subset separate from the full detail action group prevents compact surfaces from exposing an uncontrolled number of actions while avoiding duplicated availability logic.

## feat(project): 프로젝트 카드 프리미티브 추가

Introduce the reusable project-card primitive that composes detail navigation, screenshot, deployment badge, summary, stack, highlights, debug provenance, and card actions. A featured variant changes emphasis and limits supporting detail without changing the project contract.

This becomes the shared evidence surface for home and project-index views. By accepting a resolved project and route state, the card stays responsible for presentation while selectors continue to own link eligibility and content loaders own record availability.

## feat(ui): 공용 섹션 제목 추가

Add a common section-heading primitive for a title, optional body copy, and optional content-source hint. The component fixes the repeated semantic and spacing structure used by the upcoming home sections.

A small shared boundary is appropriate here because the heading appears across templates while its text remains content-driven. It reduces markup drift without forcing visually distinct sections into one large component.

## feat(home): 디자인 대표 프로젝트 섹션 추가

Add the design home's configurable featured-project section using the shared heading, reveal, and project-card primitives. The first featured entry spans the lead position and subsequent entries fill a supporting grid, with image priority reserved for the most prominent cases.

The section is driven by presentation configuration and the selected featured-project set, so it can disappear cleanly when disabled or empty. Reusing the card preserves deployment, link, stack, and accessibility behavior established elsewhere.

## feat(home): 클래식 대표 프로젝트 섹션 추가

Add the classic home's featured-project section as a compact single-lead presentation. It uses the same selected project and shared card primitive as the design variant, but applies the classic route's composition and section copy.

The implementation reinforces the renderer boundary: template-specific layout does not require template-specific project behavior. Empty data and disabled-section states remain valid and do not produce placeholder cards.

## feat(home): 작업 지표 섹션 추가

Introduce a shared work-map section and derive its displayed counts from portfolio content rather than storing totals in presentation JSON. Named count keys select curriculum, reliability, or product-oriented aggregations for each configured card.

Both home variants can enable the section independently while consuming the same computed values. This prevents copy configuration from becoming a second data source and keeps statistics synchronized with the projects that are actually enabled.

## feat(stack): 기술 스택 마키 프리미티브 추가

Create the stack marquee's semantic structure from a bounded subset of the canonical technology list. The visual track is duplicated to permit a seamless loop, but the duplicate is hidden from assistive technology so technologies are announced only once.

Stable keys and per-item color variables allow the CSS animation to remain presentation-only. Capping the items also prevents a decorative home element from expanding without bound as the technology catalog grows.

## style(stack): 기술 스택 마키 동작 추가

Implement the marquee's masked overflow, max-content tracks, continuous translation, and hover pause. The keyframe moves exactly one track width plus its gap, matching the duplicated structure so the loop does not visibly jump.

The animation is disabled for reduced-motion preferences, leaving the technology list readable in a static layout. This preserves the informational content while treating motion as an optional visual enhancement.

## feat(home): 기술 집중 영역 추가

Add the shared technical-focus section over the structured skill focus areas and connect it to both home templates behind their section configuration. Each focus item retains content provenance in debug mode and can participate in the common reveal behavior.

The component consumes the domain-level skill model instead of embedding a second list in presentation data. That keeps explanatory focus areas reusable across templates while allowing each home route to decide whether and where to present them.

## feat(home): 선택 기술 스택 영역 추가

Add the selected-stack home section by collecting technology IDs referenced by configured skill groups and filtering the canonical technology catalog to that set. The section combines the marquee with grouped stack lists and is independently gated in both home templates.

Deriving the visible catalog from references avoids maintaining a separate “featured technologies” list that could drift from the actual skill groups. Canonical technology metadata remains the source for labels, colors, and icons, while presentation controls only the section's presence and copy.

## feat(journey): 여정 날짜와 카드 프리미티브 추가

Introduce journey formatting and card primitives that normalize single dates, date ranges, ongoing periods, category labels, descriptions, and optional project links. Internal links preserve the active template and content-debug state, and pair chunking is exposed as a small layout helper.

This separates timeline semantics from any one visual arrangement. Compact and centerline renderers can share date interpretation and card behavior, ensuring that an open-ended entry or missing project reference is handled consistently everywhere.

## feat(journey): 중앙선 여정 목록 추가

Implement a paired centerline journey layout as a semantic ordered list. The first entry anchors the timeline, later entries are grouped into pairs around the center, and a final unpaired item receives an explicit single-row treatment. Optional reveal behavior wraps entries without changing their order.

Handling odd-length input structurally avoids placeholder cards or reordered content. The renderer owns spatial arrangement while the journey card remains the owner of date, category, body, and project-link presentation.

## feat(journey): 여정 목록 변형 연결

Expose a single `JourneyList` interface with compact and paired-centerline variants, plus an explicit animation option. The compact path remains a straightforward ordered list, while the centerline path delegates to the paired renderer.

A variant boundary is preferable to duplicating timeline selection across pages. About and home routes can choose a density and motion policy while consuming the same ordered journey records and card semantics.

## style(journey): 여정 타임라인 시각 계층 추가

Style the compact journey list with a continuous guide line, nodes, card hierarchy, and reveal transitions. The CSS makes temporal relationships visible without altering the ordered-list structure that carries the actual reading order.

The visual line and nodes remain decorative; journey content stays available independently of their rendering. Motion continues to inherit the global reduced-motion policy.

## style(journey): 데스크톱 중앙선 여정 구성

Add the desktop geometry for the paired centerline timeline: a central guide, starting node, three-column pair rows, centered treatment for an unpaired final card, and template-aware card surfaces.

The layout mirrors pairs visually while preserving source order in the DOM. Explicit handling for single rows avoids asymmetry being “fixed” by duplicating or moving content, and template scoping lets the same component fit both home designs.

## style(journey): 모바일 중앙선 여정 구성

Adapt the paired journey layout to a single-column mobile timeline with a left-side guide. Central desktop nodes are hidden, pair rows collapse in source order, and card surfaces are simplified for the narrower viewport.

This responsive transformation preserves chronology rather than trying to retain the desktop's visual alternation at the cost of reading order. The same semantic list therefore remains usable across breakpoints.

## feat(home): 공용 여정 섹션 추가

Add a shared home journey section using the paired, animated journey renderer and connect it to both template configurations. Section copy remains in presentation content, while entries come from the normalized journey source and links receive the active template state.

Both home variants now present the same chronology without duplicating timeline assembly. Empty or disabled sections can be omitted cleanly, preserving the established content-driven composition model.

## feat(home): 연락 미리보기 추가

Introduce a shared contact-preview section that combines current availability text with preferred contact links selected by the portfolio domain helpers. The common link renderer applies internal/external behavior, security attributes, and active route state.

This keeps contact preference and enablement rules out of the home templates. Design and classic views can independently include the preview while remaining consistent with the dedicated Contact page's interpretation of the same source data.

## feat(projects): 프로젝트 그룹 정렬 규칙 추가

Add deterministic grouping and ordering for project-index data. Known categories follow the explicit order declared by presentation content; categories absent from that configuration are retained after known groups and sorted consistently among themselves.

The rule avoids dropping newly introduced categories while preserving editorial control over established ones. Centralizing it also ensures that design and classic indexes present the same project taxonomy even though their layouts differ.

## feat(projects): 디자인 프로젝트 소개 영역 추가

Implement the design project index's hero and statistics from the active project collection. Visible entries, curriculum projects, and source-only projects are computed by the route-facing data layer and rendered with presentation-owned labels.

The page therefore reports the records users can actually browse rather than a manually maintained total. Debug provenance and the shared shell remain available without coupling the hero to individual project-card implementation.

## feat(projects): 디자인 대표 프로젝트 목록 추가

Add the design index's featured-project section with shared project cards and prioritized media for the first entries. The section consumes the same featured selection used elsewhere and preserves template/debug state in all generated links.

Reusing the card keeps deployment status, stack limits, screenshots, and actions consistent with the home showcase. The index only determines section composition and visual priority.

## feat(projects): 디자인 프로젝트 그룹 목록 추가

Render the remaining design-index projects by the centralized grouping result. Category descriptions come from presentation content, groups receive alternating visual treatment, and each section reports its own count before rendering the shared cards.

Separating featured and grouped collections prevents duplicate cases while keeping every enabled non-featured project reachable. Unknown categories remain displayable because the grouping utility supplies a deterministic fallback order.

## feat(projects): 클래식 프로젝트 소개와 터미널 추가

Implement the classic project index's hero, typed statistics, and terminal-style group snapshot. Statistic configuration selects only supported derived count keys, while the terminal limits the number of groups according to presentation content.

The route retains authority over actual counts and grouping; the classic renderer changes only how that information is framed. Bounding terminal output keeps a decorative summary from replacing or overwhelming the full project index.

## feat(projects): 클래식 대표 프로젝트 추가

Add the classic index's selected-project area using a single lead project and the shared featured card. The section is conditional on an available featured project rather than rendering an empty frame.

This provides a concise classic presentation without creating separate project semantics. Link eligibility, deployment status, media, and technology rendering remain inherited from the common card boundary.

## feat(projects): 클래식 그룹 인덱스 추가

Add the classic project's dense grouped index with category copy, per-group counts, deployment badges, summaries, limited stack lists, and internal detail links. Detail URLs preserve the active template and content-debug state.

The compact index intentionally uses less card chrome than the design variant but consumes the same grouped records. This keeps taxonomy and navigation identical while allowing the classic template to optimize for scan density.

## feat(projects): 프로젝트 목록 route 연결

Connect `/projects` to the aggregated content and query-state model. The route resolves the active template and debug flag, partitions featured and non-featured projects, groups the remainder, computes visible, curriculum, and source-only counts, and dispatches to the corresponding index renderer inside the shared shell.

Computing these collections once at the route boundary prevents the two visual variants from drifting in eligibility or totals. Adding the Projects navigation entry makes the newly complete route reachable through the content-driven site navigation.

## feat(project): 상세 화면 섹션 프리미티브 추가

Introduce reusable title, two-column, and list section primitives for project detail pages. These components fix the repeated heading/content relationship while accepting section-specific copy and records.

The abstraction is deliberately narrow: it standardizes semantic hierarchy and spacing without hiding the distinct problem, solution, architecture, or results content behind one opaque renderer. This supports a long case-study page while keeping each section's responsibility visible.

## feat(project): 프로젝트 상세 소개 추가

Build the project-detail introduction with state-preserving back navigation, category, period, role, deployment status, summary, description, eligible actions, and a prioritized primary screenshot. Content-debug hints identify the underlying project source.

The view receives a resolved project rather than performing lookup itself, and link exposure continues to use the shared deployment-aware selector. This keeps the detail component focused on case-study presentation while preserving route and content boundaries.

## feat(project): 프로젝트 문제와 해결 설명 추가

Add independent problem and solution sections to the project detail view using the shared two-column primitive. The texts come directly from the project record, while presentation content supplies the section headings.

Separating these concepts from the introductory summary gives each case study a stable reasoning structure: the constraint and the response cannot be collapsed into card-level marketing copy. The common hierarchy also keeps projects comparable without forcing their actual explanations to be uniform.

## feat(project): 프로젝트 구조와 증거 갤러리 추가

Extend project details with an architecture section and a screenshot evidence gallery. Architecture is represented as a summary plus explicit items, while every configured screenshot is rendered through the shared media primitive.

The change distinguishes implementation structure from general solution prose and treats screenshots as supporting evidence rather than as decorative background. Using project-owned arrays allows case studies to vary in depth without changing the page component.

## feat(project): 프로젝트 기술과 의사결정 추가

Complete the main case-study body with the full technology stack and separate lists for decisions, trade-offs, and results. Stack rendering reuses canonical technology resolution, and the remaining sections use the shared list hierarchy.

Keeping decisions and trade-offs distinct records both what was selected and what costs accompanied that selection. Results remain a separate outcome layer, preventing the detail page from presenting implementation choices as evidence of success by themselves.

## feat(project): 프로젝트 상세 route 연결

Add the dynamic project-detail route and generate static parameters from the enabled project collection. The route resolves asynchronous parameters and query state, looks up the project through the shared selector, returns Next.js `notFound` for an unknown identifier, and renders the detail view inside the state-aware shell.

Static generation and runtime lookup use the same content source, so the set of prebuilt routes and the set of valid records cannot diverge. The switcher receives the concrete detail path, allowing visual-template changes without navigating away from the selected project.

## feat(about): 프로필과 원칙 소개 추가

Create the About route from profile and presentation content. The page resolves template/debug query state, renders identity and summary in the shared shell, and maps structured principles into individual articles with content provenance in debug mode.

The route does not duplicate profile facts already used on the home page; it gives the same records a fuller explanatory layout. Template switching remains URL-based and preserves the `/about` location.

## feat(about): 여정 요약 추가

Add the portfolio journey to the About page through the existing `JourneyList` abstraction. Presentation content provides the section title, while the normalized journey collection, active template, and debug state are passed directly to the shared renderer.

Reusing the compact default avoids introducing a second timeline implementation for About. Dates, ongoing entries, optional project links, and chronology therefore remain consistent with the home journey section.

## feat(about): 기술 그룹 소개 추가

Add grouped technical skills to the About page with the shared stack-list renderer, and expose the completed route through site navigation. Each group retains its source hint in debug mode and resolves technology metadata through the canonical catalog.

The page presents skill grouping without copying labels, colors, or icon data into its own component. Adding navigation in the content source keeps reachability under the same editable site configuration as the existing Home and Projects links.

## feat(resume): 이력 소개와 요약 추가

Create the Resume route with profile identity, presentation-owned hero copy, an optional download action, and structured summary paragraphs. Query-selected template and debug state are handled through the shared shell.

The download control is rendered only when a URL exists, making the absence of a generated resume a valid content state. Summary content remains separate from project records so the route can introduce the candidate's scope before listing evidence.

## feat(resume): 선택 프로젝트 경력 추가

Add selected project evidence to the Resume page by resolving configured resume project IDs through the shared selector. Each entry presents period, summary, a bounded technology list, and a state-preserving link to the full case study.

Resolving references instead of embedding project snapshots prevents resume content from drifting from the project catalog. Invalid or disabled references are handled at the selector boundary, leaving the page to render only valid domain records.

## feat(resume): 교육 과정 요약 추가

Add structured training entries to the Resume page and expose the route in the content-driven site navigation. Each record presents its name, period, and description with a debug source hint.

Training remains a separate resume concern rather than being inferred from project categories, allowing educational history to be described directly. The navigation change makes the now-complete route reachable without hard-coding menu markup.

## feat(contact): 연락 페이지 소개 추가

Create the Contact route with profile identity and contact-owned title and introductory text. The page uses the same query-state resolution, shared shell, and debug provenance behavior as the other auxiliary routes.

This establishes the route before adding individual contact methods, keeping the introductory availability context independent from link rendering. The content source remains authoritative for the wording.

## feat(contact): 선호 연락 수단과 안내 추가

Complete the Contact page with availability details, preferred contact links, and explanatory notes, then add the route to site navigation. Preferred links are selected through the domain helper and rendered through the common internal/external link component.

The page therefore honors enablement, preference order, URL classification, and external-link security without duplicating those rules. Notes remain structured content so operational expectations can change independently of the contact-link catalog.

## style(project): 프로젝트 카드 상호작용 추가

Add lift and layered highlight feedback to project cards and screenshots on hover. Pseudo-elements remain non-interactive and card children are explicitly layered above them, so the effect does not obstruct links or content.

The reduced-motion rule removes transforms and transitions from motion cards while leaving all information and actions intact. This keeps hover feedback presentational and avoids making movement part of the card's functional contract.

## style(a11y): 동적 목록의 모션 감소 지원

Extend the reduced-motion override to technology chips and the animated guide elements used by experience and journey lists. Their transforms and transitions are disabled alongside reveal and card motion.

The change closes a coverage gap in the existing accessibility policy: motion reduction now applies not only to obvious hero animations but also to repeated list and timeline effects that can be more disruptive because they occur throughout a page.

## build(content): runtime 콘텐츠 검증 의존성 추가

Add Zod as a runtime dependency and `tsx` as a development-time TypeScript runner, with the generated lockfile updated to capture their complete platform-specific resolution graph.

The two dependencies establish complementary parts of the validation boundary: Zod expresses and executes schemas against imported JSON, while `tsx` can run TypeScript validation tooling without first producing a separate JavaScript build. The semantic decision is recorded in the package manifest; the large lockfile change is mechanical evidence of reproducible installation.

## feat(content): 콘텐츠 경로와 기본 식별자 schema 추가

Begin runtime content validation with reusable schemas for non-empty strings, stable content identifiers, six-digit colors, supported links, local asset paths, and navigation items. Link values are limited to root-relative, fragment, HTTP(S), email, and telephone forms, while local assets must live under the public content or template namespaces.

These primitives encode assumptions that were previously carried only by TypeScript types and component behavior. Strict navigation objects reject accidental fields, and early path validation prevents content from pointing to arbitrary local locations that the deployment does not publish.

## feat(content): 사이트와 프로필 schema 추가

Add runtime schemas for site and profile sources. Required identity, metadata, navigation, footer, profile text, principles, and optional photo fields are validated, including the previously established asset-path rule.

The profile contract is strict because its shape is well-defined, while the site contract allows passthrough fields around a validated core to support incremental page-capability additions. This choice preserves validation of values the current application depends on without blocking compatible site-level extensions.

## feat(content): 링크와 배포 상태 schema 추가

Add runtime enums and strict object schemas for content links, link placement, deployment status, and project images. Optional IDs, enablement, external behavior, and placement lists are validated against the finite vocabulary used by selectors and renderers.

This protects availability logic from misspelled link types or deployment states that would otherwise fall through to inconsistent UI behavior. Project images also inherit the controlled local-asset path and non-empty alternative-text requirements.

## feat(content): 프로젝트 분류와 지표 schema 추가

Add strict schemas for ordered project groups and declarative project metrics. Metric filters can target project IDs, group IDs, tags, featured state, or deployment statuses, and non-empty filter arrays prevent configurations that appear selective but match nothing by construction.

Metric aggregation is constrained to project or highlight counts. This keeps presentation-level statistics expressive while preventing arbitrary executable queries or unknown aggregation modes from entering the content format.

## feat(content): 프로젝트 사례 schema 추가

Define the complete runtime schema for project case-study sources and the enclosing project catalog. Stable IDs, ordering, grouping, tags, lifecycle flags, narrative fields, deployment metadata, screenshots, stack references, links, architecture, decisions, trade-offs, and results are validated as one strict record.

Requiring at least one group and project establishes the minimum viable catalog, while optional feature and enablement flags retain the prior default behavior. The schema mirrors both list and detail consumers, turning their shared assumptions into an executable input contract instead of relying on casts.

## feat(content): 홈 표현 식별자 schema 추가

Add the finite identifiers used by presentation configuration: supported site designs, shared home sections, variant-specific section orders, work-map count keys, and project-page count keys. Editorial, brutalist, and cinematic section arrays must be non-empty and contain no duplicates.

These constraints make ordering declarative without permitting impossible or repeated sections. Enumerated count keys also guarantee that presentation content can select only values the application knows how to derive.

## feat(content): 프로젝트 목록 표현 schema 추가

Add runtime validation for the project-index presentation model across design, classic, editorial, brutalist, and cinematic variants. The schema checks group copy, hero fields, supported statistics, terminal configuration, archive labels, and variant-specific framing.

Strict inner objects catch misspelled fields where the renderer has a fixed contract, while the enclosing page object permits compatible extension for later page sections. Positive numeric limits and typed count keys protect the terminal and statistics renderers from invalid configuration.

## feat(content): 표현 공용 UI schema 추가

Establish the top-level presentation schema for the default template registry and shared UI copy. It validates template identities, accessibility labels, switcher text, project and journey action templates, the current-time label, and named empty states used across routes.

Treating accessibility and empty-state strings as required content prevents a visual template from being considered valid while omitting nonvisual navigation context or failure-state copy. Passthrough remains available at higher levels so later template-specific sections can be added incrementally.

## feat(content): Design과 Classic 홈 표현 schema 추가

Validate the Design and Classic home configurations inside the presentation schema. Design hero labels, typed statistics, enabled section IDs, and featured copy are checked, while Classic additionally validates its terminal title, boot line, prompt, commands, and command output arrays.

Both variants share the same allowed common-section vocabulary and work-map count keys. The schema therefore preserves their distinct framing while enforcing that each references only mechanisms already implemented by the home renderers.

## feat(content): Editorial 홈 표현 schema 추가

Add runtime validation for the Editorial shell and home presentation. The schema requires shell framing, a unique ordered section list, hero issue and action labels, lead-project copy, featured heading, and current-work action text.

Editorial-specific fields remain isolated from Design and Classic configuration, so adding the variant does not weaken their contracts. The explicit section order keeps the editorial composition content-driven while preventing duplicate structural regions.

## feat(content): Brutalist 홈 표현 schema 추가

Add runtime validation for the Brutalist shell and home configuration, including debug framing, stamp and signal text, ordered sections, primary and secondary hero actions, featured-project copy, system explanation, journey action, and contact action.

The schema encodes the variant's deliberately different vocabulary without moving it into component constants. Its section list uses the previously defined uniqueness rule, preserving a deterministic page structure even when content editors reorder regions.

## feat(content): Cinematic 홈 표현 schema 추가

Add runtime validation for the Cinematic shell subtitle and home composition. Required fields cover its unique section order, two hero actions, statement and focus labels, contact action, and case-study action.

Keeping this contract beside the other presentation schemas lets all templates share one validated source while retaining independent required fields. The cinematic renderer can assume its narrative controls exist instead of defending against partially configured content at every section.

## feat(content): 공용 홈 섹션 schema 추가

Complete validation for the home sections shared across templates. Work-map cards require stable IDs, labels, descriptions, and supported count keys; technical focus, stack, journey, and contact receive their required section and action copy.

This closes the gap between variant-level section selection and the shared content those selections reference. A configuration can no longer name a common section while omitting the copy needed to render it, and work-map statistics remain tied to known derived values.

## feat(content): About과 Contact 표현 schema 추가

Add runtime schemas for About and Contact presentation content. About validates its core section titles, curation structure, and editorial/brutalist labels; Contact validates availability, notes, and variant-specific hero framing.

The page objects permit compatible extension, but each currently consumed nested structure is checked. This gives auxiliary pages the same runtime guarantees as the home and project index without forcing unrelated visual variants into a single flat set of labels.

## feat(content): Interview Map 표현 schema 추가

Add runtime validation for the Interview Map page's hero, track navigation, question and answer labels, depth and reference metadata, empty state, item-count template, and gap-section accessibility copy.

The schema captures both visible labels and the ARIA context required by the map's grouped structure. Keeping those fields in presentation content allows the page vocabulary to remain editable while ensuring that navigation, empty results, and unmapped gaps always have the text the renderer expects.

## feat(content): Journey 표현 schema 추가
Extended the presentation schema with the journey page's semantic structure.

The page must provide hero framing, explanatory copy for the decision narrative, explicit labels for prior state, reason, and result, timeline framing, and the current-direction section's project-link label. Validating these concepts separately preserves the distinction between chronological entries and decision analysis, while page-level extensibility allows later designs to add presentation-specific fields without weakening the required shared contract.

## feat(content): 프로젝트 상세 표현 schema 추가
Extended the presentation schema with the complete project-detail interface contract.

The configuration now validates navigation and case labels, the unavailable-project state, project facts, frame and outro copy, editorial decision framing, and labels for every case-study section from problem through results. Requiring each known nested block prevents a renderer from silently losing a section because of malformed presentation data, while the page-level passthrough leaves room for additional design-specific fields. Project evidence remains in the project source; this schema governs only how that evidence is framed.

## feat(content): Resume 표현 schema 추가
Extended the presentation schema with the résumé page's complete interface contract.

The page must provide hero and download copy, labels for summary, selected projects, training, experience, education, and notes, identity-field labels, and design-specific hero framing. Individual known blocks are strict so misspelled labels fail validation, while the page remains extensible through the surrounding presentation schema. This separates résumé facts from the copy used to organize and render them across visual designs.

## feat(content): 기술과 경력 schema 추가
Defined runtime schemas for the technology registry, skill presentation, and experience history.

Technology entries now use stable identifiers, validated colors, and a finite icon vocabulary that matches the renderer's supported assets instead of accepting arbitrary names. Skills separate explanatory focus areas from named groups of technology references, and experience remains a compact sequence of period, title, and description records. Strict objects make unsupported metadata fail early and keep display identity centralized in the technology registry rather than repeated throughout page content.

## feat(content): 여정과 연락 schema 추가
Defined runtime contracts for chronological journey entries, global links, and contact content.

Journey records require a date, title, category, and description while allowing an open-ended period and optional links to either a canonical project or source path. Global links reuse the shared link schema, and contact preferences reference those links by identifier alongside availability and notes. This keeps timeline facts, reusable destinations, and contact-page composition separate while giving each collection a strict shape before it reaches the UI.

## feat(content): Resume 콘텐츠 schema 추가
Defined the strict runtime schema for résumé content.

The contract allows an optional local download asset, requires summary and note entries to be meaningful strings, references selected projects by stable content identifiers, and models training and education with the same name–period–description structure. Making the document strict prevents accidental fields from being silently accepted, while the nullable asset path supports a valid portfolio before a résumé PDF is supplied.

## feat(content): 여정 narrative schema 추가
Defined the strict schema for the portfolio's decision-oriented journey narrative.

Each milestone must have a stable identifier, date, title, prior state, decision reason, resulting change, and zero or more anchor-project identifiers, followed by a separate current-position summary. This representation prevents the journey from degrading into an unstructured timeline: the content contract requires the context, reasoning, outcome, and evidence relationship needed to explain a development transition.

## feat(content): Interview Map 콘텐츠 schema 추가
Defined the strict runtime schema for interview-evidence content.

The document now requires an introduction, a labeled reference repository, topic tracks with stable identifiers, individual questions with source links, project-backed answers with explicit evidence depth, and a section for unsupported topics. Reusing the shared URL and content-identifier schemas keeps external references and project relationships compatible with the rest of the content system. The shape makes the distinction between a question, its source, its supporting evidence, and known gaps enforceable at ingestion.

## feat(content): 큐레이션 schema와 타입 export 추가
Defined a strict schema for portfolio-curation content and exposed schema-derived project types.

The curation contract requires an introduction, named selection criteria, rationale-backed categories with project identifiers, explicit omissions, and a next-review statement; nested objects reject undeclared fields and meaningful text must be non-empty. Project groups, metrics, filters, source records, the projects document, and presentation content are now exported directly from their schemas. This makes runtime validation and TypeScript consumers share one authoritative representation instead of maintaining parallel definitions.

## refactor(content): 프로젝트 컬렉션 migration 경계 추가
Added a compatibility boundary for migrating `projects.json` from a flat array to an object-backed catalog.

The content facade accepts either the legacy array or the new `{ items }` representation and normalizes both to the existing `PortfolioProject[]` consumed by routes and selectors. This isolates the file-format transition from the rendering layer, allowing groups and metrics to be introduced without forcing every current consumer to change in the same commit. The boundary is intentionally narrow and is later replaced by schema-validated loading once the migration is complete.

## feat(content): 사이트와 프로필 starter 콘텐츠 구성
Replaced generic placeholders with a coherent starter identity, site map, contact policy, and experience record.

Site content now declares optional page availability and navigation for the new journey and interview routes, while profile content includes a portrait, working principles, location, availability, and honest starter copy. Contact preferences reference global link identifiers rather than duplicating URLs, and setup notes keep unsafe placeholders disabled until replaced. This creates a usable default portfolio while preserving clear boundaries between site configuration, personal facts, contact routing, and career history.

## feat(content): 링크와 기술 starter 콘텐츠 구성
Populated the starter's global links, technical focus, skill groups, and technology registry.

Links now carry stable identifiers, semantic types, enabled state, internal-versus-external behavior, and explicit placements for hero, contact, and footer contexts; placeholder email remains disabled until configured. Skill groups reference technology identifiers instead of repeating display metadata, while the technology registry owns labels, icons, and colors. This separates reusable technology identity from page grouping and lets one link record participate safely in multiple presentation surfaces.

## feat(content): 프로젝트 starter 분류와 지표 구성
Changed the project source from a flat array into a catalog with explicit groups and declarative metrics.

Groups carry stable identifiers, ordering, labels, and descriptions, while metrics define their aggregate and optional filters by group, featured state, or deployment status. This moves project statistics out of route-specific heuristics and makes the starter's product, archive, reliability, and source-only counts explainable from content. The later item collection can therefore reference classification and measurement rules through stable identifiers.

## feat(content): 프로젝트 starter 상세 구성
Added a complete starter project that exercises the portfolio's full case-study model.

The record defines grouping, tags, deployment state, media, technology references, placement-aware links, highlights, problem and solution narratives, architecture, decisions, trade-offs, and results under one canonical identifier. The source link is deliberately disabled and the artwork is clearly marked as placeholder evidence, so the starter renders safely without implying a real deployment. Providing one end-to-end record makes cross-file references and all five visual templates testable against the same content shape.

## feat(content): Resume와 여정 starter 콘텐츠 구성
Populated the résumé and journey sources with complete starter records.

The résumé now demonstrates factual summary lines, project references, training entries, and setup notes while leaving the optional download and education data explicit. A timeline entry links the example project into chronological history, and the new journey narrative models a decision as state, reason, result, and supporting project identifiers before recording the current direction. These examples establish how résumé selection and historical claims should reuse canonical projects instead of duplicating case-study content.

## feat(content): Interview Map과 큐레이션 starter 콘텐츠 구성
Added starter data for the interview-evidence map and portfolio-curation rationale.

The interview map demonstrates how a topic, external reference, project identifier, and evidence-depth statement form one traceable answer, while its gap list records unsupported claims explicitly. The curation source models selection criteria, rationale-backed categories, omissions, and a future review trigger. Providing complete examples establishes the intended authoring contract and makes honesty about evidence coverage part of the portfolio data rather than an informal convention.

## feat(content): 공용 UI 표현 콘텐츠 구성
Introduced the shared interface-copy contract used across designs and routes.

The presentation source now owns skip-link, navigation, menu, design-switcher, project-action, terminal, marquee, and journey labels, including interpolation templates and explicit empty-state messages. Template descriptions were also replaced with meaningful design summaries. Centralizing visible and assistive text prevents reusable components from hard-coding language and makes zero-data states part of the content model rather than accidental blank output.

## feat(content): Design과 Classic 홈 표현 콘텐츠 구성
Completed the presentation content for the original design and classic home variants.

Both variants now declare the full shared-section sequence and replace placeholder actions and featured-work copy with evidence-oriented language. The classic terminal becomes a content-driven summary of identity, indexed projects, focused tools, and contact availability, using interpolation tokens rather than fixed personal values. This keeps the terminal's visual metaphor synchronized with canonical portfolio data while letting the two home layouts share the same section model.

## feat(content): 확장 디자인 홈 표현 콘텐츠 구성
Added complete home-page presentation contracts for the editorial, brutalist, and cinematic designs.

Each design declares its own section order and the labels needed for its browsing metaphor: issue and cover-story language for editorial, signal, numbered work, system, journey, and contact framing for brutalist, and archive, statement, focus, and case-study actions for cinematic. Design-specific shell copy was added alongside the route content. Keeping section sequencing and wording in data gives renderers an explicit composition contract while preserving the same underlying portfolio evidence.

## feat(content): 공용 홈 섹션 표현 콘텐츠 구성
Replaced placeholder copy for the home sections shared by multiple designs.

The work map now distinguishes product case studies, the learning archive, and reliability practice through separate evidence-oriented descriptions, while technical focus, stack, journey, and contact sections receive complete explanatory copy. The archive card identifier was also generalized from curriculum to archive without changing its metric key, separating the broader presentation category from the underlying count. Centralizing this language keeps shared section meaning stable across alternate home compositions.

## feat(content): 프로젝트 목록 표현 콘텐츠 구성
Completed the projects-index presentation content across all supported designs.

Placeholder copy was replaced with descriptions that frame projects as evidence, the classic archive received explicit terminal, statistic, lead-project, and grouped-index wording, and editorial, brutalist, and cinematic renderers gained their own hero and archive labels. A project-group description also establishes the content shape later derived from canonical group data. This keeps the route's information model stable while allowing each design to express a different browsing metaphor.

## feat(content): 프로젝트 상세 표현 콘텐츠 구성
Expanded project-detail presentation content into a complete case-file contract.

The configuration now covers unavailable-project messaging, role and deployment facts, frame numbering, return and outro actions, an editorial decision-spread title, and a distinct highlights section. Existing section language was refined to distinguish visual evidence, technology, decisions, constraints, and outcomes. Moving these labels into content lets normal, missing, and design-specific detail states share one semantic structure without embedding editorial terminology in route components.

## feat(content): About과 Journey 표현 콘텐츠 구성
Expanded the presentation model for the about and journey routes.

The about page now distinguishes experience from the separate journey narrative, frames portfolio curation through criteria, categories, omissions, and review timing, and supplies renderer-specific labels for editorial and brutalist layouts. The journey page receives explicit hero, decision-milestone, timeline, and current-direction copy, including labels for state, reason, result, and supporting case studies. These structures let routes present authored evidence and its framing consistently without collapsing distinct concepts into generic section titles.

## feat(content): Interview Map과 Resume 표현 콘텐츠 구성
Expanded presentation content for the résumé and interview-evidence routes.

The résumé contract now distinguishes summary, selected projects, training, experience, education, notes, identity labels, and design-specific hero copy rather than relying on placeholder text. The interview map receives separate framing for track navigation, question references, supporting projects, evidence depth, counts, empty states, and known gaps. Keeping these labels and templates in structured presentation data lets multiple renderers share the same information architecture while varying composition without hard-coded interface text.

## feat(content): Contact 표현 콘텐츠와 최종 문서 형식 구성
Completed the contact-page presentation contract and normalized `presentation.json` into its final schema-oriented grouping.

Contact copy now names the notes section explicitly and supplies design-specific hero framing for editorial and brutalist renderers, including a location-aware editorial template. Existing shared UI, design-shell, home-shared, journey, and interview-map blocks were relocated without changing their meaning so the document mirrors the schema's top-level and page organization. Keeping renderer-specific wording in content prevents alternate designs from embedding copy in their components while the normalized layout makes the large configuration easier to validate against its contract.

## feat(content): 콘텐츠 validation 오류 모델 추가
Introduced the structured error model and source inventory for runtime content validation.

Each issue carries its source file, path, and message, while `PortfolioContentError` retains the complete issue array and renders it as one actionable failure. The loader module also names every schema-backed content source and defines overrideable inputs, supported designs, and navigable pages for the checks that follow. This gives malformed or inconsistent content a distinct failure type and allows validators to accumulate related problems instead of reducing them to an unlocated generic exception.

## feat(content): JSON 경로 진단 추가
Added a deterministic formatter for schema-error paths.

Numeric segments become array indexes, identifier-safe property names use dot notation, and unusual keys are JSON-quoted in bracket notation, with `$` representing the document root. Translating parser paths into familiar JSON paths makes diagnostics precise enough to edit the source file directly and gives later validation layers one consistent location format.

## feat(content): JSON schema 파싱 경계 추가
Added the schema-parsing boundary that converts raw JSON into typed application data.

`parseContentFile` uses `safeParse` so every Zod issue for a file can be translated into the portfolio's structured error format with the original file name and a JSON-style path. Successful parsing returns the schema's output type, allowing downstream code to rely on validated transformations and defaults rather than unchecked assertions. This concentrates malformed-content handling at ingestion instead of distributing defensive checks through rendering code.

## feat(content): 중복과 참조 진단 helper 추가
Added shared diagnostics for duplicate values and unresolved identifiers.

Duplicate detection records each repeated value once even when it appears more than twice, and both helpers append source-aware issues instead of throwing immediately. This supports complete validation reports across independent collections and gives later referential checks a uniform message shape. Separating detection from policy also lets callers define which identifiers must be unique or resolvable without duplicating error construction.

## feat(content): 내부 route 참조 검증 추가
Added a reusable validator for internal URLs declared in content.

The helper ignores external and protocol-relative destinations, normalizes internal paths through `URL`, accepts the site root, and recognizes only registered top-level pages or single-project detail routes. It reports unsupported paths, routes to disabled pages, and project links whose decoded identifier is unknown or disabled. Keeping this logic separate from individual content collections establishes one route-validity contract that navigation, global links, and project links can apply consistently.

## feat(content): 콘텐츠 파일 schema 파싱 연결
Connected every portfolio content file to its corresponding runtime schema through a single loader.

`loadPortfolioSource` now assembles the default JSON modules, accepts targeted overrides for validation scenarios, parses each source with its own file name and schema, and returns only validated values. The exported singleton and return type establish this loader as the authoritative boundary between untrusted JSON and the application model. Keeping source-aware parsing in one place ensures that malformed data fails before selectors or routes consume it and that diagnostics identify the file responsible.

## feat(content): 콘텐츠 식별자 중복 검증 추가
Added whole-repository uniqueness checks for the identifiers and ordering keys that other content records depend on.

The loader now detects duplicate project groups and group orders, metric identifiers, project identifiers and display orders, technology and link identifiers, journey milestones, interview tracks, curation categories, design identifiers, and navigation destinations. All collisions are accumulated with their source collection before loading fails. Establishing uniqueness before referential checks makes those later checks deterministic: an identifier can resolve to at most one semantic record, and ordered content cannot silently compete for the same position.

## feat(content): 지원 디자인 구성 검증 추가
Added bidirectional validation between presentation templates and the application's supported design registry.

The configured default must appear in the template list, every configured template identifier must be supported by code, and every supported design must have a presentation entry. Checking both directions prevents either an unrenderable content option or an implemented design with missing selector copy and metadata, while precise content paths make configuration failures actionable.

## feat(content): 사이트와 링크 route 참조 검증 추가
Applied internal-route validation to global navigation entries and content links.

Each configured URL is checked against enabled page flags and the set of enabled project routes, while external URLs remain outside that internal contract. Recording the source file and exact array path turns invalid navigation into a content-load error instead of a runtime dead link. Using the same helper for navigation and general links keeps route availability rules consistent across both surfaces.

## feat(content): 프로젝트 내부 참조 검증 추가
Added structural and referential validation inside each project record.

Every project must reference a declared group, technology identifiers must exist, and duplicate tags or stack entries are reported at their exact content paths. Project links are also passed through the internal-route validator, so links to disabled pages or unknown project routes cannot survive schema loading. These checks protect the derived category, stack rendering, metrics, and navigation layers from inconsistent source data.

## feat(content): 지표와 Resume 참조 검증 추가
Added referential checks for metric filters and résumé project selections.

Metric project identifiers must resolve to enabled projects, group identifiers to declared groups, and tag filters to tags that actually exist in project content. Résumé project identifiers are validated against the same enabled-project set. These checks ensure that declarative filters cannot produce misleading zero values because of misspellings and that résumé evidence cannot reference hidden or removed work.

## feat(content): 여정과 Interview 참조 검증 추가
Extended content integrity checks across every project reference used by journey and interview data.

Optional journey entries, milestone anchor lists, and nested interview answers must now resolve to enabled project identifiers. The validator records the precise file and array path for each failure and appends all issues before throwing. This guarantees that narrative and interview evidence cannot point to projects that the portfolio has disabled or removed.

## feat(content): 큐레이션과 연락 참조 검증 추가
Extended cross-file validation to curation project references and preferred contact-link references.

Every curation category must point to an enabled project, and every preferred contact identifier must resolve to an enabled global link. Failures retain the exact source file and array position through JSON-style paths and are accumulated with the loader's other issues. This prevents optional presentation data from silently producing dead project cards or missing contact actions.

## refactor(content): schema 기반 핵심 콘텐츠 타입 연결
Rebased the portfolio's core TypeScript contracts on the validated content schema instead of maintaining parallel hand-written page shapes.

Home and page presentation types now index directly into `PresentationContentSource`, and project group, metric, and source types are re-exported from the schema module. The runtime model was extended with optional page flags and social imagery, link placements, project group identifiers and tags, and the full registered design identifier set. This removes a major drift risk: schema changes now propagate to route-facing types rather than requiring duplicated interfaces to be updated independently.

## feat(content): 여정과 큐레이션 콘텐츠 타입 추가
Defined the runtime-facing content contracts for journey narratives, interview evidence, and portfolio curation.

Journey milestones explicitly carry state, reason, result, and anchor-project identifiers; interview topics pair external references with project-backed answers and depth notes; curation records selection criteria, grouped project rationales, omissions, and a review checkpoint. Modeling these concepts separately preserves their different evidence relationships and gives routes precise types instead of passing loosely shaped JSON objects through the portfolio facade.

## refactor(content): 검증된 콘텐츠를 portfolio facade에 연결
Moved the portfolio facade from direct JSON imports and unchecked type assertions to the validated `portfolioSource`.

Project groups are now sorted once and used to derive both each project's display category and the projects-page group copy, making group identifiers the canonical relationship rather than duplicating labels across files. The facade also exposes project metrics, journey narrative, interview-map, and curation data through one `PortfolioContent` object. Environment-key URL substitution was removed from the presentation layer; validated content links are now authoritative, while the legacy function argument is accepted but deliberately ignored for compatibility. This establishes a single pipeline from schema validation to selector and route consumption.

## feat(content): 페이지 활성화 selector 추가
Added a typed selector for the site's optional page flags.

A page is considered enabled unless its configuration is explicitly `false`, preserving backward compatibility for content files that omit the new map. Exporting this default-on policy through the portfolio facade gives navigation and route guards one shared interpretation instead of allowing absent flags to be handled differently across components.

## feat(content): 프로젝트 지표 selector 추가
Added a shared evaluator for content-defined project metrics.

Metric filters can constrain projects by identifier, group, an all-tags match, featured state, and deployment status. The selector then either counts matching projects or sums their highlight records, returning zero for an unknown metric identifier. Centralizing these rules makes dashboard and page statistics derive from the declared metric schema instead of duplicating project-specific heuristics in each view.

## feat(project): 카드 링크를 콘텐츠 배치 기준으로 선택
Changed project-card actions to honor each link's declared `card` placement.

The selector no longer hard-codes GitHub and case-study types as the only card-compatible actions; content placement now determines eligibility, while demo links retain the additional requirement that the project be live. This separates presentation context from link semantics and allows new action types to appear on cards without changing selector code.

## refactor(content): schema type import 경계 정리
Removed an unused `ProjectMetricFilter` import from the portfolio type facade.

The change leaves the exported schema contract and runtime behavior unchanged while keeping the type boundary limited to symbols actually consumed by the module.

## feat(metadata): 콘텐츠 기반 site metadata 추가
Replaced static layout metadata with request-aware metadata generated from validated portfolio content.

The layout derives its base URL from forwarded host and protocol headers, with explicit local-development defaults, then resolves canonical, Open Graph, and Twitter image URLs against that origin. Title, description, language, and optional social imagery now share the same site content source as the rendered application, preventing metadata from drifting from visible copy. The root layout also registers the Korean serif variable used by the expanded visual systems and marks document-level smooth scrolling explicitly.

## feat(content): 저장소 자산 참조 경계 검증
Added repository-boundary validation for every local asset referenced by portfolio content.

The validator collects the social image, profile portrait, résumé download, and all project screenshots with their originating file and JSON path. Each public URL is resolved beneath the configured `public` root, rejected if it escapes that root or becomes absolute, and checked for existence. All failures are accumulated into the existing structured content error rather than stopping at the first missing file, giving editors a complete actionable report while preventing path traversal and broken build-time assets. A committed portrait placeholder supplies a valid default for the new profile-photo reference.

## build(content): 콘텐츠 검사 명령 추가
Added a standalone content-validation entry point and exposed it as `content:check`.

The script loads the canonical source data, runs the same asset-aware validation against the repository's `public` directory, and reports the validated project and design counts only after the full check succeeds. Reusing production loaders and validators avoids a parallel verification model, while the explicit command makes content integrity testable independently of the application server.

## build(content): 콘텐츠 검사를 prebuild에 연결
Connected the content validation command to the package's `prebuild` lifecycle.

Production builds now fail before Next.js compilation when structured portfolio content violates the repository's validation rules. Making validation an automatic prerequisite removes the possibility of a successful build that contains broken references or unsupported content shapes, while retaining `content:check` as an independently runnable verification command.

## feat(journey): 여정 route 소개 추가
Introduced the journey narrative as an optional route using the portfolio's standard page lifecycle.

The route checks its feature flag before rendering, resolves design and content-debug parameters consistently, and supplies the current path to the shared shell so design switching remains route-preserving. Presentation copy frames the page while the introduction comes from journey narrative data, keeping route wording and historical content independently maintainable.

## feat(journey): 결정 milestone 목록 추가
Introduced an ordered milestone narrative on the journey route.

Each milestone receives a stable content identifier, chronological index, date, and title, with source-level debug metadata attached to the card. Extracting `MilestoneCard` establishes a focused boundary for the decision record and passes through the surrounding content, design, labels, and debug context needed by later rationale and project-evidence additions.

## feat(journey): milestone 결정 근거 추가
Expanded each journey milestone from a title into an explicit state–reason–result record.

A semantic definition list binds presentation-provided labels to the milestone's structured fields, making the transition and its rationale readable as one unit. This representation distinguishes the condition being addressed, the decision logic, and the observed outcome instead of compressing them into an unstructured narrative.

## feat(journey): milestone 프로젝트 근거 연결
Linked journey milestones to the projects that substantiate them.

Milestone project identifiers are resolved against the canonical project collection, with unresolved references filtered rather than producing invalid routes. The resulting links preserve the active design and content-debug state, allowing readers to move from a narrative claim to its case-study evidence without losing context. Omitting the link list when no project resolves keeps milestones valid even when they are purely descriptive.

## feat(journey): 전체 여정 타임라인 추가
Added the complete journey collection to the dedicated route using the paired-centerline timeline variant.

The route passes the resolved design and content-debug state into the shared list, so case-study links retain the current presentation context and individual entries remain traceable to their source data. Reusing the common `JourneyList` keeps the chronological representation consistent with journey summaries elsewhere while allowing this page to choose the denser full-history layout.

## feat(journey): 현재 방향 요약 추가
Added a current-position summary to close the journey route.

The section reads its heading from page presentation copy and its title and narrative from the journey-specific content source, preserving the existing separation between interface framing and authored history. Placing the current direction after the timeline turns a chronological record into a present-state explanation without modifying or overloading individual journey entries.

## feat(interview-map): 근거 route 소개 추가
Introduced the interview-evidence map as an optional, independently addressable route.

The page enforces its enablement flag before rendering, resolves the active design and debug state through the same route contract as the rest of the portfolio, and links to the external reference repository with safe new-tab attributes. Separating presentation copy from interview-map data lets the route frame the evidence model without embedding its source material in the component.

## feat(interview-map): 인터뷰 주제 인덱스 추가
Added a presentation-driven topic index for navigating the interview map.

Each track becomes an in-page link to its stable section fragment, allowing the long evidence map to be scanned and traversed without duplicating route definitions. The navigation carries an explicit accessible label and a content-debug hint for the source track collection, keeping both wayfinding and provenance tied to the structured data.

## feat(interview-map): 근거 공백 목록 추가
Added a dedicated evidence-gap section to the interview map.

The section uses structured gap data for its heading, explanation, and individual missing-evidence items, and exposes the source path through content-debug mode. Rendering gaps explicitly prevents the map from presenting its interview coverage as complete; the page can now distinguish supported claims from areas that still lack portfolio evidence.

## feat(interview-map): 주제 track 소개 추가
Introduced a dedicated section boundary for each interview-map track.

Every track now has a stable fragment identifier, source-level debug hint, presentation-driven item count, label, and description, with alternating section backgrounds for long-page scanning. Extracting `TrackSection` establishes the per-track rendering context—including content, design, and debug state—that subsequent question and evidence rows can reuse without moving route concerns into the data model.

## feat(interview-map): 주제와 외부 참조 표 추가
Added a structured question table to each interview track, pairing every topic with its external reference.

Using table headers and row cells establishes a stable comparison structure that later evidence columns can extend. Reference links open outside the portfolio with `noreferrer`, while their visible label remains presentation-driven. The track description stays separate from the question rows, preserving the distinction between category context and item-level sources.

## feat(interview-map): 프로젝트 답변 근거 연결
Connected interview questions to the project evidence and depth notes declared in their answer records.

A project lookup map resolves each answer reference once per track, and successful matches become links that preserve the active design and content-debug state. Unresolved identifiers remain visible as text rather than disappearing, making broken content references observable. Separate answer and depth columns keep the evidence source aligned with the claimed level of discussion for each question.

## feat(content): 프로젝트 지표를 화면에 적용
Connected route-level project statistics to the shared metric selector and exposed project highlights in the detail view.

The projects page and work-map section no longer infer curriculum, product, reliability, or source-only counts from asset paths, specific project identifiers, and local filters. Reading the declared metric definitions through `getProjectMetricValue` gives every view the same calculation rules. The detail page also renders the structured `highlights` collection with its presentation heading, completing the visible evidence used by those metrics.

## feat(content): 링크 배치 selector 추가
Formalized link placement as a shared `LinkPlacement` type and added selectors for both site-level and project-level links.

`getProjectLinksForPlacement` becomes the common implementation behind card and detail helpers, so placement checks and the existing link-eligibility rules cannot diverge between views. `getContentLinksByPlacement` provides the same boundary for global links. Exporting these selectors through the portfolio facade lets route components depend on content semantics rather than repeat array filtering logic.

## refactor(project): 상세 링크를 배치 기준으로 선택
Routed project-detail actions through `getProjectDetailLinks` before applying runtime visibility and optional case-study exclusion.

The component no longer treats every link attached to a project as suitable for the detail page. Centralizing placement selection in the content helper keeps card and detail contexts consistent with the link schema, while the component retains responsibility for state-dependent visibility and its local `excludeCaseStudy` option.

## feat(content): 홈 링크를 배치 기준으로 선택
Changed both home designs to select calls to action by the link's declared `hero` placement instead of a hard-coded set of link types.

Placement metadata expresses where a link should appear independently of whether it represents GitHub, a résumé, or a website. This lets content authors add or remove hero actions without changing route code and prevents semantic link categories from doubling as presentation rules.

## feat(content): 공용 UI 접근성 문구 적용
Replaced hard-coded shared interface and accessibility text with values from the presentation UI contract.

Journey case-study links, the animated terminal label, and the technology-marquee label now receive explicit copy from their route or section owners and pass it through every component layer. This keeps visible labels and assistive descriptions configurable from the same content source instead of embedding English in reusable components. Project action links were also raised to a minimum 44-pixel height, aligning pointer targets with the updated accessibility boundary.

## feat(contact): 연락 링크 빈 상태 추가
Added an explicit empty state for contact channels and normalized each link to a minimum touch target.

When the preferred-link resolver returns no entries, the page now explains the absence using presentation content instead of silently leaving a blank column. The link renderer remains unchanged for populated states, preserving design and debug routing behavior while making the zero-item state intentional and understandable.

## feat(routes): 비활성 페이지 route 차단
Enforced page-enablement settings at the route boundary for about, contact, projects, project details, and resume.

Disabled pages now resolve through Next.js `notFound()` even when their URLs are entered directly; hiding navigation alone would not prevent access to the underlying route. Project detail inherits the projects gate, keeping the collection and all of its children under one availability decision. Performing the check immediately after loading content also avoids resolving template state for a route that must not render.

## style(theme): 디자인 속성을 site shell로 승격
Promoted the active design marker from the home-content selector to the shared site shell.

Classic theme variables and component overrides now target `data-site-design`, while `data-home-template` remains available for home-specific behavior. Placing the design identity at the shell boundary allows the palette and visual overrides to cover headers, footers, and non-home routes instead of being limited to descendants of the home `<main>` element.

## style(a11y): 모바일 헤더와 동작 감소 보강
Strengthened the global reduced-motion contract and simplified the mobile header effect.

When `prefers-reduced-motion` is active, all animations and transitions are reduced to a single near-zero-duration iteration and smooth scrolling is disabled, with explicit coverage for the terminal wrapper and hover-transformed cards. This broad rule prevents newly added motion from bypassing a hand-maintained selector list. Removing the header backdrop filter on small screens also avoids relying on an expensive visual effect in the most constrained layout.

## feat(about): 프로필 사진 소개 추가
Added the optional profile photograph to the about hero through the shared `ProfilePhoto` component.

The hero becomes a responsive text-and-media grid only when photo metadata is present, so content variants without an image retain the previous text-only structure. Extending the debug hint to include the photo path keeps the visual asset traceable to the same profile source as the surrounding identity copy; the remaining changes only normalize formatting.

## feat(about): 기술 집중 영역 추가
Expanded the about page's skills section to distinguish technical focus areas from concrete tool groups.

Focus areas are rendered first as explanatory cards, followed by the existing stack lists. This separates higher-level engineering concerns from the technologies used to address them, avoiding a flat inventory that would conflate capabilities with implementation tools. Content-debug hints remain attached to both schema paths.

## feat(about): 경력 목록 추가
Added a chronological experience list to the about page.

Using an ordered list makes sequence part of the document structure, while each item keeps period, title, and explanatory text together. The section reuses the canonical experience collection and carries a source hint for debug mode, avoiding a separate about-specific copy of the same career history.

## feat(about): 큐레이션 기준 소개 추가
Introduced the curation section on the about route and gated it through the site's page-enablement policy.

The section combines presentation copy with the structured curation introduction and criteria, and retains content-debug hints down to individual criterion records. Isolating it as `CurationSection` gives the optional feature a clear rendering boundary and prevents disabled curation content from leaking into the page merely because its data is loaded.

## feat(about): 큐레이션 프로젝트 범주 추가
Added project-backed curation categories to the about page.

Each category resolves its stored project identifiers against the canonical project collection, filters unresolved references defensively, and renders links only when at least one project remains. The links preserve both the selected design and content-debug state, so moving from curation rationale to supporting case studies does not reset the presentation context. Extracting a category card also keeps reference resolution and route generation out of the parent section's layout loop.

## feat(about): 큐레이션 공백과 재검토 추가
Completed the curation narrative with explicit omissions and the next review checkpoint.

The route now presents what is intentionally absent from the portfolio alongside the reasons for those gaps, then records the next planned reassessment as a separate content block. Treating omissions and review criteria as structured data makes curation boundaries visible rather than implying that the current project set is exhaustive or permanent.

## feat(resume): 프로필 위치와 가용성 추가
Exposed profile location and availability in the resume hero as a two-field definition list.

The values remain sourced from profile data while their labels come from resume presentation copy, preserving the distinction between reusable identity facts and route-specific wording. Using `<dl>`, `<dt>`, and `<dd>` makes the label-value relationship explicit rather than presenting these facts as decorative cards only; the remaining diff is formatting-only cleanup.

## feat(resume): 경력 이력 추가
Added a conditional experience-history section to the resume route.

Each entry keeps its title, period, and narrative in one semantic article, while the responsive header allows the date to move without separating it from the role. The collection is rendered directly from `content.experience` and disappears when empty, preserving one route implementation across portfolios with different career histories.

## feat(resume): 교육 이력 추가
Added a conditional education section to the resume route.

Each education record is rendered as a semantic article that keeps the institution or program, period, and description together, with a composite key reflecting the content identity available in the schema. The section is omitted when the collection is empty, allowing the same route component to support portfolios with or without formal education history.

## feat(resume): Resume 안내 기록 추가
Added an optional resume notes section backed directly by structured content.

The section is rendered only when notes exist, avoiding an empty heading or decorative container in content variants that omit guidance. Keeping the title in page presentation copy and the note items in resume data preserves the existing separation between interface wording and resume facts while presenting each note as an individually scannable record.

## feat(designs): site design 정의 registry 추가
Established a single registry for the site's available visual designs and their preview palettes.

The ordered `SITE_DESIGNS` collection becomes the authoritative source for design iteration and selector swatches, while the derived identifier list supports validation without maintaining a second enumeration. `getSiteDesignDefinition` falls back to the first registered design, giving callers a deterministic presentation even when an identifier cannot be matched.

## feat(designs): route renderer 계약 추가
Defined the shared input contract for designs that render complete portfolio routes.

`PortfolioRouteId` enumerates every supported route shape, and `DesignRouteProps` carries resolved content, debug state, the current path, and an optional project for detail pages. Passing already-resolved domain data keeps design renderers focused on composition rather than routing or content loading, while the route discriminator lets one renderer handle the full site without relying on URL parsing.

## refactor(designs): 확장 renderer lazy registry 추가
Introduced a registry boundary for design-specific route renderers.

The registry maps design identifiers to asynchronous module loaders and exposes separate capability detection and rendering operations. Routes can therefore ask whether a design owns a full-page renderer without importing every design implementation eagerly, while unsupported designs continue through the established route components. At this stage the loader table is intentionally empty, defining the extension contract before concrete renderers are registered.

## style(designs): 디자인 선택기 기본 메뉴 구성
Created the base desktop presentation for the design selector as an anchored disclosure menu.

The trigger exposes the current design and position, while the panel lays out each option as a palette swatch, descriptive copy, and ordered number. Hover, keyboard focus, and the active state intentionally share the same high-contrast treatment, so pointer and keyboard users receive equivalent selection feedback. Keeping the styles in a component-scoped module isolates this cross-design control from the visual systems it switches between.

## style(designs): 모바일 디자인 선택 sheet 구성
Adapted the design selector into a mobile bottom sheet with a modal backdrop, bounded scrolling, and safe-area-aware padding.

The panel is fixed to the viewport edge rather than the header on narrow screens, preventing long design lists from expanding or displacing page navigation. `overscroll-behavior: contain` and a viewport-relative maximum height keep scrolling local to the sheet, while the separate sheet header and large close target make the disclosure practical on touch devices.

## feat(designs): 디자인 선택기 상태와 trigger 추가
Introduced the client-side state and trigger for a route-preserving design switcher.

The component treats `SITE_DESIGNS` as the authoritative design order while using presentation templates only for user-facing labels and descriptions. It derives a stable active fallback, formats the index and total through content-provided templates, and exposes the current choice through a localized summary label. Building the control on native `<details>/<summary>` provides disclosure semantics and keyboard behavior before the selection panel is added.

## feat(designs): 디자인 선택 목록과 닫기 동작 추가
Completed the design-switcher sheet with an ordered list of registered designs, active-state semantics, palette previews, and explicit closing behavior.

Links are generated from the current path so changing the design does not discard the user's route or content-debug state. The active design is exposed through `aria-current`, while the close button removes the native `<details>` open state and restores focus to the summary trigger. Returning focus is important because visually closing an overlay without moving keyboard focus would leave the user at a hidden control.

## feat(shell): 현재 navigation 상태와 모바일 메뉴 추가
Made global navigation route-aware and added a keyboard-operable mobile menu.

`isCurrentNavigation` treats the home route as an exact match and other navigation roots as active for their descendant paths, allowing both desktop and mobile links to expose `aria-current="page"` consistently. The responsive header can now wrap safely and uses native `<details>/<summary>` disclosure semantics for small screens. This commit also replaces the header's former inline template-button group with the mobile navigation, narrowing the shell to primary wayfinding until the design selector is reintroduced as its own component.

## feat(shell): 디자인 선택기를 공용 shell에 연결
Integrated the design switcher into the shared site header and made shell-level interface text come from presentation content.

Every route now supplies the same `ui` contract to `PageShell`; the shell uses it for desktop and mobile navigation labels, menu text, and the skip-link label. The outer wrapper is separated from the semantic `<main>` landmark so the header, footer, and keyboard skip target are structured correctly. Centralizing the switcher and accessibility labels at this boundary keeps alternate designs available on every page without duplicating navigation behavior or hard-coded copy.

## refactor(routes): 확장 디자인 renderer 위임 경계 추가
Added a common delegation boundary from every public route to design-specific renderers registered outside the App Router pages.

Each page still resolves content, template selection, debug mode, and route validity, then passes a small route context—current path, route kind, and the resolved project where applicable—to `renderDesignRoute`. Designs without a dedicated renderer continue through the existing classic or design implementation. This keeps URL, loading, and not-found responsibilities in the route layer while allowing an expanded visual system to own the complete composition of supported pages without duplicating template conditionals across each route.

## style(editorial): 지면과 masthead 토큰 구성
Created the editorial design's foundational stylesheet with scoped color tokens, paper texture, focus treatment, resets, skip-link behavior, and masthead geometry.

Keeping the palette and normalization under the route root prevents the alternate design from leaking into other portfolio themes. The visible focus outline and recoverable skip link preserve keyboard navigation despite the highly customized presentation, while the masthead grid establishes the brand, navigation, and control regions that later rules populate.

## style(editorial): wordmark와 navigation 계층 구성
Defined the editorial shell's wordmark, desktop navigation, design-switcher slot, and lead footer call to action.

The navigation is treated as a bordered, equal-width strip with explicit hover inversion, separating global wayfinding from the brand block and switcher controls. The footer repeats the serif display language at a larger scale, turning contact into a clear terminal action while retaining the same ink, paper, and vermilion hierarchy used throughout the design.

## style(editorial): footer와 hero 활자 체계 구성
Established the editorial typography primitives and the upper structure of the home hero.

Section kickers, overlines, standfirsts, footer fine print, and debug annotations now share explicit typographic roles. The home hero is mapped onto a twelve-column grid with a bounded viewport-relative height and balanced headline wrapping, giving issue metadata and the primary title predictable placement while allowing the type scale to respond continuously to the viewport.

## style(editorial): hero spread 레이아웃 구성
Completed the lower half of the editorial hero and introduced shared spread spacing for the main content sections.

The summary, byline, portrait fallback, and primary action are placed on explicit twelve-column spans, preserving their relationships even when text lengths vary. Common section padding and borders then establish a reusable vertical rhythm for stories, principles, experience, evidence, decisions, highlights, and milestones instead of repeating route-specific spacing rules.

## style(editorial): lead story와 매체 표현 구성
Defined the editorial lead-story treatment and the common behavior of framed media.

The lead copy now combines a large serif headline, standfirst, supporting facts, and an animated underline without coupling those effects to the route markup. Shared image-frame rules enforce cropping, captions, muted default color, and restrained hover emphasis, giving every project visual the same media contract while preserving intrinsic width and responsive height.

## style(editorial): 이미지 프레임과 feature 열 구성
Introduced reusable editorial treatments for image placeholders, project-index rows, and split feature columns.

The project index uses an explicit multi-column grid to keep ordinal, title, summary, metadata, and navigation aligned as one scannable record, with hover feedback applied to the row rather than individual fragments. A neutral placeholder frame preserves layout dimensions when an asset is absent, and the feature-column primitive provides a consistent boundary between primary narrative content and supporting material.

## style(editorial): 원칙 목록과 contact strip 구성
Added the editorial treatment for principle cards, sidebar features, text tags, and the cross-page contact strip.

The two-column principle grid and bordered sidebar separate long-form explanation from supporting metadata, while the high-contrast contact strip provides a consistent terminal call to action. Shared annotation selectors tie these sections to the resume and skills layouts, reducing visual drift between routes that present structurally similar content.

## style(editorial): contact와 archive 지면 구성
Completed the editorial contact strip and established the shared page and archive layout primitives.

The stylesheet gives secondary pages a three-column hero, introduces a four-column archive overview, and separates each archive category into a fixed descriptive rail and a flexible content column. Reusing these structural rules lets contact and archive routes retain the same typography, spacing, and border rhythm as the rest of the editorial design rather than becoming isolated page-specific compositions.

## style(editorial): archive group과 case link 구성
Added the structural styling for editorial archive groups and the opening portion of project case studies.

Archive headings now remain sticky beside their entries, while case studies gain a three-column hero with a metadata rail, restrained descriptive copy, a large serif title, and a dedicated link column. This establishes a stable correspondence between the route's semantic regions and the editorial grid, keeping navigation, context, and narrative content visually distinct.

## style(editorial): case link와 dark section 구성
Extended the editorial case-study stylesheet with bordered link rows, an unconstrained cover image, a three-column narrative spread, drop-cap typography, and a dark architecture section.

The shared selectors align headings and editorial annotations across narrative, decision, architecture, and result sections, so the case-study route can reuse one visual hierarchy instead of encoding presentation into each block. Fractional grids and `clamp()`-based spacing preserve the magazine-style composition while allowing it to scale across viewport sizes.

## style(editorial): dark section과 decision 열 구성

Extend the Editorial stylesheet with a desktop composition for architecture evidence, image pairs, and paired decision sections. The layout separates narrative copy from supporting facts through explicit grid columns, hairline borders, and the existing dark-theme tokens, while keeping evidence rows structurally consistent across light and dark backgrounds. Establishing these selectors as one visual vocabulary lets route components present reasoning and proof without embedding presentation rules in their JSX.

## style(editorial): 결과 spread와 profile facts 구성

Add Editorial layouts for result summaries, case-study exit navigation, missing-project feedback, and the profile hero. The asymmetric grids reserve more space for substantive result and identity content, while the wrapping fact list and 44-pixel outro link keep metadata and navigation usable as content or viewport width changes. The missing-page treatment also gives an invalid project route an intentional recovery path instead of leaving it visually indistinguishable from an incomplete render.

## style(editorial): profile summary와 skill group 구성

Complete the profile and skills composition with a bounded portrait, a three-column principles grid, and a split skills spread. Image cropping and grayscale treatment normalize arbitrary portrait dimensions to the Editorial frame, while repeated bordered cards and grouped focus areas make prose, principles, and technology lists readable as separate information levels. The layout keeps those concerns in CSS so route data can remain semantic rather than carrying visual positioning metadata.

## style(editorial): 기술 그룹과 curation 본문 구성

Define reusable row structures for technology groups and experience entries, then introduce an asymmetric curation spread. Fixed semantic columns keep each label, narrative, and ordinal aligned across variable-length entries, while wrapped skill lists avoid forcing the content into an artificial table. The curation split gives the selection criteria a stable introductory column and leaves the longer evidence-oriented body room to grow.

## style(editorial): curation panel과 프로젝트 목록 구성

Build the detailed curation presentation from numbered panel headers, two-column criterion grids, category and omission cards, and wrapping project links. Shared typography and border rules make each subsection visibly related while preserving distinct roles for criteria, exclusions, and evidence. Using `minmax(0, 1fr)` and `min-width: 0` prevents long content from forcing the paired panels beyond their grid boundary.

## style(editorial): curation link와 resume 도입부 구성

Finish the curation area with touch-sized project links and a dark next-review panel, then establish the resume header and two-column body. The resume identity column is made sticky so stable personal metadata remains available while the longer record scrolls, and the download/reference links receive explicit interaction targets. The dark review treatment reuses the same panel structure with adjusted contrast instead of introducing separate markup for an inverted section.

## style(editorial): resume identity와 프로젝트 행 구성

Define the resume's information hierarchy with a compact identity definition list, numbered section grid, and repeated project and training rows. Separating ordinal, section label, and content into dedicated columns keeps scanning predictable even when descriptions vary substantially in length. Shared row rules for project and training entries preserve one document rhythm without collapsing their semantic distinctions.

## style(editorial): resume 사례와 contact 본문 구성

Add a case-study link treatment to resume entries and establish the contact page's hero, availability summary, contact channels, and supporting notes. The three-column desk layout gives availability, primary actions, and context separate responsibility, while 44-pixel links and visible hover changes keep the actionable rows operable rather than merely decorative. The contact cards use a stable index/content/arrow grid so labels remain aligned across different channel names.

## style(editorial): contact note와 milestone link 구성

Style the contact notes as a compact supporting list and establish the journey milestone spread as a date/story composition. The two-column milestone rows separate chronology from narrative evidence, while definition-list pairs keep challenge and learning details aligned without flattening them into prose. Wrapping milestone links allow each event to retain direct paths to related project evidence.

## style(editorial): milestone과 현재 방향 지면 구성

Add a secondary journey timeline and a high-contrast current-position panel. The timeline uses a bounded two-column card matrix for shorter historical entries, complementing the larger milestone narratives without duplicating their visual weight. Touch-sized project links and a dedicated current-position grid keep historical evidence and present direction distinct but connected.

## style(editorial): 현재 방향과 interview track 구성

Complete the current-position typography and add a sticky, horizontally scrollable chapter navigator for the interview map. Each interview track receives its own anchored section with a persistent local header, so long question collections retain context while scrolling. `scroll-margin-top` and the sticky navigation height are coordinated to keep anchor targets visible rather than hidden beneath the chapter bar.

## style(editorial): interview 답변과 근거 표현 구성

Define the interview ledger as paired question and evidence columns. Questions retain stable numbering and optional source links, while each answer's supporting evidence is visually grouped by a vermilion rule and explicit label. This representation distinguishes claims from their proof and keeps multiple evidence records readable without embedding presentation decisions in the content model.

## style(editorial): 공백 목록과 중형 화면 경계 구성

Introduce the dark unresolved-gaps spread and begin adapting the Editorial shell at the 1180-pixel boundary. The gap section intentionally presents missing evidence as first-class content, while the medium-width rules reduce navigation and project-index density before the layout reaches tablet size. Hiding secondary labels and metadata preserves primary route and project information instead of compressing every desktop column.

## style(editorial): tablet masthead와 hero 재배치

Replace the desktop navigation with a native disclosure menu at tablet widths and remap the home hero onto an eight-column grid. The disclosure menu keeps navigation functional without client-side menu state, provides a visible open treatment, and constrains the flyout to the viewport. Reassigning each hero block to explicit columns preserves the editorial hierarchy as the desktop grid narrows.

## style(editorial): tablet route 지면 재배치

Collapse the major route spreads to tablet-appropriate single-column flows and selectively retain two-column relationships where their hierarchy still matters. Sticky side rails are disabled once they would compete with the reduced viewport, and borders are moved from vertical to horizontal separators to match the new reading order. The profile portrait, resume identity, case-study narrative, and contact notes each receive specific placement rules rather than relying on a generic stack that would lose their semantic grouping.

## style(editorial): tablet 세부 간격 정리

Limit the introductory column of the tablet journey timeline to a readable measure. The small constraint prevents the now-stacked lead copy from spanning the full container and preserves the text rhythm established by the wider layout.

## style(editorial): mobile navigation과 hero 구성

Establish the first mobile breakpoint by simplifying masthead metadata, stacking the major route grids, and converting the home hero to a linear flex flow. Project-index rows retain their number, title, summary, and action while dropping desktop-only metadata, and multi-column principle, evidence, and decision structures become single-column sequences. These rules preserve content order and interaction targets instead of merely scaling the desktop composition down.

## style(editorial): mobile 본문과 표 구성

Complete mobile reflow for page heroes, case metadata, archive facts, profile content, resume sections, milestones, curation panels, and interview questions. The change removes inherited grid-column assignments after stacking and restores borders where the desktop grid had supplied them implicitly. This prevents orphaned columns and missing separators when table-like desktop structures become linear reading flows.

## style(editorial): mobile footer와 동작 감소 구성

Finish the small-screen spacing adjustments and add a repository-wide reduced-motion contract for the Editorial renderer. Mobile-specific rules remove nonessential ordinals, flatten remaining definition grids, and keep chapter and interview sections legible without fixed heights. Under `prefers-reduced-motion`, scrolling, transitions, animations, and hover transforms are effectively disabled, preserving content and interaction without requiring motion-sensitive users to absorb decorative movement.

## feat(editorial): route 계약과 navigation helper 추가

Establish the Editorial renderer's route boundary with a closed route-name union and a shared props contract for content, optional project detail, current path, and debug mode. Central helpers preserve the active design and debug query when generating internal links, mark parent routes active for nested paths, and normalize display ordinals and bounded tag sets. This gives later route implementations one consistent navigation and presentation contract instead of reimplementing path semantics per page.

## feat(editorial): debug note와 이미지 프레임 추가

Introduce two focused presentation primitives: an opt-in debug source note and a semantic project image frame. Debug annotations disappear entirely outside content-debug mode, while the image component centralizes Next.js image sizing, priority, alternate text, and caption fallback inside a `<figure>`. Keeping these concerns behind small components prevents each route from drifting on accessibility and responsive image behavior.

## feat(editorial): 콘텐츠 링크와 방향 표식 추가

Add a content-aware link renderer that distinguishes internal application paths from external destinations. Internal links pass through the Editorial URL helper so the selected design and debug mode survive navigation; external links retain their configured destination and receive new-tab and `noreferrer` attributes only when marked external. The decorative arrow is hidden from assistive technology so link labels remain the accessible name.

## feat(editorial): masthead와 footer shell 추가

Build the shared Editorial page shell around content-driven desktop and mobile navigation, design switching, main-content targeting, and footer links. Active-route detection is exposed through `aria-current`, a skip link provides direct keyboard access to the main region, and the mobile menu uses native `<details>` semantics rather than duplicating disclosure state. All internal navigation is generated through the renderer-aware URL helper, preserving the active design and debug context across the site.

## feat(editorial): 섹션 표식과 프로젝트 인덱스 추가

Extract section numbering and project-index rows into reusable Editorial components. Each project row binds category, title, summary, deployment metadata, a bounded tag list, and an explicitly labelled detail action to the shared content model. Centralizing the row contract keeps home and archive listings consistent and ensures assistive labels are generated from the configured template rather than inferred from an icon.

## feat(editorial): 홈 hero spread 추가

Start the Editorial home route as a content-directed section dispatcher and implement its hero spread. Featured projects are selected with a deterministic fallback when none are flagged, while the hero derives identity, availability, location, and current year from shared content instead of embedding renderer-specific copies. Photo fallback and renderer-aware project navigation keep the hero complete even when optional profile imagery is absent.

## feat(editorial): 홈 lead story 추가

Add the lead-project section using the first selected project as a full narrative feature. The renderer combines category, period, summary, description, highlights, and a priority-loaded screenshot into one case-study entry point, while preserving an explicit empty state when no projects exist. The visual link receives a title-specific accessible label, so the image-led action remains understandable without relying on its arrow or layout.

## feat(editorial): 홈 대표 프로젝트 목록 추가

Render the remaining selected projects through the shared index-row component after excluding the project already used as the lead story. This prevents duplicate prominence on the home page, caps the list at a deliberate editorial length, and preserves the configured empty-state copy when no candidates are available. Reusing the index component keeps metadata and accessible detail links aligned with the archive view.

## feat(editorial): 홈 원칙과 기술 sidebar 추가

Add a two-part home section that presents profile principles as the primary narrative and current journey plus technology stack as supporting context. The renderer reads each concern from its authoritative content collection and limits the stack preview to a compact subset, leaving the full journey behind a renderer-preserving route link. This separates durable working principles from transient status and tool inventory while keeping them visibly related.

## feat(editorial): 홈 contact strip 추가

Complete the home section dispatcher with a compact contact call-to-action. The strip uses the content layer's preferred-link ordering and limits the preview to three channels, routing each through the content-aware link component so internal and external behavior remains correct. Availability, title, and actions therefore stay synchronized with the dedicated contact route rather than being duplicated in the renderer.

## feat(editorial): 프로젝트 archive route 추가

Add the Editorial project archive as a content-driven route. Projects are joined to the configured `projectGroups`, empty groups are removed, and each surviving group reuses the shared project-index row, so taxonomy remains owned by the content model rather than reconstructed from visual order. The route also derives its overview metrics through `getProjectMetricValue` and provides an explicit archive empty state, while the accompanying `EvidenceList` establishes one ordered-or-unordered representation for later case-study evidence.

## feat(editorial): 프로젝트 상세 서사와 구조 추가

Introduce the first complete Editorial case-study route, including a recoverable missing-project state, project facts, canonical detail links, cover media, problem and solution narrative, architecture evidence, and stack labels. Supporting screenshots are filtered against the cover source to prevent duplicate evidence, and stack identifiers are resolved through the shared technology catalog with an identifier fallback so incomplete catalog data does not erase project information. Keeping route recovery, link normalization, and content joins at this renderer boundary lets the page remain robust without weakening the underlying content contracts.

## feat(editorial): 프로젝트 증거와 결과 spread 추가

Complete the case-study narrative with highlights, an optional supporting-image gallery, separate decision and trade-off columns, project results, and a route back to the archive. Each collection uses the common evidence primitive and its explicit empty-state behavior, while the gallery is omitted when no non-cover screenshots exist. Presenting decisions, trade-offs, and outcomes as distinct source-backed sections preserves their different explanatory roles instead of flattening all project material into a generic feature list.

## feat(editorial): About 정체성과 원칙 소개 추가

Add the Editorial About route's identity and principles sections from the shared profile model. The hero combines headline, summary, availability, location, bilingual name data, and an optional portrait without manufacturing fallback content when a photograph is absent. Principles are rendered as an ordered semantic collection, keeping personal identity facts and working principles independently addressable while sharing one content source across designs.

## feat(editorial): About 기술과 경력 소개 추가

Extend the About route with focus areas, grouped skills, and the chronological experience record. The renderer preserves the source model's distinction between explanatory focus areas, concrete skill inventories, and dated experience entries rather than deriving one from another. This gives each information type an appropriate semantic list while allowing the stylesheet to control their visual relationship.

## feat(editorial): About 큐레이션 기준 추가

Expose the curation criteria on the About route only when the curation page capability is enabled. The section is labelled through `aria-labelledby` and reads its introduction, title, and criterion cards directly from the curation and presentation models, so optional portfolio material is governed by the same page-availability contract as navigation. Conditional rendering at the route boundary prevents disabled content from remaining reachable merely because a renderer implements its layout.

## feat(editorial): About 큐레이션 범주 추가

Add curation categories that resolve their configured project identifiers back to canonical project records. Missing identifiers are filtered with a type guard, and project links are rendered only when at least one reference resolves, preventing broken content relationships from producing invalid case-study navigation. The links continue through the Editorial URL helper so the selected design and debug mode survive the cross-reference.

## feat(editorial): About 큐레이션 공백과 재검토 추가

Complete the curation narrative with explicit omission records and a next-review section. Treating excluded material and reevaluation criteria as first-class content makes the selection boundary observable instead of presenting the visible projects as an unexplained complete set. The route therefore communicates both the current archive and the conditions under which that archive may change.

## feat(editorial): Resume 정체성과 프로젝트 경력 추가

Introduce the Editorial résumé route with an optional download action, profile identity facts, narrative summary, and the projects selected by `getResumeProjects`. Project entries preserve period, role, tags, and renderer-aware case-study links, while an explicit empty state handles a résumé with no selected projects. Reusing the shared project-selection helper keeps the résumé's evidence set consistent with the content model instead of duplicating filtering policy in the view.

## feat(editorial): Resume 경력과 교육 기록 추가

Complete the résumé body with separate experience, training, education, and notes sections. Each source collection retains its own labels and chronology, and free-form notes use the common evidence-list behavior so an empty list is represented deliberately. Separating these records avoids conflating employment history, structured programs, formal education, and supplementary qualifications.

## feat(editorial): Contact desk route 추가

Add the Editorial contact route around the shared preferred-contact ordering. The hero, current availability, actionable channels, and contact notes are all sourced from the content model; internal and external channels pass through `EditorialContentLink`, while a dedicated empty state covers the absence of contact methods. This makes the contact page a projection of one authoritative contact configuration rather than a second set of hard-coded addresses.

## feat(editorial): Journey milestone spread 추가

Introduce the Journey route's milestone narrative. Each milestone preserves its state, reason, and result, then resolves optional anchor project identifiers to canonical projects and silently discards unresolved references before building navigation. This makes the timeline explanatory rather than merely chronological and prevents stale cross-references from becoming broken links, while retaining an explicit empty state when no milestones exist.

## feat(editorial): Journey timeline과 현재 방향 추가

Extend the Journey route with the broader dated archive and the current-position statement. Timeline entries support date ranges, categories, and optional project references resolved through the project collection; unresolved or absent references simply omit the action rather than invalidating the entry. Keeping the historical archive separate from the current-position summary distinguishes recorded progression from the portfolio's present direction.

## feat(editorial): Interview Map 소개와 chapter 추가

Add the Interview Map introduction, external reference repository, and an in-page chapter index generated from configured interview tracks. Stable track identifiers form the anchor targets, and the reference link explicitly uses a new browsing context with `noreferrer`. The route also builds a project lookup map for the evidence layer that follows, establishing project identity as the join key between interview prompts and portfolio case studies.

## feat(editorial): Interview 답변 근거와 공백 추가

Complete the Interview Map by rendering tracks, questions, source references, project-backed answers, and the declared evidence gaps. Answer project identifiers are resolved through the canonical lookup; an unresolved mapping remains visible as a no-evidence state with its requested depth instead of disappearing or linking incorrectly. Explicit empty states at the answer, track-item, and track levels make missing evidence distinguishable from a rendering failure, while the final gaps section records limitations as part of the portfolio's data.

## feat(editorial): route dispatcher 추가

Connect every supported Editorial route to its specialized renderer through one exhaustive dispatcher, then place the selected route inside the shared `EditorialShell`. Centralizing route selection keeps masthead, navigation, debug state, and footer behavior uniform while allowing each page component to remain focused on its own content projection. Passing the same route props through unchanged also preserves one contract for project-detail context and renderer-aware navigation.

## style(editorial): 반응형 media rule 정렬

Normalize indentation and consolidate adjacent media-query blocks without changing their selectors or declarations. Keeping each breakpoint's rules in one syntactically coherent block reduces the chance that later responsive edits are placed outside the intended boundary while preserving the existing tablet and mobile behavior.

## feat(editorial): renderer를 디자인 registry에 활성화

Promote the completed Editorial renderer into the site's selectable design contract. The change registers its metadata and swatch, adds a lazy route-module loader and public export, accepts the identifier during content validation, and makes Editorial the default home template. Updating presentation data, runtime loading, validation, and design configuration together prevents a state where the interface advertises a design that cannot load or the loader accepts a design that content validation rejects.

## style(brutalist): 화면 토큰과 brand mark 구성

Establish the Brutalist renderer's scoped visual tokens, typography, sizing model, and first shell elements. The root contains the palette and box-sizing boundary so the design cannot leak its assumptions into other renderers, while high-contrast focus outlines and a keyboard-revealed skip link make the intentionally severe visual treatment usable without a pointer. The header and animated brand mark begin a consistent interaction language without moving navigation semantics into CSS.

## style(brutalist): header 상태와 home hero 구성

Build the desktop shell around explicit status, design-switcher, navigation, debug, and home-hero regions. Navigation uses horizontally flowing fixed-minimum columns so a large content-defined menu remains reachable rather than wrapping unpredictably, and `aria-current` receives the same strong state treatment as hover. The debug banner and hero grid are given separate structural rows, preserving operational context without competing with primary navigation.

## style(brutalist): hero stamp와 action row 구성

Define the home hero's stamp, copy column, oversized title, summary, and flexible action row. Fluid type and `overflow-wrap` allow content-owned names and headlines to scale without assuming a fixed English word length, while the split grid keeps summary information independent from the primary identity statement. Actions wrap as a group instead of depending on a fixed count.

## style(brutalist): 주요 action과 section 경계 구성

Add a shared high-contrast action vocabulary, a four-column metric band, an animated signal strip, and consistent section boundaries. Primary and secondary actions share dimensions and keyboard-visible structure while differing by emphasis, and definition-list metrics retain their label/value semantics inside the visual grid. The signal strip is isolated as decorative motion, allowing later reduced-motion handling without changing surrounding content.

## style(brutalist): section header와 프로젝트 지표 구성

Introduce a numbered section-header grid and a reusable project-index row. Each project is presented as one large link with dedicated ordinal, main content, metadata, and action columns, so the full card remains an unambiguous navigation target while its internal information hierarchy stays visible. Minimum-width guards, fluid headings, and alternating offsets accommodate variable project copy without allowing grid children to overflow their boundary.

## style(brutalist): 프로젝트 지표와 card 번호 구성

Complete project-index metadata, tag chips, action affordances, and the first principle-card system. Long summaries are deliberately clamped in the index while the detail route remains the full source, preserving scanability without deleting content from the model. Shared chip styling gives project and stack identifiers one visual grammar, and the full-width archive action remains visually distinct from individual case-study links.

## style(brutalist): 원칙 카드와 contact band 구성

Extend the home composition with readable principle cards, a wrapping technology wall, a structured compact timeline, and the large contact band. The timeline fixes separate columns for sequence, date, title, and explanation, making chronology and narrative independently scannable. Fluid contact typography and a three-part grid reserve space for availability, message, and actions while allowing the content to scale across wide displays.

## style(brutalist): contact 링크와 프로젝트 group 구성

Finish the contact-band action styling and establish shared page-hero, inline-metric, and grouped-project archive layouts. Definition-list metrics remain compact beside the page introduction, while each project group separates persistent taxonomy and count from its member list. The giant heading uses fluid sizing and emergency wrapping so content-defined route titles do not become a hard desktop-width assumption.

## style(brutalist): 교차 group과 상세 lead 구성

Differentiate alternating project groups and introduce the case-study lead layout. Group headers own descriptive context and counts, while their compact member lists suppress secondary tag columns to avoid repeating archive-level density inside an already classified group. The detail hero creates a clear boundary between navigation and narrative copy on one side and project media on the other, with the back action kept reachable at the top of the copy column.

## style(brutalist): 상세 fact와 소개 본문 구성

Add the case-study fact grid, reusable media frame, placeholder treatment, and introductory narrative band. Images use `object-fit: contain` so screenshots remain evidence rather than decorative crops, and the figure caption remains attached to the media contract. A dedicated placeholder preserves layout and explanatory context when an image is absent, while labeled facts and the introduction retain separate semantic roles.

## style(brutalist): 상세 본문과 gallery grid 구성

Structure long case-study evidence around repeated labeled sections, numbered lists, and a two-column gallery. The offset content column and central guide line create a stable reading rhythm, while list variants distinguish neutral, highlighted, and primary evidence without requiring different markup. Every third gallery frame spans both columns, allowing mixed evidence scales while keeping figures inside one responsive grid.

## style(brutalist): 다음 프로젝트와 focus card 구성

Add case-study continuation and recovery states, then establish the About route's identity, portrait, and skills foundations. The missing-project view receives a deliberate minimum-height layout and primary recovery action instead of appearing as an unstyled absence. Profile facts, optional portrait media, focus areas, and skill groups are represented as separate bounded components so absent portrait data does not disturb the identity ledger.

## style(brutalist): focus card와 criteria grid 구성

Complete focus and skill cards and introduce the dark curation section with numbered criteria. Skill inventories wrap as compact tokens while focus cards retain explanatory prose, preserving the distinction between capabilities and the reasoning around them. The curation grid alternates contrast but keeps a consistent border and minimum height, giving selection criteria equal structural weight even when their copy lengths differ.

## style(brutalist): criteria 본문과 재검토 영역 구성

Complete the curation presentation with category cards, omission records, and a bounded next-review panel. The layout keeps selected categories, intentionally excluded material, and future reevaluation as separate information classes instead of treating only visible projects as evidence. Project references remain visually subordinate within category narratives, while the dark section's explicit white and yellow boundaries preserve readability across variable copy lengths.

## style(brutalist): 재검토와 resume entry 구성

Finish the review panel and establish the résumé's repeated section and entry grammar. Each résumé section splits a durable heading rail from its content, while summaries, dated entries, and selected projects receive independent structures rather than one generic card list. This lets chronology, narrative summary, and project evidence vary independently without losing a stable reading order.

## style(brutalist): resume 본문과 contact hero 구성

Complete résumé project rows and notes, then introduce the Contact route's blue hero. Selected projects reserve distinct columns for sequence, evidence summary, and case-link action, while résumé notes remain a separate highlighted contract rather than being folded into experience records. The contact hero reuses page-label semantics with a design-specific contrast treatment.

## style(brutalist): contact 상태와 note 목록 구성

Build the contact availability badge, channel grid, and reusable note-list foundation. Contact methods are full-row actions with separate ordinal, label, and direction affordances, and the empty-state selector avoids the overlapping-border treatment used for populated rows. Availability motion is isolated to a small status marker so later reduced-motion handling can disable it without changing the underlying text.

## style(brutalist): note 목록과 anchor link 구성

Complete notes and evidence-gap rows and define the Journey milestone card. Milestones keep sequence, date, title, state, reason, and result in separate semantic positions, with optional project anchors presented as wrapping links. The structure makes a milestone explanatory rather than merely chronological and gives missing or additional evidence a dedicated list grammar.

## style(brutalist): archive timeline과 track navigation 구성

Add the broader journey archive, current-position callout, and the shell for Interview Map track navigation. Archive entries preserve sequence, dates, category, narrative, and optional project action, while the current state is visually separated from historical records. The track-navigation grid establishes a labeled in-page index without conflating it with the site's primary navigation.

## style(brutalist): track 목록과 question prompt 구성

Complete the in-page track index and establish the Interview Map's track and question hierarchy. Track headers expose ordinal, title, description, and question count, while each question separates the prompt and reference side from its answer-evidence side. `scroll-margin-top` gives chapter anchors a usable landing position instead of aligning content flush against the viewport edge.

## style(brutalist): 답변 근거와 footer lead 구성

Finish question references and answer evidence, add an explicit empty-answer presentation, and introduce the footer lead. Multiple evidence records stack within one answer column with clear project and title emphasis, while an absent mapping remains visibly distinct from a rendering failure. The footer separates a large closing statement from metadata so global exit information does not compete with route evidence.

## style(brutalist): footer metadata와 blink 동작 구성

Complete footer metadata, define a shared dashed empty-state block, and add the two renderer animations. Centralizing empty-state presentation gives all routes an intentional representation for absent content. The crawl and blink keyframes are kept narrowly scoped, enabling the later reduced-motion media query to neutralize decorative motion without affecting layout.

## style(brutalist): tablet grid 재배치

Reflow the Brutalist desktop grids for tablet widths. Major split routes move to one column, metrics become a two-by-two grid, dense project tags are removed from index rows, and three-column card sets reduce to two columns. The breakpoint changes hierarchy rather than merely shrinking type, preventing narrow intermediate widths from preserving desktop columns that no longer have enough room.

## style(brutalist): mobile header와 hero 구성

Replace the desktop navigation with a native `<details>` mobile menu and stack the header's status and debug content at narrow widths. The disclosure marker communicates open and closed state, while current-route styling is preserved inside the mobile menu. Retaining native summary semantics provides keyboard and no-JavaScript disclosure behavior instead of reimplementing menu state in a client component.

## style(brutalist): mobile 프로젝트와 상세 화면 구성

Collapse home metrics, section headers, project rows, principles, skills, curation cards, and galleries into mobile reading order. Secondary project summaries are hidden only in the dense index view, while the canonical detail content remains available. Removing alternating offsets and multi-column spans prevents visual composition rules from changing semantic order on a small screen.

## style(brutalist): mobile profile과 resume 구성

Continue the mobile reflow through page heroes, project details, curation, résumé, contact, and current-position sections. Multi-column fact and narrative structures become single columns, left-offset evidence returns to the normal flow, and gallery spanning is removed. These overrides preserve source order and readable borders rather than relying on desktop grid coordinates after the grid collapses.

## style(brutalist): mobile 여정과 interview 구성

Complete the narrow-screen treatment for journey milestones, archive entries, interview tracks, footer metadata, and missing-page recovery. Definition-list milestone evidence and question prompt and answer pairs become explicit vertical sequences, while track navigation expands to full-width rows. The footer and recovery state also lose desktop split boundaries so content remains one coherent reading stream.

## style(brutalist): 소형 화면과 인쇄 경계 구성

Harden the smallest viewport, reduced-motion, and print boundaries. Compact grids keep project, detail, résumé, and note content usable below 430 pixels; the reduced-motion query suppresses transitions and both decorative animations; and print removes global navigation and debug chrome while restoring black text on white. These are separate output constraints, so handling them explicitly avoids treating print or motion preference as just another screen width.

## style(brutalist): 반응형 media rule 정렬

Consolidate the repeated 720-pixel media queries into one block and normalize indentation without changing declarations. Keeping the complete mobile override set in one boundary makes the cascade easier to audit and reduces the risk of inserting future rules between logically identical breakpoints.

## feat(brutalist): 콘텐츠와 탐색 조회 도우미 추가

Establish the Brutalist renderer's content and navigation adapter layer. The helpers preserve design and debug state in links, resolve compact metrics and grouped projects from canonical content, bound tag density with a stack fallback, apply typed copy-template tokens, and distinguish exact home navigation from nested route matches. Concentrating these joins outside page markup keeps route components declarative and prevents each view from inventing its own fallback and active-route rules.

## feat(brutalist): route 레이블과 기본 shell 구성

Introduce the shared Brutalist shell and an exhaustive route-label resolver. The shell owns the design and debug boundary, keyboard skip link, renderer-preserving brand link, route and location status, design switcher, and main landmark, while labels prefer configured navigation copy with page-specific fallbacks. This makes global navigation context consistent across every route without forcing individual page renderers to duplicate shell or labeling policy.

## feat(brutalist): 주 탐색과 모바일 메뉴 추가

Connect canonical site navigation to both desktop and native mobile controls, preserving the selected renderer and content-debug query on every internal route. Active-route detection feeds `aria-current`, while configured accessible names distinguish primary and mobile navigation. The same commit adds a link boundary that sends external HTTP links and mail addresses through ordinary anchors but routes internal destinations through Next.js, preventing design-state propagation from leaking onto external URLs.

## feat(brutalist): footer와 홈 히어로 연결

Connect the shared footer and the first Home section to canonical portfolio content. Footer actions are selected by placement metadata and delegated through the internal-versus-external link boundary, while the hero derives identity, availability, calls to action, and the first four computed metrics from the content model. Rendering sections through the configured section order makes the view extensible without hard-coding a single monolithic page sequence.

## feat(brutalist): 홈 섹션 공용 프리미티브 추가

Extract the recurring visual and routing units used by the Brutalist home and archive views: a decorative signal strip, numbered section header, renderer-preserving project row, contact band, and explicit empty state. These primitives centralize numbering, project metadata, link construction, and absence handling so later route sections can compose canonical content without duplicating presentation contracts. The signal strip is marked decorative, while empty states use status semantics because those messages carry information.

## feat(brutalist): 대표 작업과 작업 원칙 구성

Expand the configured Home sequence with its signal, featured-project, and system sections, and establish the Projects route hero. Featured selection prefers explicitly marked projects but falls back to the normal project order, avoiding an empty showcase when no feature flags are present. Principles and a bounded technology wall remain separate from project evidence, while empty-state and total-count handling keep the archive entry point valid for sparse content.

## feat(brutalist): 홈 여정과 프로젝트 archive 구성

Complete the Home sequence with the four most recent journey records and the contact band, then render the Projects archive from canonical project groups. Recent history is selected from the end of the journey collection and reversed for newest-first presentation without changing the underlying stored order. Group sections expose descriptions and counts and omit empty groups, while an explicit archive empty state covers content sets with no resolvable projects.

## feat(brutalist): 프로젝트 상세 표시 프리미티브 추가

Introduce the reusable primitives needed by project case studies: optimized image frames, ordered project actions, text and list section shells, page labels, and curation headings. Project actions preserve the established internal-versus-external link boundary and promote only the first action visually, while media retain source alt text and responsive sizing. Optional labels and empty-list handling let the same structural components support heterogeneous project evidence without fabricating missing content.

## feat(brutalist): 프로젝트 상세 hero와 소개 구성

Establish the project-detail route's valid and missing-project paths. A missing identifier receives a content-defined recovery view back to the archive; a valid project receives canonical metadata, deployment state, detail actions, priority media, and a case introduction before any deeper evidence. This boundary prevents detail components from dereferencing absent data and gives project navigation and recovery consistent renderer-preserving links.

## feat(brutalist): 프로젝트 상세 본문과 gallery 구성

Compose the main project case study from problem, solution, architecture, screenshots, and resolved stack data. A reusable list section supports optional eyebrow and introduction copy, explicit empty evidence, and controlled blue or yellow emphasis without changing list semantics. Screenshot galleries are omitted when empty, while stack identifiers are resolved against the canonical technology catalog, keeping project records authoritative and presentation labels centralized.

## feat(brutalist): 프로필과 기술 소개 구성

Implement the About route's identity, principles, focus areas, and skill groups from canonical profile content. The optional portrait is rendered only when media exists, so the identity ledger remains valid without a photo. Principles, explanatory focus areas, and compact skill inventories use distinct structures because they answer different questions: operating values, areas of concentration, and concrete capabilities.

## feat(brutalist): 큐레이션과 경력 소개 구성

Extend About with experience history and a feature-gated curation archive. Curation is rendered only when the site-page policy enables it, then resolves category project identifiers defensively before creating links. Criteria, selected categories, omissions, and the next review are kept as separate evidence classes, making the page explain both inclusion and exclusion decisions instead of presenting a project list as self-justifying.

## feat(brutalist): 이력 hero와 경력 요약 구성

Establish the Résumé route with identity and availability context, an optional download action, numbered summary statements, and dated experience entries. Download rendering is conditional on an actual URL and reuses the shared link boundary, so the page does not expose an inert control. Separating concise summary evidence from chronological experience gives the route a stable hierarchy even when the experience collection is empty.

## feat(brutalist): 프로젝트 결과와 의사결정 구성

Complete the project case-study evidence sequence with highlights, decisions, trade-offs, and results. All four use the established list-section contract and the same explicit empty state, while trade-offs and results receive distinct tones to prevent positive outcomes from visually collapsing into unresolved costs. The numbered progression turns the detail page from a media showcase into an engineering narrative that includes judgment and consequences.

## feat(brutalist): 선택 프로젝트와 이력 세부 구성

Complete the Résumé with selected project evidence, training, education, and additional notes. Project identifiers from the résumé are resolved against canonical projects and unresolved references are dropped before rendering, preventing broken case links. Accessible case-study labels preserve project context for icon-only actions, while a defined notes empty state keeps optional supplementary information distinguishable from a rendering omission.

## feat(brutalist): 연락 수단과 안내 구성

Implement the Contact route around preferred communication channels with a placement-based fallback. This preserves an explicit preference order when configured but still exposes valid contact links when preference metadata is absent. Each method passes through the shared link boundary, availability is presented as text plus a decorative status marker, and an empty-state row prevents a zero-link configuration from becoming a blank section.

## feat(brutalist): 여정 milestone 구성

Establish the Journey route's explanatory milestone model. Each milestone renders state, reason, and result as a definition list rather than reducing the record to a date and title, and optional anchor project identifiers are resolved before links are emitted. The route therefore treats chronology as evidence of transitions and consequences, with an explicit fallback when no milestones are available.

## feat(brutalist): 여정 archive와 인터뷰 map 머리말 구성

Complete Journey with the full chronological archive and current-position statement, then establish the Interview Map hero and track index. A project lookup map gives timeline entries optional case-study links without repeated scans, while unresolved references simply remain unlinked. Interview track anchors preserve renderer and debug state and are separated from the external reference repository, defining a clear boundary between in-site evidence navigation and source material.

## feat(brutalist): 인터뷰 근거 archive 구성

Render the Interview Map as tracks of questions backed by project evidence. Project identifiers are resolved through a lookup map; only valid answers become linked evidence cards, and questions with no resolvable evidence receive a specific empty message rather than silently disappearing. Stable track anchors, configured item counts, external references, and recorded answer depth make the map auditable as a relationship between interview topics and concrete case studies.

## feat(brutalist): 인터뷰 근거 공백 구성

Add a dedicated evidence-gap section to the Interview Map. Gaps come from the canonical content model, receive their own accessible list label, and are visually separated from mapped answers. Recording missing evidence as first-class content prevents the portfolio from implying complete coverage and keeps future additions distinguishable from current verified mappings.

## refactor(brutalist): 내부 helper 공개 범위 정리

Reduce the Brutalist module's public API to the route renderer by making content adapters, visual primitives, and individual views module-private. No behavior changes; the refactor codifies that callers select the renderer as one unit rather than depending on its internal composition. This preserves freedom to restructure route sections without creating cross-module compatibility obligations for incidental helpers.

## feat(brutalist): 모든 route를 renderer에 통합

Introduce the single `BrutalistRoute` entry point and dispatch every supported route through it before applying the shared shell. The exhaustive route switch supplies route-specific inputs such as the optional project and current path, while individual views and the shell become private implementation details. This establishes the renderer contract expected by the design registry and guarantees that navigation, debug state, footer, and landmarks surround every Brutalist route consistently.

## feat(designs): Brutalist renderer 활성화

Activate Brutalist across every registry boundary required for a selectable renderer. The commit adds presentation metadata, the module entry point, palette swatches, lazy route loading, and content-loader support for the design identifier. Updating these sources together preserves the invariant that a design advertised to users is also type-recognized, loadable, and accepted when content or query state requests it.

## style(cinematic): 암실 palette와 shell 기초 구성

Establish the Cinematic renderer's root visual and accessibility contract. Design-scoped color variables define the darkroom palette, while selection colors, inherited link color, visible keyboard focus, and a focus-revealed skip link make that visual system usable without a pointer. The sticky, translucent header and initial desktop/mobile navigation structure provide a stable shell without leaking Cinematic tokens into other renderers.

## feat(cinematic): 링크와 chapter 표기 프리미티브 추가

Centralize Cinematic navigation and repeated chapter markup before route composition begins. Internal paths pass through `getTemplateHref` so renderer selection and content-debug state survive navigation, while non-local destinations remain ordinary anchors with new-tab and `noreferrer` handling only when appropriate. Filtering disabled content links in one place and standardizing zero-padded chapter labels keeps every later route consistent with the same link and sequencing contracts.

## style(cinematic): 모바일 탐색과 hero 매체 구성

Complete the shell's mobile disclosure and establish the image-led hero composition. The native `details` menu becomes a bounded, scrollable overlay with active-link treatment, preventing long navigation from escaping the viewport, while the footer and two-column hero define the renderer's primary content hierarchy. Action links and media captions remain readable over the dark palette and provide the layout primitives consumed by the Home route.

## feat(cinematic): 공용 frame과 media 추가

Introduce the shared Cinematic frame and media boundary used by every route. The frame owns the skip target, canonical navigation, current-page state, design switcher, mobile disclosure, main landmark, and footer links selected by placement metadata; route views therefore supply only page content. The media primitive routes images through `next/image` with required alternative text, responsive sizing, and optional priority, making image loading behavior consistent across hero, archive, and detail views.

## feat(cinematic): 프로젝트 chapter 추가

Extract a reusable project chapter that couples a sticky evidence summary with its visual asset. Both the textual action and image link preserve the Cinematic renderer, while the media link receives a project-specific accessible label and the first chapter may opt into priority loading. This gives Home and the project archive one canonical representation for project category, title, summary, destination, and screenshot.

## style(cinematic): chapter와 archive 지면 구성

Define the long-form chapter and archive layout used by the Cinematic renderer. Project entries pair sticky copy with large media, statement and focus sections use deliberate asymmetric grids, and image hover treatment reinforces the visual hierarchy without changing content semantics. These styles establish reusable page geometry for project lists, detail evidence, profile essays, and résumé sections rather than styling each route independently.

## feat(cinematic-home): 소개와 대표 프로젝트 구성

Compose the Cinematic Home page from canonical portfolio content while allowing presentation data to control section order. A typed map binds each configured section identifier to its rendered node, so reordering the `sections` array changes composition without duplicating content or weakening the accepted identifier set. Featured projects drive the lead image and chapters with deterministic fallbacks to available projects, and chapter numbering adapts to the resulting collection.

## feat(cinematic-projects): 프로젝트 archive 구성

Add the complete Cinematic project archive by reusing the shared project-chapter representation for every canonical project. The heading reports the actual collection size, and only the first archive image receives priority loading so the initial viewport is optimized without eagerly loading the full visual list. Reusing the same chapter component keeps route-preserving links, accessible image actions, and project summaries aligned with Home.

## style(cinematic): 상세와 이력 grid 구성

Establish the grid system for case-study evidence, profile essays, and résumé content. Large route headings lead into bounded two-column sections, identity facts use semantic definition-list styling, and galleries and biography blocks receive distinct layouts suited to their content density. The shared geometry lets later route implementations expose detailed evidence without embedding layout decisions in their data-mapping code.

## feat(cinematic-project): 상세 hero와 매체 구성

Create the Cinematic project-detail boundary with explicit handling for both valid and unresolved projects. Missing records render a recoverable route state that returns to the archive, while valid records expose category, period, summary, description, role, deployment status, and a priority lead image. Keeping the lookup failure inside the renderer prevents route composition from dereferencing absent content and gives every design a controlled not-found experience.

## feat(cinematic-project): 상세 서사와 gallery 구성

Expand project detail from a hero into a complete evidence narrative. Optional text and list sections render only when the project supplies data, stack identifiers resolve through the canonical technology catalog with an identifier fallback, and project actions come from the shared detail-link selector. Supporting screenshots exclude the lead image by source, avoiding duplicate media while preserving the remainder as a gallery; together these rules keep sparse and rich project records valid under one renderer.

## style(cinematic): 프로필과 콘텐츠 section 구성

Add the reusable visual structures needed for profile facts, long-form content sections, chronology, evidence links, contact information, and interview gaps. The styles separate compact metadata from explanatory prose and give timeline and evidence records stable reading order without hard-coding route-specific content. This prepares the remaining Cinematic routes to share consistent density, spacing, and link affordances.

## feat(cinematic-about): 프로필과 경력 소개 구성

Implement the Cinematic About route from the canonical profile, skills, and experience model. The identity block treats the profile image as optional, principles and technical focus remain distinct conceptual groups, and skill catalogs and experience records are rendered directly from their source collections. This keeps biography presentation independent of renderer-specific copy while preserving a clear progression from identity through practice to work history.

## feat(cinematic-about): 큐레이션 archive 구성

Add the optional curation archive to the Cinematic About route under the shared site-page enablement contract. Criteria, categories, omissions, and the next review remain distinct sections of the curation model, while category project identifiers are resolved and filtered before renderer-aware links are emitted. Gating the entire block with `isSitePageEnabled` prevents hidden content from leaking through a design-specific implementation and keeps broken references from producing invalid project cards.

## style(cinematic): 여정 timeline과 답변 근거 구성

Define the visual grammar for narrative milestones, chronological archive entries, current-position summaries, and interview evidence. Milestone state, reason, and result are presented as parallel facts, while answer records use a separate evidence treatment so linked projects and explanatory depth remain distinguishable. These structures support two related but different histories—curated turning points and the complete archive—without flattening them into one generic list.

## feat(cinematic): 이력과 연락 route 구성

Implement Cinematic résumé and contact routes with explicit reference resolution and fallbacks. Résumé project identifiers are resolved against the canonical project collection before links are rendered, optional downloads and notes remain conditional, and experience, training, and education retain separate ownership in the content model. Contact links prefer the configured identifiers but fall back to links placed for contact use, preserving a usable route even when no preference list is populated.

## style(cinematic): 인터뷰 근거와 반응형 동작 구성

Complete Cinematic interaction and responsive behavior across the renderer. Wide multi-column compositions collapse at tablet and phone breakpoints, sticky project copy becomes static where viewport constraints make it inappropriate, navigation moves to the native mobile disclosure, and dense evidence grids become single-column reading flows. A reduced-motion query removes transitions, animations, smooth scrolling, and image scaling, so the visual treatment does not override the user's motion preference.

## feat(cinematic-journey): 여정 archive 구성

Implement the Cinematic journey route as two complementary histories plus a current-state conclusion. Curated milestones resolve their anchor project identifiers before rendering state, reason, result, and evidence links; the archive then presents every dated journey entry with optional project navigation. Separating milestone interpretation from the chronological record preserves both narrative meaning and source completeness instead of forcing one representation to serve both purposes.

## feat(cinematic-interview): 인터뷰 근거 map 구성

Implement the Cinematic interview-evidence map by joining answer records to canonical projects. Each track retains its source reference, questions render mapped project evidence with recorded depth, unresolved identifiers receive the shared no-evidence state, and empty tracks or gap collections have explicit fallbacks. Building one project lookup map keeps repeated joins deterministic while the final gaps section makes missing evidence visible rather than silently omitting it.

## feat(designs): Cinematic renderer 활성화

Activate Cinematic as a complete selectable renderer and narrow its module API to the route entry point. `CinematicRoute` dispatches every supported route inside the shared frame, while presentation metadata, palette swatches, lazy loading, module exports, and content-loader support register the same identifier across all required boundaries. Updating these contracts together ensures that any advertised Cinematic selection is recognized, loadable, and capable of rendering the full route set.

## test(content): Vitest 기반 콘텐츠 계약 검증 추가

Introduce an executable test boundary for the portfolio content model with Vitest, jsdom, and Testing Library support. The suite verifies source validation, identifier uniqueness, the complete five-design registry, asset-location rules, disabled and unresolved references, internal-route validity, generic project metrics, selection helpers, chronological journey data, and renderer/debug query propagation. Treating these as data and selector contracts catches inconsistencies before rendering; the lockfile records the resulting test dependency resolution rather than defining the behavior itself.

## test(routes): 홈과 route presentation 계약 검증

Add route-level characterization tests that compare presentation shells against canonical content rather than hard-coded snapshots. Home is exercised across all five designs, default and invalid design selection, shared featured content, and debug-state-preserving navigation; Journey verifies content-owned accessibility and milestone labels. A route matrix also locks down the Classic shell, current-path-aware design links, and first-value semantics for repeated query parameters, protecting the common routing contract while allowing each renderer's markup to differ.

## test(ui): 디자인 선택과 프로젝트 링크 계약 검증

Lock down the interaction contracts of the design selector and project-link components. The selector test verifies content-owned labels, native `details` closure through both the explicit close control and navigation, and focus restoration; project-link tests verify source ordering, renderer/debug propagation for internal links, external-link safety attributes, deployment and placement filtering, and omission of empty wrappers. These tests protect behavior that can be lost during UI refactoring without relying on renderer-specific visuals.

## test(e2e): 다섯 디자인의 route matrix 검증

Add browser-level verification for the full five-design, enabled-route matrix on desktop and mobile Chromium. The Playwright suite checks successful navigation, renderer roots, shared content evidence, loaded project media, absence of horizontal overflow, route-preserving design switches, invalid-design fallback, reduced-motion behavior, mobile touch-target size, keyboard focus visibility, and bounded design and navigation sheets. Running one worker avoids development-compiler invalidation when two device projects request cold routes concurrently, trading speed for deterministic route compilation; generated dependency changes only record the Playwright installation.

## test(portfolio): selector와 presentation 회귀 계약 보강

Add a regression contract for the public portfolio module surface and its ownership boundaries. The test enumerates the intended selector exports so accidental API expansion or removal becomes visible, then verifies that each content read returns fresh project, project-link, and global-link structures while stable source collections remain shared. This distinguishes data that callers may safely derive or mutate locally from canonical validated content that should retain referential identity.

## refactor(routes): 홈 page context 통합

Introduce `resolvePortfolioPageContext` as the single owner of common page initialization and migrate Home to it. The typed current-path union, asynchronous query resolution, design fallback, debug parsing, content acquisition, and complete shell/switcher props are now assembled together. Centralizing this boundary prevents routes from drifting in how they preserve renderer and debug state while still allowing callers to inject an already loaded content object when page-specific validation requires it.

## refactor(projects): 프로젝트 page context 통합

Migrate both the project archive and project-detail routes to the shared page-context resolver. Each route still performs the projects-page enablement check and its own project or metric work, but design selection, debug parsing, shell construction, and switcher current paths now come from one source; the detail path includes the resolved project identifier. Passing the previously loaded content into the resolver avoids creating a second derived content graph and preserves consistent references throughout the request.

## refactor(routes): 소개와 학습 route context 통합

Apply the common page-context boundary to About, Journey, and Interview Map. The routes retain their page-enable checks, dedicated-renderer dispatch, and specialized curation or evidence logic, while duplicated query parsing and `PageShell` construction are removed. This makes renderer selection and current-path-aware design switching uniform across the site's profile and learning-evidence routes without collapsing their distinct domain content.

## refactor(routes): 이력과 연락 context 통합

Complete the page-context migration for Resume and Contact. Both routes continue to resolve their own selected projects or preferred contact links after page availability is checked, but consume the same active design, debug state, and shell props as every other route. The refactor intentionally leaves route-specific selection logic outside the context helper, keeping common request setup separate from page-domain decisions.

## refactor(ui): 프로젝트 링크 렌더링 중복 제거

Extract one internal `ProjectLinkList` renderer for detail and card link collections while leaving each caller's selection rules intact. Empty collections, visual priority for demo links, external versus internal icons, focus styles, and renderer/debug propagation now have a single implementation. This removes presentation drift without merging the different filtering responsibilities of `ProjectLinks` and `ProjectCardLinks`.

## fix(ui): hydration 중 native details 상태 보존

Mark the native design-switcher `details` element as an intentional hydration boundary. A user or the browser can change its open state after server markup arrives but before React attaches, so treating that transient DOM state as a server/client mismatch would emit misleading diagnostics or encourage resetting valid native state. Suppressing the warning at the owning element preserves the disclosure's current state while leaving its post-hydration ref-based close and focus behavior unchanged.

## test(ui): details hydration 경쟁 조건 검증

Reproduce the design-switcher hydration race directly and lock down the intended invariant. The test server-renders the component, opens the native `details` element before hydration, hydrates the same tree, captures mismatch diagnostics, and verifies that the open attribute survives with no hydration error. Explicit unmounting, spy restoration, and DOM cleanup keep the regression test isolated and ensure it validates the exact browser/React handoff addressed by the preceding fix.

## chore(runtime): 지원 Node.js와 npm 버전 고정

Pin the supported runtime and package manager consistently across `.node-version`, `.nvmrc`, `packageManager`, package engines, and lockfile metadata. Declaring Node.js 24.18.0 and npm 11.16.0 at every tool-discovery boundary makes local installation, package resolution, and automated verification converge on the same runtime contract instead of depending on whichever versions happen to be installed.

## test(e2e): production server 검증 경로 추가

Add an end-to-end path that exercises the optimized production artifact rather than the development compiler. The new command builds first, starts `next start` on an isolated port, disables reuse of an unrelated server, and runs the existing desktop/mobile Playwright matrix against that process. Keeping a separate production configuration exposes build-time and production-serving failures while preserving the faster development-server configuration for local iteration.

## ci: 기본 배포 품질 검사 추가

Establish a deployment-quality CI gate using the repository's pinned toolchain. Pushes and pull requests install dependencies reproducibly with `npm ci`, then require linting, type checking, content validation, a production build, and the Chromium end-to-end suite to pass. Read-only permissions, a job timeout, and cancellation of superseded runs bound the workflow's authority and resource use while ensuring that the same production path verified locally is enforced before integration.

## feat(content): 콘텐츠 mode와 readiness 오류 모델 추가

Introduce the type and error model for distinguishing template content from production-ready content. Missing, empty, or explicit `template` mode resolves conservatively to the template contract, only the exact `production` value enables production mode, and unsupported values fail immediately instead of being guessed. Structured readiness issues retain file and JSON-path context, the aggregate error formats all failures, and the discriminated result requires a parsed site URL only in production mode; this commit defines the protocol without yet implementing the readiness checks that will populate it.

## feat(content): template placeholder 탐색 경계 추가
Centralize the JSON source-to-file mapping and add a recursive placeholder scanner for production content. The scanner records JSON-style paths while traversing arrays and objects, so readiness failures identify the exact field rather than reporting only a file-level error. Keeping the marker vocabulary and traversal in the readiness layer establishes one reusable boundary for rejecting starter copy across every content document.

## feat(content): public origin과 자산 경계 검증 추가
Add production-specific validation for public origins and locally served assets. `SITE_URL` must now be an absolute HTTP(S) origin that is neither local, credential-bearing, nor reserved for examples, while production assets must live under `public/content`. This prevents a formally valid build from publishing placeholder metadata or references that work only in a development environment.

## feat(content): 공개 URL과 연락 링크 검증 추가
Define reusable predicates for deployable public URLs and contact links. Public links reject placeholder text, malformed URLs, non-HTTP protocols, and reserved example hosts, while contact links additionally permit `mailto:` and `tel:` schemes. Separating these predicates lets later readiness checks apply the correct protocol policy to project links and contact channels without weakening the public-origin rules.

## feat(content): production readiness 기본 검사 추가
Introduce the aggregate production-readiness validator. It validates the public site origin, scans every authoritative content file for template markers, accumulates all issues, and returns a discriminated production result only when the complete content set passes. Reporting the full issue collection in one failure makes the build gate actionable while preserving the invariant that production mode yields a verified `URL`.

## feat(content): 필수 자산과 프로젝트 readiness 추가
Extend production readiness from generic placeholder detection to portfolio-specific completeness. A production build now requires social, profile, and résumé assets under the public content boundary, at least one enabled project, production-hosted project screenshots, and an enabled public link for every published project. Disabled projects remain exempt, so editorial staging does not block deployment while every visible project is guaranteed to have usable presentation assets and an exit path.

## feat(content): 연락 수단과 build readiness 연결
Require at least one enabled, non-placeholder contact method in production and expose a single mode-aware build-readiness entry point. Template mode returns without applying publication requirements, whereas production mode delegates to the full validator. Internal helper functions are made module-private at the same time, narrowing the public API to the content-mode resolver, production URL resolver, error type, and build validation contract.

## build(content): readiness 검사를 prebuild에 연결
Make content readiness a mandatory prebuild gate after schema validation. A dedicated script loads the authoritative JSON source, validates the selected content mode and environment, prints the resolved mode or production origin, and converts readiness issues into a failing process status. This moves publication completeness from an optional check into the normal build lifecycle without preventing template-mode development.

## feat(seo): 콘텐츠 mode별 metadata 정책 추가
Add a pure metadata factory driven by validated site content and the selected content mode. It derives canonical, Open Graph, Twitter, and optional social-image metadata from one base URL, while enabling indexing only for production mode. Keeping the policy in a testable helper prevents starter/template deployments from being indexed and ensures all absolute social URLs share the same origin calculation.

## feat(seo): 콘텐츠 mode별 robots 정책 추가
Generate `robots.txt` from the same content-mode contract used by readiness and metadata. Template deployments disallow all crawlers, while production deployments advertise an explicit validated host and allow indexing; omitting a production URL is treated as a programming error. This keeps crawler policy consistent with page-level robots metadata instead of relying on unrelated static configuration.

## feat(seo): layout metadata를 콘텐츠 mode에 연결
Connect the root layout to the mode-aware metadata policy. Production metadata now derives its base from the validated `SITE_URL`, avoiding dependence on proxy/request headers, while template mode retains request-derived origins for local preview. Delegating construction to the metadata factory keeps canonical, social, and indexing behavior aligned with the build-readiness decision.

## test(content): readiness와 indexing 계약 검증
Add regression coverage for the complete readiness and indexing contract. The tests distinguish permissive template mode from strict production mode, verify that validation reports multiple independent content categories together, accept a fully prepared source, reject malformed or non-public origins, and assert matching page metadata and `robots.txt` policies. Constructing a production-ready fixture from the checked-in template also verifies the intended transition between the two modes.

## test(e2e): 콘텐츠 mode별 metadata와 robots 검증
Exercise the indexing policy through the running application rather than only through metadata helpers. The browser assertion checks the rendered robots meta tag and the HTTP assertion checks `robots.txt`, with expectations selected from the active content mode. This protects the integration between environment configuration, Next.js metadata routes, and the final responses seen by crawlers.

## fix(font): 빌드용 글꼴과 출처를 저장소에서 제공
Replace build-time Google Font fetching with repository-owned WOFF2 assets registered through `next/font/local`. The layout preserves the existing CSS variables while substituting Source Han Serif KR for the related Korean serif face, so design styles keep their established contracts. Recording upstream versions, checksums, and OFL notices makes the offline build reproducible and keeps redistribution terms alongside the binaries.

## test(font): 로컬 글꼴과 license 경계 검증
Lock down the self-contained font build contract. The test rejects any Google Fonts dependency in the root layout, confirms that every configured asset is a real WOFF2 file, and verifies that the corresponding SIL OFL notices remain in the repository. This prevents later styling changes from silently reintroducing network-dependent builds or separating redistributed fonts from their licenses.

## fix(build): production build에 webpack compiler 고정
Make the production build select the webpack compiler explicitly, matching the compiler already used by local development. Pinning the compiler at the script boundary avoids relying on framework defaults and keeps development and production compilation paths consistent for the project’s existing configuration and assets.

## feat(seo): route별 검색 metadata 정책 추가
Introduce a shared factory for route-specific canonical, Open Graph, and Twitter metadata. Non-root pages receive a brand-qualified title and an explicit canonical path, while the home page keeps the site title and root URL. Centralizing this policy prevents individual routes from drifting on title composition, social images, content type, or canonical identity.

## feat(seo): 홈과 프로젝트 route metadata 연결
Apply the shared metadata policy to the home page, project index, and statically generated project details. Project metadata is derived from the same enabled-page and project lookup rules used by rendering, so disabled routes and unknown project identifiers remain `notFound` instead of publishing orphaned search metadata. Detail pages are represented as articles with canonical URLs tied to stable project IDs.

## feat(seo): 프로필 route metadata 연결
Add content-derived metadata to the about, contact, and resume routes. Each generator first enforces the route’s enabled-page gate, then reuses the page’s authoritative profile, contact, or presentation copy for its title and description. This keeps search presentation aligned with what the route can actually render instead of maintaining a second set of static SEO strings.

## feat(seo): 여정과 근거 route metadata 연결
Connect the journey and interview-map routes to the common metadata factory. Their descriptions come from the narrative and evidence content models and are emitted only when the corresponding site pages are enabled. The change extends the same canonical and title policy to these specialized routes without bypassing their availability contract.

## feat(seo): 공개 route sitemap 생성
Generate `sitemap.xml` from the validated production origin and the routes that the current content configuration actually exposes. Template mode returns no entries, disabled optional pages are omitted, and project detail URLs are derived from enabled project IDs; production `robots.txt` also advertises the resulting sitemap. This makes crawl discovery follow the same publication boundary as rendering and indexing rather than listing a fixed, potentially stale route set.

## feat(seo): JSON-LD 안전 직렬화 경계 추가
Add a dedicated component and serializer for embedding JSON-LD. Structured data is serialized once and escapes `<`, `>`, and `&` before being assigned to a script element, preventing content from terminating or altering the surrounding HTML script context. Keeping this safety rule behind a reusable component avoids ad hoc `JSON.stringify` calls at individual routes.

## feat(seo): 사이트 소유자 JSON-LD 모델 추가
Model the portfolio owner and website as a linked Schema.org graph. Stable fragment identifiers connect the `WebSite` author to the `Person`, while names, role, summary, language, image, and canonical URLs are taken only from validated portfolio content. Optional profile fields are emitted conditionally so the structured representation does not invent missing claims.

## feat(seo): production layout에 사이트 JSON-LD 연결
Embed the site-level structured-data graph at the root layout only for production content. The layout resolves the same validated public origin used by canonical metadata and omits JSON-LD entirely in template mode, preventing starter identities from being exposed as machine-readable facts. Placing the graph once at the layout boundary also avoids duplicating owner and website entities across routes.

## feat(seo): 프로젝트 CreativeWork JSON-LD 모델 추가
Add a project-level `CreativeWork` representation derived from the authoritative project and site models. The record uses a canonical project URL and fragment ID, links back to the site owner, and carries only supported fields such as summary, screenshot, language, tags, and title. This provides route-specific structured data without asserting ratings, awards, or other facts absent from the content source.

## feat(seo): 프로젝트 상세에 JSON-LD 연결
Render project `CreativeWork` JSON-LD alongside both dedicated-design and fallback project-detail views. Structured data is created only after page availability and project existence have been validated, and only in production mode using the configured public origin. Wrapping both rendering branches preserves one machine-readable contract regardless of the selected visual implementation.

## test(seo): route metadata export 검증
Verify the actual metadata exports of every public route instead of testing only the shared factory. The suite checks canonical paths, content-derived titles and descriptions, and project-detail metadata keyed by a real project ID. This catches wiring regressions where a page stops exporting metadata or supplies content from the wrong route even if the helper itself remains correct.

## test(seo): route metadata와 sitemap 계약 검증
Add focused coverage for canonical route metadata and sitemap publication. The tests require query-free canonical paths, ensure template mode publishes no sitemap entries, and verify that production output includes enabled pages and project details while omitting a disabled route. This locks search discovery to the same content-availability configuration used by the application.

## test(seo): JSON-LD 계약과 직렬화 검증
Protect both the semantics and the embedding safety of structured data. The tests check the linked `Person` and `WebSite` records, require project `CreativeWork` data to omit unsupported claims, and reproduce a closing-script payload to confirm markup-significant characters are escaped. Together they prevent both schema drift and script-context injection regressions.

## feat(site): 사용자 정의 404 페이지 추가
Provide a portfolio-styled not-found page with an explicit route back to the home page. It reuses the shared shell and current content identity so invalid or disabled routes remain inside the site’s navigation context, while page-level robots metadata prevents the error page itself from being indexed.

## test(site): 404 복귀 동선 검증
Verify that the custom not-found page communicates the error through its primary heading and exposes a semantic link back to `/`. The test protects the recovery path rather than presentation details, ensuring later redesigns cannot strand users on an invalid route.

## refactor(content): 홈 route view model 경계 추가
Introduce a dedicated home-route view model that computes presentation-ready selections once at the content boundary. Featured fallbacks, lead project, metric values, current year, recent journey entries, placed links, and preferred contacts are derived centrally instead of being recomputed by each design. Clearing unrelated root collections begins limiting what home renderers can consume, while the route discriminant establishes a type-level basis for route-specific rendering.

## refactor(content): 프로젝트 목록 파생 모델 추가
Add a projects-route view model that resolves featured and archive partitions, project groups, and metric values before rendering. Configured group order and metadata remain authoritative, empty configured groups are omitted, and projects with unconfigured group IDs are retained through deterministic fallback groups rather than being silently dropped. Centralizing this projection gives every design the same project taxonomy.

## refactor(content): 상세와 소개 파생 모델 추가
Extend the route-model boundary to project detail and about pages. Project detail now resolves action links, stack metadata with a safe fallback for unknown IDs, and secondary screenshots while returning `null` for an unknown project. About curation resolves project references through an indexed lookup and omits missing references. These builders convert cross-file identifiers into renderer-ready objects at one controlled boundary.

## refactor(content): 이력과 연락 파생 모델 추가
Add resume and contact route projections and combine the route models into a discriminated union. Resume project IDs are resolved to existing project objects, while contact link precedence is computed once: preferred links take priority and contact-placement links provide the fallback. The resulting union lets later APIs associate each route literal with the exact data shape required by that route.

## refactor(routes): renderer view model 요청 타입 추가
Introduce a typed migration request that pairs each route literal with its corresponding view-model variant. The registry accepts either the new discriminated request or the legacy renderer props and adapts the view model back to the existing component contract, including project extraction only for detail routes. This compatibility layer permits incremental renderer migration without losing route-to-model type correlation.

## refactor(renderers): footer 링크 파생 모델을 호환
Teach the Brutalist, Cinematic, and Editorial shells to consume precomputed `footerLinks` when a route view model supplies them, while retaining the legacy filtering path for raw content. This small adapter preserves current rendering during the staged migration and prevents each design from recomputing the same placement rule once projected content is available.

## refactor(home): 공용 홈에서 파생 view model 사용
Create the home view model at the route boundary and migrate the shared Classic and Design home components to consume its derived fields. Featured projects, hero and contact links, metric values, and project counts are no longer recomputed in individual components. This makes the route projection the single owner of home selection semantics while preserving the rendered behavior.

## refactor(renderers): 홈 renderer 파생 값을 연결
Pass the home view model through the design registry and update the dedicated Brutalist, Cinematic, and Editorial renderers to use its featured-project fallbacks, metrics, recent journey entries, preferred links, counts, and captured year. Moving these calculations out of renderer implementations keeps all designs consistent and makes time-dependent output explicit at model construction.

## refactor(projects): 프로젝트 목록 파생 모델 사용
Construct the project-index view model in the `/projects` route and use its featured/archive grouping and metric projections for the shared renderers. The route no longer repeats grouping or metric selector logic, so both fallback templates and dedicated designs consume the same resolved project set and counts.

## refactor(renderers): 프로젝트 목록 파생 값을 연결
Pass the project-index view model to dedicated renderers and remove their local grouping and metric derivations. Brutalist and Editorial now render the model's resolved groups and metric values, ensuring configured ordering, fallback groups, and counts remain identical across designs instead of being reinterpreted in each renderer.

## refactor(projects): 상세 route 파생 데이터를 준비
Resolve project detail through `createProjectDetailViewModel` at the route boundary. Missing projects now follow the model's explicit `null` result into the 404 path, while downstream rendering and metadata share the same resolved project and page copy. This prepares the route to pass one coherent projection to every renderer.

## refactor(renderers): 상세 프로젝트 근거 데이터를 연결
Pass the project-detail view model through the registry and migrate dedicated renderers to its resolved links, stack items, and supporting images. This removes repeated identifier lookups and unsafe assumptions such as non-null stack matches; all designs now share the same fallback labels and exclusion of the lead image from the supporting gallery.

## refactor(about): 큐레이션 파생 모델을 route에 적용
Build the about view model at the route boundary and migrate shared and dedicated renderers to its resolved curation categories. Project-reference lookup and missing-reference filtering no longer occur independently inside each design, so category ordering and membership follow one content-layer rule.

## refactor(routes): 이력과 연락 파생 데이터를 연결
Apply the resume and contact projections at their route boundaries and pass them through every renderer. Resume project ordering and unknown-reference omission, as well as preferred-contact fallback behavior, are now computed once instead of being reimplemented by each visual design. The registry's remaining raw-content request is narrowed to routes not yet migrated.

## test(content): route view model 파생 규칙 검증
Add focused tests for every route projection. The suite locks down configured project-group order without duplication, missing-project behavior, stack and image resolution, curation and resume reference filtering, preserved reference order, contact fallback precedence, and explicit time injection for the home model. These assertions protect the semantic boundary rather than a particular renderer implementation.

## test(design): view model 기반 renderer matrix 검증
Render all six migrated routes across the five available designs as a compatibility matrix. Each case must retain the requested design boundary and a meaningful page heading, providing integration coverage that route-model migration did not break the registry, route selection, or the basic HTML contract of any design.

## build: standalone server 산출물 생성
Configure Next.js to emit a standalone server bundle. The build output now contains the traced runtime files needed to start the application without carrying the full development dependency tree, establishing the artifact boundary used by the later container and deployment checks.

## test(build): standalone 산출물 완전성 검증
Add an explicit post-build check for the standalone server entry point and static asset directory. Failing when either artifact is absent turns the deployment layout from an implicit Next.js assumption into a verifiable build contract.

## ci: standalone 산출물 검증 추가
Run the standalone artifact check in CI after the production end-to-end build. This makes deployment completeness a required pipeline property rather than a local opt-in check.

## fix(a11y): 디자인별 색상 대비 보정
Adjust shared and Editorial color tokens so accent text remains distinguishable on both light and dark surfaces. Separating the dark-surface vermilion from the normal text token avoids improving one context at the expense of another and applies the correction consistently to evidence, architecture, curation, and gap labels.

## fix(a11y): skip link focus target 복원
Make each main-content landmark programmatically focusable with `tabIndex={-1}`. Skip links can therefore move keyboard focus as well as scroll the viewport, restoring the expected navigation behavior across the shared, Cinematic, and Editorial shells without placing the landmark in normal tab order.

## fix(a11y): Brutalist 지표의 definition semantics 수정
Correct the Brutalist metric block so every descriptive value is represented by a `<dd>` inside its definition list instead of an unrelated paragraph. The corresponding selector now styles that semantic description explicitly without inheriting the stronger value typography. The shell’s main landmark also becomes programmatically focusable, completing the skip-link focus contract for this design while preserving its visual presentation.

## test(a11y): 디자인×route WCAG 행렬 추가
Add an end-to-end accessibility matrix that exercises every enabled route under all five designs. Each case verifies a successful response, the selected design boundary, exactly one banner, main, and content-info landmark, and a clean Axe scan for the configured WCAG 2.x A/AA rule sets. A separate keyboard path proves that the skip link is first in the tab order and transfers focus to the main landmark. Shared design and route fixtures keep this suite aligned with the existing site matrix; the lockfile records the new Axe integration dependency.

## refactor(content): 여정 근거 view model 추가
Introduce a journey-specific view model that resolves content references before they reach a renderer. Milestone anchor identifiers are converted to existing projects and unknown references are omitted, while an optional timeline project resolves to either the matching project or an explicit `null`. Excluding the full project collection from the route projection keeps journey renderers dependent on the evidence relationships they actually own rather than on global content lookup.

## refactor(content): 인터뷰 근거 view model 추가
Introduce an interview-map view model that preserves the track, question, and answer hierarchy while resolving each answer’s project identifier to a project object or `null`. Cross-reference handling therefore belongs to the content projection layer instead of being repeated by renderers, and missing evidence remains representable without unsafe assertions. The route model omits the raw project collection so consumers cannot bypass the prepared evidence boundary.

## style(designs): route renderer 디자인 토큰 확장
Extend the design token layer beyond color to cover display typography, body scale, section rhythm, motion timing, navigation stacking, and content width. Values are scoped by `data-site-design`, allowing shared route-renderer markup to express five distinct visual systems without component-level conditionals. The route-renderer width override becomes the first consumer of this broader token contract.

## refactor(shell): 디자인 renderer 셸 경계 추가
Add a prepared shell-props boundary for the shared `design` and `classic` renderers. The helper derives profile, site, presentation, switcher, and debug state from a route view model and marks the page shell with the active route-renderer identity. This centralizes shell assembly and gives design-scoped CSS a stable boundary without requiring individual routes to reconstruct the same framing contract.

## feat(design-home): 홈과 대표 프로젝트 행동 동선 추가
Add explicit navigation from the design home route into the project index at both the hero and featured-project boundaries. Both links use the template-aware URL helper, so the selected design and content-debug mode survive internal navigation. This turns the landing page’s primary presentation areas into consistent entry points for the portfolio’s detailed evidence.

## feat(design-home): 작업 지표 지도 추가
Move the work-map presentation into the design home renderer and drive it from the home view model’s precomputed metric values. Card configuration remains content-owned, while the renderer maps each declared count key to a numeric value with a conservative zero fallback. Keeping this composition local lets the route adopt its own visual treatment without reintroducing raw project counting in the view.

## feat(design-home): 기술 집중 영역 추가
Move the technical-focus section into the design home renderer and build it from the validated focus-area content. Each card retains its source hint in content-debug mode and participates in the route’s reveal sequence. The change gives this renderer local control over layout and interaction while leaving the actual technical claims in the content model.

## feat(design-home): 선택 기술 스택 구성
Move the selected-stack composition into the design home renderer. The marquee is limited to technologies referenced by configured skill groups, while each group renders its ordered identifiers through the shared stack list and preserves content debug hints. Deriving the visible set from the group configuration prevents unrelated catalog entries from appearing and keeps the section aligned with the portfolio’s declared skill taxonomy.

## feat(design-home): 여정 근거 영역 추가
Move the journey evidence section into the design home renderer and compose it from the prepared home journey items. The route selects the paired centerline presentation, retains template-aware case-study links, and carries content-debug source hints through the shared journey list. This gives the design renderer control over section framing without duplicating timeline behavior.

## feat(design-home): 연락 미리보기 동선 추가
Move the contact preview into the design home renderer and use the view model’s preferred contact links as the primary actions. The section pairs current availability with direct contact methods and a template-aware link to the full contact route, while preserving content-debug hints and the selected design across navigation.

## refactor(design-home): 홈 섹션 순서를 콘텐츠로 연결
Render design-home sections by iterating the validated section identifiers in content instead of checking each known section in a hard-coded component order. A typed `HomeSection` dispatcher maps each identifier to its renderer and returns nothing for an unsupported value. This makes section inclusion and ordering a single content-owned contract while keeping the rendering implementations explicit.

## refactor(routes): Design 홈 renderer로 위임
Turn the design home implementation into a route renderer that accepts the common prepared route contract. It narrows the discriminated view model to `home`, derives shared shell props in one place, and receives the current path from the page boundary instead of constructing shell state internally. The page now delegates presentation to the design module while retaining route loading and selection responsibilities.

## refactor(design-home): renderer 선언 순서 정리
Reorder the design-home declarations and normalize a few line breaks without changing the rendered structure or data flow. Related helper and section implementations now follow the route’s composition order, making the large renderer easier to navigate.

## refactor(routes): Design 프로젝트 목록 renderer로 위임
Move assembly of the design project-index route into its renderer module. The renderer narrows the route view model, derives the shell, page copy, grouped archive entries, featured projects, and metric fallbacks locally, while the Next.js page delegates with the common route contract. This keeps loading and not-found behavior at the page layer and makes the design module the owner of presentation-specific composition.

## feat(design-project): 프로젝트 상세 히어로 추가
Introduce the design project-detail hero with a template-preserving return link, source hint, project availability, summary, description, external links, and priority screenshot. The component deliberately excludes the case-study self-link from the project actions because the user is already on that route. This establishes the detail page’s identity and navigation contract before its evidence sections are composed.

## feat(design-project): 상세 섹션 프리미티브 추가
Add small presentation primitives for titled two-column narrative sections and repeated evidence lists. Centralizing the eyebrow/title hierarchy and list-card structure keeps the project-detail body visually consistent while allowing each content category to remain a semantic section or list. These primitives prepare the renderer for multiple project evidence fields without duplicating layout markup.

## feat(design-project): 프로젝트 근거 본문 구성
Compose the design project-detail body from the project’s problem, solution, architecture, screenshots, stack, decisions, highlights, trade-offs, and results. Presentation labels come from route copy while evidence comes from the selected project, and a combined content hint records both sources. Reusing the section primitives and shared stack and screenshot components keeps the long-form case study structured without collapsing distinct evidence types into generic prose.

## refactor(routes): Design 프로젝트 상세 renderer로 위임
Make the design project-detail module a complete route renderer. It narrows the discriminated model, derives shell state and project-detail copy, and owns composition of the hero and body; the Next.js page delegates to it while preserving JSON-LD output and route-level not-found handling. Internal section helpers become private to the renderer, reinforcing the boundary between routing, structured metadata, and visual presentation.

## refactor(design-project): renderer 선언 순서 정리
Reorder the project-detail renderer's private declarations so the route, hero, and body appear before their supporting section primitives. Import ordering and a compact prop signature are normalized at the same time. The rendered output and data flow remain unchanged.

## feat(design-about): 큐레이션 프로젝트 카드 추가
Add a curation-category card that presents each category's rationale together with the projects already resolved by the about view model. Empty categories remain valid and omit the project-list markup, while populated categories link through the template-aware URL helper and retain content-debug mode. This keeps reference resolution outside the renderer and makes the card responsible only for curation presentation.

## feat(design-about): 큐레이션 기준과 범주 구성
Compose the about page's curation section from validated curation data and route-specific presentation copy. It separates selection criteria from categorized project evidence, reuses the prepared category view models, and preserves source hints for both content layers. The renderer therefore explains not just which projects are shown, but the policy used to select them.

## feat(design-about): 큐레이션 생략과 재검토 기준 추가
Extend the curation section with explicit omission reasons and the next review condition. These fields make non-selection and future reconsideration first-class parts of the curation model rather than leaving absent projects unexplained. The renderer keeps the two concepts visually separate: current exclusions are a list of criteria, while the next review is a single review boundary.

## feat(design-about): 소개와 개발 원칙 구성
Create the Design about-route renderer with a route discriminator, shared shell assembly, profile hero, optional photo, and development-principle cards. Content claims stay in profile data while headings and section labels come from about-page presentation copy, with debug hints showing both origins. This establishes the route's identity and shell boundary before the remaining evidence sections are attached.

## feat(design-about): 여정과 기술 역량 구성
Extend the Design about route with evidence-oriented journey and skills sections. The journey uses the prepared cross-content projection so case-study links retain template and debug context, while skill focus areas and grouped stacks render directly from validated skill data. Keeping narrative copy, source hints, and resolved route data separate lets the page explain both progression and current technical capability without resolving references in the component.

## refactor(routes): Design 소개 renderer로 위임
Delegate the Design about page to its dedicated route renderer while leaving the application page responsible for content loading and template dispatch. Complete the renderer with experience history and a curation section guarded by the site's page-availability policy, so disabled optional content is not exposed accidentally. The route module now owns the full Design presentation, and its internal curation helpers are kept private to that implementation.

## feat(design-resume): 이력서 소개와 요약 구성
Create the Design resume renderer around the prepared resume view model and shared shell contract. The hero combines presentation copy with profile identity, location, availability, and an optional download action, then renders the resume summary as source-traceable statements. The route discriminator prevents the renderer from consuming an incompatible projection, and the optional download keeps missing assets from producing a dead action.

## feat(design-resume): 대표 프로젝트와 교육 과정 추가
Add selected-project and training evidence to the Design resume. Projects come from the resume view model's already-resolved project references, show a bounded stack preview, and link to case studies without losing template or debug state; training remains independent structured resume data. This keeps the resume concise while preserving a path from summarized claims to fuller project evidence.

## refactor(routes): Design 이력 renderer로 위임
Delegate the Design resume page to its dedicated renderer and complete the route with optional experience, education, and notes sections. Each collection is rendered only when it contains data, avoiding empty headings while preserving the distinction between work history, formal education, training, and supplemental notes. The application route retains content preparation and design selection; the renderer owns the Design-specific composition.

## feat(design-contact): 연락 가능성과 링크 구성
Create the Design contact route with a profile-aware introduction, availability statement, preferred contact actions, and contextual notes. Preferred links are supplied by the contact view model and rendered through the shared content-link component so internal and external targets keep their established behavior. When no preferred link is available, the route shows an explicit empty state instead of presenting an unusable contact surface.

## refactor(routes): Design 연락 renderer로 위임
Delegate the Design contact page to its dedicated renderer after the application route has resolved page availability, content, template, and debug context. This removes Design-specific composition from the generic route without changing the fallback renderer path used by other templates.

## feat(design-journey): 여정 마일스톤 카드 추가
Add a milestone card for the prepared journey narrative model. Each entry presents state, reasoning, and result as a definition list, preserving the semantic relationship between labels and evidence, and resolves optional anchor projects before rendering template-aware case-study links. Milestones without project evidence remain valid and omit the link list.

## feat(design-journey): 여정 서사와 근거 목록 구성
Create the Design journey route around the narrative introduction and ordered milestone evidence. The renderer consumes a journey-specific projection, uses shared shell construction, and numbers milestones in presentation order while leaving project-reference resolution to the view model. This separates the higher-level career narrative from the reusable milestone-card representation.

## refactor(routes): Design 여정 renderer로 위임
Delegate the Design journey page to its dedicated renderer using an explicitly created journey view model. Complete the route with the detailed timeline and current-position sections, reusing the paired-centerline journey list for chronological evidence and keeping the milestone helper private. The page route now prepares data and selects presentation, while the renderer owns the complete Design narrative.

## feat(design-interview): 인터뷰 트랙 표 구조 추가
Introduce the semantic table structure used to present each interview-evidence track. Track metadata, item counts, and source hints sit beside a table whose column headers define the question, answer, and depth relationship. The empty body deliberately establishes the presentation contract before answer rows are attached.

## feat(design-interview): 프로젝트 답변과 심화 근거 추가
Populate interview-track tables with source references, project-backed answers, and depth explanations. Resolved projects link to their case studies with template and debug state preserved; unresolved identifiers remain visible rather than disappearing, so incomplete evidence is explicit. Keeping answer and depth lists aligned per table row preserves the correspondence between a question's supporting projects and the claimed level of detail.

## feat(design-interview): 트랙 탐색과 근거 페이지 구성
Create the Design interview-map route with an introduction, external reference repository, in-page track index, and the prepared evidence tables. Stable track IDs connect the index to section anchors, while the route discriminator and shared shell keep the renderer within the established design contract. The page can therefore be scanned by topic without duplicating project-reference resolution in the UI.

## refactor(routes): Design 인터뷰 renderer로 위임
Delegate the Design interview-map page to a dedicated renderer built from the interview-specific view model. Complete the evidence page with an explicitly labelled gaps section, making unsupported or incomplete areas visible alongside the project-backed answers instead of implying complete coverage. The route module retains content preparation and renderer selection; track composition becomes private to the Design implementation.

## refactor(design): Design route dispatcher 추가
Add a single Design route dispatcher that maps the route discriminator to the corresponding dedicated renderer. This consolidates the Design template's route surface behind one component contract and makes the switch exhaustive over the supported route union. The project-list renderer is also moved to the same flat module boundary so every Design route can be imported consistently.

## refactor(classic-home): 홈 renderer를 독립 모듈로 이동
Move the Classic home composition behind a dedicated route renderer that accepts the same prepared route contract as the other designs. The renderer now owns shell construction, content-driven section ordering, and the Classic-specific contact, journey, stack, focus, and work-map sections that were previously exposed as global portfolio components.

Keeping these presentation details inside the Classic module removes template-specific coupling from the application page while preserving the existing section visibility and navigation behavior.

## refactor(classic-projects): 프로젝트 목록 renderer를 이동
Move the Classic projects page behind a route-level renderer that derives its shell, copy, metrics, featured projects, and archive groups from the prepared projects view model. The application route no longer decomposes those values into Classic-specific props.

This keeps terminal, lead-project, and archive presentation concerns private to the template while aligning Classic with the same discriminated route boundary used by the other renderers.

## refactor(classic-project): 상세 본문 프리미티브를 이동
Relocate the Classic project-detail view and its section primitives into the Classic design module. Shared elements such as screenshots, links, badges, and stack rendering remain in the common component layer, while the two-column and list-section composition becomes private to the template that defines it.

This separates reusable content primitives from Classic-specific page structure without changing the rendered project evidence.

## refactor(classic-project): 상세 renderer를 독립 모듈로 완성
Complete the Classic project-detail boundary by making the design module responsible for route discrimination, shell construction, and the project hero/body composition. The Next.js page retains project lookup and structured-data emission, then passes the prepared detail view model and route context to the renderer.

Splitting the renderer into private hero and body sections keeps presentation ownership inside Classic while preserving metadata and JSON-LD responsibilities at the application route.

## refactor(classic-about): 소개 renderer를 독립 모듈로 이동
Move the complete Classic about and curation presentation out of the application route and into a dedicated renderer. The page now selects the Classic or Design implementation and passes the same prepared about view model, while the Classic module owns its shell, profile, principles, journey, skills, experience, curation categories, omissions, and review sections.

This removes a template-specific page implementation from the routing layer and preserves the existing page-enable and resolved-reference behavior.

## refactor(classic-resume): 이력 renderer를 독립 모듈로 이동
Extract the Classic resume presentation into a route renderer that consumes the prepared resume view model and constructs its own shell. The application page now selects a renderer instead of owning Classic-specific identity, summary, project, training, experience, education, and notes markup.

The boundary keeps route availability and data preparation outside the design while making all Classic resume composition—including optional sections and template-aware project links—the renderer's responsibility.

## refactor(classic-contact): 연락 renderer를 독립 모듈로 이동
Move the Classic contact page into a dedicated route renderer and reduce the application page to selecting a template implementation. The renderer receives the prepared contact model, builds the shell, renders preferred links or the configured empty state, and keeps contact notes within the template module.

This applies the common route contract without altering the distinction between resolved contact links and fallback content.

## refactor(classic-journey): 여정 renderer를 독립 모듈로 이동
Extract the Classic journey page into a dedicated renderer and make both Classic and Design consume the same prepared journey view model. Project references for narrative milestones are resolved before rendering, so the Classic module no longer searches the raw project collection while building cards.

The application route retains page availability and view-model creation; the renderer owns the shell, narrative, timeline, and current-position presentation. This preserves the reference-resolution boundary established by the view-model layer.

## refactor(classic-interview): 인터뷰 renderer를 독립 모듈로 이동
Move the Classic interview map into its own route renderer and feed both template variants the prepared interview view model. Answer-to-project references are now resolved centrally instead of rebuilding a project lookup map inside the Classic page.

The renderer owns track navigation, evidence tables, unresolved-reference fallback text, and gap disclosure, while the application route remains responsible for page availability and model preparation.

## refactor(classic): Classic route dispatcher 추가
Introduce a single Classic dispatcher over the discriminated prepared-route contract. Each supported route is mapped to its dedicated Classic renderer, matching the module boundary already established for the Design template.

Centralizing dispatch gives the registry one design entry point and makes route coverage explicit: adding or omitting a route is now visible in one exhaustive switch rather than distributed across application pages.

## refactor(journey): 모든 renderer에 여정 view model 적용
Make every journey renderer consume the prepared journey view model rather than the raw portfolio dataset. Milestone anchor projects and timeline project references are resolved once during model construction, then exposed directly to Classic, Design, Brutalist, Cinematic, and Editorial presentations.

This removes repeated identifier lookups from rendering code and preserves one missing-reference policy across templates. The route now creates the model before registry dispatch so all designs receive the same projection.

## refactor(interview): 모든 renderer에 인터뷰 view model 적용
Apply the prepared interview-map view model to every renderer. Track answers now carry their resolved project or a null result, eliminating per-template project maps and keeping unresolved references explicit at the presentation boundary.

The application route constructs this projection before dispatch, ensuring that navigation, answer evidence, and fallback behavior are derived from the same reference-resolution rules regardless of the selected design.

## refactor(designs): renderer 입력을 route view model로 제한
Change the common design contract from the complete portfolio content object to the discriminated union of route view models. Shells now rely on an explicit `footerLinks` projection instead of recovering it from raw links, and the temporary alternate request shape for journey and interview routes is removed.

This makes prepared route data the only legal registry input and prevents renderers from silently reaching into unrelated source collections. Compatibility types move to the central design contract so every template observes the same boundary.

## refactor(designs): 모든 route를 registry renderer로 위임
Route every application page through the design registry after resolving its template and building the corresponding view model. Direct imports and special-case selection for Classic and Design are removed, while project-detail pages continue to own not-found handling and structured-data emission around the rendered result.

This establishes one dispatch path for all templates and routes. The application layer now owns framework concerns and data preparation; the registry owns template selection; each renderer owns presentation.

## test(design): 독립 renderer와 design token 경계 검증
Extend the renderer matrix to the journey and interview routes and assert that the Classic and Design implementations expose their independent renderer boundary. Add stylesheet contract tests for the shared typography, spacing, breakpoint, motion, layer, and content-width token families, including explicit Classic and Design scopes.

These tests protect both sides of the refactor: every route must remain renderable through every design, and renderer-specific layouts must continue to be driven by declared tokens rather than accidental global defaults.

## refactor(content): 홈 view model 공개 필드 제한
Replace the home model's inheritance from the complete portfolio object with a scoped type that exposes only shared shell data, the source sections the home renderers use, and explicit home derivations. All other portfolio keys are typed as unavailable, while the runtime factory copies only contact, journey, skills, technology, and prepared metrics/project references.

This turns route isolation into a compile-time contract and stops the home renderer from retaining unrelated source collections merely for structural compatibility.

## refactor(content): 프로젝트 view model 공개 필드 제한
Scope the project-index and project-detail models to their actual data dependencies. The index receives the project collection, contact data, groups, metrics, and prepared subsets; the detail model exposes only the selected project and its derived links, stack entries, and supporting images in addition to shared shell data.

Removing the full-content base—and the former empty `projects` placeholder on detail routes—makes unrelated collections unavailable by type and avoids carrying them at runtime.

## refactor(content): 소개·이력·연락 공개 필드 제한
Apply the scoped route-model contract to the about, resume, and contact projections. Each factory now copies only the source sections needed by its renderers and the references it has already resolved: curation categories for about, selected projects for resume, and placement-filtered links for contact.

This replaces the full content object and synthetic empty project arrays with explicit dependencies, reducing accidental cross-route coupling while preserving optional-section and missing-reference behavior.

## refactor(content): 여정·인터뷰 공개 필드 제한
Scope the journey and interview models to their route-specific source data and resolved references. Journey retains its narrative and timeline plus prepared milestone and project links; interview retains its map plus tracks whose answers carry resolved projects.

The factories no longer copy the complete portfolio object or insert empty project arrays. Renderers therefore cannot recover raw project collections and must use the centralized reference-resolution results.

## refactor(content): route view model 공용 경계 제한
Finish the route-model isolation by reducing the common base to presentation, profile, site, and prepared footer links. The factory stops spreading the complete content object and no longer creates empty compatibility arrays for links, groups, or metrics.

Unavailable source keys remain typed as `never` so legacy helper signatures can be migrated without copying those values into runtime models. This separates type-level compatibility from actual data ownership and makes the shared payload intentionally small.

## test(content): scoped view model과 연락처 회귀 검증
Lock down the route-view-model boundary at runtime rather than relying only on TypeScript declarations. The tests enumerate the source content fields each route is allowed to retain, require the shared shell fields and derived footer links, and reject implementations that reconstruct a model by intersecting with or spreading the complete `PortfolioContent` object.

The suite also verifies the data-resolution behavior that motivated the projections: project-list and about models retain the contact data their renderers use, journey milestones discard unresolved project references, and interview answers preserve the original identifier while exposing a `null` project for a missing reference. Together these checks protect both payload scoping and the renderer contract for incomplete cross-references.

## refactor(ui): 디자인 선택기를 server markup으로 전환
Convert the design selector itself from a client component to server-rendered markup and isolate the only imperative behavior in a small `DesignSwitcherClose` client component. The selector can now render its native `<details>` structure and navigation links without hydrating React state or refs for the whole panel.

The close control locates its owning `<details>` element from the event target, removes the native open attribute, and restores focus to the summary. Design links no longer need an `onClick` handler because navigation replaces the page; their generated URLs remain responsible for preserving the content-debug query. This keeps keyboard focus restoration for an explicit close while reducing the browser-side component boundary to the behavior that actually requires JavaScript.

## test(ui): server 선택기와 focus 복원 검증
Add a structural regression check that reads the design-switcher source and rejects either a top-level `"use client"` directive or `useRef` state in the selector component. This makes the server/client split an explicit contract instead of an incidental implementation detail, complementing the existing rendering, native-open-state, and explicit-close focus tests.

The accompanying lockfile movement only refreshes transitive test dependencies; the authoritative change is the test that prevents the selector markup from silently expanding back into a hydrated client component.

## refactor(ui): reveal 콘텐츠를 server에서 즉시 표시
Remove the client-side intersection-observer lifecycle from `Reveal` and render every wrapped element in its visible state from the server. The component retains its polymorphic element and transition-delay styling, but no longer withholds content until hydration, observer registration, and a viewport callback have completed.

This trades scroll-triggered reveal animation for deterministic first render, lower client JavaScript and no observer cleanup burden. More importantly, content remains available when JavaScript is delayed or disabled, so presentation effects cannot become a visibility or interaction prerequisite.

## refactor(navigation): 디자인 전환 URL 기본값 명시
Make the configured default design an explicit input to every design-switcher instance and generate switch links through `createTemplateHref`. The URL helper can now distinguish a deliberate non-default selection from the default presentation, retaining `view=<design>` only when it is required and removing a stale `view` parameter when the user returns to the default.

Threading `defaultId` through page context, shared shell props, and the dedicated renderer shells keeps URL canonicalization based on content configuration rather than a hidden global assumption. Existing query state such as content-debug mode remains preserved by the same helper.

## perf(font): route별 글꼴 로딩 비용 축소
Reduce unconditional font work at the root layout. The primary sans face remains available through `next/font`, while the mono face is no longer preloaded and small switcher labels use the system monospace stack instead. The Korean serif variable is attached only when the configured site language is Korean; other languages receive an explicit system-serif CSS-variable fallback without loading the large CJK font.

All local faces switch to `display: optional`, allowing the browser to keep a suitable fallback instead of performing a late font swap. The result favors predictable first paint and avoids transferring typography assets that a route or locale does not need, at the cost of accepting platform-font rendering when a custom face misses the browser's short optional-loading window.

## perf(navigation): 유휴 route prefetch 비활성화
Disable Next.js automatic prefetching across the portfolio's internal navigation surfaces, including shell links, design switching, project cards, calls to action, and route-specific renderers. With many routes and five independently bundled presentations, viewport and hover prefetch could request route payloads and chunks that the visitor never opens.

Applying `prefetch={false}` consistently makes user navigation the boundary for route loading and prevents idle browsing from multiplying network, parsing, and cache work. The trade-off is that a first click may no longer benefit from speculative route data, but the site avoids paying that cost for every visible link.

## test(perf): 유휴 route 요청과 글꼴 경계 검증
Add browser-level performance assertions for the home and project-detail routes across every design. The test records requests during an idle period after first paint and fails if any React Server Component request is issued before user interaction, turning the no-prefetch policy into observable network behavior rather than a source-code convention.

The same matrix discovers the emitted Geist Mono `@font-face` URLs, checks that none are preloaded, and verifies that designs not using the face do not download it. Inspecting actual stylesheets, preload links, computed font users, and network resource types protects the intended loading boundary even if bundling changes asset filenames.

## test(perf): 사용자 상호작용 지연 측정 추가
Introduce a Playwright performance harness based on Chromium's Event Timing API for the interactions that remain client-sensitive. It installs a `PerformanceObserver`, delimits each sample, requires exactly one browser-trusted click, groups entries by `interactionId`, and waits through the next paint before reading the result. Events below the observer's 16 ms reporting threshold are treated as bounded by that threshold rather than falsely reported as zero.

For every design, the suite warms up and samples design-switcher closing three times; mobile projects also sample opening the native menu. Both the median and maximum upper bounds must remain at or below 200 ms, while state and focus assertions confirm that a fast measurement still produced the correct UI outcome. Logging every sample makes regressions diagnosable without replacing the pass/fail budget with an unstable single timing.

## fix(perf): webpack route manifest parser 보강
Introduce a dedicated parser for Next.js client-reference manifest files instead of treating the generated JavaScript wrapper as plain JSON or evaluating it. The parser locates the `globalThis.__RSC_MANIFEST[...]` assignment across line breaks, slices only the serialized value, requires the expected terminating semicolon, and then delegates validation to `JSON.parse`.

Malformed or changed output now fails with the manifest filename instead of producing a misleading bundle measurement. A matching declaration file records the optional JavaScript and CSS entry maps consumed by the route-budget tooling, including the CSS inlining flag that determines whether an asset contributes a separate transfer.

## test(build): compiler와 manifest parser 계약 검증
Lock the production measurement pipeline to the build output it understands. The test asserts that the project continues to invoke Next.js with the webpack compiler, preventing an unnoticed compiler switch from changing manifest formats underneath the bundle-budget tooling.

Representative compact manifests verify both an ordinary page key and a dynamic route containing square brackets. These cases exercise the parser against the generated wrapper syntax rather than a simplified JSON fixture, protecting the route-key matching rule that bundle accounting depends on.

## fix(deps): Next.js runtime 보안 패치 적용
Advance the pinned Next.js runtime and its matching ESLint configuration from 16.2.4 to 16.2.11, and refresh the lockfile so the framework's environment package, lint plugin, and platform-specific SWC binaries resolve from the same patch line. Keeping these packages aligned avoids mixing framework tooling and compiler artifacts from different releases.

The change is deliberately a patch-level framework update: application APIs and architecture remain unchanged while the deployed runtime receives the repository's selected security maintenance release. The lockfile also records explicit GNU-versus-musl constraints for Linux compiler binaries, preserving correct native-package selection in both local and container environments.

## build(perf): route별 client asset 측정 추가
Add production-build measurement that reports the client JavaScript and non-inlined CSS attributable to each application route. The collector derives public routes from `app-paths-manifest.json`, skips framework internals, maps each page output to its client-reference manifest, and combines route-specific JavaScript with the root shared chunks.

Asset paths are deduplicated before reading their actual uncompressed file sizes, preventing the same shared chunk from being counted twice within one route. CSS entries marked as inlined are excluded because they do not create a separate client asset. This makes the build output—not source-file size or a bundler estimate—the authoritative representation for later route budgets.

## build(perf): route bundle 성장 예산 평가 추가
Define route bundle growth as a comparison against committed per-route JavaScript and CSS baselines, with a fixed five-percent allowance. The evaluator reports a structured violation when an expected route disappears, either asset class exceeds its rounded byte limit, or a newly emitted route has no baseline.

Treating route coverage and asset growth as separate failure categories prevents a green result caused by silently dropping or adding pages. The structured records retain baseline, allowed, and actual byte counts for actionable diagnostics, while the shared literal and declaration types keep the five-percent policy consistent for script consumers.

## build(perf): bundle budget CLI 연결
Expose the route measurement and budget evaluator as two explicit package commands. `bundle:baseline` serializes the current production measurements with a schema version, source description, and fixed five-percent policy; `bundle:check` reads that committed file, verifies the policy value, and exits unsuccessfully after printing every violation.

Separating baseline creation from routine checking prevents normal validation from silently accepting new numbers. The script also guards its command-line entry point so measurement and evaluation functions remain importable by tests without executing filesystem or process side effects.

## chore(perf): route bundle 기준값 기록
Commit the first route-bundle baseline generated from the webpack production output. The file records all eight public route patterns, their uncompressed client JavaScript and CSS byte counts, the schema version, and the five-percent growth policy consumed by `bundle:check`.

Although the byte values are generated measurements, the committed snapshot is operational configuration: it defines the accepted reference state and route coverage against which later builds fail. Updating it therefore requires an explicit reviewable commit rather than occurring as a side effect of ordinary checks.

## build(perf): desktop Lighthouse 실행 경계 추가
Add a reproducible desktop Lighthouse CI matrix for the home page and one enabled project detail page in all five designs. The configuration derives the project identifier from content, starts the production server on a dedicated port, performs three headless runs per URL, and evaluates medians to reduce sensitivity to a single noisy audit.

Release thresholds require at least 0.90 performance and 0.95 accessibility scores, with concrete limits of 2.5 seconds for Largest Contentful Paint, 200 ms for Total Blocking Time, and 0.1 for Cumulative Layout Shift. The package command and ignored Lighthouse workspace make this a repeatable validation boundary without committing transient audit artifacts.

## build(perf): Lighthouse 결과 요약기 추가
Add a deterministic summarizer for the raw Lighthouse CI reports. It extracts the five release metrics from each LHR, groups runs by the final audited URL, sorts routes for stable output, and records both every run and the median values used by the gate.

The resulting baseline also captures the audit targets and material execution context—Chrome user agent, Node version, platform, architecture, CPU, logical core count, and memory—so performance numbers are not detached from the environment that produced them. Failing when no reports exist prevents an empty or stale summary from masquerading as a successful measurement.

## test(perf): 배포 성능 gate 규칙 검증
Consolidate the build-manifest checks into a broader performance-gate contract. The tests now inspect the actual Lighthouse configuration to require a production server, desktop preset, three runs, and both home and project-detail coverage for every design, then assert the exact performance, accessibility, LCP, CLS, and TBT thresholds.

Route-budget tests preserve the generated-manifest parser cases and exercise the policy boundary itself: exactly five-percent CSS and JavaScript growth is accepted, the first byte beyond either limit identifies the offending route and asset class, and missing baseline routes fail closed. This prevents configuration edits or evaluator regressions from weakening the deployment gate without a failing unit test.

## fix(build): Tailwind utility CSS 변환 복원
Restore Tailwind's build-time CSS transformation by registering `@tailwindcss/postcss` in an explicit PostCSS configuration. Having the dependency installed is not sufficient on its own; Next.js must invoke the plugin so Tailwind imports and utility usage are expanded into the production stylesheet.

Keeping this integration in the conventional root configuration makes the same transform apply to local development, production builds, Lighthouse audits, and bundle measurements. Without it, the source CSS can compile without the utility layer the React markup depends on, producing a structurally valid but visually broken artifact.

## test(visual): 다섯 디자인 회귀 기준 추가
Establish visual regression coverage for all five designs with a deterministic snapshot layout shared by the development and production Playwright configurations. Home pages are captured on desktop and mobile, while project details receive desktop references; a manifest test requires exactly those fifteen baselines so adding or losing a design snapshot cannot happen silently.

Before each capture, the test enables reduced motion, waits for network idle, and then waits for document fonts and every image to settle. Full-page comparisons disable animations and permit at most a one-percent pixel difference. These controls make snapshot readiness explicit instead of depending on arbitrary delays, while the committed images remain generated evidence rather than the source of the testing policy.

## ci: 검증된 bundle과 Lighthouse gate 활성화
Promote the production bundle and Lighthouse checks from local tooling into the CI release path. The workflow now builds once through a CI-specific production E2E command, verifies the standalone output, checks every route against its committed JS/CSS budget, and runs Lighthouse against the production server with Playwright's installed Chromium exposed as the browser binary.

Visual snapshot cases remain available in the full production suite but are excluded from the general CI E2E command, leaving their committed baselines as a separate regression contract. The required deployment artifact, route-size limits, and laboratory performance thresholds therefore fail the automated build instead of remaining advisory checks.

## build(docker): public 자산을 포함한 비루트 standalone image 추가
Add a multi-stage container build around the verified Next.js standalone artifact. Dependencies are installed with the repository's pinned Node and npm versions, content mode and public origin are supplied at build time, and the builder must pass both the production build and standalone-output verification before a runtime image can be produced.

The final image runs as the unprivileged `node` user and contains only the standalone server, generated static assets, and the repository's `public` directory. Copying `public` explicitly is required because it is not embedded in the standalone server bundle. The accompanying ignore rules keep source-control data, local dependencies, test output, logs, and environment files out of the Docker build context.

## test(docker): runtime route와 public 자산 검증 자동화
Add an end-to-end container contract that builds the image, starts it on an isolated ephemeral port, waits for readiness, and verifies that the configured runtime user is `node`. The check then requests the home page and a project-detail route, requiring successful non-empty HTML responses from the packaged standalone server.

Public asset coverage is derived recursively from the authoritative content JSON rather than maintained as a duplicate list. Every referenced content or template asset must be served with a non-empty body and the MIME type implied by its extension. Unique image and container names avoid concurrent-run collisions, failure logs remain available for diagnosis, and `finally` cleanup removes both resources. Running this contract in CI verifies the deployable image itself, including the public-assets copy and non-root runtime boundary.

## refactor(style): 공용 interaction 규칙 순서 정리
Move the shared reveal, motion-card, project-card, and screenshot interaction rules next to the common base styles without changing their declarations. This is an organizational refactor: reusable interaction behavior is grouped before the design-specific animation sections, making the stylesheet's ownership boundaries easier to follow while preserving the existing visual effects.

## refactor(projects): 사용하지 않는 그룹 helper 제거
Remove the obsolete project-grouping helper and its exported tuple type after route view models became responsible for preparing grouped project data. Keeping the unused utility would preserve a second, unreferenced implementation of category ordering and blur the new derivation boundary; deleting it leaves the centralized projection path as the single source of that behavior.

## style(code): 정적 설정과 export 형식 정리
Normalize static configuration and module formatting without changing runtime behavior. The ESLint ignore list now explicitly records that it replaces the defaults inherited from `eslint-config-next`, the public portfolio exports are consistently ordered, and a long selector signature is wrapped to the repository's formatting convention.

## test(docs): 엔지니어링 문서 계약 검증
Add an executable documentation contract while removing the standalone `devlog` document set. The Vitest suite recursively discovers the remaining project Markdown, requires the principal guides to retain titles and specific architecture, content-mode, verification-command, and evidence-boundary statements, and prevents empty template claims from reappearing in the case study.

Local links are checked independently of prose assertions. The validator strips fenced code, resolves relative targets, decodes paths and fragments, and approximates GitHub's heading-anchor generation, including duplicate-heading suffixes, so missing files and stale section links become test failures. In the resulting tree, documents still contain links to the removed `devlog` paths; the new fail-closed link check therefore exposes a documentation mismatch that must be reconciled rather than treating the presence of the test as proof that the documentation currently passes.

