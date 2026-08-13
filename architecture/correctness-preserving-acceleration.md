# 선형 탐색의 선택 규칙을 보존하는 BVH 경로

BVH는 도형을 검사하는 순서를 바꾸지만 교차 결과의 의미까지 바꾸면 안 된다. 이 프로젝트는 선형 탐색을 기준 경로로 남겨 두고, 고정 회귀 장면에서 BVH의 주요 교차 필드와 픽셀 바이트가 같은지 확인한다.

사용 방법은 [프로젝트 안내](../README.md)에 있다. 여기에는 장면의 도형이
유한·무한 경로로 갈라졌다가 하나의 후보 선택 규칙으로 다시 모이고, 소유
도형과 파생 가속 상태의 최신성을 함께 지키는 구조를 이어 놓았다.

## 가속 전부터 존재하던 동일 `t` 규칙

`src/scene.cpp`는 도형을 입력 순서대로 검사하고 지금까지 찾은 광선 매개변수
`closest`를 다음 도형의 `t_max`로 넘겼다. 도형 교차 함수가 `t == t_max`를
허용하므로, 두 도형이 정확히 같은 `t`를 반환하면 입력에서 뒤에 있는 도형이
앞의 결과를 덮어쓰게 된다. `Ray`가 direction을 정규화하지 않는 공개 타입이므로
여기서 `t`를 항상 세계 거리라고 부르지는 않는다.

BVH는 공간 순서로 도형을 재배열한다. 같은 `t`에서 기존 결과를 그대로
유지하면 방문 순서에 따라 재질, 법선, 도형 포인터가 달라질 수 있다.
`Scene::intersect`는 원래 도형 인덱스를 함께 보관해 더 작은 `t`를 우선하고,
`t`가 같으면 원래 인덱스가 큰 도형을 선택한다.

더 작은 `t`의 후보가 우선하며, C++ `double`의 정확 비교에서 `t`가 같을
때만 원래 인덱스가 큰 도형을 선택한다. 비트 표현을 따로 비교하지 않으며,
허용 오차 범위에 있는 두 값을 동률로 취급하지도 않는다. BVH 말단의 저장
순서와 자식 방문 순서는 성능에 영향을 줄 수 있지만 최종 동률 규칙은 바꾸지
않는다. 현재 코드는 [`src/scene.cpp`](../src/scene.cpp)에서 확인할 수 있다.

## 실제 도형보다 작아서는 안 되는 상자

가속 구조의 AABB는 실제 도형을 모두 포함해야 한다. 상자가 실제 도형보다 조금 크면 불필요한 교차 검사가 늘어나지만 결과는 유지된다. 상자가 작으면 실제 교차를 BVH가 미리 제거할 수 있다.

`src/accel.cpp`, `src/geometry.cpp`는 도형 인터페이스에 `bounds()`를 추가하고 슬래브 방식 교차를 구현했다. 광선 방향 성분이 정확히 0이면 나눗셈을 하지 않고 원점이 해당 슬래브 안에 있는지 확인한다.

```cpp
if (direction == 0.0) {
    if (origin < slab_min || origin > slab_max) {
        return false;
    }
    continue;
}
```

각 도형은 성질에 맞게 경계를 제공한다.

- 구는 각 축에서 `center - radius`와 `center + radius`로 계산한 상자를 반환한다. 구의 경계에는 `nextafter`를 이용한 바깥쪽 패딩이 없다.
- 평면은 무한하므로 경계를 제공하지 않는다.
- 유한 원기둥은 축 성분과 반지름으로 각 축의 경계 범위를 계산한 뒤 `nextafter`로 상자를 바깥쪽 한 단계 확장한다.

원기둥의 확장은 다음과 같이 적용한다.

```cpp
minimum.x = std::nextafter(
    minimum.x, -std::numeric_limits<double>::infinity());
minimum.y = std::nextafter(
    minimum.y, -std::numeric_limits<double>::infinity());
minimum.z = std::nextafter(
    minimum.z, -std::numeric_limits<double>::infinity());
maximum.x = std::nextafter(
    maximum.x, std::numeric_limits<double>::infinity());
maximum.y = std::nextafter(
    maximum.y, std::numeric_limits<double>::infinity());
maximum.z = std::nextafter(
    maximum.z, std::numeric_limits<double>::infinity());
```

이 처리의 목적은 반올림 때문에 경계가 실제 원기둥보다 작아질 가능성을 줄이는 것이다. 경계 범위 계산식의 `kEpsilon`과 `nextafter`를 함께 쓴 수치 오차 한계가 별도의 형식 증명으로 남아 있지는 않는다. 상자 교차는 [`src/accel.cpp`](../src/accel.cpp)에, 도형별 경계 계산은 [`src/geometry.cpp`](../src/geometry.cpp)에 있다.

## 상자를 만들 수 없는 평면은 트리 밖에 둔다

`include/ray/accel.hpp`, `src/accel.cpp`, `src/scene.cpp`는 유효한 경계를 제공하는 도형만 BVH에 넣고, 경계가 없거나 무효한 도형은 별도 목록에 보관하도록 구성했다.

```text
Scene의 비공개 소유 도형
  ├─ 유효한 bounds       ──> vector<BvhPrimitive> ──> Bvh::nodes_ + primitiveIndices_
  └─ 없거나 무효한 bounds ──> unboundedIndices_
```

평면에 임의로 큰 상자를 부여하지 않기 때문에 장면 규모에 따라 평면이 잘리는
문제가 없다. BVH 순회가 끝난 뒤 무한 도형도 같은 `test_shape(index)` 함수로
검사하므로 `t`와 원래 인덱스 규칙을 그대로 적용한다. 무한 도형이 많으면 그
부분은 선형으로 남는다.

`Bvh`는 노드와 말단 도형 인덱스를 각각 연속된 `std::vector`에 저장한다. 노드는 동적 포인터 대신 자식 노드 번호 또는 말단 범위의 시작 위치와 개수를 가진다. 말단에는 최대 네 도형이 들어간다.

```cpp
const std::uint32_t count = last - first;
if (count <= 4) {
    nodes_[node_index].first = first;
    nodes_[node_index].count = count;
    return node_index;
}
```

구축 과정은 현재 범위에 속한 도형의 AABB를 합치고 중심점(`centroid`) 범위를 구한 뒤, 그 범위가 가장 긴 축을 골라 중앙에서 나눈다. 같은 중심점은 원래 `shapeIndex`로 정렬하므로 같은 입력에서는 안정된 구축 순서를 얻는다. 이 정렬은 트리 재현성에 도움이 되지만 선형 결과와의 동등성을 직접 보장하는 장치는 아니다. 결과 선택은 여전히 원래 도형 인덱스를 사용하는 후보 갱신 규칙이 담당한다.

## 구축·순회 비용을 따로 본다

경계를 가진 도형 수를 `n`, 경계가 없는 도형 수를 `u`라고 하자. 각 내부
재귀 구간은 자신의 primitive 범위를 다시 `stable_sort`하고 중앙에서 반으로
나눈다. 한 레벨의 정렬 합이 O(n log n)이고 레벨이 O(log n)이므로 일반적인
comparison sort 비용 모델에서 현재 구축은 약 O(n log² n)이다. SAH나 한 번의
전역 정렬을 쓰는 O(n log n) builder가 아니다.

이 O(n log² n)은 `stable_sort`가 임시 buffer를 확보해 각 호출에서
O(m log m) 비교를 하는 통상 경로다. C++17 알고리즘 계약은 충분한 추가
메모리를 얻지 못한 `stable_sort` 호출에 O(m log² m) 비교까지 허용한다.
그 fallback이 각 재귀 구간에서 쓰이면 builder 전체의 비교 횟수 상한은
O(n log³ n)까지 늘 수 있다. 구현이 buffer 할당 실패를 예외로 끝내는
경로라면 완성된 BVH가 없고, 그 실패 뒤 Scene 상태는 아래 수명 절에서 다룬다.

노드와 primitive index, 구축 중 primitive 배열은 O(n) 저장 공간을 쓴다.
중앙 분할이라 재귀 깊이는 O(log n)이다. 한 광선의 BVH 순회는 잘 잘린
장면에서 많은 도형을 건너뛸 수 있지만 평균 O(log n)을 계약하지 않는다.
모든 상자가 겹치면 노드와 bounded primitive를 모두 보아 최악 O(n)이며,
unbounded 목록 `u`개는 항상 별도로 O(u) 검사한다. 선형 경로는 장면의 전체
도형 수에 비례한다.

이 복잡도는 primitive/AABB 호출 수와 저장 구조를 설명한다. cache 효과,
분기, `std::vector` 할당과 실제 벽시계 시간은 별도 측정 대상이다.

## 가까운 자식부터 보되 결과 순서는 따로 지킨다

BVH 순회는 명시적 스택을 사용한다.

1. 루트 AABB의 진입 `t`를 스택에 넣는다.
2. 꺼낸 노드의 진입 `t`가 현재 `closest`보다 크면 건너뛴다.
3. 말단이면 저장된 원래 도형 인덱스로 교차를 검사한다.
4. 내부 노드이면 두 자식 AABB를 검사한다.
5. 먼 자식을 먼저 스택에 넣어 가까운 자식을 먼저 꺼낸다.
6. BVH 순회가 끝나면 경계가 없는 도형을 검사한다.

두 자식의 진입 `t`가 같으면 노드 인덱스가 작은 쪽을 먼저 방문한다.

```cpp
const bool left_first =
    left_entry < right_entry ||
    (left_entry == right_entry &&
     node.left < node.right);
```

가까운 자식 우선은 도형 검사를 줄이기 위한 순회 방식일 뿐 동률 도형의 우선순위가 아니다. 최종 결과는 [`src/scene.cpp`](../src/scene.cpp)의 공통 후보 갱신에서 정한다.

## 도형 원본과 파생된 BVH의 수명

장면은 소유 도형, 파생된 BVH, 경계가 없는 도형 인덱스, 준비 플래그를 함께 가진다. `addShape`는 null이 아닌 새 도형을 받은 경우에만 도형을 추가하고 파생 상태를 비운 뒤 준비 플래그를 내린다.

```cpp
if (shape) {
    shapes_.push_back(std::move(shape));
    bvh_.clear();
    unboundedIndices_.clear();
    accelerationReady_ = false;
}
```

준비되지 않은 장면에서 BVH 모드를 요청하면 오래된 구조를 쓰지 않고 선형 탐색으로 돌아간다.

`shapes_.push_back`이 새 원소를 추가하기 전에 실패하면 뒤의 세 무효화 문장은
실행되지 않는다. 현재 원소 타입은 nothrow 이동하는 `unique_ptr`이므로
allocation 실패에서는 기존 도형과 기존 파생 상태를 그대로 사용할 수 있다.
성공한 추가 뒤에는 BVH와 unbounded 목록이 비고 준비 플래그가 false가 되어
BVH 요청도 재구축 전까지 선형 경로로 돌아간다.

파서는 도형을 모두 추가한 다음 한 번만 `buildAcceleration()`을 호출하므로 정상
CLI 흐름에서는 완성된 BVH를 사용한다. 소유 도형 vector는 `Scene` 내부에
비공개로 두고, 호출자는 개수와 읽기 전용 도형 조회만 할 수 있다. 내장 도형의
위치, 축과 크기도 생성 뒤 외부에서 바꿀 수 없게 감쌌다. 따라서 컨테이너를 직접
비우거나 구축 뒤 내장 도형을 이동해 준비 플래그를 우회하는 경로가 없다. 외부 파생
`Shape`가 자체 변경 메서드나 보관된 포인터를 노출하는 경우까지 막지는 않는다.

새 도형은 `addShape()`를 거쳐서만 추가하며, 성공한 추가 직후 파생 상태를
무효화한다. 재구축을 마치기 전 BVH 요청은 선형 탐색으로 돌아가므로 이전
인덱스나 경계를 새 도형 목록에 적용하지 않는다. 이 불변식은 장면 변경 뒤
선형/BVH 결과를 비교하고, 읽기 전용 조회가 소유권을 넘기지 않는 회귀 검사로
고정한다.

## 교차 결과와 픽셀을 함께 맞춘 검사

`tests/accel_tests.cpp`는 빈 장면, 구 하나, 평면만 있는 장면, 임의 축 원기둥, 같은 위치의 구 두 개에서 선형과 BVH 결과를 비교한다. 교차 여부, `t`, 교차점, 법선, `albedo`, 실제 도형 포인터를 확인한다. `t`에는 `1.0e-9` 허용 오차를 두고 `Vec3 ==`는 구성 `double` 값에 C++의 정확 비교를 적용한다.

```cpp
require(linear_hit.shape == bvh_hit.shape,
        label + " primitive");
```

같은 파일은 구 400개, 평면 1개, 광원 2개로 만든 160×90 장면을 두 방식으로 렌더한다.

```cpp
require(linear.pixels == bvh.pixels,
        "linear and BVH pixels");
require(ray::checksumHex(linear) == ray::checksumHex(bvh),
        "linear and BVH checksum");
require(bvh_stats.primitiveTests * 4 <
            linear_stats.primitiveTests,
        "BVH primitive test reduction");
```

픽셀 전체가 같아야 하고 BVH의 실제 도형 교차 호출은 선형의 25% 미만이어야 한다. AABB 검사, 스택 순회, 캐시 효과, BVH 구축 시간은 이 비율에 포함되지 않는다.

`ray-benchmark`는 같은 수의 구와 광원을 640×360으로 렌더해 더 큰 장면의 반복
카운터와 시간을 기록한다. 이 실행 파일은 CMake에서 빌드되지만 CTest에 등록되어
있지 않으며 CI 구성도 실행하지 않는다. 저장된 성능 수치는 한 환경에서 얻은
관찰값일 뿐 다른 장면과 환경의 속도를 보장하지 않는다.

## 이 지도 밖에 남은 경계

- 선택된 AABB와 장면만 검사하므로 모든 축, 극단 크기, 거의 평행한 광선, 모든 원기둥 방향을 포괄하지 않는다.
- 임의 장면을 생성하는 속성 기반 비교는 없다.
- 파서는 비유한 수와 퇴화 축을 거부하지만 C++ API 생성자로 직접 잘못된 도형을 만드는 경우는 제한하지 않는다.
- 동률 규칙은 정확히 같은 `double` 값에만 적용한다. 아주 가깝지만 다른 두 값에는 더 작은 값이 우선한다.
- 도형 교차 호출 수는 전체 CPU 시간이나 메모리 비용과 같지 않다.
- 메모리 할당 실패를 모든 BVH 구축 지점에 결정적으로 주입하는 검사는 없다.
- 극단적으로 큰 유한 좌표와 크기가 AABB 계산 중 inf/NaN을 만들지 않는다는
  보장은 없다.

이 제한 안에서 선형 탐색은 삭제하지 않고 결과 기준선으로 남는다. 새로운 가속 방식을 추가할 때도 먼저 같은 교차 결과와 같은 픽셀을 요구하고, 그다음 작업량과 시간을 따로 비교할 수 있다.

## 관련 개발 기록

- [보수적 경계](../devlog/12-conservative-bounds.md)
- [BVH 동치](../devlog/13-bvh-equivalence.md)
