# ray-scene-tracer

`.rt` 장면을 읽어 P3 ASCII PPM을 만드는 C++17 CPU ray tracer다. 구·평면·유한
원기둥, 환경광·점광원·그림자, 확산 재질과 깊이가 제한된 완전 반사 metal을
지원한다. 구와 원기둥은 BVH로 가속하고 평면은 별도 선형 목록에서 검사하며,
16×16 타일을 여러 작업자에게 배분해 결정적인 이미지 바이트를 만든다.

## 빌드와 실행

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=ON
cmake --build build --parallel
ctest --test-dir build --output-on-failure
./build/ray-scene-tracer scenes/basic.rt output.ppm --checksum
```

직접 CMake 구성·빌드는 3.16 이상을 기준으로 한다. `make`, `make test`도 같은
CMake 흐름을 감싸며, `cmake -E rm`을 쓰는 `make clean`까지 사용하려면 CMake
3.17 이상이 필요하다.

```text
ray-scene-tracer <scene.rt> <output.ppm> [--checksum]
                 [--accel linear|bvh]
                 [--threads N|auto]
                 [--max-depth 0..32]
```

- `--accel`: 기본 `bvh`; 비교 기준선 `linear`도 선택 가능
- `--threads`: 기본 `auto`; 양의 정수 또는 `auto`
- `--max-depth`: 기본 4; metal 반사를 추가로 확장할 횟수 0..32
- `--checksum`: 이미지 크기 일부와 픽셀 byte를 섞은 16자리 FNV-1a 회귀 키를
  stdout에 출력

알 수 없거나 중복된 옵션과 잘못된 옵션 값은 사용법을 stderr에 쓰고 status 2로
끝난다. 파싱·렌더·파일에서 전달된 `std::exception`은 status 1, 성공은 0이다.
작업자에서 발생한 `std::exception`도 모든 작업자를 회수한 뒤 호출자에게 다시
전달되어 같은 status 1 경로로 끝난다. 그 밖의 예외 타입은 CLI 처리 범위 밖이다.

PPM 저장은 이미지 차원과 픽셀 저장 크기를 먼저 확인한다. 최종 파일과 같은
디렉터리의 임시 파일을 완전히 쓰고 flush와 close 성공을 확인한 뒤 최종 경로로
교체한다. 교체 전 실패나 교체 실패에는 기존 출력을 보존한 채 임시 파일 삭제를
시도한다. 삭제 실패는 별도로 보고하지 않는다.

## 지원 범위

픽셀당 표본은 중심 광선 하나이고 gamma correction은 없다. 유전체, texture,
rough metal, mesh, transform 계층, dynamic BVH, SIMD/GPU와 P6 출력은
구현하지 않는다. 지원 범위는 현재 저장소의 공개 코드와 검사에서 확인되는
계약이며 다른 비공개 사양 전체와의 일치를 주장하지 않는다.

## 문서

- [장면 형식](docs/scene-format.md): 지시어별 token 수, 값 범위와 오류 위치
- [장면에서 첫 이미지까지](architecture/scene-to-first-image.md): 입력, 광선,
  이미지와 PPM 공개 흐름
- [선형 탐색과 BVH](architecture/correctness-preserving-acceleration.md): 경계,
  동률 규칙과 가속 상태 불변식
- [재질과 병렬 결정성](architecture/materials-and-deterministic-parallel-rendering.md):
  반사 깊이, 타일 소유권과 작업자 실패 전파
- [실패와 확장 경계](architecture/failure-and-extension-boundaries.md): 공개 API 전제와
  아직 자동화하지 않은 범위
- [검증](docs/verification.md): 회귀 검사, benchmark, CI와 근거의 한계
- [개발 기록](devlog/README.md): 실제 커밋 시간표와 문제별 읽기 순서
