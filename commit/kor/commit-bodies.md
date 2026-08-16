## chore(project): CXX17 실행 골격과 직접 빌드 구성
ray tracing 기능을 도입하기 전에 최소한의 C++17 실행 파일과 Make 기반 직접 빌드 구성을 마련한다. 빌드는 현재 소스 파일을 탐색하고 프로젝트의 경고·최적화 정책을 적용하며, `--help`를 통해 사용법만 제공하는 안정적인 명령줄 경계를 노출한다. 생성된 바이너리, 오브젝트 파일, 의존성 파일, 빌드 디렉터리는 버전 관리에서 제외한다.

첫 실행 환경의 역할을 의도적으로 인자 검증에만 한정함으로써, 이후 커밋에서 프로젝트 골격 구성과 도메인 구현을 뒤섞지 않고 재현 가능한 컴파일 대상과 관찰 가능한 CLI 계약을 사용할 수 있게 한다.

## feat(math): 벡터 값과 산술 연산 구현
기하와 색상에서 공통으로 사용할 값 표현으로 `ray::Vec3`를 도입하고, 이후 모든 ray tracing 하위 시스템에 필요한 성분별 생성과 기본 산술 연산을 구현한다. `Color`는 별도의 저장 타입이 아니라 alias로 정의하여, 호출 지점에서는 의도를 구분하면서도 동일한 3성분 연산을 공간 계산과 radiometric 계산에 함께 사용할 수 있게 한다.

공개 선언은 `include/ray` 아래에 배치하고 umbrella header에서 모아 제공하며, 명시적인 include 경로를 통해 직접 빌드에서도 사용할 수 있게 한다. 수학 상태를 실행 파일 내부에 두는 대신 재사용 가능한 라이브러리 경계를 마련한다.

## feat(math): 벡터 길이와 기하 연산 구현
벡터 계층에 norm, dot product, cross product, 정규화, near-zero 판정을 추가한다. 이 연산들은 하위 시스템마다 좌표 공식을 중복 구현하지 않고 카메라 basis 구성, 교차 계산, normal 방향 결정, 퇴화한 방향 비교에 필요한 기하 연산의 공통 기반을 제공한다.

정규화는 벡터의 크기가 공통 epsilon 이하이면 영벡터를 반환한다. 수치적으로 무시할 수 있는 길이로 나누는 일을 방지하고 `isNearZero`를 통해 호출자에게 퇴화 상태를 명시적으로 드러낸다. 다만 반드시 0이 아니어야 하는 방향을 거부하는 책임은 이후 입력 검증에 남겨 둔다.

## feat(math): 벡터 비교와 색상 범위 연산 추가
렌더링과 검증에 필요한 벡터 값 의미론을 완성한다. 성분별 곱셈은 albedo, 광원 색상, 환경광 색상을 결합할 때 사용하는 Hadamard product를 제공하고, 복합 대입 연산은 좌표별 연산을 반복해서 노출하지 않고 값을 누적할 수 있게 한다. 정확한 비교와 스트림 포맷팅을 통해 결정적 값을 직접 테스트하고 진단할 수도 있다.

스칼라와 색상 clamp 연산은 수학 계층에 모아 픽셀 변환과 shading이 동일한 출력 범위를 적용하도록 한다. 동등 비교 연산자는 암묵적인 오차 허용치를 도입하지 않고 저장된 성분을 의도적으로 정확히 비교하며, 근사 기하 비교는 호출자가 명시적으로 처리하도록 남겨 둔다.

## feat(ray): 광선 위치 계산 모델 추가
원점과 방향으로 구성된 명시적 `Ray` 값을 추가하고, 매개변수 위치는 `at(t)` 하나로 정의한다. 모든 교차 루틴이 `origin + t * direction`이라는 동일한 관계를 사용하게 하여, 개별 도형이 서로 미묘하게 다른 규약으로 이 계산을 다시 구현하는 일을 막는다.

Ray는 방향을 자동으로 정규화하지 않는다. 전달받은 방향을 그대로 보존해 광선 생성 비용을 낮고 범용적으로 유지하고, 단위 방향이 필요한지는 카메라 생성 등 각 호출자가 자신의 계약에 따라 결정하도록 한다.

## feat(material): diffuse 재질 값 모델 추가
구체적인 도형과 독립적으로 표면 albedo를 소유하는 재질 값을 도입한다. 외형과 기하를 분리하여 sphere, plane, cylinder 구현에 색상 동작을 하드코딩하지 않고, 교차 코드가 공간 정보와 함께 장면에서 선택된 표면 반응을 반환할 수 있게 한다.

초기 재질은 diffuse 색상만 지원하며, 중립 기본값으로 흰색을 사용한다. 이 작은 표현은 기본 Shape 인터페이스를 바꾸지 않고 이후 재질 종류를 확장할 수 있는 안정적인 지점을 마련한다.

## feat(geometry): hit와 도형 교차 계약 정의
다형적 도형 경계와 교차 성공 시 생성되는 완전한 기록을 정의한다. 모든 도형은 호출자가 지정한 `[t_min, t_max]` 구간에서만 광선을 평가해야 하며, 성공하면 매개변수, 교차점, 방향이 정리된 normal, 재질, 원본 도형, 앞면/뒷면 상태를 제공해야 한다.

`HitRecord::setFaceNormal`은 저장되는 normal이 입사 광선의 반대 방향을 향하도록 하면서 광선이 바깥면에 부딪혔는지도 보존하는 규칙을 한곳에 모은다. 각 primitive가 서로 다른 방향 규약을 선택하지 못하게 하고 shading에 일관된 normal 계약을 제공한다. virtual destructor와 material accessor도 추상 `Shape` 인터페이스를 통한 소유권 처리를 안전하고 명시적으로 만든다.

## feat(geometry): 구 교차 계산 구현
광선 방향이 정규화되어 있다고 가정하지 않고 이차방정식으로 sphere 교차를 구현한다. 따라서 계수 `a`를 그대로 유지하고, 퇴화한 방향과 양수가 아닌 반지름을 거부하며, 가까운 근을 먼저 확인한 뒤 먼 근을 확인하되 두 근 모두 호출자가 지정한 구간 안에서만 허용한다.

교차에 성공하면 sphere의 재질, 원본 포인터, 면 방향에 맞춘 normal을 포함해 공통 record 계약에 따라 hit 정보를 채운다. `t_min`과 `t_max`를 기준으로 근을 선택하므로, sphere 내부에 순회 정책을 넣지 않고도 최근접 hit 탐색과 범위가 제한된 shadow query 모두에 사용할 수 있다.

## feat(geometry): 평면 교차 계산 구현
생성 시 normal을 한 번 정규화한 뒤 모든 광선 질의에서 재사용하는 무한 평면 primitive를 추가한다. 교차 계산은 분모로 나누기 전에 퇴화한 normal과 평면에 사실상 평행한 방향을 거부하고, 이후 sphere와 동일하게 호출자가 지정한 `t` 구간과 hit record 계약을 적용한다.

평면을 한 점과 단위 normal로 표현해 임의의 유한 크기에 의존하지 않는 방정식을 유지한다. normal 방향 정리 helper를 사용하여 평면 어느 쪽에서 교차하더라도 shading에 동일한 규약을 적용한다.

## feat(geometry): 유한 원기둥 옆면 교차 구현
임의 방향을 갖는 유한 원기둥의 옆면 교차를 구현한다. 광선의 원점과 방향을 정규화된 원기둥 축에 평행한 성분과 수직인 성분으로 분해하고, 수직 평면에서 이차방정식을 풀어 무한 원통의 교차 후보를 구한 뒤 축 방향 좌표를 유한 높이 범위로 제한한다.

퇴화한 축과 크기, 옆면에 평행한 광선을 거부하고, 점차 좁아지는 hit 구간 안에서 두 근을 모두 평가한다. 교차점에서 축 방향 성분을 제거해 outward normal을 구한다. 이렇게 반지름 방향 교차와 유한 길이 clipping을 분리하여 원기둥이 특정 world axis에 정렬되어 있다고 가정하지 않는다.

## feat(geometry): 원기둥 cap과 최근접 hit 선택 완성
양쪽 end-cap 평면과의 교차를 계산하고 cap 반지름 안에 있는 점만 허용하여 원기둥을 닫힌 유한 primitive로 완성한다. 옆면과 cap 후보는 공통 closest-hit updater를 거치므로 모든 표면에 동일한 구간 검사, record 구성, 재질 대입, normal 방향 정리, 현재 상한 축소 규칙이 적용된다.

하나의 질의에서 광선이 옆면과 cap을 모두 만날 수 있으므로 후보 선택을 통합하는 것이 중요하다. 각 해석적 경우를 어떤 순서로 평가하든 반환되는 record는 가장 가까운 유효 표면을 나타내야 한다. cap 경계에 작은 반지름 epsilon을 적용하여 부동소수점 반올림만으로 rim 위의 점이 거부되는 것도 방지한다.

## feat(scene): 카메라·조명과 장면 aggregate 구성
이미지 크기, 필수 지시어 상태, 환경광 항, 배경, 카메라, 광원, 소유 중인 도형 참조를 하나의 렌더링 가능한 모델로 묶는 aggregate로 `Scene`을 도입한다. 카메라와 광원 값에는 명시적인 기본값을 두되, `hasResolution`, `hasAmbient`, `hasCamera`는 저장된 값과 별도로 유지하여 파서가 "입력되지 않음"과 수치적으로 유효한 기본값을 구분할 수 있게 한다.

이 요소를 한곳에 모아 파서에는 단일 구성 대상을 제공하고, 이후 렌더러에는 모든 장면 입력의 읽기 전용 snapshot을 제공한다. 이 단계에서는 도형 소유권을 공유하여 공통 인터페이스를 통해 서로 다른 primitive를 담을 수 있게 하고, 더 엄격한 소유권 결정은 뒤로 미룬다.

## feat(scene): 선형 최근접 교차 탐색 구현
호출자가 직접 도형 저장소를 순회하지 않도록 장면이 가장 가까운 primitive hit를 선택하게 한다. 탐색은 호출자의 `t_max`에서 시작해 현재 최근접 값을 각 도형에 전달하고, 유효한 후보가 반환될 때마다 결과를 교체한다.

이 구현은 shading과 이후 가속 검증에서 사용할 선형 참조 동작을 정의한다. primitive는 현재 상한과 정확히 같은 값의 후보도 허용하므로, 장면 순서상 뒤에 있는 도형이 동일한 `t`의 hit를 대체할 수 있다. 이 관찰 가능한 선택 규칙은 가속 순회에서도 보존해야 하는 동작의 일부가 된다.

## feat(parser): 소스 위치 오류와 line tokenization 구성
입력 스트림과 호출자가 제공한 source name을 중심으로 파서 경계를 마련한다. `ParseError`는 구조화된 source와 line 정보를 보존하면서 같은 문맥을 `what()` 문자열에도 포함한다. CLI는 유용한 진단 정보를 출력할 수 있고, 테스트는 오류 문자열을 다시 파싱하지 않고 정확한 실패 위치를 검증할 수 있다.

공백 제거와 line tokenization은 파서 내부 utility로 추가한다. lexical preparation을 비공개로 유지해 장면 문법과 공개 모델을 분리하고, 파서가 실제 입력 줄을 한 줄씩 처리하도록 준비한다. 이는 검증 실패를 정확한 source line에 연결하는 데 필요하다.

## feat(parser): 유한 수와 범위 값 해석 구현
장면 문법을 위한 엄격한 스칼라 변환 helper를 추가한다. 숫자 token은 전체가 빠짐없이 소비되어야 하고, 부동소수점 값은 finite여야 하며, 차원은 양의 `int` 범위에 들어야 한다. 비율은 `[0, 1]`로 제한하고 기하 크기는 반드시 양수여야 한다. 모든 실패는 현재 source 위치에서 필드별 `ParseError`로 변환한다.

값이 `Scene`에 들어가기 전에 이를 검사하여 `NaN`, 무한대, 뒤따르는 잘못된 문자, overflow, 유효하지 않은 범위가 기하나 렌더링 계층으로 유입되지 않게 한다. 정확한 token 개수 helper도 각 지시어를 닫힌 문법으로 만들어 인자가 부족하거나 남는 경우를 조용히 허용하지 않게 한다.

## feat(parser): 벡터와 색상 token 해석 구현
장면 형식에서 사용하는 쉼표 구분 복합 token을 구현한다. 벡터는 비어 있지 않은 finite 성분 정확히 3개를 요구하고 진단 메시지에 필드별 성분 이름을 유지한다. 색상은 `[0, 255]` 범위의 정수 byte channel 3개를 요구하고, 한 번만 변환하여 렌더러에서 사용하는 정규화된 `[0, 1]` 표현으로 만든다.

쉼표 splitter는 빈 필드를 보존하므로 성분 누락이나 끝 구분자 같은 잘못된 형식을 제거해 버리지 않고 거부할 수 있다. 색상 decoding을 일반 벡터와 분리하여 소수나 범위를 벗어난 source channel이 실수로 허용되는 것도 막는다.

## feat(parser): 줄 단위 지시어 dispatch 기반 구성
파서의 실제 줄 처리 loop를 구성한다. 주석을 제거하고 양끝 공백을 정리한 뒤 빈 줄은 무시하며, 나머지 줄은 token화한 후 directive dispatch로 넘긴다. 이 loop와 함께 singleton 중복 검사와 nonzero-vector validator를 도입하여 각 handler가 동일한 위치 정보 기반 오류 타입으로 장면 전체 제약과 기하 제약을 적용할 수 있게 한다.

이 중간 단계에서는 아직 directive handler가 설치되지 않아 비어 있지 않은 모든 식별자가 unknown-directive 오류로 이어진다. 알 수 없는 문법을 포함한 부분적으로 채워진 장면을 반환하는 것보다 이러한 fail-closed 골격이 안전하며, 이후 커밋에서 지시어 계열을 하나씩 추가할 수 있는 제어 흐름 경계를 제공한다.

## feat(parser): 해상도와 환경광 지시어 지원
줄 단위 dispatch 골격에 첫 번째 실제 장면 지시어를 추가한다. `R`은 정확히 두 개의 양의 정수 차원을 요구하며 한 번만 나타날 수 있다. `A`는 범위가 제한된 비율 하나와 byte로 인코딩된 색상 하나를 요구하고 마찬가지로 singleton이다. 해당 presence flag는 모든 필드 파싱이 성공한 뒤에만 설정한다.

이 순서를 통해 첫 번째 항목이 잘못된 경우에도 중복 검사가 오염되지 않으며, 저장된 장면 상태와 검증 상태를 일치시킨다. 알 수 없는 식별자는 계속 무시하지 않고 해당 source line에서 실패한다.

## feat(parser): 카메라와 광원 지시어 지원
카메라와 point light 지시어를 정규화된 런타임 값으로 파싱한다. 카메라는 정확한 arity, 0이 아닌 방향, `(0, 180)`의 열린 FOV 범위를 요구하는 singleton이다. 방향은 입력 경계에서 정규화하여 카메라 구성 단계에 안정적인 방향 값을 전달한다. 광원은 여러 번 지정할 수 있으며 위치, 범위가 제한된 밝기, 정규화된 색상을 요구한다.

이 차이는 장면 모델을 그대로 반영한다. 활성 카메라는 하나지만 광원 목록의 개수는 제한하지 않는다. 파서에서 퇴화한 방향과 특이한 FOV 값을 거부하여 의미 있는 frame을 만들 수 없는 입력이 카메라 basis와 원근 투영 계산으로 넘어가지 않게 한다.

## feat(parser): 구와 평면 지시어 지원
sphere와 plane 문법을 다형적 geometry 모델에 연결한다. 입력의 지름은 양수인지 검증한 뒤 내부 반지름 규약으로 정확히 한 번 변환한다. plane normal은 constructor가 정규화하기 전에 퇴화 여부를 검사한다. 두 지시어 모두 색상을 재질 값으로 변환하고 생성한 도형을 scene 경계를 통해 추가한다.

문법별 단위와 검증을 파서에 유지하여 교차 클래스는 이미 검증된 자체 표현만 다루게 한다. 정확한 token 개수 검사는 지원하지 않는 material option으로 오인될 수 있는 뒤쪽 필드를 실수로 허용하는 것도 막는다.

## feat(parser): 원기둥 지시어 지원
중심, 축, 지름, 높이, 색상 필드를 명시적으로 갖는 유한 원기둥 지시어를 추가한다. 파서는 퇴화한 축과 양수가 아닌 크기를 거부하고, 입력 지름을 geometry 계층의 반지름 표현으로 변환한 뒤 모든 필드가 검증을 통과한 경우에만 임의 축 원기둥을 생성한다.

이를 통해 초기 도형 문법을 완성하면서 sphere와 plane에 적용한 계층 분리를 그대로 유지한다. 파일 형식 규약은 입력 경계에 남고, primitive는 정규화되고 내부적으로 의미 있는 값만 전달받는다.

## feat(parser): 필수 지시어 검증과 입력 loader 완성
파싱된 장면을 반환하기 전에 해상도, 환경광, 카메라가 반드시 존재하도록 하여 장면 구성을 완성한다. 필수 지시어 누락 오류는 잘못된 특정 줄이 아니라 파일 전체의 누락을 나타내므로 line 0을 사용한다. 이를 통해 구조화된 오류 계약에서 두 경우를 구분한다.

동일한 파서 구현 위에 stream, text, file 단위 진입점을 추가하고, 파일 열기 실패는 요청한 경로에 대한 `ParseError`로 보고한다. 유효한 scene fixture와 의도적으로 잘못된 fixture를 제공하여 재사용 가능한 end-to-end 입력으로 사용한다. 하나는 초기 지시어 계열 전체를 실행하고, 다른 하나는 알려진 줄의 범위 오류를 고정한다. 최상위 `loadScene` 함수는 렌더링 코드에 파일 처리를 노출하지 않으면서 실행 파일에 좁은 로딩 경계를 제공한다.

## feat(camera): 화면 좌표를 카메라 광선으로 변환
원근 카메라 frame 구성을 도입하고 image-space sample 좌표를 정규화된 world-space 광선으로 변환한다. frame은 직교정규 `forward`/`right`/`up` basis를 구하고, 수직 FOV와 aspect ratio로 viewport 크기를 계산한다. 또한 image-space의 수직 좌표를 뒤집어 픽셀 row가 증가할수록 아래쪽으로 이동하면서도 카메라의 up 방향은 양수로 유지되게 한다.

구현은 퇴화한 카메라 입력을 명시적으로 보정한다. forward 방향이 0이면 기본 시선 축을 사용하고, up 벡터가 없거나 forward와 거의 평행하면 안정적인 cross product를 만들 수 있는 축으로 교체한다. 차원을 최소 1로 clamp해 0으로 나누는 일을 방지하므로, 파서가 일반적으로 양의 크기를 보장하더라도 함수 자체가 방어적으로 동작한다.

## feat(render): 직접광과 그림자 추적 구현
광선 하나에서 표면 색상까지 이어지는 첫 번째 완전한 radiance 경로를 구현한다. 광선이 아무것도 맞히지 않으면 장면 배경색을 반환하고, hit가 있으면 albedo에 환경광을 곱한 값에서 시작해 방향이 정리된 표면 위쪽에 광원이 있고 해당 선분을 다른 primitive가 가리지 않을 때만 각 point light의 Lambertian 기여를 누적한다.

shadow ray는 normal 방향으로 아주 조금 offset된 지점에서 시작하고 광원 바로 앞에서 끝난다. 이 두 경계는 시작점의 self-intersection을 피하고 광원 뒤의 geometry가 잘못된 그림자를 만드는 것을 방지한다. nearest-hit와 occlusion helper는 모두 장면의 구간 기반 교차 계약을 사용하므로 shading 정책이 별도의 순회 구현을 갖지 않는다. 공개 depth 매개변수는 이미 존재하지만 반사 재질이 도입되기 전까지는 의도적으로 동작에 영향을 주지 않는다.

## feat(renderer): 직렬 이미지 렌더링 구현
이미지와 render settings 값 타입을 추가하고 결정적인 row-major 렌더러를 구현한다. 각 픽셀은 중심에서 한 번 샘플링되고, 카메라 모델을 통해 광선으로 변환된 뒤 장면을 trace한다. 결과 색상은 clamp하고 가장 가까운 byte 값으로 반올림하여 interleaved RGB buffer에 저장한다.

이로써 메모리 할당이나 순회 세부 구현과 무관한 출력 순서를 갖는 단순한 직렬 참조 pipeline이 생긴다. 명시적인 이미지 buffer는 렌더링과 파일 인코딩을 분리하고, settings 객체는 현재 loop에서 depth 설정만 사용하더라도 광선 범위, sampling, recursion 제어를 담을 안정적인 위치를 제공한다.

## feat(output): PPM 직렬화와 이미지 체크섬 구현
이미지 저장과 회귀 식별을 렌더링에서 분리한다. `writePpm`은 메모리의 RGB buffer를 명시적인 header와 픽셀당 한 줄을 갖는 P3 이미지로 출력하며, 출력 파일을 열지 못하면 아무 결과도 남기지 않고 넘어가는 대신 예외로 보고한다.

`checksumHex`는 이미지 크기와 픽셀 byte에 고정된 64-bit FNV-1a 방식의 연산을 적용하고 안정적인 16자리 16진수 key로 포맷한다. 크기를 해시에 포함해 모양이 다른 byte buffer가 같은 렌더링 이미지로 취급되지 않게 하며, 이미 양자화된 저장소를 해시하므로 체크섬은 부동소수점 중간값이 아니라 실제 관찰 가능한 출력을 나타낸다.

## feat(cli): 장면 렌더링 명령 연결
파서, 렌더러, 출력 writer, 체크섬 구성 요소를 실행 파일의 완전한 scene-to-image 명령으로 연결한다. 인터페이스는 scene 경로, output 경로, 선택적 `--checksum` flag만 허용한다. 잘못된 호출은 status 2의 usage error로 처리하고, 로딩·렌더링·쓰기 중 발생한 예외는 status 1의 runtime failure로 처리한다.

명령은 로딩 후 렌더링, 렌더링 후 쓰기 순서로 실행되므로 잘못된 scene 입력이 이 경로에서 이미지를 만들 수 없다. 예외 변환은 process boundary에만 두어 하위 계층의 구체적인 진단은 유지하면서 모든 runtime failure에 일관된 실행 파일 prefix를 붙인다. Make smoke target도 이제 인자 파서만 호출하는 대신 실제 pipeline을 실행한다.

## test(render): 장면 렌더링 smoke 검사 추가
최소 실행 파일 호출을 실패 격리와 결정적 성공을 모두 검증하는 end-to-end smoke test로 교체한다. 알 수 없는 지시어가 들어오면 명령이 실패해야 하며 렌더링된 이미지를 남겨서는 안 된다. 이를 통해 출력 생성 전에 장면 검증이 완료되어야 한다는 실행 순서를 고정한다.

대표적인 조명 장면을 서로 다른 파일에 두 번 렌더링한다. 테스트는 P3 magic, 이미지 크기, 최대 channel 값, 체크섬 형식과 안정성, 두 PPM 파일의 byte 단위 완전 일치를 확인한다. 임시 artifact는 격리하고 항상 제거하므로 working tree를 오염시키지 않으면서 파서, 카메라, 교차 계산, shading, 이미지 변환, 직렬화를 함께 검증한다.

## build(cmake): 코어 라이브러리와 검증 타깃 구성
CMake를 authoritative build graph로 도입하고 재사용 가능한 렌더링 코드와 명령줄 entry point를 분리한다. 구현 소스는 공개 include 경계를 가진 `raycore` 라이브러리를 구성하고, 실행 파일은 모든 translation unit을 하나의 구분 없는 target으로 직접 컴파일하는 대신 해당 라이브러리를 링크한다. 이후 unit test와 benchmark 실행 파일이 `main`을 중복하지 않고 동일한 production object를 재사용할 수 있는 구조다.

언어 계약은 compiler extension 없이 표준 C++17로 고정하고 MSVC와 non-MSVC toolchain 모두에서 엄격한 warning level을 유지한다. CTest가 smoke test 등록을 관리하고 정확히 현재 빌드에서 생성된 실행 파일을 script에 전달하므로 nested rebuild를 피하고 활성 CMake 구성의 바이너리를 검증한다. Makefile은 경쟁하는 별도 빌드 모델을 정의하지 않고 동일한 configure, build, test, cleanup 작업을 감싸는 얇은 convenience wrapper로 남긴다.

## test(core): 수학·기하·파서·출력 회귀 기준 추가
production과 동일한 `raycore` 라이브러리에 링크되는 native regression 실행 파일을 추가한다. 벡터 연산의 수치 기대값, 지원하는 모든 primitive의 최근접 거리, 잘못된 scene fixture의 source line 보고, 작은 P3 이미지의 정확한 텍스트 인코딩을 검증한다. 기본 장면 렌더링을 통해 파싱된 해상도가 이미지 경계까지 전달되는지도 확인한다.

이 검사를 CLI 아래 계층에 두어 component contract와 shell 수준 integration 동작을 분리한다. source 디렉터리는 process working directory에서 추론하지 않고 CMake가 전달하므로 CTest가 build tree에서 실행되어도 fixture 조회를 재현할 수 있다.

## perf(render): 광선과 교차 작업량 계측 추가
일반 호출부를 바꾸지 않고 optional `RenderStats` sink를 렌더링, shading, occlusion, scene intersection 경로에 전달한다. counter는 primary, secondary, shadow ray와 primitive test, 향후 AABB test를 구분하고, steady clock으로 전체 이미지 렌더링 구간을 측정한다. null sink를 전달하면 기존 동작을 유지하므로 production 사용에서 계측이 필수가 되지 않는다.

primitive test는 각 shape intersection 직전에 scene boundary에서 증가시키므로 scene 크기로 추정한 값이 아니라 실제 dispatch 횟수를 나타낸다. shadow ray는 광원이 양의 diffuse 기여를 만들어 실제로 occlusion query를 수행하는 경우에만 집계한다. 이렇게 배치하면 이후 가속 변경도 동일한 의미의 workload를 기준으로 비교할 수 있고, 체크섬은 이미지가 의도치 않게 바뀌는지 계속 검출할 수 있다.

## perf(benchmark): 조밀 장면 기준 workload 추가
ground plane, 두 개의 광원, 20×20 sphere grid로 구성된 결정적 dense scene을 사용하는 전용 benchmark target을 만든다. workload를 코드에서 직접 구성하여 parser와 file I/O의 변동을 제거하고, 구현 변경 사이에도 object 배치, material 변화, 카메라, 해상도를 고정한다.

benchmark는 통계를 활성화한 production API로 렌더링하고 일반 이미지 체크섬을 계산한다. 이 단계에서는 timing 결과를 주장하지 않고 체크섬만 출력하여 이후 커밋에서 성능 모드를 비교하기 전 correctness anchor를 마련한다. `raycore`에 링크하므로 실행 파일과 동일한 교차·shading 구현을 workload가 사용한다.

## perf(benchmark): 반복 측정과 결정성 보고 구성
한 번만 렌더링하던 benchmark를 반복 가능한 측정 protocol로 바꾼다. 보고하지 않는 warm-up 1회를 먼저 실행한 뒤 5회를 측정해 일회성 초기화 영향을 줄이고, outlier에 민감한 평균 대신 elapsed sample의 중앙값을 선택한다.

결과를 보고하기 전에 모든 측정 run의 이미지 체크섬과 primitive-test count가 일치해야 한다. 따라서 더 빠르지만 동작이 다른 렌더링이 눈에 띄지 않게 통과하지 못하며, correctness와 실제 실행 workload가 benchmark 계약의 일부가 된다. 구조화된 report에는 workload 식별자, 해상도, run 수, ray 수, primitive 작업량, 중앙값 시간, 체크섬을 기록하여 이후 가속 변경을 명시적인 baseline과 비교할 수 있게 한다.

## fix(math): 큰 유한 벡터를 안정적으로 정규화
먼저 `x*x + y*y + z*z`를 계산하는 대신 scale을 고려하는 `std::hypot` 알고리즘으로 벡터 크기를 구한다. finite 범위 상단에 가까운 성분을 제곱하면 벡터 자체는 의미 있는 finite 방향을 갖더라도 중간값이 infinity로 overflow할 수 있다. 이 상태에서 정규화하면 finite 성분을 infinity로 나누어 0에 가까운 값으로 무너뜨리게 된다.

`std::hypot`은 기존 length와 normalization 인터페이스를 유지하면서 이러한 불필요한 중간 overflow와 underflow를 피한다. 그 결과 무시할 수 없을 정도의 finite 벡터는 단위 방향으로 변환할 수 있어야 한다는 불변식을 복구한다. 이 불변식은 카메라 frame, surface normal, cylinder axis, ray direction에서 공통으로 의존한다.

## test(math): 큰 유한 벡터 정규화 검증
기존 제곱합 구현이 overflow하던 크기에 회귀 test case를 추가한다. `(1e308, 0, 0)`을 정규화하면 0에 가까운 값이나 non-finite 결과가 아니라 정확한 양의 x 단위 벡터가 나와야 한다.

이 case는 일반적인 정규화 정확도보다 앞선 변경이 수정한 수치 메커니즘 자체를 겨냥한다. finite이지만 매우 큰 좌표나 방향 성분을 허용하는 모든 geometry 경로에서 더 단순한 magnitude 공식으로 인해 overflow가 다시 조용히 도입되는 것을 막는다.

## fix(parser): 임계값 이하 방향 벡터 거부
카메라 방향과 cylinder axis를 성분별로 따로 검사하는 대신 Euclidean magnitude를 기준으로 검증한다. 각 성분은 작더라도 전체 길이는 사용할 수 있는 벡터가 있을 수 있고, 실제로 퇴화한 방향은 정규화와 교차 코드가 사용하는 동일한 스칼라 허용 오차에 따라 거부해야 한다.

파서는 geometry를 생성하거나 방향을 정규화하기 전에 길이가 `kEpsilon` 이하인 모든 방향을 거부한다. 잘못된 orientation data가 scene model로 들어오는 것을 차단하고, 조용히 영방향으로 변환되어 이후 camera-frame이나 cylinder 계산에서 정의된 축을 갖지 못하는 상황을 방지한다.

## test(parser): 퇴화한 카메라와 원기둥 방향 검증
orientation vector를 사용하는 두 지시어 모두에 대해 파서의 magnitude 기반 경계를 고정한다. 카메라 방향이나 cylinder axis의 길이가 `1e-6`인 in-memory scene은 `ParseError`를 발생시켜야 하며, 문법적으로 finite한 벡터라고 해서 자동으로 기하학적으로 유효한 것은 아님을 확인한다.

두 입력 모두 정규화되지만 서로 다른 downstream 알고리즘으로 전달되므로 카메라와 cylinder 지시어를 각각 테스트한다. 검증이 입력 경계에 중앙화된 상태를 유지하고 어느 지시어도 공통 nondegeneracy 규칙을 우회하지 못하게 한다.

## fix(image): 이미지 할당과 픽셀 인덱스 overflow 방지
이미지 저장소 크기 계산을 명시적으로 검사하는 연산으로 만든다. 차원은 양수여야 하며, 할당 전에 `width * height * 3` 곱셈이 `std::size_t` 범위에서 유효한지 검증하여 signed integer overflow나 wraparound 때문에 명목상 큰 이미지에 지나치게 작은 pixel buffer가 할당되는 일을 막는다.

PPM index 계산도 row, width, channel count를 곱하기 전에 모두 `std::size_t`로 승격한다. 기존처럼 정수 표현식 계산이 끝난 뒤 cast하면 이미 overflow한 값을 그대로 보존할 수 있다. 각 operand를 먼저 변환하여 할당과 직렬화가 동일한 index domain을 사용하게 하고, 유효한 `Image`에서 계산되는 모든 RGB offset이 storage 범위 안에 있다는 불변식을 유지한다.

## test(image): 잘못된 차원과 저장 크기 계산 검증
새 이미지 할당 계약의 양쪽을 검증한다. 유효한 2×3 이미지는 정확히 18개의 channel byte를 소유해야 하며, 0이나 음수 차원은 비어 있거나 wrap된 buffer 또는 겉보기에는 유효한 buffer를 만드는 대신 `std::invalid_argument`로 거부해야 한다.

이 테스트는 `std::size_t` 한계에 가까운 platform-dependent 할당을 시도하지 않고 관찰 가능한 생성 동작에 집중한다. 검사된 sizing 경로를 보호하고 모든 렌더링·직렬화 이미지에서 양의 차원을 명시적인 불변식으로 만든다.

## fix(output): 표준 FNV-1a 기준값 적용
이미지 체크섬에 사용하는 64-bit FNV-1a offset basis를 수정한다. 기존 10진 상수에는 숫자 한 자리가 빠져 있어 byte mixing 방식은 FNV-1a와 비슷했지만 표준 초기값을 구현하지 않았고 독립적인 구현과 비교할 수 없었다.

기존 prime과 byte 순서를 유지하면서 basis만 고쳐 체크섬에 문서화 가능하고 재현 가능한 정의를 부여한다. digest는 암호학적 무결성 수단이 아니라 여전히 작은 regression fingerprint이지만, 상수를 표준화해 golden value가 불필요하게 호환되지 않는 원인을 제거한다.

## test(output): PPM과 렌더링 체크섬 기준 고정
체크섬 계약을 두 수준에서 고정한다. 직접 만든 2-pixel 이미지는 dimensions, pixel byte, FNV-1a digest 사이의 정확한 관계를 고정하고, 기본 장면 체크섬은 parsing, camera projection, intersection, lighting, quantization, image layout을 모두 거친 완전한 결정적 렌더링 결과를 고정한다.

작은 golden은 체크섬 encoding 변경을 국소화하고, scene golden은 렌더링 pipeline 어디에서든 발생하는 동작 변경을 드러낸다. 두 값을 함께 사용하여 하위 체크섬 정의나 pixel 의미가 바뀌었는데도 상위 digest 하나만 우연히 유지되는 상황을 막는다.

## refactor(scene): 장면 도형의 단독 소유권 적용
다형적 shape의 shared ownership을 `Scene`의 exclusive ownership으로 교체한다. shape는 `std::make_unique`로 생성해 scene으로 이전하고 `unique_ptr`를 통해 순회한다. 다른 하위 시스템은 소유권을 유지하지 않으며 reference-counted lifetime extension도 필요로 하지 않는다.

copy operation을 삭제하고 noexcept move는 유지하여 타입 자체가 이 소유권 모델을 명시하도록 한다. parser에서 scene을 반환하거나 benchmark로 이동할 때 이기종 object를 복제할 필요가 없고, 파괴 시 각 shape가 정확히 한 번 해제된다. resource boundary가 좁아지고, 어느 객체가 shape lifetime을 제어하는지 흐리지 않으면서 가속 구조가 non-owning reference를 보유할 수 있는 기반이 마련된다.

## perf(camera): 픽셀별 카메라 프레임 재계산 제거
camera ray 생성 경로를 frame을 직접 만드는 convenience overload와 기존 `CameraFrame`을 받는 lower-level overload로 분리한다. 전체 이미지 렌더링은 직교정규 basis, aspect-scaled viewport, field-of-view projection을 한 번만 계산한 뒤 모든 픽셀에서 이 불변 값을 재사용한다.

픽셀별 계산은 여전히 screen coordinate 변환과 방향 정규화를 담당하므로 이 최적화는 camera-invariant 작업만 제거한다. 기존 overload를 유지해 개별 호출자에게 단순한 공개 계약을 보존하면서 hot rendering loop에 필요한 재사용 표현을 노출한다.

## test(camera): 재사용한 카메라 프레임의 동치 검증
단순하지 않은 카메라, aspect ratio, fractional pixel 위치에 대해 기존 ray generation 경로와 새 precomputed-frame overload를 비교한다. 원점과 정규화된 방향이 모두 정확히 같아야 한다.

이 회귀 테스트는 frame 생성을 pixel loop 밖으로 옮겼을 때 비용만 달라지고 projection semantics는 달라져서는 안 된다는 최적화의 핵심 요구사항을 보호한다. 두 API를 직접 비교하여 차이가 전체 scene 체크섬 변화로만 나타나기 전에 향후 divergence를 국소적으로 검출한다.

## feat(accel): AABB 값과 결합 연산 구현
공간 가속의 값 기반으로 axis-aligned bounding box를 도입한다. 기본 invalid box는 뒤집힌 infinite extent를 사용하므로 호출자는 "아직 누적된 bounds가 없음"과 실제 0-volume box를 구분할 수 있다. 명시적으로 생성한 box는 validity와 centroid 계산을 제공하고, `surroundingBox`는 primitive bounds를 tree node로 합칠 때 필요한 성분별 union을 만든다.

이 표현을 shape와 traversal에서 독립적으로 유지하여 기하학적 범위와 소유권·교차 정책을 분리한다. centroid는 이후 partitioning에 사용할 안정적인 공간 key를 제공하고, validity 검사는 초기화되지 않은 bounds가 눈에 띄지 않게 가속 결정에 들어가는 것을 막는다.

## feat(accel): ray-box slab 교차 구현
호출자의 `[t_min, t_max]` 구간을 세 좌표축 slab에 대해 차례로 clipping하는 방식으로 ray–AABB 교차를 구현한다. 방향이 음수인 축에서는 entry와 exit 값을 뒤바꾸고, 구간이 비면 즉시 종료한다.

방향 성분이 0인 경우에는 나눗셈을 하지 않는다. 광선 원점이 해당 slab 안에 있을 때만 계속 진행할 수 있게 하여 평행 광선을 명시적으로 처리하고 부동소수점 나눗셈에서 생기는 infinity나 NaN에 의존하지 않는다. optional entry 값은 boolean culling 계약을 바꾸지 않으면서 이후 traversal ordering에 사용할 가장 가까운 유효 box 경계를 제공한다.

## feat(accel): 도형 경계 계약과 구·평면 bounds 추가
다형적 shape 계약에 optional finite bounds를 추가한다. 기본값은 unbounded로 두어 기존 geometry나 본질적으로 무한한 geometry가 억지로 box를 만들지 않고도 정확하게 동작하도록 한다. sphere는 중심에 반지름을 더하고 뺀 정확한 AABB를 제공하고, plane은 bounds가 없음을 명시적으로 반환한다.

`std::optional<Aabb>`를 사용해 "unbounded"와 invalid box를 구분하고 이후 accelerator가 shape를 안전하게 분할할 수 있게 한다. bounded object는 hierarchy에 넣을 수 있지만 plane은 직접 intersection 경로에 남아야 한다. 공통 `Shape` 인터페이스는 유지하면서 가속 가능 여부를 각 geometry 구현이 제공하는 속성으로 만든다.

## feat(accel): 원기둥의 보수적 bounds 계산 추가
모든 concrete shape가 자신의 bounding 동작을 명시하도록 하고, 임의 방향의 capped cylinder에 finite AABB를 제공한다. 각 world axis의 extent는 원기둥의 투영된 half-height와 원형 단면의 투영 반지름을 합쳐 계산하므로 옆면과 cap을 모두 포함한다.

결과는 의도적으로 보수적으로 만든다. epsilon padding으로 intersection 구현이 허용하는 side 범위를 덮고, cap 반지름도 동일하게 확장하며, 각 경계를 `std::nextafter`로 표현 가능한 다음 값까지 바깥쪽으로 한 단계 이동시킨다. BVH box에 빈 공간이 포함되는 것은 허용되지만 실제 primitive hit를 제외해서는 안 된다. false positive traversal은 성능만 손해 보지만 false negative bound는 렌더링 이미지를 바꾼다.

## test(accel): AABB와 도형 경계 계산 검증
hierarchy를 구성하기 전에 가속 경계 조건을 검증한다. slab test는 양수·음수 ray direction, box face에 정확히 닿는 경우, slab 바깥에 있는 평행 광선을 다룬다. entry distance assertion으로 clipping 후 가장 가까운 허용 매개변수가 유지되는지도 확인한다.

shape 검사는 sphere의 정확한 bounds, plane의 unbounded 상태, 대각선 방향 cylinder의 타이트하면서도 바깥쪽으로 보수적인 box를 고정한다. cylinder assertion은 해석적으로 구한 extent와 비교하되 작은 상한 여유를 두어 under-bounding으로 인한 correctness failure와 불필요하게 느슨한 공식을 모두 놓치지 않게 한다.

## feat(accel): BVH node와 연속 저장소 구성
bounding-volume hierarchy를 위한 non-owning index 기반 저장 모델을 정의한다. `BvhPrimitive`는 scene shape index와 해당 bounds를 묶고, `BvhNode`는 내부 node라면 child index를, leaf라면 연속된 primitive range를 저장한다. 양수 primitive count를 leaf 판별자로 사용하여 node별 polymorphism이나 pointer를 피한다.

node와 primitive index는 `Bvh`가 소유하는 연속 vector에 저장하고, shape의 유일한 소유자는 계속 scene으로 둔다. 이 표현은 cache-friendly iterative traversal과 hierarchy의 안전한 이동을 지원하며, 두 배열을 비우는 것만으로 완전한 reset이 가능하다. read-only accessor는 외부 mutation을 허용하지 않고 생성된 구조를 traversal과 검증에 노출한다.

## feat(accel): 결정적 중앙 분할 BVH 구축 구현
bounded primitive를 longest-centroid-axis median split 방식으로 재귀적으로 나누어 hierarchy를 만든다. 각 node는 먼저 자신의 primitive bounds 전체를 정확히 union한다. 4개 이하 범위는 연속 leaf로 만들고, 더 큰 범위는 균형 잡힌 하위 범위로 나눈다. primitive당 약 2개 node를 미리 reserve하여 재귀적으로 child를 추가하는 동안 node index가 안정적으로 유지되게 한다.

centroid가 같은 경우에도 생성 결과는 결정적이다. stable sort로 선택한 centroid 좌표를 먼저 비교하고, 같으면 원래 scene shape index로 정렬하여 동일한 입력이 같은 primitive 순서와 tree topology를 만들도록 한다. 결정성은 재현 가능한 성능 데이터뿐 아니라 traversal이 더 이상 scene 삽입 순서를 따르지 않을 때 동일 거리 hit 규칙을 명확히 유지하는 데도 중요하다.

## feat(accel): 선형·BVH 탐색 모드 계약 연결
render, trace, shading, occlusion, scene-intersection API 전반에 `AccelMode`를 도입하여 상위 렌더링 코드를 바꾸지 않고 linear reference path와 BVH traversal을 선택할 수 있게 한다. 기본 설정은 BVH로 바꾸지만, 이 중간 단계의 실제 구현은 아직 linear path를 사용한다.

동시에 nearest-hit tie 동작을 명시한다. shape test는 원래 scene index를 함께 전달하고, 정확히 같은 `t`에서는 더 뒤의 shape index가 이기는 경우에만 이전 hit를 교체한다. 이는 앞선 sequential loop의 실제 동작과 같다. traversal order를 바꾸기 전에 이 규칙을 확립하여 acceleration이 겹치는 material이나 normal 중 어떤 것이 선택되는지를 조용히 바꾸지 못하게 한다.

## feat(scene): 가속 구조 소유권과 rebuild 경계 구성
`Scene`이 BVH, unbounded shape index 목록, 명시적인 readiness state를 소유하도록 한다. acceleration build는 각 live shape의 optional valid bounds를 기준으로 분류한다. finite primitive는 BVH build input에 복사하고, plane과 다른 unbounded shape는 별도 direct-test 목록에 남긴다. hierarchy는 index만 저장하므로 `Scene`이 계속 shape lifetime의 단독 소유자다.

shape를 하나라도 추가하면 두 derived structure를 모두 비우고 acceleration을 stale 상태로 표시한다. 이전 shape 집합으로 만든 BVH를 현재 데이터인 것처럼 질의해서는 안 되므로 이 invalidation이 필수다. 파싱된 scene은 모든 필수 지시어와 shape 검증을 마친 뒤에만 build하므로 성공적으로 반환된 scene은 기본 accelerated render path를 바로 사용할 수 있고, programmatic mutation을 거친 scene은 다시 build해야 한다.

## feat(accel): 결정적 BVH 최근접 순회 구현
연속 BVH 위를 반복적으로 순회하는 accelerated nearest-hit path를 구현한다. linear mode이거나 acceleration이 stale 또는 미구축 상태이면 의도적으로 전체 shape scan으로 fallback하여 programmatic mutation을 거친 scene에서도 correctness를 보존한다. root와 child box는 현재 closest hit를 기준으로 clipping하고, box 시작점이 그 거리보다 먼 stack entry는 버린다.

두 child가 모두 hit되면 entry가 가까운 쪽을 먼저 처리하고, entry가 같으면 node index를 결정적 tie-breaker로 사용한다. 먼 child는 stack에 남겨 두었다가 더 가까운 primitive가 발견되면 이후 prune할 수 있다. leaf는 기존의 shape-index-aware hit selection을 재사용하고, unbounded primitive는 tree 순회 뒤에 검사한다. 따라서 traversal 순서는 비용만 바꾸고 nearest-hit나 equal-distance 의미는 바꾸지 않는다. AABB test는 실제 culling 지점에서 정확히 집계한다.

## test(accel): 선형 탐색과 BVH 결과 동치 검증
linear scan을 semantic reference로 취급하는 전용 acceleration regression suite를 추가한다. 빈 scene, bounded shape 하나만 있는 scene, unbounded shape만 있는 scene, 임의 축 cylinder scene에서 두 mode는 hit 존재 여부와 거리뿐 아니라 point, normal, material, 실제로 선택된 shape까지 모두 일치해야 한다.

overlapping sphere case로 traversal order와 무관하게 뒤쪽 shape가 equal-distance에서 이긴다는 규칙을 고정한다. 이어서 dense mixed scene의 전체 pixel buffer와 체크섬을 비교하면서 primitive intersection 호출이 최소 4배 감소하는 것도 요구한다. 이 조합은 BVH가 동일한 렌더링 계약을 최적화한 것임을 검증하고, 측정된 이점이 출력 변경이 아니라 culling에서 나온다는 것을 확인한다.

## perf(benchmark): 선형 탐색과 BVH 작업량 비교
동일한 prebuilt dense scene에서 linear reference와 BVH path를 통제된 방식으로 나란히 비교하도록 benchmark를 확장한다. 각 mode마다 별도의 warm-up과 5회 측정 중앙값을 사용하고, 반복 sample마다 체크섬, primitive-test count, AABB-test count가 모두 일치해야 한다.

두 mode의 이미지가 다르면 benchmark는 결과를 보고하지 않는다. 구조화된 출력은 elapsed time과 함께 primary·shadow ray 수, 두 종류의 intersection 작업량을 기록하여 실제 primitive culling 이득과 추가 box test overhead를 구분할 수 있게 한다. 하나의 immutable scene을 재사용하므로 parsing과 hierarchy construction은 측정되는 render interval에서 제외된다.

## feat(material): metal 모델과 깊이 제한 반사 구현
재질 값에 명시적인 `Diffuse` 또는 `Metal` 타입을 추가하면서 diffuse를 기본값으로 유지하여 기존 scene 구성과 렌더링 동작의 호환성을 지킨다. diffuse hit는 기존 direct-light shading을 계속 사용하고, metal hit는 입사 방향과 방향이 정리된 surface normal을 이용해 완전한 specular reflection을 생성한다.

반사는 이미 remaining depth가 recursive transport를 정의하는 `traceRay` 안에서 처리한다. depth 0에서 metal에 hit하면 black을 반환하여 무한 반사 chain을 막는다. 그 외에는 원래 표면을 즉시 다시 맞히지 않도록 normal 방향으로 `kRayTMin`만큼 이동한 위치에서 reflected ray를 시작하고, 선택된 acceleration mode와 statistics sink를 그대로 물려받으며 depth를 1 줄인다. 재귀적으로 얻은 색상에 albedo를 성분별로 곱해 색이 입혀진 mirror를 표현하고, 생성한 각 광선을 secondary work로 기록한다.

## feat(parser): 선택적 도형 재질 문법 추가
기존 형식을 유지하면서 `sp`, `pl`, `cy` 지시어 뒤에 optional material token 하나를 허용한다. 정확한 arity 검증은 이제 기본 field count 또는 거기에 하나를 더한 경우만 허용하므로, 잘못 붙은 추가 인자가 조용히 무시되지 않는다.

token을 생략하면 `Diffuse`로 해석하여 기존 `.rt` 파일과 backward compatibility를 유지한다. 명시적인 `diffuse`와 `metal` 값은 parser boundary에서 `MaterialType`으로 변환하고, 다른 식별자는 source와 line 정보를 포함한 `ParseError`를 발생시킨다. 모든 shape에 같은 helper를 적용해 material 문법을 통일하고 geometry constructor에는 이미 검증된 material 값만 전달한다.

## test(material): 재질 파싱과 반사 깊이 검증
문법, recursive transport 계약, backward compatibility를 다루는 material 중심 regression target을 추가한다. parsing test는 material 이름을 생략하면 diffuse가 유지되고, 세 shape 지시어 모두 명시적인 diffuse 또는 metal을 허용하며, 알 수 없는 material은 기본값으로 처리하지 않고 거부한다는 점을 고정한다.

표면 하나뿐인 mirror scene으로 direct lighting과 독립적으로 depth boundary와 reflection 계산을 검증한다. depth 0은 black으로 끝나야 하고, bounce 1회를 허용하면 background와 metal albedo를 성분별로 곱한 색상을 반환해야 한다. trace를 반복해 결정성을 확인하고 statistics assertion으로 secondary ray가 정확히 하나 생성되는지도 검증한다. 기존 all-diffuse scene 체크섬도 유지하여 material 도입 이전의 rendering path가 의도치 않게 바뀌지 않도록 한다.

## refactor(render): 직렬 렌더링을 고정 tile 순회로 전환
실행은 의도적으로 single-threaded로 유지한 채 row-major serial loop를 결정적인 16×16 tile 순회로 교체한다. edge tile은 끝 좌표를 이미지 크기에 맞게 clamp하므로 해상도가 tile 크기의 배수가 아니어도 모든 유효 픽셀을 정확히 한 번 방문한다.

pixel storage는 단조 증가 cursor가 아니라 `(x, y)` 좌표로 접근한다. 각 tile이 독립적인 작업 단위가 되고 처리 순서와 buffer 위치 사이의 의존성이 사라지므로 이후 concurrent scheduling의 전제가 마련된다. camera ray, shading, color conversion, statistics는 바꾸지 않아 기존 이미지 체크섬을 보존하고 work decomposition만 변경한다.

## feat(render): 원자적 tile 분배와 작업자 통계 병합 구현
고정 tile 분할을 `std::thread` worker pool로 병렬화한다. relaxed atomic counter가 각 tile index를 정확히 하나의 worker에 할당한다. counter는 고유한 작업 배분에만 사용되고 tile ownership이 두 worker가 같은 pixel byte를 쓰지 않도록 보장하므로 더 강한 memory ordering은 필요하지 않다. 렌더링 중 shared scene과 camera frame은 읽기 전용이다.

각 worker는 cache-line-aligned `RenderStats` 인스턴스를 별도로 누적하여 race를 피하고 자주 증가하는 counter의 contention을 줄인다. 모든 worker를 join한 뒤 caller-visible statistics를 reset하고 local 값의 합으로 구성한다. 빌드는 이제 platform thread library를 명시적으로 링크한다. RAII joiner는 worker 생성 도중 조기 종료가 발생하면 추가 할당을 중단하고 이미 생성된 thread를 join하여 setup failure 중 joinable thread가 파괴되는 것도 막는다.

## feat(renderer): 작업자 수 설정과 자동 선택 추가
`RenderSettings::threadCount`를 통해 renderer parallelism을 노출한다. 값이 0이면 platform이 보고한 hardware concurrency를 사용하고, platform이 이를 제공하지 못하면 1로 fallback한다. 명시적인 0이 아닌 값은 호출자가 worker 수를 재현 가능하게 제어할 수 있게 한다. 어느 경우든 worker 수는 tile 개수를 넘지 않도록 제한하여 실제 작업을 받을 수 없는 thread를 만들지 않는다.

acceleration benchmark는 worker를 명시적으로 1개 선택한다. linear과 BVH 비교를 intersection work에 집중시키고 scheduler variability나 병렬 실행량 차이가 acceleration 측정을 흐리지 않게 하기 위한 것이다. 일반 렌더링은 기본적으로 자동 CPU 활용을 유지한다.

## test(render): 작업자 수에 따른 함수 결과 동치 검증
서로 독립적인 두 실행 선택 축, 즉 linear 대 BVH intersection과 1개 대 4개 worker thread를 교차 검증하는 renderer regression을 추가한다. scene에는 여러 광원, bounded·unbounded geometry, diffuse shading, recursive metal path를 포함하여 shared read-only scene state와 주요 statistics counter를 모두 사용하게 한다.

네 실행 모두 byte 단위로 동일한 이미지와 동일한 체크섬을 만들어야 한다. 각 acceleration mode 안에서는 worker 수를 바꿔도 primary, secondary, shadow, primitive-test, AABB-test 총계가 모두 유지되어야 하므로 tile scheduling이 rendering semantics와 accounting 어느 쪽도 바꾸지 않음을 입증한다. width-times-height primary-ray assertion으로 픽셀이 누락되거나 중복 처리되는 것도 추가로 막는다.

## refactor(cli): 위치 인자와 checksum option 모델 구성
명령줄 해석을 전용 `CliOptions` 값과 `parseCli` 경계로 옮긴다. 필수 positional path 두 개를 optional behavior와 분리하고, render settings도 호출 지점에서 암묵적으로 생성하지 않고 파싱된 option과 함께 전달한다. 따라서 실행 경로는 `argv`를 다시 해석하지 않고 검증된 값만 소비할 수 있다.

parser는 `--checksum`을 최대 한 번만 허용하고, 알 수 없거나 중복된 option은 기존 usage-error 종료 경로로 거부한다. runtime failure는 syntax failure와 계속 구분된다. 의도적으로 동작은 바꾸지 않지만 option loop를 마련하여 이후 값을 갖는 renderer switch를 추가할 때 `main`에 positional special case가 누적되지 않는 확장 가능한 계약을 만든다.

## feat(cli): 가속 방식 선택 option 추가
값을 받는 명령줄 option으로 `--accel linear|bvh`를 추가하고 `RenderSettings::accelMode`에 직접 매핑한다. semantic reference 구현과 최적화 구현을 하나의 실행 파일에서 노출하므로 scene 파일을 바꾸거나 재빌드하지 않고도 출력 비교와 성능 진단이 가능하다.

option parser는 값 누락, 지원하지 않는 값, acceleration option 중복을 거부한다. `--checksum`과의 순서에는 영향을 받지 않으며, option이 없으면 기본 render setting이 계속 BVH를 선택한다. 검증을 CLI boundary에 두어 renderer가 raw string이 아니라 유효한 enum만 전달받게 한다.

## feat(cli): 작업자 수 option 추가
`--threads N|auto`를 추가하고 renderer에 이미 정의된 thread-count 계약으로 변환한다. `auto`는 sentinel 값 0을 사용하고, 명시적인 개수는 `unsigned int`로 표현 가능한 엄격한 양의 10진 정수여야 한다.

공통 unsigned parser는 먼저 모든 문자가 숫자인지 확인한 뒤 전체 변환과 option별 최댓값을 검사하며, 변환 예외도 잘못된 입력으로 처리한다. 따라서 rendering 시작 전에 부호, 뒤따르는 문자, overflow, 0, 값 누락, thread option 중복을 모두 거부한다. CLI가 잘리거나 의미 없는 worker count를 thread 생성으로 넘길 수 없게 한다.

## feat(cli): 반사 깊이 option과 기본값 추가
recursive reflection depth를 `--max-depth 0..32`로 노출하고 기본값을 1 bounce에서 4로 높인다. 기본값만으로도 여러 표면에 걸친 metal reflection을 눈에 띄게 사용할 수 있고, 명시적인 설정을 통해 0에서 metal transport를 완전히 종료하거나 더 깊은 경로를 탐색할 수 있다.

기존 bounded unsigned parser가 포함 상한을 적용하고 음수, 잘못된 형식, 값 누락, 중복 값을 거부한다. 값을 32로 제한하여 과도한 작업을 일으킬 수 있는 임의의 명령줄 정수를 허용하는 대신 재귀적으로 생성되는 secondary ray에 명확한 운영 상한을 둔다.

## test(cli): 렌더링 옵션과 오류 종료 계약 검증
잘못된 호출과 성공적인 렌더링을 구분하는 실행 파일 수준의 CLI 계약 테스트를 추가한다. positional argument 누락, 알 수 없는 option, 중복 flag, option 값 누락, 지원하지 않는 acceleration mode, 양수가 아니거나 overflow하는 thread count, 잘못된 형식 또는 범위를 벗어난 depth는 모두 status 2를 반환하고 standard error에 usage prefix를 출력해야 한다.

이후 유효한 두 경계 조합으로 전체 load-render-write 경로를 실행한다. depth 0의 single-threaded linear render와 depth 32의 automatic-threaded BVH render는 모두 비어 있지 않은 파일을 만들고 16자리 소문자 체크섬을 출력해야 한다. fixture가 diffuse-only이므로 두 체크섬은 같아야 한다. 이를 통해 acceleration, scheduling, 관련 없는 reflection depth가 이미지를 바꾸지 않는 상태에서 option 연결과 exit semantics를 검증한다.

## test(render): smoke 검사의 fixture와 실행 경로 정리
저장소에서 관리하는 invalid scene을 smoke test의 parser-failure fixture로 사용하고 진단이 `invalid.rt` line 3을 가리키는지 확인한다. 거부된 scene이 렌더링 결과를 남기지 않아야 한다는 요구사항은 그대로 유지하되, 이제 별개의 unknown directive를 inline으로 만들지 않고 실제 range-validation failure를 검증한다.

magic value, dimensions, 최대 channel 값을 확인하기 전에 `sed`로 PPM header 3줄을 명시적으로 읽는다. script 내부의 중복 fixture 내용을 제거하면서 smoke test를 실행 파일에서 관찰 가능한 parse·serialization 계약에 집중시킨다.

## test(render): 실행 모드별 PPM byte 결정성 검증
process 내부 pixel 비교를 보완하도록 설치된 command path와 직렬화된 artifact를 대상으로 end-to-end determinism test를 추가한다. diffuse·metal, bounded·unbounded geometry가 섞인 동일한 scene을 고정 reflection depth에서 linear 또는 BVH intersection, 1개 또는 4개 worker 조합으로 렌더링한다.

모든 run은 같은 체크섬을 출력해야 하며 `cmp`는 전체 P3 PPM 파일이 single-threaded linear baseline과 byte 단위로 완전히 같다고 판정해야 한다. 직렬화된 byte를 검사하여 내부 image buffer assertion만으로는 잡지 못하는 dimensions, channel ordering, formatting, write behavior 차이까지 검출한다.

## build(sanitizers): 메모리와 정의되지 않은 동작 검사 구성
AddressSanitizer와 UndefinedBehaviorSanitizer를 위한 opt-in `RAY_ENABLE_SANITIZERS` CMake 구성을 추가한다. Clang과 GCC에서는 core target이 sanitizer compile/link flag를 의존 실행 파일과 테스트에 전파하고, 유용한 진단을 위해 frame pointer를 유지한다. 지원하지 않는 compiler는 효과 없는 option을 지원하는 것처럼 보이게 하지 않고 configure 단계에서 명시적으로 실패한다.

기본값은 비활성화하여 일반 빌드를 그대로 유지하되, 별도 `build*` 디렉터리에 instrumented configuration을 만들고 version control에는 포함하지 않을 수 있다. 이 계측은 manual buffer indexing, recursive ray, polymorphic ownership, BVH index traversal, multithreaded execution을 사용하는 이 renderer에서 특히 의미가 있다.

## ci: 플랫폼별 빌드와 회귀 검사 자동화
모든 push와 pull request에 대해 지속적인 검증을 추가한다. release configuration은 현재 Ubuntu와 macOS runner에서 각각 전체 CTest suite를 빌드·실행하여 지원 CMake 경로, platform thread integration, shell 기반 실행 파일 계약, 두 운영체제에서의 결정적 렌더링을 검증한다.

별도의 Ubuntu debug job은 AddressSanitizer와 UndefinedBehaviorSanitizer를 활성화하고 leak detection 및 오류 발생 즉시 중단 동작을 켠 뒤 동일한 regression suite를 instrumentation 아래에서 실행한다. release portability와 sanitizer diagnostics를 서로 다른 job으로 유지하여 실패 원인을 구분하고, 어느 구성도 로컬에서만 제공될 뿐 실제로 사용되지 않는 상태가 되지 않도록 한다.

## perf(benchmark): 측정 schema와 가속 기준 검증 고정
renderer benchmark를 versioned self-describing measurement contract로 만든다. 반복 sample은 이제 primitive test, AABB test, 체크섬뿐 아니라 모든 ray category가 일치해야 한다. 출력은 `schemaVersion` 1 아래에 scene population, resolution, worker count, reflection depth, tile size, warm-up count, measured-run count를 기록하여 보고된 수치를 해당 workload와 함께 해석할 수 있게 한다.

benchmark는 핵심 acceleration 요구사항도 강제한다. BVH의 primitive test 수는 linear count의 25% 미만이어야 한다. primitive-test ratio와 median time speedup을 별도로 보고하여 결정적인 algorithmic work reduction과 환경에 민감한 elapsed time을 구분한다. 이미지가 같더라도 culling이 충분하지 않은 run은 겉보기에는 유효한 report를 출력하지 않고 실패한다.

## perf(benchmark): 참조 측정값 기록
benchmark의 versioned schema를 사용한 release-mode reference run 하나를 기록하고 정확한 AppleClang, arm64, logical-thread 환경도 함께 남긴다. 두 traversal mode는 같은 체크섬과 동일한 primary·shadow·secondary ray 수를 생성했으며, BVH는 1,696,156회의 AABB test를 추가하는 대신 primitive intersection을 205,904,678회에서 904,630회로 줄였다.

저장된 `0.004` primitive-test ratio는 이 고정 scene에서 환경과 무관한 작업량 감소를 나타내고, 측정된 `26.744` median speedup은 기록된 machine과 toolchain에 명시적으로 종속된다. 결과 옆에 configuration과 environment를 함께 보존하여 timing이 보편적인 성능 보장으로 오해되지 않게 한다.

## fix(output): 불일치한 이미지 저장소 거부
`Image`에 pixel vector가 정확히 `width * height * 3` byte를 포함해야 한다는 명시적인 representation check를 추가하고, dimensions와 overflow 규칙은 기존 storage-size 계산에 위임한다. 공개 image field 때문에 남아 있던 허점을 막는다. 기존에는 호출자가 생성 후 vector 크기를 줄이거나 늘린 뒤 선언된 dimensions와 맞지 않는 storage를 output code가 index하게 만들 수 있었다.

체크섬 생성과 PPM 쓰기는 모두 pixel을 사용하기 전에 검증한다. 잘못된 이미지는 out-of-bounds read, partial file, 선언된 이미지와 일치하는 것처럼 보이는 체크섬을 만드는 대신 일관되게 거부된다. destination을 열기 전에 검증하므로 I/O가 시작되기 전부터 잘못된 데이터 때문에 기존 파일이 truncate되는 일도 막는다.

## test(output): 잘못된 이미지 저장소 처리 검증
image-storage 불변식의 양방향을 모두 회귀 테스트한다. 2-pixel 이미지에서 1 byte를 제거하면 체크섬 생성과 PPM 쓰기가 `std::invalid_argument`를 던져야 하고, byte를 초과해서 추가한 경우에도 직접 validation이 실패해야 한다.

writer case는 기존 파일이 있는 상태에서 시작하여 잘못된 이미지가 거부된 뒤에도 내용이 바뀌지 않는지 검증한다. representation error는 첫 번째 잘못된 pixel 접근 직전이 아니라 destination을 열거나 truncate하기 전에 검출되어야 한다는 validation 순서를 고정한다.

## fix(output): PPM 출력 실패 시 기존 파일 보존
`std::ostream` overload를 추가하여 PPM serialization과 destination file 교체를 분리한 뒤, path 기반 write를 transactional하게 만든다. 전체 이미지를 먼저 검증하고 destination 옆에 고유한 이름의 temporary file로 직렬화한다. stream exception, 명시적인 post-write state check, `flush`, `close`를 통해 replacement를 시도하기 전에 모든 출력이 성공했는지 확인한다.

완성된 temporary file만 target을 교체한다. POSIX에서는 같은 디렉터리의 `rename`을 사용하고, Windows에서는 replace-existing와 write-through flag를 지정한 `MoveFileEx`를 사용한다. scope guard는 open, serialization, flush, close, replacement 실패를 포함해 commit되지 않은 모든 경로에서 temporary artifact를 제거한다. 따라서 완전한 후속 파일이 준비될 때까지 기존의 유효한 PPM은 그대로 유지되고, 호출자는 조용히 truncate된 destination 대신 실제 replacement 오류를 받는다.

## test(output): 출력 실패의 대상 보존과 정리 검증
transactional PPM writer의 failure path를 위한 전용 suite를 추가한다. 모든 write를 거부하는 custom stream buffer를 사용하여 stream overload가 잘못된 stream state를 성공으로 받아들이지 않고 serialization failure를 보고하는지 확인한다. 성공 경로는 기존 내용을 정확한 예상 P3 byte로 교체하고 temporary sibling을 남기지 않아야 한다.

요청한 destination을 sentinel file을 포함한 기존 디렉터리로 만들어 replacement failure를 강제로 발생시킨다. writer는 오류를 발생시키면서 destination의 타입과 내용 모두를 보존하고, 이미 작성한 temporary file도 제거해야 한다. 이 case들은 cleanup과 destination preservation이 invalid image 입력뿐 아니라 commit point의 양쪽 모두에서 성립함을 고정한다.

## fix(renderer): 작업자 예외를 호출자에게 전달
worker thread 함수 밖으로 예외가 빠져나가 `std::terminate`를 호출하지 않도록 모든 예외를 worker-thread boundary에서 잡는다. 각 worker가 하나의 `std::exception_ptr` slot을 소유하므로 shared lock 없이 원래 예외를 기록할 수 있다. 실패하면 해당 worker가 atomic tile cursor를 종료 값으로 전진시켜, 다른 worker가 이미 진행 중인 작업을 마치는 동안 아직 할당되지 않은 tile이 새로 배정되지 않게 한다.

호출 thread는 error slot을 확인하기 전에 모든 worker를 join하고, statistics를 병합하거나 부분 렌더링 이미지를 반환하기 전에 캡처한 예외를 다시 던진다. 원래 예외 타입과 메시지를 보존하고 thread 회수를 보장하며, `renderScene`의 일반적인 synchronous contract를 복구한다. 즉 rendering failure는 process를 종료시키는 대신 호출자에게 보고된다.

## test(renderer): 작업자 실패 전파와 회수 검증
intersection method에서 식별 가능한 runtime error를 던지고 unbounded 분류를 통해 BVH mode의 scene path에서 반드시 평가되도록 한 test-only `Shape`를 도입한다. 여러 worker를 요청해 multi-tile 이미지를 렌더링하면 `renderScene` 호출자에게 정확히 그 오류가 반환되어야 한다.

호출 이후 assertion까지 도달했다는 사실은 예외가 worker 밖으로 빠져나가 process를 종료시키지 않았음을 의미한다. 또한 호출이 완료되려면 renderer가 새 작업 할당을 중단하고 worker thread를 모두 join한 뒤 예외를 다시 던져야 한다. sentinel message를 통해 propagation이 원래 실패를 generic concurrency error로 바꾸지 않는지도 확인한다.

## fix(accel): 가속 구조의 도형 불변식 보호
이미 생성된 acceleration structure가 bounds와 primitive index의 원본 데이터보다 오래 유효한 것처럼 남지 않도록 shape geometry와 scene의 shape container를 외부에서 read-only로 만든다. sphere, plane, cylinder parameter는 const accessor 뒤로 옮기고, normalized plane normal이나 cylinder axis 같은 저장 값은 계속 construction 시점에 확정한다. intersection과 bounds 계산은 geometry 계약을 바꾸지 않고 private representation을 사용하도록 이전한다.

`Scene`은 이제 shape vector를 private으로 소유하고 count와 checked const element access만 노출한다. 모든 structural mutation은 `addShape`를 거치며, 이 경계에서 BVH와 unbounded-shape index set을 비우고 acceleration을 unavailable로 표시한다. 호출자가 우회할 수 있던 cache invalidation 관례를 강제 가능한 ownership boundary로 바꾼 것이다. 외부 코드는 현재 geometry를 검사할 수 있지만 stale BVH bounds와 index가 usable로 남은 상태에서 geometry를 변경하거나 shape storage 순서를 바꿀 수 없다.

## test(accel): 장면 변경과 가속 상태 불변식 검증
compile time과 runtime 양쪽에서 acceleration ownership boundary를 고정한다. type-trait assertion으로 `Scene`이 더 이상 mutable shape storage를 노출하지 않고, index 기반 shape access가 `const Shape&`를 반환하며, 대표적인 sphere·plane·cylinder geometry accessor를 통해 값을 대입할 수 없음을 검증한다. 이를 통해 이미 build된 BVH 뒤에서 호출자가 데이터를 변경하지 못하게 하는 API 속성을 보호한다.

runtime regression은 shape 하나로 acceleration을 build한 뒤 지원되는 scene 경계를 통해 shape를 하나 더 추가하고, visible shape count가 증가하는 동시에 acceleration이 invalidation되는지 확인한다. 이후 BVH-mode query는 stale index를 참조하지 않고 현재 linear geometry로 fallback하여 새 shape를 찾아야 한다. acceleration을 다시 build한 뒤에도 동일한 hit가 유지되어야 하므로 invalidation, fallback, reconstruction이 하나의 일관된 state transition을 이루고 rebuilt BVH가 현재 scene을 index함을 입증한다.
