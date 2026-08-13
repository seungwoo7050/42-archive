# 실패 뒤 상태와 확장 경계

현재 공개 타입, 제품 코드와 테스트를 맞춰 보면 해결한 실패 경계와 아직 호출자가
지켜야 할 전제가 함께 있다. 아래 표는 미래 계획 목록이 아니라 현재 실패 뒤
상태와 직접 C++ API의 계약이다.

| 영향 | 현재 동작 | 코드와 검사 |
| --- | --- | --- |
| 작업자 예외 | 작업자별 예외를 보관하고 새 타일 배정을 중단한 뒤 모든 작업자를 회수한다. 호출자 스레드에서 보관한 예외를 다시 던진다. | [`src/renderer.cpp`](../src/renderer.cpp), [`tests/render_tests.cpp`](../tests/render_tests.cpp) |
| PPM 공개 | 이미지 저장 크기를 검증하고 같은 디렉터리의 임시 파일에 완전히 쓴 뒤 최종 경로로 교체한다. 쓰기·flush·close·교체 실패는 기존 파일을 보존하고 임시 파일 삭제를 시도한다. | [`src/output.cpp`](../src/output.cpp), [`tests/core_tests.cpp`](../tests/core_tests.cpp), [`tests/output_tests.cpp`](../tests/output_tests.cpp) |
| 렌더 설정 | `maxDepth`, `accelMode`, `threadCount`만 렌더링에 영향을 준다. `samplesPerPixel`, `tMin`, `tMax`는 값을 바꿔도 사용되지 않는다. | [`include/ray/renderer.hpp`](../include/ray/renderer.hpp), [`src/renderer.cpp`](../src/renderer.cpp), [`src/shading.cpp`](../src/shading.cpp) |
| 장면과 BVH | 소유 도형 목록과 내장 도형의 기하 상태는 외부에서 직접 바꿀 수 없다. 새 도형은 `addShape()`로만 추가하며 파생 상태를 무효화한 뒤 재구축한다. 외부 파생 `Shape`의 변경 가능성은 타입이 막지 않는다. | [`include/ray/scene.hpp`](../include/ray/scene.hpp), [`src/scene.cpp`](../src/scene.cpp), [`tests/accel_tests.cpp`](../tests/accel_tests.cpp) |
| 장면 입력 | 문법·의미 오류는 위치와 함께 거부하지만 `getline()` 종료 뒤 `badbit()`을 확인하지 않는다. 입력 크기, 줄 길이와 도형 수의 상한도 없다. | [`src/parser.cpp`](../src/parser.cpp), [`tests/core_tests.cpp`](../tests/core_tests.cpp) |
| 직접 C++ API | 파서가 검사하는 해상도, 방향, 크기와 색 범위를 직접 생성자로 우회할 수 있다. `CameraFrame`과 원래 카메라·해상도의 조합도 확인하지 않는다. | [`include/ray/scene.hpp`](../include/ray/scene.hpp), [`include/ray/camera.hpp`](../include/ray/camera.hpp), [`src/camera.cpp`](../src/camera.cpp) |
| 값과 수명 | `Vec3` 나눗셈은 0을 거부하지 않고 `operator==`는 정확 비교이다. `HitRecord::shape`는 장면보다 오래 보관할 수 없는 비소유 포인터이다. | [`include/ray/math.hpp`](../include/ray/math.hpp), [`src/math.cpp`](../src/math.cpp), [`include/ray/geometry.hpp`](../include/ray/geometry.hpp) |
| 광선 매개변수 | `Ray`는 direction을 정규화하지 않는다. `t`와 `t_min`/`t_max`는 비단위 광선에서 세계 거리와 다르다. | [`src/math.cpp`](../src/math.cpp), [`src/shading.cpp`](../src/shading.cpp) |
| 유한 파생 계산 | 단순 제곱합 대신 `std::hypot`을 쓰지만 실제 길이가 표현 범위를 넘는 큰 유한 방향은 0벡터로 정규화될 수 있다. 큰 좌표·크기도 dot·제곱·bounds에서 inf/NaN을 만들 수 있다. 공개 카메라 API는 parser의 범위를 우회하며 viewport 파생값을 다시 검사하지 않는다. | [`src/math.cpp`](../src/math.cpp), [`src/geometry.cpp`](../src/geometry.cpp), [`src/accel.cpp`](../src/accel.cpp), [`src/camera.cpp`](../src/camera.cpp) |
| 수치·인덱스 | AABB의 평행 판정은 `direction == 0.0`이고 도형·노드 인덱스는 범위 검사 없이 `uint32_t`로 줄인다. 원기둥 경계의 바깥쪽 확장이 모든 누적 오차를 덮는다는 보장도 없다. | [`src/accel.cpp`](../src/accel.cpp), [`src/geometry.cpp`](../src/geometry.cpp), [`src/scene.cpp`](../src/scene.cpp) |
| 결과 식별 | 체크섬은 너비·높이의 하위 16비트와 픽셀을 섞은 회귀 키이다. 충돌 없는 이미지 식별자나 파일 무결성 형식은 아니다. | [`src/output.cpp`](../src/output.cpp), [`tests/render_determinism.sh`](../tests/render_determinism.sh) |
| 자동 검증 | 정해진 장면에서 선형/BVH와 작업자 1개/4개를 비교하고, 잘못된 이미지·출력 실패·작업자 예외·장면 변경을 주입한다. 픽셀별 방문 기록, ThreadSanitizer와 자동 시간 회귀는 없다. | [`CMakeLists.txt`](../CMakeLists.txt), [`tests/accel_tests.cpp`](../tests/accel_tests.cpp), [`tests/render_tests.cpp`](../tests/render_tests.cpp) |

## `Ray::t`는 타입이 강제하는 거리가 아니다

`Ray(origin, direction)`은 direction을 받은 그대로 저장하고
`at(t) = origin + direction * t`를 계산한다. 카메라 광선과 그림자 광선은
단위 direction을 만들고, 그 경로에서 반사한 direction도 단위 길이를
유지한다. 그러나 `Scene::intersect`, `findNearestHit`, `isOccluded`는 공개
C++ API이며 비단위 광선을 거부하거나 정규화하지 않는다.

따라서 교차 결과 `t`는 광선 매개변수이고 direction 길이가 1일 때만 세계
거리와 같다. 특히 `isOccluded(shadow_ray, max_distance)`는 caller가 단위
direction과 그에 대응하는 거리 상한을 넘긴다는 전제가 있다.

두 상수도 역할이 다르다.

- `kEpsilon = 1e-6`: 영벡터, 평행 판정, 퇴화 반지름·높이, 원기둥 seam 등
  여러 수치 비교에 재사용
- `kRayTMin = 1e-4`: 교차 매개변수 하한이면서 법선 방향의 세계 좌표 원점
  offset

비단위 광선에서는 `kRayTMin` 매개변수 하한이 뜻하는 실제 이동 거리가
direction 길이에 따라 바뀌지만, 법선 offset은 그대로 `1e-4` 세계 단위다.
현재 API는 이 둘을 타입으로 구분하지 않는다.

direction 크기는 `t`만 역비례해 바꾸는 것도 아니다. 구는
`dot(direction, direction) <= kEpsilon`, 평면과 원기둥 덮개는 법선과의
dot 절댓값 `<= kEpsilon`, 원기둥 옆면은 축에 수직인 direction 제곱
`<= kEpsilon`을 퇴화·평행으로 취급한다. 따라서 같은 기하학적 반직선의
direction을 충분히 작게 스케일하면 `t` 재척도에 그치지 않고 교차 자체가
거절될 수 있다. 공개 API의 비단위 `Ray` 계약은 direction scale에
불변하지 않다.

## 유한 token은 유한 장면 계산을 보장하지 않는다

파서는 `std::isfinite`로 각 실수 token을 확인하고 `Vec3::length()`는
`std::hypot`을 사용한다. 이는 단순 제곱합의 중간 overflow를 줄이지만 이후의
모든 연산을 보호하지 않는다.

- 방향·법선·축의 유한 성분이 너무 커 실제 길이가 `double` 범위를 넘으면
  `hypot` 결과가 `inf`일 수 있다. `length() <= kEpsilon` 검사는 이를 통과시키고,
  각 성분을 `inf`로 나누어 0벡터가 될 수 있다. 카메라는 frame 생성 때 기본
  forward를 쓰고, 평면과 원기둥은 퇴화해 교차하지 않을 수 있다.
- 구·원기둥 교차는 dot, 제곱과 판별식을 계산한다.
- 원기둥 bounds는 반지름 제곱, 높이와 축 성분을 조합한다.
- BVH는 bounds와 centroid를 합친다.
- 카메라는 `tan(fov/2)`와 종횡비로 viewport를 만들고 전달받은
  `CameraFrame`과 pixel 좌표로 방향을 계산한다.

극단적으로 큰 유한 방향·좌표·크기는 정규화와 기하 단계에서 0벡터, inf/NaN을
만들 수 있고, 현재 코드는 파생값마다 유한성을 다시 검사하지 않는다.
파서의 FOV와 해상도는 더 좁게 제한되지만 공개 C++ API는 그 범위를 강제하지
않고 임의의 유한 pixel 좌표나 다른 `CameraFrame` 조합도 받는다. 따라서
viewport 경로의 전제도 parser 계약과 직접 API 계약을 나누어야 한다. 이는
parser가 `NaN` token을 허용한다는 뜻이 아니라, 입력 검증 범위와 계산
closure가 다르다는 뜻이다. 현재 문법의 정확한 범위는
[장면 형식](../docs/scene-format.md)에 있다.

## 스레드를 못 만든 경우와 작업자가 실패한 경우

스레드 생성 실패와 작업자 본문 실패는 발생 위치가 다르지만 같은 회수 경계로
모인다. 스레드를 만들다가 실패하면 다음 타일 번호를 끝으로 옮기고 이미 시작한
스레드를 회수한다. 각 작업자는 자신의 `std::exception_ptr` 슬롯을 가진다.
`traceRay()`나 BVH 순회가 예외를 던지면 작업자 본문이 이를 잡아 자기 슬롯에
보관하고 다음 타일 번호를 끝으로 옮긴다.

이미 타일을 처리 중인 다른 작업자는 그 타일을 마칠 수 있지만 새 타일은
배정받지 않는다. 모든 `std::thread`를 `join()`한 뒤 호출자 스레드가 작업자 번호
순서로 저장된 예외를 찾아 다시 던진다. 이는 시간상 첫 예외 선택을 보장하는
규칙은 아니다.
따라서 작업자 스레드에서 예외가 빠져나가 즉시 종료되지 않고 호출자 스레드에서
다시 나타나며, `Image`를 반환하거나 출력 경로를 열지 않는다. 그 예외가
`std::exception` 계열이면 [`main()`의 `catch`](../src/main.cpp)가 종료 상태 1로
처리한다. 그 밖의 타입은 CLI 처리 범위 밖이다. `std::runtime_error`를 던지는 검사
도형은 호출자 재전파와 시작한 작업자 회수를 고정한다.

## PPM을 완성한 뒤에만 최종 경로를 바꾼다

`writePpm()`은 쓰기 전에 `Image`의 양의 폭·높이와
`pixels.size() == width × height × 3`을 확인한다. 불일치한 직접 생성 이미지는
직렬화하기 전에 예외로 거부하므로 픽셀 벡터 범위를 벗어나 읽지 않는다.

공개 절차는 다음 순서로 구성한다.

```text
크기와 픽셀 배열 검증
→ 최종 파일과 같은 디렉터리의 임시 파일 열기
→ 전체 PPM 쓰기
→ flush와 close 결과 확인
→ 최종 경로로 교체
→ 실패 시 임시 파일 삭제 시도
```

같은 디렉터리의 임시 파일을 쓰면 파일 시스템이 다른 경로 사이의 이동 문제를
피할 수 있다. 쓰기·flush·close·최종 교체 중 하나라도 실패하면 기존 최종 파일을
보존하고 임시 파일 삭제를 시도한다. 삭제 실패는 소멸자에서 무시한다. 임시 이름은
시계 값과 프로세스 내부 카운터를 조합할 뿐 여러 프로세스 사이의 유일성을 보장하지
않고, 파일도 배타적으로 생성하지 않는다. 쓰기에 실패하는 `streambuf`는 직렬화
오류 전달을 확인한다. 최종 교체가 불가능한 기존 디렉터리 대상을 사용한 회귀는
오류 전달, 기존 내용 보존과 그 사례의 임시 파일 부재를 함께 확인한다.

원자적 이름 교체는 독자가 완성 파일만 보게 하는 조건이다. 전원 장애 뒤의
내구성까지 필요하다면 파일과 디렉터리 동기화 정책을 별도로 정해야 한다.

## 선언만 있고 렌더 경로에서 읽지 않는 설정

| 필드 | 기본값 | 현재 사용 |
| --- | ---: | --- |
| `samplesPerPixel` | `1` | 읽지 않는다. 모든 픽셀은 중심 광선 하나만 사용한다. |
| `maxDepth` | `4` | 금속 재질의 추가 반사 횟수로 사용한다. |
| `tMin` | `kRayTMin` | 읽지 않는다. 교차 경로가 `kRayTMin`을 직접 사용한다. |
| `tMax` | 무한대 | 읽지 않는다. 주 광선과 반사 광선의 최대 `t`는 무한대이다. |
| `accelMode` | `Bvh` | 선형 탐색과 BVH를 선택한다. |
| `threadCount` | `0` | `0`은 자동 선택, 양수는 요청 작업자 수이다. 타일 수보다 크게 만들지는 않는다. |

사용하지 않는 필드는 조용히 무시되므로 C++ 호출자가 설정이 적용됐다고 오해하기
쉽다. 계약을 명확하게 만드는 방법은 두 가지뿐이다.

- 기능을 제공하지 않는 동안 필드를 공개 타입에서 제거한다.
- 필드를 유지한다면 값을 검증하고 실제 광선 생성·교차 호출까지 전달한다.

`samplesPerPixel`을 연결할 때는 샘플 위치, 평균 시점, 난수 시드와 작업자 수가 달라도
결과를 재현할 규칙을 먼저 정해야 한다. `tMin`과 `tMax`는 주·반사 광선에 적용할
범위와 광원 거리로 상한을 정하는 그림자 광선의 규칙을 분리해야 한다. 검사는
기본값만 확인하지 말고 각 값을 크게 바꿨을 때 결과가 달라지거나 잘못된 값이
거부되는지도 확인해야 한다.

## 소유 도형과 BVH를 한 변경 경계에 둔다

`Scene`의 소유 도형 vector는 비공개이며, 외부에는 개수와 읽기 전용 조회만
노출한다. `Sphere`의 중심·반지름과 `Cylinder`의 중심·축·반지름·높이 같은 내장
도형의 기하 상태도 생성 뒤 외부에서 바꿀 수 없다. 따라서 컨테이너를 비우거나
내장 도형을 이동해 준비 플래그를 우회하는 경로를 API 수준에서 막는다. 다만 외부
파생 `Shape`는 삽입 전에 보관한 포인터나 자체 변경 메서드를 통해 기하를 바꿀 수
있으므로 이 불변성은 공개 확장점 전체에 강제되지 않는다.

새 도형은 `addShape()`로만 추가한다. null 입력은 아무 상태도 바꾸지 않는다.
새 원소 추가가 allocation 실패로 끝나면 `unique_ptr`의 nothrow 이동 조건 아래
기존 소유 도형과 파생 상태가 남는다. 성공하면 BVH와 경계 없는 목록을 비우고
준비 상태를 false로 만든다. 재구축 전 BVH mode 요청은 선형 탐색으로
fallback한다.

회귀 검사는 구축 뒤 도형을 추가한 장면이 오래된 BVH를 순회하지 않는지,
읽기 전용 조회 결과와 선형/BVH 교차가 일치하는지를 확인한다. 기하를 바꾸는
기능을 추가하려면 변경 메서드가 파생 상태를 같은 경계에서 무효화하거나 새
불변 도형으로 교체해야 한다.

도형과 BVH 노드 수를 `uint32_t`로 표현하므로 구축 전에 개수가 표현 범위 안인지도
확인해야 한다. 범위를 넘는 입력은 축소 변환하기 전에 명시적으로 거부해야 한다.

## 입력과 수치 계산에서 남은 작은 구멍

- 파서는 문법·의미 오류와 정상 EOF는 처리하지만 EOF가 아닌 스트림 실패를 별도로
  거부하지 않는다. 루프 뒤 `input.bad()`을 확인하고 공개 오류 타입으로 변환해야
  한다.
- `CameraFrame`은 자신을 만든 카메라와 해상도를 보관하지 않는다. 프레임이 필요한
  값을 모두 소유하게 하거나 생성 키를 함께 저장해 잘못된 조합을 거부해야 한다.
- AABB의 정확한 0 비교, 원기둥 옆면과 덮개가 같은 `t`인 경우의 선택, NaN이 직접
  C++ API로 들어오는 경우는 계약과 반례가 더 필요하다.
- 선형/BVH 교차 동치 검사는 `t`·점·법선·알베도·도형을 비교하지만 `frontFace`와
  재질 타입을 직접 비교하지 않는다.
- 광선 총계는 누락 하나와 중복 하나가 상쇄되는 경우를 찾지 못한다. 검사 전용
  픽셀·타일 방문표가 있어야 정확히 한 번 처리를 직접 확인할 수 있다.
- `ray-benchmark`는 체크섬과 도형 검사 감소를 스스로 검사하지만 CTest 대상은
  아니다. CI는 Linux와 macOS의 CTest, Linux의 ASan·UBSan까지 실행하며
  ThreadSanitizer, Windows, 배포 패키지와 벽시계 성능 회귀는 다루지 않는다.

렌더 기능도 픽셀 중심 샘플 하나, 감마 보정 없는 8비트 변환, 거리 감쇠 없는 확산광,
거칠기 없는 완전 반사와 P3 PPM 출력까지이다. 텍스처, 유전체, 메시, 변환 계층,
SIMD와 GPU 경로는 지원하지 않는다. 기능을 넓힐 때는 위 실패 경계를 먼저
보강해야 새 경로의 오류를 기존 경계 문제와 구분할 수 있다.

## 다음 확장에서 먼저 확인할 것

사용하지 않는 렌더 설정은 구현에 연결하거나 공개 타입에서 빼야 한다. 그 뒤에
입력 stream 실패, 인덱스 축소, 극단 좌표의 NaN과 평행 판정을 다루고,
픽셀별 방문표와 데이터 레이스 전용 검사를 더하는 순서가 남아 있다. 새 기하 변경
API를 추가할 때는 소유 도형과 파생 BVH가 한 변경 경계를 유지하는지도 함께
검증해야 한다.

## 관련 개발 기록

- [회귀 검사 층](../devlog/08-regression-layers.md)
- [CI와 검증 근거](../devlog/18-ci-and-evidence.md)
