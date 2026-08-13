# `argv`에서 PPM 파일까지 이어지는 한 번의 실행

한 번의 실행은 `.rt` 장면을 읽어 메모리 이미지로 렌더링한 뒤 P3 PPM 파일로 저장한다.

```text
ray-scene-tracer <scene.rt> <output.ppm> [options]
```

명령 사용법은 [프로젝트 안내](../README.md), 지시어와 오류 위치의 현재 계약은
[장면 형식](../docs/scene-format.md)에 있다. 이 문서는 입력 인자가 완성된 장면,
광선 매개변수, 픽셀 바이트와 PPM 파일로 바뀌는 동안 상태와 소유권이 어디로
이동하는지만 한 경로로 잇는다.

## 출력 파일을 열기 전까지 완성해야 하는 것

진입점은 장면을 완성한 뒤 렌더링하고, 렌더링이 끝난 뒤에야 출력 파일을 연다.

```cpp
const ray::Scene scene =
    ray::loadScene(options.scenePath);
const ray::Image image =
    ray::renderScene(scene, options.renderSettings);
ray::writePpm(image, options.outputPath);
```

실행 중에는 다음 상태가 차례로 생긴다.

```text
argv
  └─ parseCli
       └─ CliOptions + RenderSettings
            └─ loadScene / parseSceneFile
                 └─ parseScene의 지역 Scene
                      ├─ Camera, Light 값 객체
                      ├─ 비공개 vector<unique_ptr<Shape>>
                      └─ buildAcceleration
                           └─ 완성된 이동 전용 Scene
                                └─ renderScene(const Scene&)
                                     ├─ CameraFrame
                                     ├─ 주 광선
                                     ├─ HitRecord
                                     ├─ 그림자/반사 광선
                                     └─ Image(vector<unsigned char>)
                                          └─ writePpm
                                               └─ P3 텍스트 파일
```

이 순서 덕분에 CLI 형식, 장면 파일 열기, 파싱, 이미지 할당, 렌더링 준비 단계에서
실패하면 출력 경로를 열지 않는다. 작업자 스레드의 예외도 모든 작업자를 회수한
뒤 주 스레드로 전달한다. PPM은 임시 파일에서 완성하고 상태를 확인한 뒤 최종
경로로 교체하므로 출력 실패는 기존 파일을 보존한다.

## 문자열 인자에서 완성된 장면까지

`parseCli`는 두 위치 인자를 입력·출력 경로로 보관하고 렌더 설정만 만든다. 아직 파일은 열지 않는다. 인자가 부족하거나 옵션이 중복되었거나 값이 범위를 벗어나면 사용법을 출력하고 종료 코드 2를 반환한다. 장면 로드 이후 주 스레드로 전달된 `std::exception`은 종료 코드 1로 처리한다.

`parseScene`은 지역 `Scene`을 줄 단위로 채운다. `R`, `A`, `C`는 각각 정확히
한 번 필요하고 광원과 도형은 0개도 허용된다. 숫자 token은 전체가 변환되고
유한해야 하며 지시어별 token 수와 값 범위를 모두 통과해야 한다. 특정 줄의
오류에는 입력 이름과 줄 번호가 붙고, 파일 열기·필수 지시어 누락에는 line 0이
남는다. 정확한 cardinality와 기본 재질은 [장면 형식](../docs/scene-format.md)이
소유한다.

필수 지시어를 모두 확인한 뒤 가속 구조까지 만든 장면만 반환한다. 파서가 직접
던진 문법·의미 오류와 가속 구조 구축 예외에서는 지역 장면이 폐기되지만,
`getline`이 비-EOF stream 실패로 멈췄는지는 루프 뒤에 별도로 확인하지 않는다.

[`src/parser.cpp`](../src/parser.cpp)가 파일 열기, 줄 단위 해석, 필수 지시어 검사와 가속 구조 구성을 맡고, [`src/main.cpp`](../src/main.cpp)가 완성된 장면을 렌더 경로에 넘긴다.

## 값 객체와 `unique_ptr`가 나누어 가진 장면

카메라와 광원은 값으로 저장한다. 다형 도형은 `Scene`의 비공개
`vector<unique_ptr<Shape>>`가 한 번만 소유한다. `Scene`은 복사할 수 없고
이동할 수 있다.

```cpp
private:
    std::vector<std::unique_ptr<Shape>> shapes_;

Scene();
Scene(const Scene&) = delete;
Scene& operator=(const Scene&) = delete;
Scene(Scene&&) noexcept = default;
Scene& operator=(Scene&&) noexcept = default;
```

따라서 파싱 중 예외가 발생하면 지역 장면과 이미 추가된 도형은 RAII에 따라 함께 정리된다. `HitRecord::shape`는 도형을 소유하지 않는 비소유 포인터이다. 렌더 함수는 `const Scene&`로 장면을 참조해 사용하고 모든 광선 추적을 마친 뒤 반환하므로 내부 렌더 경로에서는 장면보다 오래 남지 않는다. 호출자가 `HitRecord`를 장면보다 오래 보관하는 수명은 보장하지 않는다.

`HitRecord`의 재질은 값으로 복사되므로 도형의 재질 참조를 빌리지 않는다.
반면 `shape`는 정체성 비교를 위한 주소만 빌리며 장면을 소유하거나 수명을
늘리지 않는다.

`include/ray/scene.hpp`, `src/parser.cpp`, `src/scene.cpp`는 `unique_ptr` 단독 소유를
사용한다. 외부에는 도형 수와 읽기 전용 조회만 제공한다. `addShape`는 기존 BVH와
무한 도형 목록을 비우고 준비 플래그를 내리며, 파싱을 마친 뒤 가속 구조를 한 번
구축한다. 가속 구조의 무효화 범위는
[가속 구조 설명](correctness-preserving-acceleration.md)에 이어진다.

## 픽셀 중심 광선에서 가장 가까운 도형까지

렌더러는 해상도와 카메라로 `CameraFrame`을 한 번 계산한다. 픽셀마다 프레임을 다시 만들지 않고 픽셀 중심 `(x + 0.5, y + 0.5)`을 통과하는 광선을 만든다.

```cpp
makeCameraRay(scene.camera,
              camera_frame,
              scene.width,
              scene.height,
              x + 0.5,
              y + 0.5);
```

`src/camera.cpp`와 `src/renderer.cpp`에서 `u`는 왼쪽에서 오른쪽으로 증가하고,
`v`는 이미지 행이 증가할수록 감소하므로 첫 행은 뷰포트 상단에 대응한다. 현재
검사는 대표 광선 값을 확인하지만 좌표계 선택 자체의 외부 기준은 두지 않는다.

파서가 카메라 direction을 정규화하고, `buildCameraFrame`은 이를 forward로
다시 정규화한다. 다만 유한 성분의 실제 길이가 `double` 범위를 넘어
`std::hypot` 결과가 `inf`이면 파서의 nonzero 검사를 통과한 뒤 정규화 결과가
0벡터가 될 수 있다. 이 경우 카메라 frame은 `(0,0,1)` forward로 대체한다. 기본
up seed가 forward와 거의 평행하면 다른 축을 골라 right와 true-up을 만든다.
장면의 FOV는 수직 시야각이다.

```text
viewportHeight = 2 * tan(fovRadians / 2)
viewportWidth  = viewportHeight * (width / height)
```

따라서 종횡비는 수평 범위만 조정하고 세로 FOV를 유지한다. 장면 파서는
`0 < fov < 180`, 양의 `int` 범위 해상도를 요구한다. 반면 공개 C++ API는
이 범위를 우회한 `Camera`와 임의의 유한 `pixel_x`/`pixel_y`, 다른
`CameraFrame`의 조합도 받으며 viewport와 픽셀 방향의 파생값이 유한한지
다시 검사하지 않는다.

`Ray` 생성자는 direction을 정규화하지 않고 `at(t) = origin + direction * t`만
정의한다. 카메라와 그림자 경로는 단위 direction을 만들고 그 전제에서 나온
반사 방향도 단위 길이를 유지하지만, 공개 C++ API는 임의의 `Ray`를 허용한다.
따라서 `t`는 항상 세계 거리인 값이 아니라 광선 매개변수이며 direction 길이가
1일 때만 거리와 일치한다.

구, 평면, 유한 원기둥은 `t_min <= t <= t_max`인 교차만 반환한다. 성공한
결과에는 매개변수, 점, 광선을 향하도록 정리한 법선, 재질, 도형 포인터가
들어간다. 같은 `t`를 정확히 반환한 도형이 둘 이상이면 입력에서 뒤에 추가된
도형을 선택한다. 이 비교는 C++ `double`의 정확 비교이며, 비트 표현을 별도로
검사하거나 허용 오차 범위의 값을 동률로 보지 않는다.

기본 경로는 BVH지만 선형 탐색도 정확성 기준선으로 남아 있다. 선택된 회귀 장면에서 두 방식의 교차 결과와 이미지 바이트가 같은지 확인한다. 모든 장면과 모든 부동소수 경계를 포괄하는 증명은 아니다.

## 교차 결과가 최종 색이 되는 경로

광선이 아무 도형도 만나지 않으면 배경색을 반환한다. 확산 재질은 환경광에서 시작해 각 점광원의 Lambert 내적과 그림자 가시성을 더한다. 그림자 광선은 교차점에서 법선 방향으로 `kRayTMin`만큼 옮겨 시작하며 광원보다 가까운 차폐 도형만 찾는다.

금속 재질은 법선 기준 완전 반사 방향으로 보조 광선을 만든다. `maxDepth`는 앞으로 허용할 반사 확장 횟수이며 반사 한 번마다 1을 소비한다. 깊이가 0인 상태에서 금속 재질을 만나면 검은색으로 끝난다. 난수, 거칠기, Fresnel, 다중 샘플링은 현재 범위에 없다. 재귀와 작업자 수명의 자세한 내용은 [재질과 병렬 렌더링 설명](materials-and-deterministic-parallel-rendering.md)에 정리되어 있다.

`kEpsilon = 1e-6`은 영벡터·평행·퇴화 도형과 원기둥 seam 같은 수치 판정에
쓰인다. `kRayTMin = 1e-4`는 교차 매개변수의 하한인 동시에 표면에서 새 광선
원점을 옮기는 세계 좌표 offset으로 쓰인다. 두 상수의 역할은 같지 않으며,
비단위 `Ray`에서는 매개변수 하한과 실제 이동 거리의 관계도 달라진다.
도형 교차가 direction이나 그 제곱을 고정 `kEpsilon`과 비교하므로 같은
반직선의 direction 크기만 줄여도 평행·퇴화 판정이 달라질 수 있다.

## 행 우선 RGB 바이트를 P3 텍스트로 내보내기

`Image`는 폭, 높이와 RGB 바이트 벡터를 소유한다. 할당 전에 양의 크기와
`width × height × 3`의 `size_t` 오버플로를 확인한다. 출력과 체크섬 경계에서도
저장된 픽셀 수가 이 계산과 정확히 같은지 다시 확인한다.

```cpp
if (safe_width > limit / safe_height ||
    safe_width * safe_height > limit / 3) {
    throw std::overflow_error("image dimensions are too large");
}
```

채널 값은 0 이상 1 이하로 제한한 뒤 `lround(value * 255.0)`으로 양자화한다. 메모리 위치는 `(y * width + x) * 3`이므로 행 우선 RGB 순서이다. 모든 작업자 스레드를 회수한 뒤 완성된 `Image`를 반환한다.

PPM은 같은 디렉터리의 임시 파일에 다음 헤더와 픽셀마다 십진수 `R G B` 한 줄을
기록한다.

```cpp
output << "P3\n" << image.width << ' ' << image.height << "\n255\n";
```

쓰기·flush·close 성공을 확인한 뒤 임시 파일을 최종 경로로 교체한다. 실패하면
기존 경로를 보존한 채 임시 파일 삭제를 시도한다. 삭제 실패는 별도로 보고하지
않는다.

`checksumHex`는 폭과 높이의 하위 16비트, 모든 픽셀 바이트를 FNV-1a 방식으로 섞는다. 체크섬은 결과 변화를 빠르게 찾는 회귀 키이며 서로 다른 이미지가 절대로 충돌하지 않는다는 보장은 없다. PPM 헤더와 공백, 줄바꿈까지 포함한 전체 바이트 동치는 회귀 셸 스크립트의 `cmp`가 확인한다.

`src/output.cpp`는 FNV-1a의 64비트 offset basis `14695981039346656037`을
사용한다. 상수가 다른 체크섬 자료와는 같은 규약으로 비교할 수 없다.

## 실패한 위치에 따라 달라지는 파일 상태

| 실패 지점 | 동작 | 남는 한계 |
| --- | --- | --- |
| 잘못된 CLI 형식 | 파일 I/O 전에 종료 코드 2를 반환한다. | 대표 경계값만 `tests/cli_contract.sh`에서 확인한다. |
| 장면 파일 열기·파싱 실패 | 주 스레드 예외를 종료 코드 1로 처리하고 출력 파일을 열지 않는다. | 모든 파서 오류 조합을 검사하지는 않는다. |
| 이미지 크기 오버플로 | 이미지 생성을 중단하고 출력 파일을 열지 않는다. | 극단 크기를 주입하는 전용 검사는 없다. |
| 스레드 생성 실패 | 이미 시작한 스레드를 회수한 뒤 예외를 주 스레드로 전달한다. | 부분 계산은 폐기하며 재시도하지 않는다. |
| 작업자 내부 예외 | 작업자별 예외를 저장하고 새 타일 배정을 중단한 뒤 모든 작업자를 회수해 주 스레드에서 다시 던진다. | 실패한 부분 이미지는 반환하지 않으며 재시도하지 않는다. |
| 출력 파일 열기 실패 | `runtime_error`를 종료 코드 1로 처리한다. | 전용 검사는 없다. |
| 파일을 연 뒤 쓰기 실패 | 기존 최종 파일을 보존하고 임시 파일 삭제를 시도한 뒤 예외를 전달한다. | 삭제 실패를 보고하지 않고, 전원 장애 뒤 파일·디렉터리 내구성도 보장하지 않는다. |
| 극단적으로 큰 유한 장면 값 | 방향·좌표·도형 크기는 token 단계를 통과할 수 있다. | 실제 방향 길이 overflow 뒤 0벡터 정규화, dot·제곱·bounds의 inf/NaN 파생을 일괄 검출하지 않는다. 공개 카메라 API의 범위 우회와 viewport 파생값도 별도 검사하지 않는다. |

파싱이나 렌더에 실패했을 때는 출력 경로를 열지 않는다. 출력 단계의 실패는
스트림 상태와 close 결과까지 예외로 바꾸고 최종 이름 교체 전에 중단하므로 부분
PPM을 최종 경로로 공개하지 않는다. 실패 경로에서는 임시 파일 삭제를 시도하고,
`writePpm()`이 성공한 뒤에만 체크섬을 출력한다.

## 각 검사층이 실제로 닿는 범위

| 검사 | 확인하는 내용 | 확인하지 않는 내용 |
| --- | --- | --- |
| `tests/core_tests.cpp` | 대표 수학·교차 값, 파서 오류, 정확한 2×1 PPM, 잘못된 이미지 저장소, 고정 장면 체크섬 | 모든 입력과 시각적 정답 |
| 출력 실패 회귀 | 중간 쓰기 실패의 오류 전달, 기존 대상 보존, 임시 파일 정리 | 전원 장애와 모든 파일 시스템 |
| `tests/render_smoke.sh` | 실제 프로세스의 파싱 실패, P3 헤더, 반복 출력 | 모든 장면 |
| `tests/cli_contract.sh` | 옵션 문법, 종료 코드 2, 경계 옵션 실행 | 장면 의미와 이미지 품질 |
| `tests/render_determinism.sh` | 고정 장면에서 선형/BVH와 1/4 스레드의 PPM 전체 바이트 | 다른 장면·스레드 수·플랫폼 전체 |

`RenderSettings::samplesPerPixel`, `tMin`, `tMax`는 구조에 남아 있지만 현재 렌더 루프에서 사용하지 않는다. 실제 샘플은 픽셀 중심 하나이고 교차 범위는 셰이딩 코드의 `kRayTMin`과 무한대로 정해진다. 이 필드를 현재 지원 기능으로 해석해서는 안 된다.

파서, 렌더링과 출력 경계에서 발생한 문제는
[실패와 확장 경계](failure-and-extension-boundaries.md)에 현재 계약으로
정리했다.

## 관련 개발 기록

- [장면 parser](../devlog/03-atomic-scene-parser.md)
- [첫 렌더링 수직 경로](../devlog/06-first-rendering-slice.md)
- [출력과 CLI 경계](../devlog/07-output-and-cli-boundary.md)
