# Portfolio Development Thread Workbook — Categorized Expansion

## 판단

기존 7개 문서의 56개 commit entry는 잘못된 결과라기보다 project-wide invariant와 횡단 아키텍처를 선택한 압축형 학습 세트입니다. 다만 branch의 476개 raw commit 전체를 기준으로 웹 개발의 구성 영역을 폭넓게 학습하려는 목적에는 부족합니다.

이 archive는 기존 세트를 수정하지 않고 한 category 아래에 보존하며, 웹 개발 영역과 product delivery 영역을 별도 category/scaffold로 확장합니다.

## 구조

번호는 실제 개발의 주된 선행 관계와 진행 시점을 기준으로 재배치합니다. 기존 완성 7-thread 세트는 여러 개발 시기를 횡단하는 종합 복원 세트이므로 마지막 category에 둡니다. 새로 설계한 scaffold에서는 category 내부 문서 번호도 가능한 한 해당 thread의 실제 형성 순서에 맞췄습니다. 원본 7-thread 세트의 내부 순서는 source-defined이므로 변경하지 않습니다.

```text
portfolio-devthread-workbook/
├── 01-application-foundation-and-content-systems/
│   └── scaffold/
├── 02-routing-navigation-and-page-lifecycle/
│   └── scaffold/
├── 03-shared-ui-interaction-and-responsive-primitives/
│   └── scaffold/
├── 04-route-features-and-evidence-experiences/
│   └── scaffold/
├── 05-full-site-visual-systems/
│   └── scaffold/
├── 06-seo-security-and-machine-readable-output/
│   └── scaffold/
├── 07-testing-performance-and-regression-strategy/
│   └── scaffold/
├── 08-product-delivery-and-runtime-verification/
│   └── scaffold/
└── 09-cross-cutting-architecture-and-quality-contracts/
    ├── scaffold/
    └── completed/
```

## Category map

### `01-application-foundation-and-content-systems`

**Application foundation and content systems**

실행 가능한 Next.js 애플리케이션의 시작점부터 domain content, presentation contract, loader, selector, runtime schema vocabulary와 starter catalog migration까지 다룹니다.

### `02-routing-navigation-and-page-lifecycle`

**Routing, navigation, and page lifecycle**

App Router query state, internal URL construction, shared shell navigation, dynamic routes, page enablement, not-found behavior와 공용 page context를 다룹니다.

### `03-shared-ui-interaction-and-responsive-primitives`

**Shared UI, interaction, and responsive primitives**

공용 link/media/reveal/terminal/stack/project-card/journey primitive와 responsive disclosure를 기능·상태·접근성 관점에서 다룹니다.

### `04-route-features-and-evidence-experiences`

**Route features and evidence experiences**

Home, project index/detail, About, Resume, Contact, Journey와 Interview Map의 기능 개발을 화면별로 복원합니다.

### `05-full-site-visual-systems`

**Full-site visual systems**

Design, Classic, Editorial, Brutalist와 Cinematic의 시각 언어, complete route composition, responsive rules와 renderer module boundary를 다룹니다.

### `06-seo-security-and-machine-readable-output`

**SEO, security, and machine-readable output**

Canonical metadata, indexing, robots/sitemap, safe JSON-LD와 URL/link reference security를 다룹니다.

### `07-testing-performance-and-regression-strategy`

**Testing, performance, and regression strategy**

Unit/content contracts, route characterization, component interaction, browser matrices, visual regression와 client-performance optimization을 다룹니다. CI·Docker·standalone delivery는 다음 category에서 별도로 다룹니다.

### `08-product-delivery-and-runtime-verification`

**Product delivery and runtime verification**

Pinned toolchain, production-server E2E, self-contained build, standalone artifact, release performance gate와 non-root Docker runtime을 실제 전달 경로로 복원합니다. 외부 hosting/provider 운영은 branch evidence가 없어 포함하지 않습니다.

### `09-cross-cutting-architecture-and-quality-contracts`

**Cross-cutting architecture and quality contracts**

기존 source-defined 7개 thread입니다. 여러 개발 시기의 architecture/invariant를 종합적으로 다시 추적하는 세트이므로 기능·테스트·delivery category 뒤에 배치하며 scaffold와 completed를 함께 보존합니다.

## Source와 계획의 구분

- 기존 category의 7개 thread 구조와 fixed scaffold metadata는 source-defined입니다.
- 추가 category/thread grouping은 이번 확장 작업에서 계획한 분류입니다.
- 새 scaffold의 commit SHA, subject, importance, tags는 source classification에서 가져왔습니다.
- 새 scaffold는 완료본이 아니며 learner-facing evidence 영역을 비워 두었습니다.

## Product delivery 범위의 끝

- 포함: pinned runtime/package manager, production-server verification, CI quality gate, self-contained build, standalone artifact, bundle/Lighthouse release gate, Docker image와 container runtime verification
- 제외: 실제 cloud/hosting provider provisioning, DNS/TLS/CDN 설정, secret 배포, rollout/rollback 운영, observability/incident operation

제외 항목은 `web/portfolio` branch에 구현 history가 없으므로 가상의 thread를 만들지 않습니다.
