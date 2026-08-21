# Projects Prompts

프로젝트의 Git 이력을 분석하고 Development Thread 학습 문서를 생성하기 위한 프롬프트 모음입니다.

## 권장 파이프라인
git-history-analysis-prompt
        ↓
development-thread-study-scaffold-prompt
        ↓
development-thread-study-completion-prompt
        ↓
[대규모 프로젝트일 때]
development-thread-study-category-expansion-prompt
        ↓
추가 category별 반복
development-thread-study-category-refinement-and-completion-prompt

## 기본 흐름

```text
Git history 분석
→ Development Thread scaffold 생성
→ completed 생성
```

* `git-history-analysis-prompt.md`

  * Git 이력 전체를 분석합니다.
  * `commit-bodies.md`, `commit-importance.md`를 생성합니다.
  * 중요도와 Development Thread를 정의합니다.

* `development-thread-study-scaffold-prompt.md`

  * `commit-bodies.md`, `commit-importance.md`를 기반으로 학습용 scaffold를 생성합니다.

* `development-thread-study-completion-prompt.md`

  * 확정된 scaffold를 실제 저장소 이력과 대조하여 completed workbook으로 완성합니다.

## 대규모 프로젝트

하나의 `scaffold/completed` 쌍으로 프로젝트 전체를 적절히 다루기 어려운 경우 category 계층을 추가합니다.

```text
development-thread-workbook/
├── <category>/
│   ├── scaffold/
│   └── completed/
└── ...
```

* `development-thread-study-category-expansion-prompt.md`

  * 기존 `scaffold/completed`를 하나의 category로 분류합니다.
  * 프로젝트 전체를 분석하여 추가 category를 정의하고 candidate scaffold를 생성합니다.

* `development-thread-study-category-refinement-and-completion-prompt.md`

  * 하나의 candidate category scaffold를 실제 Git 이력에 맞게 보정합니다.
  * 보정된 scaffold를 확정한 뒤 completed까지 생성합니다.

## 기타

* `repository-based-solo-development-effort-estimation-prompt.md`

  * 저장소 구현 범위를 기준으로 표준화된 1인 개발 공수를 추정합니다.

각 프롬프트의 저장소, 브랜치, 입력 및 출력 경로는 실행 시 별도로 지정합니다.
