# 로컬 폰트 출처

빌드 중에 외부 폰트를 내려받지 않도록 공식 배포 파일을 저장소에 함께 둡니다. 파일은 변환하지 않고 원본 WOFF2를 그대로 사용합니다.

| 저장 파일 | 공식 배포본 | 버전 | 크기 | SHA-256 | 라이선스 |
| --- | --- | --- | ---: | --- | --- |
| `Geist-Variable.woff2` | [Vercel Geist Sans](https://raw.githubusercontent.com/vercel/geist-font/v1.7.2/packages/next/dist/fonts/geist-sans/Geist-Variable.woff2) | `1.7.2` | 69,760바이트 | `2ffebe993e969069a9789d15164b7715d42491b5835516c5e3b935d5f81b05f1` | [OFL 1.1](./licenses/Geist-OFL-1.1.txt) |
| `GeistMono-Variable.woff2` | [Vercel Geist Mono](https://raw.githubusercontent.com/vercel/geist-font/v1.7.2/packages/next/dist/fonts/geist-mono/GeistMono-Variable.woff2) | `1.7.2` | 71,596바이트 | `afaacc4c5fbba89d2ebf7a02dc4070208540874592a5504d57175782fe893101` | [OFL 1.1](./licenses/Geist-OFL-1.1.txt) |
| `SourceHanSerifKR-Variable.woff2` | [Adobe Source Han Serif KR](https://raw.githubusercontent.com/adobe-fonts/source-han-serif/2.003R/Variable/WOFF2/OTF/Subset/SourceHanSerifKR-VF.otf.woff2) | `2.003R` | 4,751,636바이트 | `cd5c29b1e9fbe1374f809d2ebe46df3a0f0d33e9891407432183a7e0c03ee735` | [OFL 1.1](./licenses/SourceHanSerif-OFL-1.1.txt) |

한글 명조는 Noto Serif KR과 같은 계열인 Source Han Serif KR의 한국어 서브셋을 사용합니다. 기존 스타일과의 호환을 위해 CSS 변수 이름 `--font-noto-serif-kr`은 바꾸지 않았습니다.
