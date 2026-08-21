# Thread: Production origin and publication URL safety

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> Category: `06-seo-security-and-machine-readable-output`
>
> Phase 1 audit에서 확정한 구조입니다. Phase 2는 이 문서의 fixed fields와 commit sequence를 변경하지 않습니다.

## 0. 분류 출처와 역사 범위

- Repository/branch scope는 `seungwoo7050/42-archive`의 `web/portfolio`로 한정합니다.
- `commit/commit-importance.md` on `web/portfolio` describes the branch as one independent, linear 476-commit history from `cce7dd020563` through `aff0acdd4cf9`. Every SHA below was matched to that branch-local classification and its exact commit object/diff.
- Subject, importance, tags는 branch-local source classification과 일치시켰습니다.
- 아래 role, investigation target, invariant는 Phase 1 category audit에서 repository evidence에 맞춰 동결했습니다.
- 다른 branch 또는 final HEAD를 과거 SHA 설명에 사용하지 않습니다.

## 1. Thread 목표

Permissive template content와 실제 공개 가능한 production content를 분리하고, public origin, placeholder removal, assets, project exits, contact method가 모두 충족된 경우에만 verified production result를 반환하는 fail-closed publication boundary를 복원합니다.

### Phase 1 boundary decision

기존 draft는 `428055be3e64`의 predicates만 link-security Thread 끝에 두어 실제 owner와 lifecycle을 잃었습니다. Phase 1에서는 mode/error model부터 prebuild integration과 regression test까지 독립 Thread로 분리하고, 중간 B-level placeholder scanner와 S-level aggregate validator를 복원했습니다.

### Frozen critical invariants

- Missing/empty/`template` mode는 template이며 exact `production`만 strict publication을 요청합니다.
- Production `SITE_URL`은 absolute public HTTP(S)이고 local/reserved/credential-bearing origin이 아닙니다.
- Production result는 all-source placeholder scan, required `/content/` assets, enabled project public exit, usable contact가 모두 성공한 뒤에만 verified `URL`을 포함합니다.
- Readiness failure는 first-error가 아니라 file/path/message issue list로 누적됩니다.
- Normal `npm run build`는 schema check 뒤 readiness check를 반드시 실행합니다.

### Major engineering difficulties

- Starter template를 local preview에서는 허용하되 production publication에서는 fail closed로 바꾸는 문제
- URL syntax, public host policy, asset namespace, project/contact domain rules를 하나의 discriminated result로 모으는 문제
- Validation library의 failure를 CLI exit status와 build lifecycle에 정확히 전달하는 문제

## 2. 핵심 질문

- Mode resolver가 허용하는 정확한 input set과 invalid value behavior는 무엇입니까?
- Placeholder scanner는 어떤 source/file map과 JSON path formatter를 사용합니까?
- `parsePublicSiteUrl`과 `isUsablePublicUrl`의 accept/reject policy는 어디가 다릅니까?
- S-level aggregate validator가 성공하기 전후 ownership과 return type은 어떻게 달라집니까?
- Prebuild gate를 우회할 수 있는 invocation과 test가 증명하지 않는 범위는 무엇입니까?

## 3. 완료 기준

- Mode → scanner → origin/link predicates → aggregate validator → domain completeness → build gate 순서를 설명했습니다.
- S-level `002b642d52a3`의 previous risk, fail-closed decision, discriminated result, remaining gaps를 깊게 기록했습니다.
- `isUsablePublicUrl`이 production `SITE_URL` validator와 동일하지 않은 구체적 non-guarantee를 확인했습니다.
- `fb3d18fd660b`의 fixture transformation과 boundary tests를 production paths에 연결했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Frozen role |
| --- | --- | --- | --- | --- | --- |
| 1 | `b3bd671a3243` | feat(content): 콘텐츠 mode와 readiness 오류 모델 추가 | A | CONTENT, VALIDATION | Define conservative mode and structured readiness protocol |
| 2 | `741bbb4caab7` | feat(content): template placeholder 탐색 경계 추가 | B | CONTENT, ROUTING | Add recursive placeholder discovery with source-aware paths |
| 3 | `47b99d6256ef` | feat(content): public origin과 자산 경계 검증 추가 | A | CONTENT, VALIDATION | Validate public production origin and `/content/` asset namespace |
| 4 | `428055be3e64` | feat(content): 공개 URL과 연락 링크 검증 추가 | A | CONTENT, VALIDATION | Define deployable project/contact URL predicates |
| 5 | `002b642d52a3` | feat(content): production readiness 기본 검사 추가 | S | ARCH, CONTENT, VALIDATION | Establish the aggregate fail-closed production trust boundary |
| 6 | `bcd87ed856bf` | feat(content): 필수 자산과 프로젝트 readiness 추가 | A | CONTENT, VALIDATION | Extend production result with portfolio-specific evidence completeness |
| 7 | `71e7ece7208f` | feat(content): 연락 수단과 build readiness 연결 | A | CONTENT, VALIDATION, DEPLOY | Complete domain readiness and expose one mode-aware entry point |
| 8 | `37c0dbc079ff` | build(content): readiness 검사를 prebuild에 연결 | A | CONTENT, VALIDATION, DEPLOY | Make readiness mandatory for the normal npm build lifecycle |
| 9 | `fb3d18fd660b` | test(content): readiness와 indexing 계약 검증 | A | CONTENT, VALIDATION, SEO | Regression-test the complete readiness result and public-origin boundary |

## 5. Commit별 학습 기록

### `b3bd671a3243` — feat(content): 콘텐츠 mode와 readiness 오류 모델 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Frozen role:** Define conservative mode and structured readiness protocol

#### 해당 SHA에서 확인할 실제 코드

- `PortfolioContentMode`, `PortfolioReadinessEnvironment`, issue/result unions를 확인합니다.
- `PortfolioReadinessError`의 message formatting과 retained `issues` ownership을 확인합니다.
- `resolvePortfolioContentMode`가 undefined/empty/template/production/other를 처리하는 branch를 표로 만듭니다.
- 실제 production checks가 아직 없다는 protocol/implementation boundary를 기록합니다.

확인 원칙:

- `b3bd671a3243^`와 `b3bd671a3243`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-b3bd671a3243 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Schema-valid content와 publishable content를 구분하는 mode, success type, aggregate readiness error가 없었습니다. Template placeholders가 production intent와 분리되지 않았습니다. |
| 실제 변경 file/symbol/call path | 새 `src/lib/content-readiness.ts`가 mode/environment/issue/result types, `PortfolioReadinessError`, `resolvePortfolioContentMode`를 정의합니다. |
| Data/state/owner | Mode resolver는 string input을 immutable union으로 바꾸고, error object가 issue array를 보존합니다. Production success branch의 result type만 `URL`을 소유하도록 discriminated union을 설계합니다. |
| Failure·absence·fallback | undefined, empty, `template`은 conservative template입니다. exact `production`만 production이고, 다른 값은 fallback하지 않고 plain `Error`를 throw합니다. |
| 보장/비보장 | Protocol과 failure representation만 보장합니다. 아직 `SITE_URL`, placeholder, asset, project, contact를 검사하거나 production result를 생성하지 않습니다. |
| 후속 연결 | `741bbb4caab7`부터 concrete issue producer가 추가되고 `002b642d52a3`에서 aggregate success/failure boundary가 생깁니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// b3bd671a3243 — src/lib/content-readiness.ts — resolvePortfolioContentMode
if (value === undefined || value === "" || value === "template") {
  return "template";
}
if (value === "production") {
  return "production";
}
throw new Error(
  `PORTFOLIO_CONTENT_MODE must be "template" or "production"; received ${JSON.stringify(value)}.`,
);
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`741bbb4caab7`부터 concrete issue producer가 추가되고 `002b642d52a3`에서 aggregate success/failure boundary가 생깁니다.
<!-- learner:end commit-b3bd671a3243 -->


### `741bbb4caab7` — feat(content): template placeholder 탐색 경계 추가

- **Importance:** B
- **Tags:** CONTENT, ROUTING
- **Frozen role:** Add recursive placeholder discovery with source-aware paths

#### 해당 SHA에서 확인할 실제 코드

- `contentFiles`가 every `PortfolioSource` key를 exact source filename에 매핑하는지 확인합니다.
- `placeholderMarkers`의 regex와 false-positive/false-negative 가능성을 기록합니다.
- `appendPath`가 identifier key, quoted key, array index를 어떻게 표현하는지 확인합니다.
- `collectPlaceholderIssues`의 string/array/object recursion과 non-object terminal behavior를 추적합니다.

확인 원칙:

- `741bbb4caab7^`와 `741bbb4caab7`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-741bbb4caab7 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Mode와 error types는 있었지만 어떤 source를 검사하고 placeholder 위치를 어떻게 보고할지 구현되지 않았습니다. |
| 실제 변경 file/symbol/call path | `contentFiles`, `placeholderMarkers`, `appendPath`, `findPlaceholderMarker`, `collectPlaceholderIssues`가 `src/lib/content-readiness.ts`에 추가됩니다. |
| Data/state/owner | Scanner는 source object를 변경하지 않고 caller-owned issue array에 file/path/message를 append합니다. Path는 `$`에서 시작해 array index와 property를 재귀적으로 확장합니다. |
| Failure·absence·fallback | String에서 첫 matching marker를 issue로 기록하고 return합니다. array/object는 재귀 순회하며 null/number/boolean은 무시합니다. |
| 보장/비보장 | Declared marker vocabulary 탐지는 보장하지만 arbitrary placeholder 의미, cyclic object 방어, 실제 production gate 호출은 보장하지 않습니다. B-level supporting mechanism입니다. |
| 후속 연결 | `002b642d52a3`가 모든 `contentFiles`에 scanner를 호출해 aggregate production failure에 포함합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 741bbb4caab7 — src/lib/content-readiness.ts — collectPlaceholderIssues
if (typeof value === "string") {
  const marker = findPlaceholderMarker(value);
  if (marker) {
    issues.push({
      file,
      path,
      message: `Replace the template marker "${marker.label}" with production content.`,
    });
  }
  return;
}
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`002b642d52a3`가 모든 `contentFiles`에 scanner를 호출해 aggregate production failure에 포함합니다.
<!-- learner:end commit-741bbb4caab7 -->


### `47b99d6256ef` — feat(content): public origin과 자산 경계 검증 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Frozen role:** Validate public production origin and `/content/` asset namespace

#### 해당 SHA에서 확인할 실제 코드

- `isReservedHostname`의 exact domain/suffix set을 확인합니다.
- `parsePublicSiteUrl`의 missing, parse error, protocol, local, reserved, credentials branches를 확인합니다.
- `resolveProductionSiteUrl`이 issue array를 `PortfolioReadinessError`로 바꾸는 path를 확인합니다.
- URL path/query/hash를 명시적으로 거부하거나 normalize하는지 확인해 non-guarantee에 기록합니다.

확인 원칙:

- `47b99d6256ef^`와 `47b99d6256ef`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-47b99d6256ef -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Placeholder scanning만으로는 canonical/robots/sitemap이 신뢰할 public origin을 얻을 수 없고 template asset namespace가 그대로 publish될 수 있었습니다. |
| 실제 변경 file/symbol/call path | `addProductionAssetIssue`, `isReservedHostname`, `parsePublicSiteUrl`, `resolveProductionSiteUrl`가 추가됩니다. URL parser는 missing/malformed/unsafe를 structured issue로 바꿉니다. |
| Data/state/owner | Parsed `URL`은 success value이고 issue array는 caller가 소유합니다. Asset check는 `/content/` prefix policy만 적용합니다. |
| Failure·absence·fallback | Missing, non-URL, non-http(s), localhost/loopback/`.localhost`, reserved example/test/invalid host, username/password를 거부합니다. `resolveProductionSiteUrl`은 any issue에서 aggregate error를 throw합니다. |
| 보장/비보장 | Public host/protocol/credential boundary는 보장하지만 URL path/query/hash를 root origin으로 강제하지는 않습니다. Caller가 `.origin`을 사용할 때만 path가 제거됩니다. |
| 후속 연결 | `002b642d52a3`가 parsed site URL을 aggregate result에 포함하고, later metadata/robots/sitemap consumers가 이 resolver를 직접 사용합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`002b642d52a3`가 parsed site URL을 aggregate result에 포함하고, later metadata/robots/sitemap consumers가 이 resolver를 직접 사용합니다.
<!-- learner:end commit-47b99d6256ef -->


### `428055be3e64` — feat(content): 공개 URL과 연락 링크 검증 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Frozen role:** Define deployable project/contact URL predicates

#### 해당 SHA에서 확인할 실제 코드

- `isUsablePublicUrl`의 placeholder, URL parse, protocol, reserved-host conditions를 확인합니다.
- `isUsableContactHref`가 `mailto:`/`tel:`과 public URL을 어떻게 합성하는지 확인합니다.
- `parsePublicSiteUrl`과 달리 local host/credentials를 재검사하는지 비교합니다.
- 이 commit 시점에 predicates의 production caller가 있는지 확인합니다.

확인 원칙:

- `428055be3e64^`와 `428055be3e64`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-428055be3e64 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Production origin은 검증됐지만 project exit와 contact href가 실제 deployable destination인지 재사용 가능한 방식으로 판정할 helper가 없었습니다. |
| 실제 변경 file/symbol/call path | `src/lib/content-readiness.ts`에 `isUsablePublicUrl`과 `isUsableContactHref`가 추가됩니다. Placeholder marker를 먼저 거부하고 URL protocol/hostname 또는 contact scheme을 판정합니다. |
| Data/state/owner | Predicate는 boolean만 반환하고 issue를 직접 만들지 않습니다. Domain-specific validator가 boolean을 소비해 source path가 있는 issue로 변환할 책임을 가집니다. |
| Failure·absence·fallback | Malformed URL, non-http(s), reserved host는 false입니다. Contact는 placeholder가 아니면 `mailto:`/`tel:`을 즉시 true로 처리하거나 public URL predicate에 위임합니다. |
| 보장/비보장 | `isUsablePublicUrl`은 `parsePublicSiteUrl`과 동일하지 않습니다. 이 diff에서는 localhost와 credentials를 명시적으로 거부하지 않으며, `mailto:`/`tel:` payload syntax도 검증하지 않습니다. 이 점은 later tests에서도 직접 보호되지 않습니다. |
| 후속 연결 | `bcd87ed856bf`가 project links에, `71e7ece7208f`가 contact selection에 predicates를 소비합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 428055be3e64 — src/lib/content-readiness.ts
export function isUsableContactHref(href: string) {
  if (findPlaceholderMarker(href)) return false;
  return href.startsWith("mailto:") || href.startsWith("tel:") || isUsablePublicUrl(href);
}
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`bcd87ed856bf`가 project links에, `71e7ece7208f`가 contact selection에 predicates를 소비합니다.
<!-- learner:end commit-428055be3e64 -->


### `002b642d52a3` — feat(content): production readiness 기본 검사 추가

- **Importance:** S
- **Tags:** ARCH, CONTENT, VALIDATION
- **Frozen role:** Establish the aggregate fail-closed production trust boundary

#### 해당 SHA에서 확인할 실제 코드

- `ProductionReadinessResult`가 union에서 production branch만 추출하는 방식을 확인합니다.
- `validateProductionReadiness`의 issue initialization → origin parse → all-source scan → single failure boundary → success return 순서를 추적합니다.
- Previous helpers가 isolated utilities에서 one authoritative publication result로 바뀌는 ownership transition을 기록합니다.
- 이 SHA에서 아직 asset/project/contact completeness가 없는 gap을 명시합니다.

확인 원칙:

- `002b642d52a3^`와 `002b642d52a3`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-002b642d52a3 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Mode, scanner, origin/link helpers는 각각 존재했지만 caller가 임의로 일부만 사용할 수 있었습니다. `production`이라는 상태가 complete verification 없이 선언될 위험이 남아 있었습니다. |
| 실제 변경 file/symbol/call path | `validateProductionReadiness(content, {SITE_URL})`가 one issue array를 만들고 `parsePublicSiteUrl`과 every `contentFiles` entry의 `collectPlaceholderIssues`를 실행한 뒤, any failure에서 `PortfolioReadinessError`를 throw하고 성공 시 `{mode: "production", siteUrl}`을 반환합니다. |
| Data/state/owner | 이 commit부터 verified `URL`의 ownership은 discriminated success result에 있습니다. Caller는 validation을 통과하지 않고 production result를 구성할 수 없으며 source content는 mutation되지 않습니다. |
| Failure·absence·fallback | Invalid/missing origin과 모든 placeholder issue가 한 목록에 공존하므로 앞선 실패가 뒤의 source 문제를 가리지 않습니다. `!siteUrl \|\| issues.length > 0`가 단일 fail-closed branch입니다. |
| 보장/비보장 | S-level invariant는 ‘production result exists only after origin and all-source placeholder verification’입니다. 그러나 required asset presence, `/content/` placement, enabled project public exit, usable contact, mode-aware template bypass, build integration은 아직 없습니다. |
| 후속 연결 | `bcd87ed856bf`와 `71e7ece7208f`가 domain completeness를 확장하고, `37c0dbc079ff`가 normal build lifecycle에 강제하며, `fb3d18fd660b`가 aggregate categories를 검증합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 002b642d52a3 — src/lib/content-readiness.ts
const issues: PortfolioReadinessIssue[] = [];
const siteUrl = parsePublicSiteUrl(environment.SITE_URL, issues);
for (const [key, file] of contentFiles) collectPlaceholderIssues(content[key], file, "$", issues);
if (!siteUrl || issues.length > 0) throw new PortfolioReadinessError(issues);
return { mode: "production", siteUrl };
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`bcd87ed856bf`와 `71e7ece7208f`가 domain completeness를 확장하고, `37c0dbc079ff`가 normal build lifecycle에 강제하며, `fb3d18fd660b`가 aggregate categories를 검증합니다.
<!-- learner:end commit-002b642d52a3 -->


### `bcd87ed856bf` — feat(content): 필수 자산과 프로젝트 readiness 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Frozen role:** Extend production result with portfolio-specific evidence completeness

#### 해당 SHA에서 확인할 실제 코드

- site social image, profile photo, resume download의 presence와 `/content/` checks를 확인합니다.
- enabled projects filtering과 zero-project failure를 확인합니다.
- 각 enabled project의 screenshot collection과 `isUsablePublicUrl` link requirement를 추적합니다.
- disabled project가 왜 skip되는지 publication surface와 연결합니다.

확인 원칙:

- `bcd87ed856bf^`와 `bcd87ed856bf`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-bcd87ed856bf -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Generic marker-free content와 public origin만으로 production success가 가능해, 실제 이미지·resume·project exit가 없는 빈 publication도 통과할 수 있었습니다. |
| 실제 변경 file/symbol/call path | `validateProductionReadiness`가 site social image, profile photo, resume URL, enabled project count, project screenshots, enabled public project URL을 검사합니다. |
| Data/state/owner | Domain completeness는 aggregate validator가 소유하고, each failure는 original source file/index path를 사용합니다. Enabled=false project는 publication 대상에서 제외합니다. |
| Failure·absence·fallback | Missing asset은 explicit issue, 잘못된 namespace는 `addProductionAssetIssue`, no enabled project/public exit는 project-specific issue가 됩니다. 검사는 계속 진행되어 여러 category를 함께 보고합니다. |
| 보장/비보장 | Published project마다 repository-owned visual evidence와 최소 하나의 public exit를 요구합니다. Contact method는 아직 요구하지 않고, public-link predicate의 localhost/credential non-guarantee는 그대로입니다. |
| 후속 연결 | `71e7ece7208f`가 contact requirement와 mode-aware entry point를 완성합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// bcd87ed856bf — src/lib/content-readiness.ts — enabled project exit
if (
  !project.links.some(
    (link) => link.enabled !== false && isUsablePublicUrl(link.href),
  )
) {
  issues.push({
    file: "src/content/projects.json",
    path: `$.items[${projectIndex}].links`,
    message: "Add at least one enabled public project URL for production.",
  });
}
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`71e7ece7208f`가 contact requirement와 mode-aware entry point를 완성합니다.
<!-- learner:end commit-bcd87ed856bf -->


### `71e7ece7208f` — feat(content): 연락 수단과 build readiness 연결

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, DEPLOY
- **Frozen role:** Complete domain readiness and expose one mode-aware entry point

#### 해당 SHA에서 확인할 실제 코드

- `hasContactMethod`의 enabled, placement, type, href predicate conditions를 확인합니다.
- No usable contact issue의 source/path를 확인합니다.
- `validateBuildReadiness`의 template early return과 production delegation을 확인합니다.
- Helper exports가 private로 축소되는 ownership cleanup을 확인합니다.

확인 원칙:

- `71e7ece7208f^`와 `71e7ece7208f`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-71e7ece7208f -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Production content가 project evidence는 갖춰도 방문자가 연락할 실제 경로가 없을 수 있었고, callers는 mode resolution과 strict validator를 직접 조합해야 했습니다. |
| 실제 변경 file/symbol/call path | `validateProductionReadiness`가 contact placement에 포함된 enabled email/github/website link 중 usable href가 하나 이상인지 검사합니다. `validateBuildReadiness`가 mode를 resolve하고 template은 즉시 success, production은 strict validator에 위임합니다. |
| Data/state/owner | Mode branching의 owner가 one public function으로 이동합니다. Internal helpers와 constant exports는 private로 좁혀져 외부 caller가 partial policy를 조합하기 어려워집니다. |
| Failure·absence·fallback | Usable contact가 없으면 `src/content/links.json:$` issue를 추가합니다. Template mode는 placeholder/publication checks를 의도적으로 skip하고 `{mode, siteUrl: undefined}`를 반환합니다. |
| 보장/비보장 | Mode-aware library entry point와 최소 contact requirement를 보장합니다. Build process가 이 function을 호출하는지는 아직 보장하지 않습니다. |
| 후속 연결 | `37c0dbc079ff`가 CLI와 `prebuild`에 연결합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 71e7ece7208f — src/lib/content-readiness.ts
export function validateBuildReadiness(content, environment) {
  const mode = resolvePortfolioContentMode(environment.PORTFOLIO_CONTENT_MODE);
  if (mode === "template") return { mode, siteUrl: undefined };
  return validateProductionReadiness(content, environment);
}
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`37c0dbc079ff`가 CLI와 `prebuild`에 연결합니다.
<!-- learner:end commit-71e7ece7208f -->


### `37c0dbc079ff` — build(content): readiness 검사를 prebuild에 연결

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, DEPLOY
- **Frozen role:** Make readiness mandatory for the normal npm build lifecycle

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `prebuild`, `content:check`, `content:ready` scripts와 shell short-circuit order를 확인합니다.
- `scripts/validate-content-readiness.ts`의 source load, env read, result logging을 확인합니다.
- Known readiness error는 `process.exitCode = 1`, unexpected error는 rethrow되는 branch를 확인합니다.
- `npm run build`와 direct `next build`의 lifecycle 차이를 non-guarantee로 기록합니다.

확인 원칙:

- `37c0dbc079ff^`와 `37c0dbc079ff`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-37c0dbc079ff -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Correct library function은 존재했지만 build가 호출하지 않으면 incomplete production content가 artifact로 만들어질 수 있었습니다. |
| 실제 변경 file/symbol/call path | `prebuild`가 `npm run content:check && npm run content:ready`로 바뀌고 새 script가 loader와 `validateBuildReadiness`를 호출합니다. |
| Data/state/owner | Library error가 process exit status로 전파됩니다. Template/production success는 log만 만들고 source를 변경하지 않습니다. |
| Failure·absence·fallback | Known aggregate readiness error는 formatted message를 stderr에 쓰고 exit code 1을 설정합니다. Unexpected error는 숨기지 않고 throw합니다. 첫 `content:check` 실패 시 shell `&&`로 readiness는 실행되지 않습니다. |
| 보장/비보장 | Normal `npm run build` lifecycle에는 mandatory gate가 생깁니다. Direct `next build` 또는 script bypass까지 기술적으로 차단하지는 않습니다. |
| 후속 연결 | `fb3d18fd660b`가 library-level behavior를 검증하지만 이 CLI/prebuild process 자체를 spawn해 검증하지는 않습니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 37c0dbc079ff — package.json
"prebuild": "npm run content:check && npm run content:ready",
"content:ready": "node --import tsx scripts/validate-content-readiness.ts"
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`fb3d18fd660b`가 library-level behavior를 검증하지만 이 CLI/prebuild process 자체를 spawn해 검증하지는 않습니다.
<!-- learner:end commit-37c0dbc079ff -->


### `fb3d18fd660b` — test(content): readiness와 indexing 계약 검증

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, SEO
- **Frozen role:** Regression-test the complete readiness result and public-origin boundary

#### 해당 SHA에서 확인할 실제 코드

- `replaceTemplateMarkers`와 `createProductionReadyContent`의 deterministic fixture construction을 확인합니다.
- Mode default/invalid, template bypass, aggregate categories, success result, invalid SITE_URL tests를 분류합니다.
- Assertions가 exact issue order보다 category/path presence를 검사하는 이유와 한계를 기록합니다.
- 같은 commit의 `site-metadata.test.ts`는 indexing Thread에서 별도 관점으로 확인합니다.

확인 원칙:

- `fb3d18fd660b^`와 `fb3d18fd660b`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-fb3d18fd660b -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Readiness chain과 build gate는 있었지만 mode default, aggregate reporting, valid production result, origin rejection을 deterministic하게 잠그는 unit regression이 없었습니다. |
| 실제 변경 file/symbol/call path | `src/lib/content-readiness.test.ts`가 checked-in source를 clone하고 marker를 production-like values로 치환한 뒤 required assets/project link를 채웁니다. Tests는 public `validateBuildReadiness`와 `validateProductionReadiness`를 호출합니다. |
| Data/state/owner | Fixture helper가 mutable clone을 소유하고 imported source는 보존합니다. Failure는 `captureReadinessError`가 typed error와 issue list로 관찰합니다. |
| Failure·absence·fallback | Unsupported mode, template permissiveness, all-category aggregate failure, complete success, malformed/ftp/localhost/example origin rejection을 고정합니다. |
| 보장/비보장 | Boundary/unit regression evidence이며 CLI prebuild execution, actual filesystem asset existence, credential-bearing URL, local project/contact href, browser indexing을 증명하지 않습니다. |
| 후속 연결 | Indexing Thread에서는 같은 commit의 `site-metadata.test.ts`가 template noindex/robots와 production origin behavior를 검증합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// fb3d18fd660b — src/lib/content-readiness.test.ts
for (const siteUrl of ["not-a-url", "ftp://portfolio.example.dev", "http://localhost:3100", "https://example.com"]) {
  const error = captureReadinessError(() => validateProductionReadiness(createProductionReadyContent(), { SITE_URL: siteUrl }));
  expect(error.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: "SITE_URL" })]));
}
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

Indexing Thread에서는 같은 commit의 `site-metadata.test.ts`가 template noindex/robots와 production origin behavior를 검증합니다.
<!-- learner:end commit-fb3d18fd660b -->


## 6. Invariant evolution

<!-- learner:start thread-invariant-evolution -->
| Commit/구간 | 상태 | 근거 기반 설명 |
| --- | --- | --- |
| b3bd671a3243 | Introduced | Conservative mode and structured result/error protocol. |
| 741bbb4caab7 | Extended | Every source can produce source-aware placeholder issues. |
| 47b99d6256ef → 428055be3e64 | Extended | Public origin, asset namespace, project/contact URL predicates become explicit. |
| 002b642d52a3 | Architecturally enforced | One aggregate validator owns production success and verified URL. |
| bcd87ed856bf → 71e7ece7208f | Completed | Required evidence, project exits, contact, and mode-aware entry point close domain gaps. |
| 37c0dbc079ff | Integrated | Normal npm build consumes the readiness result and propagates failure to process status. |
| fb3d18fd660b | Deterministically verified | Mode, aggregation, success, and origin boundaries receive regression tests. |
<!-- learner:end thread-invariant-evolution -->

## 7. Failure → Fix → Test 관계

<!-- learner:start thread-failure-fix-test -->
| Failure/위험 | Fix/결정 | Test/증거 |
| --- | --- | --- |
| Schema-valid template could be published | Explicit mode + aggregate production validator + mandatory prebuild | Readiness tests verify template bypass and strict production failures |
| Origin/helper policies could be used partially | S-level success result centralizes origin and source checks | Complete fixture must return `{mode: production, siteUrl: URL}` |
| Publication could lack evidence/exits/contact | Domain completeness checks extend the same issue array | Test expects all input categories without masking later issues |
<!-- learner:end thread-failure-fix-test -->

## 8. Ownership/state/responsibility 변화

<!-- learner:start thread-ownership -->
| 시점 | Owner | 책임 변화 |
| --- | --- | --- |
| Before | Callers/environment | No typed distinction between preview and publishable state. |
| b3bd → 428 | `content-readiness.ts` helpers | Own mode vocabulary and issue producers, but no single success owner. |
| 002 | `validateProductionReadiness` | Owns fail-closed production result and verified URL. |
| 71 | `validateBuildReadiness` | Owns template/production branching and narrows internal helper exports. |
| 37 | npm prebuild + readiness CLI | Owns propagation from library failure to build exit status. |
<!-- learner:end thread-ownership -->

## 9. 최종 Thread 상태와 실행 흐름

<!-- learner:start thread-final-state -->
**최종 상태**

Template mode remains convenient and non-publishing, while production mode can be represented only by a validated result containing a public `URL`. The result is withheld until placeholders, origin, required assets, enabled projects, project exits, and a contact method pass. Normal npm builds invoke this boundary before Next compilation.

**코드 없는 실행 흐름**

1. The readiness CLI loads already schema-validated portfolio sources and reads `PORTFOLIO_CONTENT_MODE`/`SITE_URL`.
2. `validateBuildReadiness` resolves mode; template returns without strict publication checks.
3. Production delegates to `validateProductionReadiness`, which accumulates origin, placeholder, asset, project, and contact issues.
4. Any issue produces one `PortfolioReadinessError`; success returns a discriminated production result with the parsed site URL.
5. The CLI maps known failure to exit code 1, so `npm run build` stops before `next build` through the `prebuild` lifecycle.
<!-- learner:end thread-final-state -->

## 10. Learning completion check

<!-- learner:start thread-completion-check -->
- [x] 각 SHA의 exact diff/tree를 GitHub connector로 정적 확인했습니다.
- [x] 보장과 비보장을 commit별로 구분했습니다.
- [x] test technique과 proves/does-not-prove를 구분했습니다.
- [x] 최종 흐름을 코드 없이 재구성했습니다.
- [x] 프로젝트 명령은 DNS 제한으로 실행하지 못했으며 그 사실을 모든 실행 증거에 명시했습니다.
<!-- learner:end thread-completion-check -->
