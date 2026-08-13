# 현재 검증과 수동 벤치마크

이 프로젝트는 픽셀 회귀, 실제 PPM 비교, 알고리즘 작업량, 벽시계 시간을 서로 다른 값으로 다룬다. 체크섬이 같다는 사실과 도형 교차 호출이 줄었다는 사실, 특정 환경에서 실행 시간이 짧았다는 사실은 서로 대신할 수 없다.

```text
소스 변경
  └─ 단위·회귀 검사
       └─ 실제 CLI·파일 비교
            └─ 선형/BVH 작업량 비교
                 └─ 벽시계 시간 기록
                      └─ Linux/macOS·새니타이저 실행 구성
```

이 문서는 현재 빌드 대상, CTest, 픽셀 바이트, 교차 횟수, 실행 시간과 CI 구성이
각각 어떤 주장을 뒷받침하고 어디서 멈추는지 연결한다.

## 빌드가 만드는 대상

| 대상 | 조건 | 역할 |
| --- | --- | --- |
| `raycore` | 항상 | C++17 library target; 공개 include와 `Threads::Threads` 전파 |
| `ray-scene-tracer` | 항상 | `.rt`에서 P3 PPM을 만드는 제품 CLI |
| `ray-benchmark` | 항상 | 640×360 수동 비교 프로그램; CTest에는 미등록 |
| `ray-core-tests` | `BUILD_TESTING=ON` | 수학·기하·parser·이미지 저장소·출력·기본 장면 |
| `ray-accel-tests` | `BUILD_TESTING=ON` | linear/BVH 교차·pixel·작업량 |
| `ray-material-tests` | `BUILD_TESTING=ON` | 재질 parser와 반사 깊이 |
| `ray-render-tests` | `BUILD_TESTING=ON` | 네 실행 mode의 pixel·checksum 동치, 같은 accel 내 1/4 worker 통계와 실패 전파 |
| `ray-output-tests` | `BUILD_TESTING=ON` | stream 쓰기·최종 경로 교체 실패와 임시 파일 정리 |

세 shell 검사는 별도 executable target이 아니라 CTest가 `bash`로 제품 CLI를
호출한다. install, package, 서명, 업로드 target은 없다.

## 같은 그림을 판단하는 두 층

`checksumHex`는 먼저 양의 폭·높이와 정확한 픽셀 저장 크기를 확인한 뒤 FNV-1a
방식으로 폭과 높이의 하위 16비트, 픽셀 벡터의 모든 바이트를 순서대로 섞는다.

```cpp
mix(static_cast<unsigned char>(image.width & 0xff));
mix(static_cast<unsigned char>((image.width >> 8) & 0xff));
mix(static_cast<unsigned char>(image.height & 0xff));
mix(static_cast<unsigned char>((image.height >> 8) & 0xff));
for (unsigned char value : image.pixels) {
    mix(value);
}
```

같은 크기와 픽셀 바이트는 같은 체크섬을 만든다. 저장된 값이 달라지면 이미지 바이트나 해시 구현이 바뀌었다는 빠른 신호를 얻을 수 있다. 하지만 해시는 충돌할 수 있고 크기의 상위 비트는 포함하지 않으므로, 같은 값만으로 서로 다른 이미지가 절대 없다고 말할 수 없다. 메모리 픽셀만 해시하기 때문에 PPM의 헤더, 공백, 줄바꿈도 확인하지 않는다.

`tests/render_determinism.sh`는 체크섬 값과 함께 PPM 전체 파일을 `cmp`한다.
이 스크립트는 checksum 문자열의 길이·문자 집합을 직접 검사하지 않는다.
16자리 소문자 hexadecimal 형식은 `tests/render_smoke.sh`와
`tests/cli_contract.sh`의 정규식이 확인한다. 파일 비교는 선택된 실행들의
직렬화 byte가 정확히 같은지 확인하지만 이미지가 시각적으로 올바르거나 다른
장면과 플랫폼에서도 같다는 뜻은 아니다.

현재 [`src/output.cpp`](../src/output.cpp)는 FNV-1a의 64비트 offset basis
`14695981039346656037`을 사용한다. 이 상수를 바꾸면 저장된 체크섬과 같은 규약으로
비교할 수 없으므로 해시 구현 변경과 이미지 변경을 구분해야 한다.

## 코드에 박아 둔 두 회귀 값

`tests/core_tests.cpp`에는 두 종류의 고정 값이 있다.

- 2×1 메모리 이미지의 정확한 P3 문자열과 체크섬 `0fde7b4d509f1daf`
- `scenes/basic.rt`의 640×360 렌더 체크섬 `456dc8d87ebf194f`

`tests/material_tests.cpp`도 `basic.rt`의 같은 값을 요구한다. 금속 재질을 추가한 뒤에도 재질 토큰이 없는 기존 확산 재질 장면이 바뀌지 않았는지 확인하기 위해서이다.

metal 반사 실행의 직접 근거도 이 파일에 있다. 한 번의 반사 결과와
`secondaryRays == 1`을 요구한다. metal 도형을 포함한
`tests/render_tests.cpp`는 네 mode의 `secondaryRays`가 서로 같은지는
비교하지만 값이 0보다 큰지는 요구하지 않는다.

이 값은 테스트에 고정된 바이트가 달라졌는지 알려 준다. 최초 이미지가 외부 렌더러나 기준 이미지와 비교되어 시각적 정답으로 확정되었다는 기록은 없으므로, 시각 품질의 판정값으로 사용하지 않는다.

## 교차 횟수와 벽시계 시간은 다른 증거다

`benchmarks/render_benchmark.cpp`는 다음 렌더 통계를 모은다.

- `primaryRays`: 픽셀에서 시작한 광선 수
- `secondaryRays`: 금속 재질 반사로 만든 보조 광선 수
- `shadowRays`: 직접 조명의 가시성을 확인한 광선 수
- `primitiveTests`: 실제 도형 `intersect` 호출 수
- `aabbTests`: AABB 교차 호출 수
- `renderMilliseconds`: 렌더 시작부터 작업자 회수 뒤까지의 벽시계 시간

정수 카운터는 알고리즘이 수행한 논리 작업량을 설명한다. 특히 `primitiveTests`는 BVH가 실제 도형 검사를 얼마나 줄였는지 보여 준다. 다만 AABB 검사, 스택 순회, 분기, 캐시 효과, BVH 구축 비용은 별도이므로 도형 검사 한 번을 전체 CPU 비용과 같게 볼 수 없다.

벽시계 시간은 이 모든 비용과 운영체제 스케줄, 머신 부하를 함께 반영한다. 따라서 관찰 결과로 기록하되 자동 합격 기준으로 사용하지 않는다.

## 640×360 수동 벤치마크

[`benchmarks/render_benchmark.cpp`](../benchmarks/render_benchmark.cpp)는 코드로 다음 장면을 만든다.

| 항목 | 값 |
| --- | ---: |
| 해상도 | 640×360 |
| 구 | 400개, 20×20 배치 |
| 평면 | 1개 |
| 광원 | 2개 |
| 작업자 | 1개 |
| 반사 깊이 | 4 |
| 금속 재질 도형 | 없음 |
| 예열 | 방식별 1회 |
| 측정 | 방식별 5회 |
| 대표값 | 실행 시간 중앙값 |

작업자를 하나로 고정해 스레드 스케줄 변수를 줄이고 선형 탐색과 BVH의 차이에 집중한다. 금속 재질 도형이 없어서 보조 광선은 0이고 반사 깊이 4는 이 장면의 계산량에 영향을 주지 않는다.

각 방식은 한 번 예열한 뒤 다섯 번 측정한다. 실행 시간을 정렬해 중앙 샘플을 고르지만 모든 샘플의 체크섬과 정수 카운터가 중앙 샘플과 같아야 한다.

```cpp
if (sample.checksum != median.checksum ||
    sample.stats.primaryRays != median.stats.primaryRays ||
    sample.stats.secondaryRays != median.stats.secondaryRays ||
    sample.stats.shadowRays != median.stats.shadowRays ||
    sample.stats.primitiveTests != median.stats.primitiveTests ||
    sample.stats.aabbTests != median.stats.aabbTests) {
    throw std::runtime_error(
        "benchmark runs produced different results");
}
```

선형 탐색과 BVH의 측정이 끝나면 체크섬이 같아야 하고 BVH의 도형 검사는 선형의
25% 미만이어야 한다.

실행 시간에는 실패 임계값이 없다. 이 프로그램이 확인하는 이미지 동치는 체크섬 비교이며 PPM 파일을 만들거나 `cmp`하지는 않는다.

## 저장소에 남은 한 번의 측정

[`benchmarks/reference.json`](../benchmarks/reference.json)은 AppleClang 17.0.0, arm64, 논리 스레드 8개, Release 빌드에서 얻은 결과를 보관한다.

| 방식 | 중앙값 | 주 광선 | 그림자 광선 | AABB 검사 | 도형 검사 | 체크섬 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 선형 | 2326.770 ms | 230,400 | 283,078 | 0 | 205,904,678 | `f3f4cf26aca94dc1` |
| BVH | 87.001 ms | 230,400 | 283,078 | 1,696,156 | 904,630 | `f3f4cf26aca94dc1` |

파일에는 `primitiveTestRatio: 0.004`, `medianSpeedup: 26.744`도 있다. 도형 검사 비율은 JSON 출력 정밀도에 맞춰 반올림된 값이다.

저장된 자료에서는 두 방식의 체크섬이 같고 BVH의 도형 교차 호출이 크게 줄었다.
해당 환경의 렌더링 중앙값은 약 26.7배 차이 난다. 측정 날짜, 운영체제 세부 버전,
CPU 모델, 전원 정책, 백그라운드 부하와 정확한 CMake 옵션은 파일에 없다.

따라서 다음 내용까지 일반화할 수는 없다.

- 모든 장면과 도형 분포의 동일한 배속
- 다른 CPU·컴파일러·운영체제의 동일한 실행 시간
- BVH를 반복해서 다시 만드는 작업의 동일한 이점
- 여러 작업자를 사용할 때의 동일한 확장 비율
- 금속 반사가 많은 장면의 동일한 결과

저장된 수치는 해당 환경과 입력에서 얻은 관찰값이며 재현을 보장하는 성능 계약이 아니다.

## 재측정 절차

`ray-benchmark`는 결과 JSON을 표준 출력으로 내보내지만 시스템 환경을 자동 수집하거나 `benchmarks/reference.json`을 직접 갱신하지 않는다. 현재 저장소에서 실행할 수 있는 절차는 다음과 같다.

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=ON
cmake --build build --parallel
ctest --test-dir build --output-on-failure
./build/ray-benchmark > candidate.json
```

마지막 명령은 수동 실행이다. 새 결과를 저장하려면 체크섬과 반복 카운터, 도형 검사 비율을 확인하고 측정 환경과 시간 변동을 함께 판단해야 한다. 기준 파일 갱신, 환경 수집, 이전 결과와의 비교를 자동화한 스크립트는 없다.

## 자동으로 실행되는 검사와 그렇지 않은 검사

[`CMakeLists.txt`](../CMakeLists.txt)는 제품 동작과 실패 경계를 다음 검사로 등록한다.

| 이름 | 확인하는 내용 |
| --- | --- |
| `core_regression` | 수학, 기본 기하, 선택 AABB, 파서 오류, 이미지 저장소, 정확한 PPM, 기본 장면 회귀 |
| `accel_regression` | 개별 교차 결과 동등성, 같은 `t`의 도형 선택, 고밀도 장면 픽셀, 도형 검사 25% 조건 |
| `material_regression` | 재질 파싱, 깊이 0, 한 번의 반사, 확산 재질 회귀 |
| `render_determinism` | 네 실행 mode의 픽셀·체크섬 동치와 같은 가속 방식 안의 1/4 작업자 정수 통계 |
| `output_failure_regression` | stream 실패, 기존 파일 보존, 최종 경로 교체와 임시 파일 정리 |
| `cli_contract` | 잘못된 옵션의 종료 코드 2와 유효 경계 옵션 |
| `render_output_determinism` | 네 실행의 체크섬과 PPM 전체 바이트 |
| `render_smoke` | 파싱 실패, 줄 번호, P3 헤더와 반복 출력 |

`render_determinism`은 오류를 던지는 검사 도형으로 작업자 예외가 호출자에게
다시 전달되고 모든 작업자가 회수되는지도 확인한다. `accel_regression`은 장면
변경 뒤 오래된 BVH가 사용되지 않는지와 읽기 전용 도형 조회를 함께 확인한다.

`ray-benchmark`는 기본 빌드 대상이지만 `add_test`로 등록되어 있지 않는다. 따라서 빌드할 때 실행 파일은 만들어져도 CTest가 640×360 벤치마크를 실행하지 않는다. `accel_regression`의 160×90 고밀도 장면에 있는 25% 조건과 수동 벤치마크 내부의 같은 조건은 별개의 실행이다.

## 빌드 진입점마다 다른 최소 CMake 버전

`CMakeLists.txt`는 최소 버전을 3.16으로 선언하므로 직접 구성하고 빌드하는 기본 경로는 CMake 3.16을 기준으로 한다. Makefile의 `all`과 `test`도 CMake 구성과 빌드를 감싼다.

다만 `make clean`은 `cmake -E rm -rf`를 사용하며 `cmake -E rm`은 CMake 3.17부터 제공된다. 따라서 Make 래퍼의 정리 명령까지 사용하려면 CMake 3.17 이상이 필요하다. 이 차이는 빌드 요구 사항과 정리 명령의 요구 사항을 나누어 안내해야 한다.

## CI가 실제로 걸어 둔 실행 경로

`.github/workflows/ci.yml`은 `push`와 `pull_request`에서 다음 작업을 실행하도록 구성되어 있다.

- Ubuntu와 macOS의 Release 구성, 전체 빌드, CTest
- Ubuntu Debug 구성, ASan·UBSan을 적용한 전체 빌드와 CTest

새니타이저 작업은 Ubuntu에서 누수 검사와 첫 오류 중단 옵션을 사용한다. ASan·UBSan은 실행된 테스트 경로의 주소 오류와 선택된 정의되지 않은 동작을 찾지만 데이터 레이스를 검사하는 ThreadSanitizer는 아니다. 실행하지 않은 입력, 성능 회귀, 모든 메모리 오류의 부재도 보장하지 않는다.

워크플로 파일과 실행 명령은 검사가 실행되도록 구성됐다는 사실만 보여 준다. 실제
통과 여부는 개별 실행 결과로 확인해야 한다. 현재 CI 구성은 640×360
`ray-benchmark`를 실행하지 않는다.

## 소스 트리의 통과는 배포물 검증이 아니다

현재 자동화는 소스 트리에서 실행 파일을 빌드하고 테스트하는 단계까지 다룬다. `install()` 규칙, CPack, 버전 주입, 실행 파일 업로드, 배포물 서명, 설치 뒤 재실행 검사는 없다. 따라서 CTest가 통과하더라도 배포 패키지가 만들어지고 검증되었다는 뜻은 아니다.

검사 결과는 다음 범위로 해석할 수 있다.

| 결과 | 확인할 수 있는 내용 | 확인할 수 없는 내용 |
| --- | --- | --- |
| 체크섬 일치 | 선택 실행의 빠른 픽셀 회귀 키가 같다. | 충돌 불가능성과 시각적 정답 |
| PPM `cmp` 일치 | 선택 실행의 직렬화 바이트가 같다. | 모든 장면과 플랫폼의 동일성 |
| 개별 교차 결과 비교 | 선택 광선에서 같은 도형과 법선을 고른다. | 모든 부동소수 경계 |
| 도형 검사 감소 | 실제 도형 `intersect` 호출이 줄었다. | 전체 CPU 시간과 메모리 비용 |
| 시간 중앙값 | 기록 환경에서 관찰된 실행 시간이다. | 다른 환경의 안정된 합격 기준 |
| ASan·UBSan 구성 | 실행 시 두 검사기를 적용한다. | 데이터 레이스와 모든 오류의 부재 |
| Linux·macOS 행렬 | 두 실행 환경 계열에서 빌드와 CTest를 수행하도록 구성했다. | Windows와 고정된 운영체제 버전 |

측정 방법을 바꾸거나 기준 자료를 갱신할 때는 체크섬 동치, 도형 검사 비율과
벽시계 관찰값의 판정 범위를 서로 분리해 유지한다.

## 관련 개발 기록

- [최적화 전 측정](../devlog/09-measure-before-optimization.md)
- [CI와 검증 근거](../devlog/18-ci-and-evidence.md)
