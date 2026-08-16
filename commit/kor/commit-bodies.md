## chore(repo): 컨테이너 스택 저장소 경계 설정
저장소에서 호스트 로컬 `.env`, 평문 비밀 파일, 프로세스 로그, PID 파일, 운영체제 메타데이터를 제외한다. 이를 통해 재현 가능한 스택 정의와 배포 환경에 종속되거나 일시적인 상태 사이에 소스 제어 경계를 설정한다. 특히 자격증명과 런타임 제어 파일은 실수로 빌드 입력이나 저장소 이력에 포함되지 않도록 Git 외부에서 제공하거나 생성해야 한다.

## feat(env): 공개 스택 환경 변수 정의
버전 관리되는 `.env.example`에 스택의 공개 설정 계약을 정의한다. 여기에는 외부 도메인, 데이터베이스 및 애플리케이션 계정 식별자, WordPress 사이트 및 사용자 메타데이터가 포함된다. 비밀이 아닌 값을 예제 파일에 유지하면 비밀번호는 버전 관리 경계 밖에 두면서도 Compose 변수 치환과 로컬 설정을 재현할 수 있다. 이 구분을 통해 운영자와 테스트는 배포 가능한 자격증명 집합을 소스 코드로 취급하지 않고도 안정적인 변수 이름을 공유할 수 있다.

## feat(mariadb): Debian 서버 이미지 추가
MariaDB 서비스에 서버, 클라이언트, CA 인증서, `gosu`를 포함한 프로젝트 소유 Debian `bookworm-slim` 이미지를 추가한다. 빌드 과정에서 패키지 인덱스와 배포판에서 제공하는 데이터베이스 내용을 제거한 뒤, 런타임 및 데이터 디렉터리를 `mysql` 소유권으로 다시 생성하고 `mariadbd`를 포그라운드에서 실행해 로그를 컨테이너 콘솔로 출력한다.

비어 있고 소유권이 올바른 데이터 디렉터리에서 시작하면 이미지 레이어의 데이터가 초기화 과정에 섞이지 않고, 마운트된 데이터베이스 볼륨이 영속 상태의 기준이 된다. 데몬을 `mysql` 사용자로 실행하면 root 권한이 필요한 설정 이후에도 권한 경계를 유지할 수 있으며, 포그라운드 실행을 통해 컨테이너 런타임이 프로세스 수명주기와 로그를 직접 관리할 수 있다.

## feat(mariadb): 네트워크 DB 서버 설정
MariaDB 이미지에 명시적인 서버 설정을 설치한다. 데몬은 컨테이너 네트워크 인터페이스에서 수신하되 데이터 디렉터리, Unix 소켓, PID 파일 경로는 고정하며, 클라이언트 도구는 동일한 소켓과 `utf8mb4` 기본값을 사용한다. 이름 해석을 비활성화하고 연결 수와 버퍼 풀 크기를 제한하며, 데이터베이스 collation을 `utf8mb4_unicode_ci`로 고정한다.

이 설정을 통해 호스트 로컬 설치를 전제로 할 수 있는 배포판 기본값에 의존하지 않고 예측 가능한 네트워크 서비스 이미지를 만든다. 경로를 일치시키면 entrypoint, health check, 데몬이 동일한 위치를 사용하며, reverse DNS 조회를 끄면 인증과 연결 시작 과정의 불필요한 의존성을 제거할 수 있다. charset과 리소스 설정을 명시함으로써 영속 데이터의 의미와 컨테이너 리소스 기대값도 배포 환경 간에 일관되게 유지된다.

## feat(mariadb): DB와 애플리케이션 계정 초기화
MariaDB entrypoint가 최초 실행 시 데이터베이스 초기화를 담당하도록 한다. 비밀번호는 직접 값 또는 서로 배타적인 `_FILE` 변수로 받을 수 있으며, 필수 입력이 없으면 거부한다. SQL에 삽입하기 전에 데이터베이스 및 계정 식별자를 제한하고 비밀번호 리터럴을 escape한다. 빈 볼륨에서는 시스템 테이블을 초기화하고 소켓 전용 임시 서버를 시작한 뒤 준비 상태를 기다린다. 이후 root 계정을 보호하고, 익명 계정과 원격 root 접근을 제거하며, test 데이터베이스를 삭제하고, WordPress 데이터베이스와 최소 범위의 애플리케이션 권한을 생성한다. 마지막으로 임시 서버를 종료한 뒤 정상 포그라운드 데몬을 실행한다.

MariaDB 시스템 디렉터리의 존재 여부를 idempotency 경계로 사용한다. 이미 데이터가 있는 영속 볼륨은 파괴적으로 다시 초기화하지 않고 재사용한다. 네트워크를 비활성화한 로컬 Unix 소켓으로 bootstrap하면 보안 설정이 완료되지 않은 서버가 외부에 노출되는 것을 막을 수 있다. 일회성 초기화와 장기 실행 프로세스를 분리하면 수명주기 책임도 명확해지고, 최종 데몬은 영속 자격증명과 스키마 소유권이 확립된 뒤에만 시작된다.

## feat(wordpress): Debian PHP-FPM 이미지 추가
WordPress 서비스에 PHP-FPM, WordPress에 필요한 확장, MySQL 클라이언트 도구, FastCGI 진단 도구, 아카이브 유틸리티, WP-CLI를 포함한 Debian `bookworm-slim` 런타임을 추가한다. 이미지가 PHP 런타임과 document root 디렉터리를 `www-data` 소유권으로 생성하고, `/var/www/html`을 작업 디렉터리로 사용하며, FastCGI 포트 9000을 노출하고 PHP-FPM을 포그라운드에서 실행하도록 한다.

이 이미지는 애플리케이션 실행을 TLS 프런트엔드와 데이터베이스에서 분리하면서도, 서비스 경계 내부에서 결정적인 bootstrap과 health 검증에 필요한 도구를 유지한다. PHP-FPM을 포그라운드에서 실행하면 컨테이너 런타임이 종료와 실패 보고를 직접 제어할 수 있다. 디렉터리 소유권을 미리 설정해 두면 이후 초기화가 애플리케이션 상태를 기록할 수 있고, 정상 실행 중인 worker가 root 권한에 의존할 필요가 없다.

## feat(wordpress): PHP-FPM 풀 설정
PHP-FPM 풀을 `www-data`가 소유하는 명시적인 네트워크 서비스로 설정한다. 포트 9000에서 수신하고, 제한된 동적 worker 풀을 사용하며, 애플리케이션 bootstrap에 필요한 환경을 유지한다. 결정적인 `/ping` 응답을 제공하고 worker, access, PHP error 출력을 컨테이너의 표준 오류 스트림으로 보낸다.

이 설정은 호스트 환경을 전제로 한 패키지 기본값을 컨테이너 지향적인 프로세스 및 관측성 계약으로 대체한다. child 프로세스 수를 제한해 작은 서비스 컨테이너 내부에서 동시성이 무한정 증가하지 않도록 하고, ping endpoint를 통해 orchestration이 서비스 수준의 readiness 신호를 확인할 수 있게 한다. 스트림 기반 로깅은 진단 정보를 변경 가능한 파일에 숨기지 않고 컨테이너 수명주기에 연결한다.

## feat(wordpress): 사이트와 사용자 계정 초기화
WordPress entrypoint가 빈 애플리케이션 볼륨과 데이터베이스를 사용 가능한 사이트 상태로 수렴시킨다. 데이터베이스, 관리자, 작성자 비밀번호를 직접 값 또는 서로 배타적인 `_FILE` 입력으로 읽고, 나머지 사이트 메타데이터를 필수로 요구한다. MariaDB 인증이 가능해질 때까지 기다린 뒤 core 파일이 없을 때만 WordPress를 내려받고, 필요한 경우에만 `wp-config.php`를 생성하며, canonical HTTPS home/site URL을 보정한다. 데이터베이스가 초기화되지 않은 경우에만 사이트를 설치하고, 작성자 계정이 없을 때만 생성한다. 마지막으로 소유권을 정규화한 뒤 PHP-FPM으로 entrypoint 프로세스를 교체한다.

파일시스템 검사와 WP-CLI 쿼리는 코드, 설정, 데이터베이스 설치, 사용자 생성에 각각 별도의 idempotency 경계를 만든다. 컨테이너 시작을 일회성 설치 프로그램으로 취급하는 것보다 이 방식이 더 안정적이다. 컨테이너를 다시 생성해도 기존 애플리케이션 및 데이터베이스 영속 상태를 덮어쓰지 않고 재사용할 수 있다. 또한 WP-CLI를 사용하면 WordPress 고유 변경은 애플리케이션 경계에서 처리하고, entrypoint는 의존성 readiness와 프로세스 handoff에 집중할 수 있다.

## feat(nginx): TLS 프런트엔드 이미지 추가
스택에 HTTPS만 노출하는 전용 Debian 기반 Nginx 이미지를 추가한다. entrypoint는 필요한 런타임 디렉터리를 만들고, 인증서나 개인 키 중 하나라도 없으면 설정된 도메인용 self-signed RSA 인증서를 생성한 뒤 Nginx를 포그라운드에서 실행한다.

이를 통해 PHP-FPM이나 MariaDB를 직접 노출하지 않고 Nginx를 외부 trust 및 transport 경계로 설정한다. 런타임에 인증서를 생성하면 개인 키를 이미지와 저장소 밖에 둘 수 있고, 파일 존재 여부를 확인하므로 같은 컨테이너 파일시스템에서 반복 시작하더라도 기존 인증서를 덮어쓰지 않는다. daemonization을 끄면 컨테이너 런타임이 프런트엔드 프로세스와 종료 상태를 직접 관리한다.

## feat(nginx): PHP 요청을 WordPress로 전달
Nginx가 전체 HTTPS 요청 경계를 담당하도록 한다. IPv4와 IPv6에서 TLS 1.2 및 1.3 연결을 받고, 공유 WordPress document root를 정적 파일로 제공하며, 없는 경로는 WordPress front controller로 전달한다. PHP 스크립트는 컨테이너에서 공유하는 스크립트 경로와 HTTPS 컨텍스트를 포함해 `wordpress:9000` FastCGI endpoint로 전달한다. 가벼운 `/healthz` endpoint, 업로드 크기 제한, 브라우저 보안 헤더, dotfile 접근 차단도 초기 프런트엔드 정책에 포함한다.

이 구성은 정적 파일 제공, TLS 종료, 요청 라우팅을 Nginx에 맡기고 PHP 실행은 WordPress 서비스 안에 유지한다. 명시적인 FastCGI 파라미터는 공유 파일시스템 경로와 원래 요청 scheme에 대한 합의를 유지한다. 이 계약이 없으면 WordPress가 잘못된 스크립트를 해석하거나 비HTTPS URL을 생성할 수 있다. 숨김 경로를 제한하고 프런트엔드 로컬 health endpoint를 노출하면 애플리케이션 렌더링과 health check를 결합하지 않으면서 외부 노출 범위를 줄일 수 있다.

## feat(compose): 세 서비스 토폴로지 구성
Docker Compose가 세 개의 custom image를 하나의 스택으로 구성한다. Nginx, WordPress, MariaDB는 프로젝트 bridge network를 공유하지만 호스트 포트는 Nginx만 publish한다. 각 서비스는 안정적인 로컬 image와 container identity 및 restart 동작을 가지며, 데이터베이스와 WordPress 상태를 위한 named volume을 선언한다.

이 토폴로지는 프런트엔드를 유일한 호스트 노출 구성요소로 만들고, 서비스 이름 기반 DNS로 PHP-FPM과 MariaDB에 내부 라우팅한다. 이는 스택의 핵심 책임 경계다. transport 종료, 애플리케이션 실행, 영속성은 각각 독립적으로 빌드되고 관리되며, Compose가 이들의 공유 네트워크와 영속 리소스 namespace를 소유한다.

## feat(compose): 공개 스택 설정 전달
Compose가 각 서비스에 필요한 공개 설정만 전달하고, 참조하는 모든 값은 변수 치환 시 필수로 처리한다. Nginx에는 도메인, MariaDB에는 데이터베이스 및 계정 식별자, WordPress에는 도메인, 데이터베이스 식별자, 사이트 메타데이터, 사용자 식별자를 전달한다.

Compose 렌더링 단계에서 실패하도록 하면 누락된 설정이 부분적으로 초기화된 런타임 오류로 이어지는 대신 배포 초기에 즉시 드러난다. 서비스별 매핑은 설정 소유권도 문서화하고 불필요한 노출을 제한한다. 공개 값은 배포 계약에 중앙화하되, 각 컨테이너는 자신의 책임 수행에 필요한 부분만 받는다.

## feat(compose): 준비 상태에 따라 영속 서비스 연결
Compose 토폴로지가 명시적인 health 및 persistence 계약으로 서비스를 연결한다. MariaDB는 `/var/lib/mysql`을 named volume에 저장하고, WordPress는 쓰기 가능한 애플리케이션 volume을 소유하며, Nginx는 같은 애플리케이션 데이터를 read-only로 마운트한다. 서비스별 health check는 MariaDB 인증, PHP-FPM ping endpoint, HTTPS 프런트엔드를 각각 검증한다. WordPress는 MariaDB가 healthy 상태가 될 때까지 기다리고, Nginx는 단순히 컨테이너 생성만 기다리는 대신 WordPress 서비스가 healthy 상태가 될 때까지 기다린다.

이 변경은 시작 순서를 프로세스 존재 여부가 아니라 실제 사용 가능한 서비스 readiness 기준으로 바꾼다. 의존 서비스가 초기화 과정과 경쟁하는 것을 막고, 공유 볼륨의 마운트 모드는 소유권을 보존한다. WordPress는 애플리케이션 상태를 변경할 수 있지만 프런트엔드는 읽기만 가능하다. 예제 설정에는 초기 bootstrap 입력을 완성하기 위한 명시적 placeholder 비밀번호도 추가하지만, 실제 배포에서는 반드시 다른 값으로 교체해야 한다.

## feat(secrets): 비밀번호를 비밀 파일에서 로드
공개 환경 변수 템플릿에서 비밀번호를 제거하고 설정 가능한 호스트 파일 경로로 대체한다. Compose는 해당 파일을 named secret으로 게시하고, MariaDB에는 root 및 애플리케이션 데이터베이스 자격증명만, WordPress에는 데이터베이스와 두 WordPress 사용자 자격증명만 제공한다. 기존 `_FILE` entrypoint 인터페이스는 `/run/secrets`를 가리키도록 한다. MariaDB health check도 환경 변수로 비밀번호를 상속받는 대신 마운트된 secret 파일에서 root 비밀번호를 읽는다.

이렇게 하면 공개 설정 계약은 유지하면서 자격증명 내용은 Compose 변수 치환과 컨테이너 환경에서 분리된다. 그렇지 않으면 렌더링된 설정이나 프로세스 메타데이터를 통해 노출될 수 있다. 서비스별 secret attachment는 각 bootstrap 경로에 실제 필요한 자격증명으로 접근 범위를 좁힌다. 이 변경만으로 마운트된 파일이 일시적으로 바뀌는 것은 아니지만, 이후 수명주기 보강에서 적용할 수 있는 파일 기반 secret 경계를 마련한다.

## build(make): 스택 수명주기 명령 추가
Makefile이 선택 가능한 하나의 환경 파일과 프로젝트 Compose 정의를 기준으로 모든 Compose 호출을 중앙화한다. 시작, 종료, image build, 로그, 상태, 렌더링된 설정 확인, 일반 cleanup, 로컬 image 및 volume 전체 제거를 위한 일관된 target을 제공한다.

이 wrapper는 단순한 명령어 축약 이상의 역할을 한다. 수명주기 작업이 서로 다른 Compose 파일이나 환경 소스를 무심코 사용하지 못하게 한다. `config`는 런타임 이전 검증 경로를 제공하고, `down`과 파괴적인 `fclean` target을 구분해 영속 데이터 제거를 명시적인 운영 작업으로 만든다.

## test(static): 스택 소스 계약 검사
Python validator와 `make test` target으로 스택의 소스 수준 아키텍처를 실행 가능한 검사로 정의한다. validator는 지정된 저장소 레이아웃, custom service image와 실행 가능한 entrypoint, 세 서비스 Compose 토폴로지, HTTPS 전용 publish, health 기반 dependency, named volume, secret 파일 설정, 로컬 socket 기반 MariaDB health probe, PHP-FPM ping 요청 형식, 예상되는 Nginx, MariaDB, PHP-FPM 설정 directive를 요구한다. 또한 내장 placeholder 비밀번호와 official application image의 직접 사용을 거부한다.

이 테스트는 Docker를 시작하지 않고 구조적 invariant를 보호한다. 의도적으로 런타임 동작이 아니라 선언을 검사하므로 실제 서비스가 연동된다는 점까지 증명하지는 못한다. 대신 아키텍처 drift, 호환되지 않는 설정 문법, 실행 권한 누락, 저장소 및 secret 경계의 우발적인 약화를 빠르게 감지하는 데 가치가 있다.

## test(compose): 렌더링된 Compose 설정 검사
Docker CLI와 Compose plugin을 사용할 수 있는 환경에서는 테스트 target이 `.env.example`을 사용해 Docker Compose로 스택을 렌더링한다. Docker가 없는 환경에서는 소스 전용 검증을 실패시키는 대신 명시적으로 skip했다고 보고한다.

이 검사는 정규식 기반 검사에 authoritative Compose parser를 보완해, 텍스트 assertion으로 잡기 어려운 YAML, 변수 치환, schema 오류를 찾는다. 런타임 의존 계층을 조건부로 두면 가벼운 개발 호스트에서도 유용한 테스트 경로를 유지하면서, 필요한 toolchain이 있는 환경에서는 실제 설정 의미를 검증할 수 있다.

## test(smoke): HTTPS 상태 엔드포인트 검사
설정 가능한 smoke-check 스크립트가 외부 HTTPS health endpoint에 성공할 때까지 재시도하되, 지정된 시도 횟수를 넘으면 실패한다. `curl` 사용 가능 여부를 확인하고, 개발용 self-signed 인증서를 허용하며, 대체 URL과 재시도 간격을 지원한다. Make target에 연결하고, 해당 target의 존재와 실행 권한은 static validator가 검사한다.

이 검사는 컨테이너 상태만 신뢰하는 대신 클라이언트가 보는 TLS 경계 바깥쪽에서 스택을 검증한다. 재시도는 비동기 시작 시간을 고려하고, 유한한 실패 결과를 통해 사용할 수 없는 프런트엔드를 단순히 느린 상태로 오인하지 않도록 한다. 범위는 의도적으로 좁다. HTTPS 도달 가능성과 Nginx health 처리를 확인하며, 데이터베이스가 필요한 애플리케이션 동작은 이후 integration test에 맡긴다.

## build(docker): 임시 파일을 빌드 컨텍스트에서 제외
각 서비스 build context에서 Git metadata, 로그, PID 파일을 제외한다. 이 파일들은 image 동작과 무관하고 호스트별 이력이나 런타임 상태를 포함할 수 있으므로, Docker daemon으로 전달하지 않으면 context 크기를 줄이고 불필요한 cache invalidation이나 image layer 유출을 방지할 수 있다.

세 custom image에 같은 필터를 적용해 각 서비스 디렉터리에서 개발자가 임시 파일을 직접 관리하는 방식에 의존하지 않는 일관된 build 경계를 만든다.

## test(docker): 서비스별 빌드 필터 검사
static validator가 모든 서비스 build context에 `.dockerignore` 파일이 있는지 요구하도록 한다. 이를 통해 Nginx, MariaDB, WordPress 전체에서 새로 정한 context filtering 정책을 고정하고, 이후 서비스 변경으로 저장소 및 런타임 산출물이 Docker builder에 다시 전달되는 상황을 방지한다.

이 검사는 모든 ignore rule의 실제 효과까지 분석하지 않고 경계의 존재 여부만 확인한다. 따라서 가볍게 유지하면서도 서비스별 보호 장치 자체가 완전히 제거되는 것은 막을 수 있다.
## refactor(runtime): Compose 프로젝트 실행 경계 공통화
재사용 가능한 `ComposeProject` 추상화가 관리 코드에서 스택을 식별하고 실행하는 방식을 정의한다. Compose 프로젝트 이름과 명령 timeout을 검증하고, 사용 전에 환경 파일과 Compose 파일을 해석하며, 모든 명령을 명시적인 프로젝트 namespace로 구성한다. 또한 buffered 또는 streamed 표준 입력, 선택적 출력 capture, 종료 코드 검사, 제한된 실행 시간을 지원하는 하나의 subprocess 경계를 제공한다. 파싱된 JSON 설정과 현재 실행 중인 서비스 집합을 위한 typed helper도 노출한다.

이 규칙을 중앙화하면 backup, restore, bootstrap, diagnostics 도구가 서로 다른 명령 구성 방식으로 흩어지거나 Docker의 암묵적인 기본 프로젝트를 실수로 대상으로 삼는 일을 방지할 수 있다. 엄격한 경로 해석은 입력 파일이 없는 상태에서 파괴적인 명령이 실행되기 전에 실패하게 하고, 프로젝트 이름 제약은 리소스 이름을 예측 가능하게 만든다. timeout과 잘못된 설정을 도메인 전용 runtime error로 처리하면 상위 workflow가 원시 subprocess 및 JSON 예외에 직접 노출되지 않고 일관된 실패 모델을 사용할 수 있다.

## refactor(secrets): 비밀 파일 로딩 경계 공통화
각 관리 명령에서 따로 구현하던 secret 처리를 공유 runtime 모듈로 통합한다. 새 경계는 렌더링된 Compose 메타데이터에서 네 개의 secret source를 해석하고, canonical path가 서로 달라야 한다고 요구하며, symbolic link를 따라가지 않고 연 descriptor를 통해 각 값을 읽는다. 일반 파일이 아닌 경우, 추가 hard link가 있는 경우, 소유자가 다른 경우, 권한이 `0600`이 아닌 경우, 상위 디렉터리 권한이 과도한 경우, 입력이 너무 크거나 여러 줄인 경우, 스택의 명시적인 길이 및 문자 정책을 벗어난 비밀번호를 모두 거부한다.

이렇게 하면 설정에서 받은 경로를 단순히 읽을 수 있다는 이유만으로 신뢰하지 않고 검증된 private input으로 취급한다. descriptor 기반 검증은 경로 대체가 일어날 수 있는 시간을 줄이고 FIFO, device, symlink target을 자격증명으로 받아들이지 않도록 한다. 공유 helper는 서비스 환경을 가져오는 방식과 검증된 secret을 표준 입력으로 직렬화하는 방식도 정의해 bootstrap, backup, restore, rotation 도구가 미묘하게 다른 여러 보안 계약 대신 하나의 계약을 사용하게 한다.

## refactor(runtime): 프로젝트 관리 작업 잠금 공통화
스택 리소스를 변경할 수 있는 관리 workflow를 직렬화하는 프로젝트별 공통 operation lock을 추가한다. lock은 사용자별 private 디렉터리에 위치하며 프로젝트 이름에서 불투명한 파일명을 파생한다. 디렉터리와 lock 파일을 모두 symbolic link를 따라가지 않고 열어 소유권과 파일 유형을 검증한 뒤, exclusive non-blocking `flock`을 획득한다. context manager가 lock 해제와 descriptor 정리를 보장한다.

프로젝트 이름이 적절한 잠금 단위다. 같은 Compose namespace에 대한 bootstrap, backup, restore, credential rotation은 서로 겹치면 안 되지만, 서로 다른 프로젝트 namespace는 병렬로 동작할 수 있어야 한다. lock 경합 시 즉시 실패하는 편이 두 workflow가 volume, container, marker, credential을 두고 경쟁한 뒤 겉으로는 성공했지만 내부적으로 불일치한 상태를 남기는 것보다 안전하다.

## fix(init): 중단된 단계별 초기화를 수렴
장기 실행 service entrypoint에서 부수 효과로 수행하던 초기화를 명시적이고 잠금으로 보호되는 데이터베이스 및 애플리케이션 bootstrap 단계로 재구성한다. `start_stack.py`는 호스트 secret 파일을 해석하고 검증한 뒤, 해당 값을 label이 지정된 one-off container에 표준 입력으로만 전달한다. MariaDB를 먼저 healthy 상태까지 시작하고 WordPress를 이어서 처리하며, 애플리케이션 bootstrap이 완료된 뒤에만 프런트엔드를 시작한다. 일반 MariaDB 및 WordPress 컨테이너는 더 이상 비밀번호 환경 변수나 마운트된 secret 파일을 받지 않으므로 steady-state 프로세스에는 요청 처리에 필요한 설정만 남는다.

MariaDB는 이제 private staging 경로 아래에 새 데이터 디렉터리를 만들고, socket 전용 임시 서버를 시작해 데이터베이스 계정을 생성하고 검증한 뒤 completion marker를 기록한다. staging 상태를 동기화하고 디렉터리 이름을 영속 위치로 변경해 게시한다. 이미 marker가 있는 데이터는 다시 초기화하지 않고 같은 임시 서버로 열어 검증하며, marker가 없거나 형식이 잘못된 데이터는 거부한다. cleanup trap은 임시 프로세스를 중지하고 일시적인 client option 파일을 제거하므로, 게시 전에 중단되면 애매한 live database가 아니라 폐기 가능한 staging 상태만 남는다.

WordPress도 파일시스템과 데이터베이스 상태 전반에 같은 수렴 규칙을 적용한다. core 파일에서 예상치 못한 symbolic link를 검증하고, `wp-config.php`는 별도의 private configuration volume으로 이전하거나 그곳에 생성한 뒤 제어된 symlink를 통해서만 web tree에 노출한다. 제공된 자격증명으로 데이터베이스 설정을 검증하고, URL 변경은 임시 파일 작성 후 rename으로 게시한다. 사이트 설치, 작성자 생성, 두 계정 비밀번호를 모두 검증한 뒤 atomically replaced completion marker가 애플리케이션 준비 완료를 선언한다. 이미 완료된 설치의 자격증명이 일치하지 않으면 조용히 덮어쓰지 않고 거부한 뒤 rotation workflow를 사용하도록 한다.

Compose health check는 이제 MariaDB socket 또는 PHP-FPM ping뿐 아니라 해당 completion marker도 요구한다. 따라서 readiness는 프로세스가 연결을 받는 상태가 아니라 영속 초기화가 실제로 commit된 상태를 의미한다. 숨겨진 pause hook은 recovery test가 사용할 안정적인 중단 지점을 제공하고, 오래된 bootstrap container는 소유권 label로 선택된 프로젝트의 리소스임이 확인된 경우에만 제거한다. 이 변경들을 통해 복구 가능한 state machine을 만든다. 중단된 단계를 재시도하면 이미 commit된 상태를 검증하거나 아직 게시되지 않은 작업을 다시 만들며, 부분 초기화된 volume을 healthy 상태로 취급하지 않는다.

## test(init): 단계별 초기화 계약 검사
static validator가 복구 가능한 staged bootstrap에 필요한 소스 수준 요소를 고정한다. MariaDB에는 completion marker, staging directory, 제한된 임시 서버 대기, publish checkpoint, 계정 reconciliation을 요구하고, WordPress에는 completion marker, 인증된 데이터베이스 대기, 설치 상태 query, 별도 configuration directory를 요구한다.

이 검사가 interruption test를 대신하지는 않는다. 다만 핵심 convergence mechanism이 제거되거나 단순한 프로세스 readiness 검사로 축소될 경우 즉시 감지할 수 있다. assertion은 entrypoint script가 여전히 존재하는지만 확인하는 것이 아니라 앞선 수정에서 도입한 durable-state protocol 자체에 초점을 맞춘다.

## feat(runtime): 프로젝트·이미지·포트·URL 격리
스택 전체에서 runtime identity를 명시적이고 설정 가능하게 만든다. Compose가 더 이상 고정 container name을 지정하지 않아 project namespace가 resource naming을 소유하도록 하고, 로컬에서 빌드하는 image name에는 설정 가능한 prefix와 tag를 추가한다. HTTPS listener는 선택 가능한 host address와 port에 bind하고, WordPress는 인증서 도메인에서 암묵적으로 추론하는 대신 명시적인 canonical HTTPS URL을 받는다.

고정 container name 제거는 여러 격리 인스턴스를 실행하는 데 필수적이다. 이제 Compose가 container, network, volume을 프로젝트별로 일관되게 scope할 수 있다. parameterized image name은 프로젝트 간 build collision을 피하고, 기본 loopback bind는 평가 또는 테스트 스택이 모든 host interface에 노출되는 것을 막는다. `DOMAIN_NAME`과 `WORDPRESS_URL`을 분리하면 기본값이 아닌 port에서도 잘못된 WordPress 링크나 redirect를 만들지 않으며, URL을 필수로 지정하게 해 routing과 영속 애플리케이션 설정이 조용히 불일치하는 상황을 방지한다.

## test(bootstrap): 격리된 런타임 하네스 추가
Docker 기반 runtime harness가 개발자의 기본 프로젝트를 사용하는 대신 private temporary environment에 완전한 스택을 생성한다. 소유자만 읽을 수 있는 secret 및 environment 파일을 만들고, 고유한 Compose project와 image prefix를 선택하며, loopback HTTPS port를 예약한다. 실제 staged startup 도구를 호출하고 Docker가 실제 bind conflict를 보고한 경우에만 새 port로 재시도한다. 모든 명령은 명시적인 control, process, build timeout으로 제한한다.

bootstrap scenario는 Compose 선언을 신뢰하지 않고 실행 중인 container를 직접 검사한다. completion marker를 검증하고, 장기 실행 서비스에 `/run/secrets` mount나 비밀번호 변수가 없는지 확인하며, process argument에서 자격증명 값을 검색한다. private WordPress configuration volume이 WordPress에만 보이는지 확인하고, `wp-config.php`에는 실제 필요한 데이터베이스 자격증명만 남아 있는지 검사한다. 프로젝트 범위 teardown과 선택적 diagnostics를 통해 실패 정보를 남기면서도 테스트가 관련 없는 Docker 리소스를 삭제하지 않도록 한다.

이 harness는 소스 검증과 end-to-end 동작 사이에 실행 가능한 경계를 설정한다. 텍스트 검사만으로는 확인할 수 없는 격리, staged startup, secret lifetime, cleanup 규칙이 Docker의 렌더링된 설정과 container runtime 의미에서도 유지됨을 검증한다.

## test(e2e): HTTPS와 MariaDB를 잇는 WordPress 데이터 검증
runtime harness가 전체 요청 및 영속성 경로를 검증하도록 확장한다. 처음 선택한 HTTPS port를 의도적으로 점유해 충돌 복구를 실행하고, startup이 새 격리 port를 선택하는지 확인한다. 기존 방식인 volume 내부 `wp-config.php` layout을 강제로 구성한 뒤 private configuration volume으로 올바르게 migration되는지 검증하고, 수렴 이후 runtime secret 경계도 다시 확인한다.

이후 WP-CLI로 고유하게 식별할 수 있는 공개 게시물을 생성하고, loopback으로 명시적 DNS resolution을 사용해 Nginx의 HTTPS 경로로 가져온다. 같은 내용이 영속 database 상태에 도달했는지 WordPress를 통해 MariaDB에 query한다. 이는 healthy process를 정상 애플리케이션의 증거로 간주하는 대신 외부 TLS endpoint, FastCGI handoff, WordPress 실행, database persistence를 하나의 assertion으로 연결한다. migration case는 configuration volume 분리 이전에 만들어진 상태와의 호환성도 보호한다.

## chore(test): Python 캐시 산출물 제외
Python bytecode 파일과 `__pycache__` 디렉터리를 저장소 ignore 정책에 추가한다. 확장되는 validation 및 management toolchain은 정상 실행 중 이러한 interpreter artifact를 만들지만, 호스트와 버전에 종속된 산출물이며 스택의 소스 계약에는 필요하지 않다.

이를 제외하면 테스트 실행으로 무관한 working tree 변경이 생기지 않고, 생성된 cache 파일을 검토된 tooling으로 오인하는 일도 방지할 수 있다.

## test(persistence): 재시작·재생성 뒤 상태 보존 검증
전용 persistence scenario가 두 영속 계층에 대표 상태를 기록한다. MariaDB에는 공개 게시물과 custom WordPress option을 저장하고, WordPress data volume에는 업로드 파일을 저장한다. 프로젝트 소유 volume 세 개의 이름을 기록하고 HTTPS와 WP-CLI로 값을 검증한 뒤, 모든 서비스를 restart하고 volume을 삭제하지 않은 채 container를 teardown 후 재생성한다.

각 수명주기 전환 후에도 동일한 값을 읽을 수 있어야 하며 프로젝트는 정확히 기존 volume 집합을 계속 참조해야 한다. 이는 process recovery와 storage durability를 구분한다. 정상 상태의 대체 container가 비어 있거나 이름이 다른 volume을 조용히 연결했다면 충분하지 않다. database row, application option, filesystem content를 모두 포함해 Compose volume model이 완성된 스택이 의존하는 모든 상태 유형을 보존함을 검증한다.

## feat(backup): 백업 무결성과 비공개 파일 I/O 정의
backup 모듈은 일반적인 high-level file write 대신 명시적인 durability와 confidentiality primitive부터 정의한다. SHA-256 helper는 seek 가능한 stream에서 동작하고 호출자의 위치를 복원하며, 출력 파일은 mode `0600`으로 exclusive 생성한다. 파일 내용은 반환 전에 flush와 동기화를 수행하고, 이후 rename 작업의 영속성을 위해 directory synchronization도 제공한다. 전용 error type으로 backup domain failure와 원시 operating-system exception을 구분한다.

이 primitive는 이후 backup protocol에 필요한 전제를 만든다. 기존 경로를 실수로 덮어쓸 수 없고, backup material은 나중에 권한을 고치는 것이 아니라 생성 시점부터 private하며, checksum 계산 후에도 reader 상태를 유지하고, 성공적인 publication은 file과 directory metadata의 durability까지 포함할 수 있다. 이러한 작업을 중앙화하면 개별 backup 단계에서 `fsync`를 빠뜨리거나 더 약한 권한을 선택하는 것도 방지한다.

## feat(backup): 관리 작업 신호와 테스트 중단 경계 추가
backup 모듈이 `SIGINT`와 `SIGTERM`을 제어된 operation failure로 변환하고 이후 호출자의 기존 handler를 복원하도록 한다. 명시적인 failure injection 및 pause stage도 정의한다. pause helper는 ready file을 atomically 생성하고 동기화하는 동안 termination signal을 block하고, 대기 직전에 signal mask를 복원한다. 따라서 테스트는 작업이 의도한 상태에 도달한 뒤에만 중단 신호를 전달할 수 있으며, 설정이나 중단이 실패해도 cleanup이 ready file을 제거한다.

이를 통해 timing-dependent sleep을 테스트 suite에 추가하지 않고 비동기 실패를 결정적으로 검증할 수 있다. 더 중요한 점은 signal을 exception으로 처리하면 operator cancellation, injected fault, 일반 error가 동일한 `finally` path를 사용할 수 있다는 것이다. 따라서 service recovery, temporary file 제거, lock 해제, rollback이 abrupt process termination 의미에 의존하지 않고 하나의 correctness path를 공유한다.

## feat(backup): 백업용 Compose 실행 어댑터 추가
backup 도구에 검증된 project name, 해석된 environment/Compose 파일, JSON configuration 접근, running-service query, metadata query·control operation·장시간 data transfer별 timeout class를 갖는 전용 Compose 실행 adapter를 추가한다. subprocess interface는 byte input, streaming input, streaming output, captured output을 지원하되 서로 호환되지 않는 조합은 거부한다.

backup과 restore는 전체를 메모리에 buffer하면 안 되는 데이터 집합을 다루므로 private file을 Compose subprocess에 직접 연결할 수 있는 기능은 편의가 아니라 기능적 요구사항이다. 동시에 모든 호출은 지정된 project와 configuration source에 고정된다. 이를 통해 transfer 명령이 Docker의 implicit namespace로 fallback하는 것을 막고, 각 작업의 예상 소요에 맞는 bounded failure semantics를 제공한다.

## feat(backup): WordPress 아카이브 입력 검증
gzip tar validator가 archive 구조를 신뢰할 수 없는 입력으로 취급한다. 빈 archive, absolute path, parent-directory traversal, 정규화 후 중복되는 이름, 일반 파일이나 디렉터리가 아닌 모든 member type을 거부한 뒤 다음 consumer가 사용할 수 있도록 stream 위치를 처음으로 되돌린다.

restore 경로는 이후 이 archive를 영속 WordPress volume에 추출한다. extraction 전에 검증하면 path escape를 막고, symbolic link, hard link, device 및 쓰기 위치를 바꾸거나 특수 filesystem object를 만들 수 있는 다른 tar 기능을 제외할 수 있다. 중복 이름을 거부하면 archive 순서에 따른 모호성도 제거해 하나의 logical path에 하나의 authoritative payload만 존재하도록 한다.

## feat(backup): 프로젝트별 백업 작업 잠금 적용
backup 작업도 startup 관리에서 사용하는 것과 동일한 프로젝트별·사용자별 advisory lock model을 획득한다. lock directory와 file에 private permission, ownership, regular-file type, 안전한 no-follow open을 검사하며, 경합 시 non-blocking `flock`을 통해 즉시 실패한다.

backup은 실행 중인 container, MariaDB state, WordPress volume, 이후 restore metadata 사이의 일관된 관계를 관찰해야 한다. 다른 관리 작업과 직렬화하면 동시 bootstrap, backup, restore, rotation이 capture 도중 이 관계를 변경하지 못한다. 프로젝트를 lock key로 사용하면 동일한 Docker namespace를 다루는 모든 workflow는 보호하면서 서로 독립적인 스택 간 동시성은 유지할 수 있다.

## feat(backup): DB 덤프와 WordPress 볼륨 수집
backup 도구가 서로 다른 두 persistence domain을 수집할 수 있게 한다. MariaDB는 실행 중인 database container를 통해 `--single-transaction`으로 dump하며 routine, event, trigger, binary data, database recreation statement도 포함한다. root 비밀번호는 표준 입력으로 전달되어 container 내부의 private temporary client option file에 저장되고 signal-aware trap으로 제거된다. SQL stream은 private하고 동기화된 host file에 직접 기록한 뒤 인식 가능한 dump syntax가 있는지 확인한다.

WordPress data와 private configuration volume은 one-off service container에서 gzip archive로 streaming한다. web volume의 `wp-config.php` symlink는 authoritative regular file이 이미 configuration volume에 있으므로 제외해 dangling 또는 중복 archive member를 만들지 않는다. database export와 filesystem archive를 분리하면 각자의 consistency mechanism을 존중할 수 있다. MariaDB는 transactional logical dump를 사용하고, WordPress 파일은 volume mount topology를 통해 수집한다.

## feat(backup): 백업 출력 경로를 안전하게 예약
backup destination은 마지막 component를 resolve하지 않은 채 정규화하고, 기존 parent directory는 resolve한 뒤 실제 directory인지 요구한다. 모호한 최종 이름을 거부하고 destination directory의 device와 inode를 기록해 이후 단계가 처음 예약한 object가 여전히 해당 path를 차지하는지 확인할 수 있게 한다.

이는 신뢰 가능한 parent resolution과 새 output name 생성 과정을 분리한다. 단순 문자열 비교로는 validation과 publication 사이에 reservation이 다른 directory, symlink, mount로 교체되는 것을 감지할 수 없다. inode 비교를 통해 이후 atomic publish 단계가 대상을 교체하기 전에 object identity를 확인한다.

## feat(backup): 백업 세트를 원자적으로 게시
완전한 backup transaction을 구현한다. 세 서비스가 모두 실행 중이어야 하며, 비어 있는 private output directory를 예약하고 sibling temporary directory에 database와 WordPress artifact를 생성한다. MariaDB는 transactional dump를 위해 실행 상태로 유지하면서 Nginx와 WordPress를 중지하고, UTC 생성 metadata와 SHA-256 digest를 포함한 versioned manifest를 작성한다. publication 전 archive 구조를 검증하고 temporary directory를 동기화한다.

publication은 예약된 destination이 여전히 같은 빈 inode인 경우에만 수행한다. 검증된 temporary directory가 한 번의 rename으로 이를 대체하고 parent directory를 동기화한다. 그 전까지 caller가 관찰할 수 있는 것은 backup이 없거나 빈 reservation뿐이며, 부분적으로 채워졌지만 완전해 보이는 set은 노출되지 않는다. 모든 failure path에서 unpublished temporary state와 자체 reservation을 제거하고 application service를 healthy 상태로 되돌리려고 시도한다. service availability 복구에 실패하면 원래 backup error 뒤에 숨기지 않고 별도 실패로 드러낸다.

workflow 전체를 signal handling과 project operation lock으로 감싸 cancellation과 concurrency도 같은 transaction 경계를 따르게 한다. 결과적으로 publish된 backup에는 정확히 database dump, WordPress archive, 일치하는 manifest가 포함되고, 실패한 시도는 오해를 부를 output set을 남기지 않으며 의도적으로 stack을 중지 상태로 방치하지 않는다는 invariant가 성립한다.

## feat(backup): 백업 CLI와 Make 타깃 연결
backup transaction을 필수 project, environment, output argument와 선택적 Compose file 지정, 결정적 테스트를 위한 숨겨진 failure/pause control을 갖는 command-line operation으로 노출한다. entry point는 Docker 사용 가능 여부를 확인하고, 쌍으로 제공되어야 하는 pause argument를 검증하며, 명시적인 project 경계를 구성한다. domain 및 subprocess failure를 non-zero 결과로 변환하고 핵심 diagnostic을 출력한다. Make target은 도구를 호출하기 전에 `BACKUP_DIR`을 필수로 요구한다.

이렇게 하면 내부 transaction을 재현 가능한 운영 interface로 만들면서 기본 safety를 약화하지 않는다. output path를 필수로 지정하게 해 암묵적인 working-directory 위치를 실수로 사용하는 것을 막고, project 및 environment parameter를 유지해 기본 배포뿐 아니라 격리된 test/evaluation stack에도 사용할 수 있다.

## test(backup): 게시 실패와 중단 정리 검증
Docker runtime suite에 backup/restore scenario와 실제 cancellation을 검증하는 데 필요한 process-control 기능을 추가한다. backup 도구를 child process로 실행하고, 동기화된 stage-ready file을 기다린 뒤 `SIGINT` 또는 `SIGTERM`을 전달할 수 있다. graceful termination 시간을 제한한 후 필요하면 kill로 escalation하며, 모든 project container, volume, network를 열거하고 각 service가 healthy 상태로 복구됐는지 확인한다. 서로 다른 `TMPDIR` 값을 사용하는 process에서도 project lock을 실행해 lock identity가 caller별 temporary directory에 우연히 scope되지 않고 공유됨을 검증한다.

scenario는 database dump publication 실패와 application service 중지 이후의 interruption을 다룬다. 최종 backup이나 임시 sibling이 남지 않고 source project가 복구되는지 검사한다. 이 assertion은 atomic backup interface의 핵심 negative guarantee를 대상으로 한다. 실패하거나 취소된 작업은 그럴듯한 backup set을 게시하거나, synchronization artifact를 유출하거나, management lock을 계속 점유하거나, live stack을 degraded lifecycle state에 남겨서는 안 된다.
## feat(restore): Compose 리소스 이름과 기존 객체 조회
restore 준비 과정이 렌더링된 Compose JSON에서 실제 volume 및 network 이름을 파생하고, 현재 및 legacy Compose naming 형식에 따른 service/bootstrap container 이름 후보를 계산한다. Docker resource는 project label 또는 정확히 예상되는 이름으로 조회할 수 있다.

label만으로는 파괴적인 freshness check에 충분하지 않다. 수동으로 생성되었거나 부분 실패로 남은 object가 Compose가 사용할 이름을 차지하면서 예상 label은 갖지 않을 수 있기 때문이다. 반대로 이름을 hard-code하면 명시적인 resource name이나 Compose rendering 규칙을 무시하게 된다. 렌더링된 이름, 관례적인 container name, label을 함께 사용해 restore가 리소스를 만들거나 삭제하기 전에 충돌을 식별할 근거를 확보한다.

## feat(restore): 대상 프로젝트 자원 충돌 사전 차단
restore 대상은 완전히 새 상태여야 한다. 변경을 시작하기 전에 project label이 붙은 container, volume, network와 bootstrap helper를 포함한 정확한 container name, Docker에 이미 존재하는 렌더링된 volume/network name을 검사한다. 하나라도 일치하면 resource count 요약과 함께 작업을 중단한다.

기존 상태에 restore하면 overwrite와 rollback 의미가 모호해진다. 오류가 작업 이전의 데이터를 파괴할 수 있고, 성공적인 extraction도 서로 무관한 두 installation을 합칠 수 있다. 빈 namespace를 요구하면 단순한 ownership invariant를 얻는다. 검사 이후 생성된 모든 resource는 이 restore 시도에 속하므로 실패 시 안전하게 제거할 수 있다.

## feat(restore): 백업 입력의 형식과 체크섬 검증
restore input은 사용자 경로를 반복해서 resolve하는 대신 descriptor에 고정된 검증 객체로 연다. source는 사용자 소유의 private한 non-symlink directory여야 하며 정확히 예상된 세 파일만 포함해야 한다. 각 entry는 directory descriptor를 기준으로 link를 따라가지 않고 열고, 현재 사용자 소유의 private single-link regular file인지 확인한다. 또한 non-blocking shared lock을 유지해 검증 및 사용 중 다른 프로세스가 정상적인 방식으로 파일을 변경할 수 없게 한다.

manifest는 크기가 제한되어야 하고, 유효한 UTF-8 JSON이며, 지원하는 format version을 사용해야 한다. checksum table은 두 data artifact의 streamed SHA-256 값과 일치해야 하며, WordPress archive에는 앞서 정의한 구조 검증도 적용한다. 반환되는 `VerifiedBackup`은 restore가 끝날 때까지 이미 연 database/archive stream과 directory descriptor를 유지해 validation과 사용 사이의 path-substitution race를 줄인다. 형식이 잘못되었거나 권한이 과도하거나, 불완전하거나, 추가 파일이 있거나, 동시에 변경되었거나, 손상된 backup은 대상 resource를 하나도 만들기 전에 거부한다.

## feat(restore): DB와 WordPress 데이터를 새 볼륨에 주입
restore에 두 state domain을 위한 streaming primitive를 추가한다. database 경로는 private temporary file에서 root credential을 SQL stream 앞에 붙여 실행 중인 MariaDB container로 전송한다. 첫 줄로 ephemeral client option file을 만들고 나머지 dump는 local socket client에 전달한다. 이를 통해 비밀번호가 command argument에 들어가지 않으며 크기가 임의로 큰 dump를 process memory에 전부 올리지 않아도 된다.

WordPress 경로는 새로 생성된 volume을 마운트한 one-off service container를 실행하고 data 및 configuration mount point가 모두 비어 있어야 한다고 요구한 뒤, 앞서 검증한 gzip stream을 `/var/www` 아래에 추출한다. empty-volume precondition은 archive가 bootstrap 잔여물이나 무관한 파일과 섞이는 것을 막는다. 기존 database/application startup 함수를 재사용해 restored resource도 새로 초기화한 stack과 동일한 completion marker, health, secret lifetime 계약을 따르게 한다.

## feat(restore): 실패한 복원 자원을 정리하고 롤백
restore transaction을 signal handling과 project operation lock 아래에서 구성한다. 변경 전에 backup과 target freshness를 검증하고 현재 대상 credential을 로드한 뒤, 새 MariaDB volume을 bootstrap하고 database dump를 import하며 WordPress volume을 주입한다. 이후 일반 application bootstrap을 실행해 configuration, account, marker, service health를 수렴시킨다. database import 이후 지점에는 결정적인 recovery test를 위한 failure/pause hook을 둔다.

resource 생성이 시작된 뒤 예외가 발생하면 project 범위의 `compose down --volumes` rollback을 실행한다. cleanup은 이어서 label과 예상 이름을 기준으로 container, volume, network를 독립적으로 열거한다. Compose 명령이 성공하고 대상 resource도 하나도 남지 않은 경우에만 cleanup 성공으로 인정한다. 이 2차 검증이 필요한 이유는 `down` 명령이 실패했거나 일부 object에 label이 누락된 경우 단순히 cleanup을 시도했다는 사실만으로 rollback이 완료되었다고 볼 수 없기 때문이다.

fresh-project precondition 덕분에 삭제가 안전하다. 발견되는 모든 대상 object는 기존 사용자 상태가 아니라 실패한 restore가 만든 리소스다. restore와 cleanup이 모두 실패하면 원래 exception을 context로 보존하면서 cleanup failure도 명시적으로 보고해 대상이 빈 상태로 돌아왔다고 잘못 주장하지 않는다. 최종 계약은 project 수준의 all-or-nothing이다. 성공한 restore는 healthy한 완전한 stack을 만들고, 실패한 restore는 자신이 소유한 Docker state를 남기지 않아야 한다.

## feat(restore): 복원 CLI와 Make 타깃 연결
backup 도구의 public interface가 `backup`과 `restore` operation을 모두 지원한다. input path와 output path는 서로 배타적이며, 숨겨진 failure/pause stage는 선택된 operation에 맞는지 검증하고, 오류 메시지에는 실제 operation name을 사용한다. Make target은 `BACKUP_DIR`을 필수로 요구하고 명시적인 project/environment 경계와 함께 restore input으로 전달한다.

operation별 argument validation을 통해 테스트 전용 database-dump stage가 restore에서 허용되거나 restore pause point가 backup에서 아무 동작 없이 무시되는 일을 막는다. verification, freshness check, streaming injection, rollback이 완성된 뒤에만 restore를 노출해 CLI 경계가 불완전한 recovery command가 아니라 transaction semantics와 일치하도록 한다.

## test(restore): 거부·롤백·복원 상태 검증
backup/restore runtime scenario가 source와 동일한 credential을 사용하는 두 번째 격리 프로젝트에서 restore 계약을 검증한다. 먼저 SQL artifact를 symbolic link로 바꾸고 대상 resource가 생기기 전에 거부되는지 확인한다. 이후 database import 다음 단계에서 failure를 주입하고 같은 동기화 지점에서 `SIGINT`를 보내 두 경로 모두 모든 target container, volume, network를 제거해야 한다고 요구한다.

정상 restore는 새 target stack에서 이전에 backup한 database 값과 upload file을 복구해야 한다. 이제 active 상태가 된 프로젝트에 다시 restore를 시도하면 거부되어야 하며, 이를 통해 임의의 기존 상태와 마찬가지로 성공적으로 복원된 상태도 같은 freshness check로 보호됨을 확인한다. static assertion은 추가로 path safety, checksum, lock, signal, timeout, credential argument, publication, rollback mechanism을 보존한다.

이 테스트는 transaction의 positive/negative 측면을 연결한다. valid input은 동등하고 healthy한 installation을 만들며, unsafe input, injected failure, operator interruption, non-empty target은 destructive merge나 leaked partial project를 만들지 않아야 한다.

## feat(secrets): 교체 비밀 파일을 안전하게 읽고 게시
credential rotation에 들어오는 replacement value와 스택의 active secret file 모두를 위한 hardened host-file 경계를 추가한다. 각 secret은 symbolic link를 따라가지 않고 열며, mode `0600`의 single-link regular file이어야 한다. 필요한 경우 호출자 소유인지도 요구하고, bounded stream으로 읽어 비밀번호 형식의 한 줄만 허용한다. 이를 통해 device, pipe, linked file, 과도하게 큰 input, 광범위하게 읽을 수 있는 path를 신뢰할 수 있는 credential material로 취급하지 않는다.

secret publication은 같은 directory의 temporary file을 사용하고, 쓰기 전에 private permission을 적용하며, 내용을 flush하고 `fsync`한 뒤 destination을 atomically replace하고 parent directory를 동기화한다. 이 보장은 네 파일 전체 transaction이 아니라 파일별 보장이지만, 각 path에서 reader가 부분적으로 기록된 credential을 관찰할 수 없고 완료된 replacement는 crash boundary를 넘어 durable하게 된다. 대응되는 database 및 WordPress mutation을 조정하려면 먼저 이 low-level contract가 필요하다.

## feat(secrets): Compose 자격증명 경로와 계정 설정 해석
rotation 도구가 완전히 렌더링된 Compose model에서 operation context를 파생한다. `docker compose config --format json`을 parse하고, 일반 stack startup과 동일한 `secret_source_paths` 로직에 secret-source resolution을 위임하며, 각 service의 렌더링된 environment에서 account identifier를 읽는다.

렌더링된 configuration을 authority로 사용하면 rotation command 내부에 `.env`, 상대 secret path, interpolation, service setting을 별도로 해석하는 두 번째 구현을 유지할 필요가 없다. 따라서 rotation은 선택한 Compose project가 실제 사용할 정확한 file과 account name을 대상으로 하며, 기존의 configuration resolution과 credential mutation 경계를 유지한다.

## feat(secrets): MariaDB 계정 비밀번호 원자 교체
MariaDB credential 변경을 database container 내부의 인증된 local-socket session을 통해 수행한다. root 비밀번호와 SQL program은 표준 입력으로 전달하고, private temporary option file이 client authentication을 담당하며 shell trap으로 제거한다. 따라서 credential이 command argument나 container의 장기 environment에 들어가지 않으면서도 management tool은 명시적인 account 변경을 실행할 수 있다.

application 및 root account update는 SQL literal escaping과 `NO_BACKSLASH_ESCAPES`를 사용해 구성하며, operation을 승인하는 root credential보다 application credential을 먼저 변경한다. helper는 write 이후 강제로 SQL error를 발생시킬 수도 있어 "상태는 변경됐지만 명령은 실패함"이라는 모호한 결과를 재현할 수 있다. 이후 compensation logic은 nonzero exit status를 변경 없음과 동일시하지 않고 실제 account state를 판단해야 하므로 이 구분이 필수적이다.

## feat(secrets): WordPress 설정과 사용자 비밀번호 교체
rotation이 WordPress가 소유한 두 credential domain을 외부에서 storage representation을 직접 편집하는 대신 WordPress와 PHP를 통해 갱신한다. 관리자 및 작성자 비밀번호는 `wp_set_password`로 변경해 WordPress의 password hashing과 account semantics를 유지하고, database 비밀번호는 범위를 제한한 PHP program으로 private `wp-config.php` volume에서 갱신한다.

configuration update는 target이 regular file인지 확인하고 정확히 하나의 `DB_PASSWORD` 정의만 교체한다. 같은 filesystem에 private temporary file을 작성하고 ownership과 mode를 보존하며, 새 내용을 동기화한 뒤 `rename`으로 게시한다. JSON payload는 표준 입력으로 전달해 replacement value가 process argument에 포함되지 않게 한다. user 및 configuration operation은 one-off WordPress container에서도 실행할 수 있으므로, 현재 credential로 steady-state application container를 계속 실행할 수 없는 경우에도 이후 rollback code가 persistent state를 복구할 수 있다.

의도적으로 write 이후 failure를 주입해 command completion과 state completion을 구분한다. 따라서 상위 rotation 절차는 failed subprocess가 WordPress를 변경하지 않았다고 가정하지 않고, 결과 credential state를 검사해 보상해야 한다.

## feat(secrets): 교체 전후 자격증명 동작 검사
credential state를 실제로 소비하는 interface를 통해 검증할 수 있게 한다. 도구는 private client option file로 database application user를 인증하고, 관련 cache를 비운 뒤 `wp_check_password`로 WordPress user password를 확인하며, private configuration의 database password를 constant-time comparison으로 검증한다.

이 probe는 rotation correctness를 host file 비교나 command exit code가 아니라 관찰 가능한 동작으로 바꾼다. MariaDB, WordPress authentication, `wp-config.php`가 각각 동일한 credential에 동의하는 경우에만 설치된 것으로 간주해 성공적인 mutation, partial mutation, 이후 rollback을 판별할 근거를 제공한다.

## feat(secrets): 런타임 비밀 노출 경계 검사
rotation 도구가 live container를 기준으로 스택의 secret-isolation contract를 다시 검증한다. mount를 검사해 어떤 service도 `/run/secrets`를 유지하지 않는지 확인하고, private WordPress configuration volume은 WordPress에만 보여야 하며, Nginx는 public `wp-config.php` link를 볼 수 있지만 private target을 resolve할 수 없어야 한다.

container configuration, `/proc` 아래에서 읽을 수 있는 모든 process environment, Docker가 보고하는 process argument에서 금지된 password variable name과 검증 대상 실제 credential value를 모두 검색한다. rotation 후 이 검사가 중요한 이유는 인증 성공만으로 recreate 작업이 의도한 exposure boundary를 보존했음을 증명할 수 없기 때문이다. 새 상태가 동작하면서도 이전 및 새 credential 어느 쪽도 runtime metadata나 관련 없는 service에 남지 않아야 rotation 완료로 인정한다.

## feat(secrets): 신규 자격증명 수용과 기존 값 거부 검증
rotation verification이 credential transition의 양쪽을 모두 assertion한다. 예상되는 root 및 application database password는 인증에 성공해야 하고, private WordPress configuration에는 예상 database password가 있어야 하며, 두 WordPress account password도 유효해야 한다. 이전 credential set이 제공된 경우 해당하는 모든 기존 database 및 WordPress credential은 실패해야 한다.

기존 값의 거부까지 요구하는 것은 새 값만 확인하는 것보다 강하다. 중복 account entry, 오래된 password hash, 불완전한 `ALTER USER`, 부분적으로 recreate된 service 때문에 두 generation이 동시에 사용 가능해지는 상황을 막을 수 있다. 같은 변경에서 중복 없이 candidate value를 시험하는 root-password probe도 추가해, 중단된 root update가 compensation 전에 old/replacement credential 중 어느 쪽을 authoritative하게 남겼는지 recovery code가 판단할 수 있게 한다.

## feat(secrets): 회전 실패 시 기존 자격증명 복구
rotation 실패 시 모든 참여 store에서 이전에 검증된 credential set을 재구성하는 compensating procedure를 실행한다. 먼저 MariaDB를 recreate하지 않고 사용할 수 있게 만든 뒤 현재 동작하는 root password를 찾는다. database application credential을 복원하고, one-off application container를 통해 `wp-config.php`와 두 WordPress account를 복구하며, root credential을 되돌리고 원래 host secret file을 atomically 다시 게시한다.

중간 단계마다 compensation은 best-effort로 진행해 개별 오류를 누적하되 남은 repair를 중단하지 않는다. 단순히 명령을 시도했다는 이유로 recovery를 성공으로 보고하지 않는다. stack을 강제로 recreate한 뒤 모든 original credential이 동작하는지, 모든 replacement credential이 거부되는지, runtime exposure boundary가 유지되는지, 모든 host file을 다시 읽어 일치하는지 검증한다. 이 최종 상태 검증까지 통과한 경우에만 rollback 완료로 인정한다.

이는 database-level atomicity가 아니라 compensating transaction이다. 정확성은 현재 유효한 root credential을 식별하고, 이후 repair가 계속 가능하도록 dependency를 적절한 순서로 복원하며, subprocess 결과가 모호할 때도 검증된 최종 system state를 authoritative하게 취급하는 데 달려 있다.

## feat(secrets): 스택 자격증명 회전 절차 연결
개별 mutation 및 verification primitive를 프로젝트 범위 rotation workflow로 조립하고 CLI와 Make target으로 노출한다. 명령은 서로 다른 네 active secret path를 해석하고, caller가 소유한 private replacement directory를 요구하며, 모든 replacement를 검증하고, 변경되지 않은 값은 거부한다. runtime state를 건드리기 전에 database 및 WordPress account identity가 안전한 configuration인지 확인한다.

기존 상태를 검증한 뒤 workflow는 의존 credential이 일시적으로 불일치할 수 있는 동안 public request path를 닫기 위해 Nginx를 중지한다. WordPress account password와 private database configuration을 갱신하고, MariaDB application password를 변경한 뒤 root password를 마지막에 바꾼다. 네 host file을 게시하고 service를 force-recreate해 stack이 새 generation으로 수렴하도록 한다. 완료 조건은 새 credential이 동작하고, 기존 credential이 실패하며, host file이 일치하고, runtime secret boundary가 유지되는 것이다.

전체 절차는 다른 파괴적 management action과 동일한 per-project operation lock 아래에서 실행한다. 예외가 발생하면 compensating rollback으로 들어가 이전 generation이 완전히 복원됐는지 또는 불확실한 상태인지 보고한다. 이 순서는 inconsistency window를 최소화하면서, 성공과 실패를 검증되지 않은 write의 연속이 아니라 명시적인 최종 상태로 만든다.

## fix(secrets): 회전 중단과 불명확한 상태를 보상
rotation failure model이 write를 수행한 뒤 실패하는 command와 interruption까지 다루도록 확장한다. WordPress user update, configuration publication, database application/root 변경, 각 host-file publication 경계, service recreation 전후에 failure injection point를 두고, 모든 host file publication 이후에는 synchronized pause를 제공해 실제 mixed state에서 signal을 전달할 수 있게 한다. 이 단계들은 subprocess 결과만으로 어느 credential generation이 active인지 알 수 없는 경우를 드러낸다.

forward mutation 중 `SIGINT`와 `SIGTERM`은 일반 rotation failure로 변환되어 implementation error와 같은 compensation path로 들어간다. rollback이 시작된 뒤 들어오는 추가 termination signal은 recovery sequence를 중단하지 않고 지연한다. 따라서 operator cancellation으로 compensation 자체가 취소되어 stack이 credential generation 사이에 멈추는 일을 방지한다.

rollback 완료 여부는 최종 behavioral verification으로 판단한다. 중간 compensation error는 diagnostics를 위해 보존하지만, old credential, host file, service, rejection check가 모두 recovery 성공을 증명한다면 결과를 불확실하다고 처리하지 않는다. 반대로 해당 end state를 확립할 수 없으면 incomplete rollback을 보고한다. test-only ready marker와 엄격히 연동된 hidden argument를 통해 production interface를 바꾸지 않고 이 timing-sensitive boundary를 재현할 수 있다.

## test(secrets): 회전 롤백과 재시도 검증
전용 runtime scenario가 격리된 live stack을 대상으로 credential rotation을 검증한다. 먼저 정상 rotation을 한 번 수행한 뒤, WordPress user publication, configuration publication, database application-password publication, root-password publication, 첫 번째 host-file replacement, recreation 전 WordPress container 제거 이후에 각각 failure를 주입한다. 모든 failure는 검증된 rollback을 보고하고 직전에 active하던 generation을 authoritative하게 유지해야 한다.

scenario는 모든 host file이 변경된 뒤 pause하고 `SIGTERM`을 보내 compensation을 시작한 다음 rollback이 active해질 때까지 기다렸다가 `SIGINT`를 다시 보낸다. 두 번째 signal은 recovery를 중단하지 않고 지연되어야 한다. 이 중단된 시도 이후 변경하지 않은 동일 replacement directory로 정상 retry를 수행해 compensation이 operator input을 소비하거나 손상하지 않았고 project lock이나 잔여 state 때문에 operation이 영구적으로 복구 불가능해지지 않았음을 확인한다.

state verification은 의도적으로 end-to-end다. host file은 private ownership/permission으로 예상 값을 포함해야 하고, 예상 database 및 WordPress credential은 동작하면서 거부 대상 값은 실패해야 한다. `wp-config.php`는 MariaDB와 일치해야 하며 HTTPS와 WordPress write/read round trip도 정상 동작해야 한다. host나 container에 temporary credential file이 남아서는 안 되고, 테스트한 secret이 process metadata, runtime environment, log, tool output에 나타나서도 안 된다. 이 suite는 "rollback을 시도했다"와 "이전의 완전한 system state가 실제로 복원됐다"를 구분해 고정한다.

## build(images): Debian 이미지와 패키지 입력 고정
세 service image 모두 immutable digest로 식별되는 동일한 날짜의 Debian base image에서 시작하도록 한다. APT source는 main, updates, security repository를 모두 timestamp가 지정된 Debian snapshot으로 교체하고, archive된 snapshot metadata는 시간이 지나면 자연스럽게 만료되므로 validity-date check를 명시적으로 비활성화한다.

이 변경으로 rebuild 시점의 `bookworm-slim`이나 live mirror 상태가 아니라 동일한 base filesystem과 package repository state를 사용한다. 대신 의도적인 maintenance가 필요하다. security 및 compatibility update가 암묵적으로 들어오지 않으므로 pin을 갱신하는 방식으로 검토해 반영해야 한다. 사용하지 않는 WordPress `unzip` dependency도 제거해 더 이상 필요 없는 software를 image에 남기지 않고 고정된 package surface를 줄인다.

## build(wordpress): WordPress 산출물을 고정해 게시
WordPress image가 image build 중 명시적인 WP-CLI 및 WordPress release를 내려받고, commit된 SHA-256 digest로 두 artifact를 모두 검증한다. WordPress core는 image 소유 source directory에 풀고, 정렬된 checksum manifest가 `wp-content`를 제외한 모든 core file을 기록한다. 실행 중인 installation이 검토된 image input과 조용히 달라지지 않도록 WordPress 자동 update를 비활성화한다.

bootstrap은 더 이상 `wp core download`를 실행하지 않는다. 대신 모든 manifest path를 검증하고, symbolic link나 regular file이 아닌 target을 거부하며, 변경된 core file을 같은 directory의 temporary file을 거쳐 복사한다. 각 publication을 동기화하고 설치된 전체 core를 image manifest와 비교해 검증한다. 이를 통해 persistent volume이 interruption이나 drift 이후 startup 시 네트워크 가용성에 의존하지 않고 image가 알고 있는 core version으로 다시 수렴할 수 있다.

`wp-content`에는 다른 ownership rule을 적용한다. image는 누락된 기본 directory/file만 생성하고 기존 content는 덮어쓰지 않는다. core file은 image가 제어해 재현 가능하게 유지하고, upload, plugin, theme 및 기타 application data는 volume이 제어한다. 이 정책을 분리하면 사용자 state를 보존하면서 persisted core binary가 image integrity contract를 우회하지 못하게 한다.
## test(supply-chain): 불변 image 입력 검증
static validation이 모든 service Dockerfile에 검토된 Debian digest와 package snapshot timestamp를 유지하도록 요구한다. WordPress image도 정확한 WP-CLI/WordPress version과 각각의 checksum, checksum verification, image에서 생성한 core manifest를 유지해야 한다. entrypoint가 검증된 artifact를 복사하지 않고 다시 runtime download를 수행하도록 바뀌면 거부한다.

end-to-end runtime scenario는 별도로 WordPress와 WP-CLI에 현재 실행 중인 version을 조회한다. source contract 검사와 live version 검사를 결합하면 명백한 pin 제거뿐 아니라 Dockerfile에는 pinned artifact가 존재하지만 실제 container에서 실행되는 software는 다른 미묘한 integration error도 방지할 수 있다.

## feat(network): DB 트래픽을 내부 backend로 격리
하나의 shared bridge를 Nginx-to-WordPress traffic용 frontend network와 WordPress-to-MariaDB traffic용 internal backend network로 분리한다. Nginx는 frontend에만, MariaDB는 backend에만 연결하며, WordPress만 두 network에 모두 연결한다. WordPress가 두 tier와 합법적으로 통신해야 하는 application boundary이기 때문이다.

backend network를 internal로 지정하면 database segment에서 직접적인 외부 연결을 제거하고 TLS proxy가 MariaDB에 접근하는 것 자체를 막는다. 이 topology는 Compose 수준에서 least privilege를 표현한다. 한 tier의 compromise나 configuration error가 자동으로 모든 다른 service에 대한 network reachability로 이어지지 않으면서도 필요한 request/database path는 유지된다.

## feat(runtime): 서비스 자원과 종료 한계 적용
각 장기 실행 service에 역할에 맞는 기본값으로 CPU, memory, process count, file descriptor 제한을 명시한다. `no-new-privileges`로 executable metadata를 통한 추가 권한 획득을 막고, 제한된 `json-file` rotation으로 container log가 host storage를 무한정 차지하지 않도록 한다.

shutdown 동작도 service별로 정의한다. Nginx와 PHP-FPM에는 graceful worker termination을 위해 `SIGQUIT`을 보내고, MariaDB에는 `SIGTERM`을 보내며, 각 service에 예상 cleanup 작업에 맞는 grace period를 둔다. 이 설정은 Docker의 암묵적인 기본값을 운영 계약으로 바꾼다. overload를 container별로 제한하고 log 증가량을 제한하며, 일반 stop/recreate 작업이 강제 종료 전에 작업을 drain하고 state를 영속화할 시간을 명시적으로 갖게 한다.

## feat(nginx): 접근·오류 로그를 컨테이너 스트림에 게시
Nginx access log와 warning 이상 error log를 container-local file에 남기지 않고 표준 출력과 표준 오류로 보낸다. 따라서 Docker logging driver가 스택의 rotation limit을 적용할 수 있고, 운영 도구는 내부 log path를 mount하거나 찾아낼 필요 없이 `docker compose logs`로 proxy의 request 및 failure history를 수집할 수 있다.

## refactor(nginx): 스택 전용 TLS 산출물 이름 사용
생성되는 certificate와 private key path의 basename을 기존 `inception`에서 `container-stack`으로 바꾸고 Nginx configuration과 entrypoint를 함께 수정한다. TLS 동작은 변하지 않지만 producer와 consumer가 이전 project label이 아니라 현재 stack을 식별하는 이름을 사용하게 되어 diagnostics와 이후 certificate management의 모호성을 줄인다.

## fix(make): 볼륨 삭제 전에 확인을 요구
파괴적인 `fclean` target이 volume, local image, orphaned resource를 제거하기 전에 `DESTROY_CONFIRM`이 선택된 `PROJECT_NAME`과 정확히 일치하도록 요구한다. 일반적인 confirmation flag만으로는 어느 Compose namespace의 persistent data가 삭제되는지 식별할 수 없다. active project name을 직접 되풀이하게 하면 operator 또는 automation이 구체적인 대상을 명시적으로 확인하게 된다.

이 guard는 일반 `down`이나 `clean` 동작을 약화하지 않는다. `down -v`가 포함된 명령에만 적용하므로 편리한 lifecycle operation은 유지하면서 MariaDB 및 WordPress persistence를 backup 없이는 복구할 수 없게 되는 지점에만 추가 확인 절차를 둔다.

## build(compose): 엄격한 설정 검사 추가
`config-strict` target이 명시적인 Compose preflight를 수행한다. Docker CLI 또는 Compose v2를 사용할 수 없으면 별도의 setup error로 실패하고, 선택한 project, environment file, Compose file을 `docker compose config --quiet`에 전달해 렌더링된 설정 자체는 출력하지 않으면서 interpolation, required variable, schema validity를 검사한다.

Docker 의존 검사를 건너뛸 수 있는 opportunistic local test path와 달리 이 target은 configuration validation이 실제로 수행됐음을 요구하는 caller를 위한 계약을 정의한다. image build나 container mutation 전에 deployment 및 CI workflow가 사용할 결정적인 gate를 제공한다.

## feat(diagnostics): Compose 비밀값과 민감 항목 마스킹
새 diagnostics 도구가 operational data를 수집하기 전에 redaction부터 구성한다. 선택한 Compose project를 렌더링하고 startup과 동일한 shared path logic으로 secret file을 해석한 뒤, 각 raw configured path, resolve된 host path, 현재 secret value를 포함하는 masking set을 만든다. 이 값을 안전하게 읽을 수 없다면 이후 diagnostics output이 sanitize되었다는 사실을 증명할 수 없으므로 수집을 진행하지 않는다.

redaction은 짧은 credential/path가 긴 값의 일부를 노출하지 않도록 알려진 값 중 긴 값을 먼저 치환하고, 이어서 이름에 `password`, `secret`, `token`이 포함된 field에는 일반 assignment rule을 적용한다. exact-value masking과 structural masking을 결합해 스택이 알고 있는 credential뿐 아니라 Docker, Compose, service log, 향후 configuration field가 추가하는 민감 정보도 처리한다.

## feat(diagnostics): 컨테이너 런타임 상태 수집
Diagnostics가 command outcome과 의도적으로 제한한 container state view를 수집할 수 있게 한다. command record는 exit code, standard output, standard error, timeout failure를 보존해 diagnostic command 자체가 실패하더라도 bundle에서 조용히 사라지지 않고 유용한 증거로 남게 한다.

container inspection은 운영에 필요한 field로 제한한다. image, lifecycle/health status, exit/restart 정보, OOM state, resource limit, logging policy, security option, shutdown setting, attached network만 수집한다. raw `docker inspect` output 전체를 게시하지 않고 필요한 field만 선택하면 disclosure surface를 줄이면서 crash, resource enforcement, restart loop, shutdown behavior, topology error를 설명하는 데 필요한 데이터는 유지할 수 있다.

## feat(diagnostics): 비공개 진단 세트와 CLI 연결
Diagnostics command가 명시적인 Compose project에 대한 완전한 incident bundle을 게시한다. Docker/Compose version, 모든 service state, timestamp가 포함된 제한된 log tail, interpolation하지 않은 Compose model, 선택된 container runtime state를 기록한다. Make target은 project별 안정적인 output location을 제공하고 기본 diagnostics directory는 version control에서 제외한다.

publication은 fail-closed 방식이다. destination은 mode `0700`으로 새로 생성되어야 하고, 각 file은 mode `0600`으로 exclusive 생성한다. 모든 output을 redact한 뒤 알려진 secret이 남아 있는지 다시 검사하며, 수집 과정에서 하나라도 실패하면 불완전한 directory를 제거한다. 기존 destination을 거부해 diagnostic run이 과거 incident evidence를 덮어쓰거나 미리 배치된 output path를 따라가는 것도 막는다.

결과적인 경계는 명확하다. diagnostics에는 민감한 operational context가 포함될 수 있지만 기본적으로 private하고, 크기가 제한되며, 실제 선택한 stack의 secret을 기준으로 sanitize된다. 완전한 set으로 게시되거나 아예 보존되지 않는다.

## test(operations): 자원·격리·삭제 보호·진단 검증
새 live operations scenario가 Compose file을 단순히 받아들이는 데 그치지 않고 Docker가 선언된 policy를 실제로 적용하는지 검증한다. 각 service의 effective memory, CPU, PID, descriptor, stop signal, stop timeout, log rotation, `no-new-privileges` 설정을 비교하고, 두 network를 검사해 topology에 정의된 정확한 membership과 internal-backend flag를 요구한다.

scenario는 project-name confirmation 없이 `fclean`을 호출해 거부되는지 확인하고, 그 동안 실행 중인 HTTPS stack은 healthy 상태를 유지해야 한다. 또한 실제 credential을 Nginx access log에 기록해 diagnostics가 configuration뿐 아니라 runtime output에서 유래한 값도 redact하는지 증명한다. source secret 하나라도 읽을 수 없으면 sanitization을 검증할 수 없으므로 수집은 실패하고 아무것도 게시하지 않아야 한다.

성공한 bundle은 `0700`/`0600` 권한 아래 정확히 예상된 regular file만 포함해야 하고, 눈에 보이는 redaction evidence가 있어야 하며, credential value와 해당 host path는 포함하지 않아야 한다. 같은 destination에 다시 실행하는 경우와 dangling symbolic link를 target으로 지정하는 경우도 기존 bundle을 변경하거나 link target을 생성하지 않고 모두 거부해야 한다. runtime harness의 자동 failure collection도 같은 도구에 위임해 test diagnostics와 operator diagnostics가 하나의 privacy/publication contract를 공유한다.

## fix(smoke): HTTPS 연결과 응답 대기시간 제한
각 HTTPS smoke attempt에 5초 connection limit와 15초 total transfer limit를 추가한다. attempt별 제한이 없으면 연결은 됐지만 응답하지 않는 endpoint 하나가 단일 `curl` 호출 안에서 외부 retry budget 전체를 소모해 readiness check나 automation을 예측 불가능하게 멈출 수 있다.

retry loop는 여전히 일시적인 startup failure를 허용하지만 각 관찰은 이제 알려진 시간 안에 끝난다. 이를 통해 "service가 아직 ready가 아님"과 "probe 자체가 더 이상 진행되지 않음"을 구분하고 상위 command의 worst-case duration을 유한하게 만든다.

## test(smoke): HTTPS timeout 계약 검사
static validation이 smoke probe에 connection timeout과 total-request timeout을 모두 유지하도록 요구한다. retry loop는 남겨 두면서 개별 network call을 다시 무제한으로 만드는 이후의 단순화로부터 bounded-wait 속성을 보호한다.

## test(runtime): 프로세스·비밀값·정리 제어 흐름 강화
runtime harness가 private fixture replacement를 exclusively created temporary file에 기록하고 내용을 동기화한 뒤 destination을 atomically replace하며 항상 잔여물을 제거하도록 한다. 따라서 테스트가 생성한 credential state도 production rotation과 diagnostics가 전제로 하는 no-partial-file 가정을 따른다.

start command 구성과 실행을 분리해 interruption scenario가 project argument를 중복 구현하지 않고도 정확한 production startup invocation을 `Popen`으로 실행하고 synchronized pause control을 추가할 수 있게 한다. Compose timeout error는 멈춘 operation도 식별해 build, up, down, exec 중 어느 단계의 failure인지 diagnostics에서 구분할 수 있게 한다.

가장 중요한 변경은 harness cleanup이 자체 failure를 반환하고 전파한다는 점이다. diagnostic collection error와 nonzero `compose down --volumes` 결과를 누적하고, resource를 제거하지 못했다면 본래 scenario가 통과했더라도 실패로 바꾼다. cleanup도 test correctness의 일부다. volume, network, container를 조용히 남기면 이후 scenario를 오염시키고 lifecycle guarantee가 지켜졌다고 잘못 보고하게 된다.

## test(init): 안정 단계별 초기화 중단 복구 검증
bootstrap scenario를 체계적인 crash-recovery test로 교체한다. MariaDB bootstrap은 system table 생성, temporary server startup, database/account convergence, completion marker 생성, 최종 data publication 뒤마다 pause한 후 `SIGKILL`로 종료한다. WordPress는 core file installation, configuration publication, core installation, account convergence, marker 생성 뒤마다 독립적으로 종료한다.

bootstrap container를 종료하기 전에 harness가 Compose project label과 stack 전용 bootstrap label을 모두 검증한다. 테스트의 timing 또는 naming error로 무관한 container를 kill하는 것을 방지하기 위해서다. 각 failed start는 실제 failure로 노출되어야 하며, 이후 중단된 volume state를 그대로 두고 일반 start command를 다시 실행한다.

recovery는 MariaDB가 staging area를 남기지 않은 채 완료된 data directory를 게시하고, WordPress가 marker, private configuration, public link, user authentication을 복구하며 bootstrap temporary file이 남지 않는 경우에만 성공한다. 최종 stack은 모든 service가 실행 중이어야 하고 runtime secret boundary도 보존해야 한다. 따라서 이 테스트는 각 문서화된 durable stage가 협조적인 shell error뿐 아니라 abrupt process death 이후에도 수렴함을 증명한다.

## test(backup): 자원 충돌과 시그널 경계 검증
backup/restore verification이 timing이나 namespace pressure에서만 드러날 수 있는 두 경계를 추가로 검증한다. 반복되는 pause/signal race는 ready marker가 관찰된 직후 `SIGINT`와 `SIGTERM`을 번갈아 전송하며, management helper가 매번 signal을 보고하고 marker를 제거하도록 요구한다. 이를 통해 interruption test가 사용하는 synchronization primitive가 handoff 지점에서 오래된 evidence를 남기거나 signal을 놓치는 것을 막는다.

fresh-target enforcement는 Compose label이 붙은 stopped container와, 정확히 렌더링된 container/volume/network name을 차지하지만 label은 없는 resource 모두를 대상으로 검증한다. restore는 기존 object를 삭제하거나 변경하지 않고 각 collision을 거부해야 한다. 따라서 supposedly fresh project를 위험하게 만드는 두 별개의 경우인 ownership discovery와 raw Docker namespace conflict를 모두 다룬다.

data set에는 32 MiB random WordPress upload와 4 MiB MariaDB value를 추가한다. restore된 checksum과 length를 확인해 streaming, archive validation, dump transport, import가 이전의 작은 fixture가 buffer에 들어갔기 때문에 우연히 통과한 것이 아님을 검증한다. 두 번째 restore project의 cleanup failure도 그대로 드러내 성공적인 data comparison이 leaked recovery resource를 숨기지 못하게 한다.

## test(secrets): 회전 후 런타임 비밀 경계 고정
static validation이 rotation test에서 더 이상 사용하지 않는 `/run/secrets` mount나 mounted secret file 비교 helper에 대한 가정을 다시 도입하지 못하게 한다. 대신 private WordPress configuration temporary file cleanup과 전체 post-rotation runtime boundary check를 필수로 요구한다.

이는 bootstrap과 steady state 사이의 architectural distinction을 보호한다. secret mount는 의도적으로 수명이 짧은 bootstrap input이다. rotation을 검증하려고 이를 장기 실행 service에 다시 mount하면 테스트가 보호해야 할 속성을 약화함으로써 통과하게 된다.

## test(cleanup): 테스트 프로젝트 소유 자원만 정리
각 runtime scenario가 environment 준비를 시작하기 전에 무작위로 생성한 Compose project를 기록할 수 있게 한다. record는 symbolic link가 아닌 private directory 안에 정확한 project-name file로 작성하고 directory와 file 모두 제한적인 권한을 적용한다. image-prefix ownership은 별도로 추적해 한 stack이 자신이 생성한 tag만 제거하도록 하고, secondary stack은 cleanup 책임이 모호해지지 않은 채 image를 공유하거나 독립적으로 소유할 수 있다.

일반 harness shutdown은 선택한 project의 Compose resource, 자신이 소유한 service image tag, private temporary directory만 제거하며, 광범위한 Docker operation으로 fallback하지 않고 각 cleanup failure를 보고한다. `--keep` 경로는 조사 목적을 위해 이러한 삭제를 의도적으로 건너뛴다. 이 방식은 비슷한 이름의 모든 object가 현재 test 소유라고 가정하지 않고 명시적인 ownership과 cleanup behavior를 일치시킨다.

별도 recovery utility는 verification process가 crash하거나 외부에서 종료되어 남긴 leak을 처리한다. 엄격한 형식의 private project record만 받아 정확한 Compose project label로 container, volume, network를 찾고, 정확한 service tag로 image를 찾는다. Docker `prune` operation은 절대 호출하지 않는다. private report에는 모든 삭제 시도를 기록하고, leak 없음, leak 발견 후 성공적으로 복구, 불완전한 recovery에 각각 다른 exit status를 사용한다. 따라서 automation은 관련 없는 developer/runner resource를 위험에 빠뜨리지 않으면서 leak 발생을 실패로 처리할 수 있다.

## test(verify): 전체 스택 검증을 직렬 실행
하나의 `verify` entry point가 static validation, strict Compose rendering, 여섯 runtime scenario를 scenario별 time limit와 함께 고정된 순서로 실행한다. 모든 runtime invocation은 자신의 project identity를 하나의 private record directory에 기록해, 앞선 scenario가 실패하거나 timeout이 발생하더라도 최종 leak check가 완전하고 제한된 ownership set을 갖게 한다.

cleanup은 primary result와 무관하게 `finally`에서 실행한다. incomplete cleanup은 다른 모든 결과보다 우선하고, 발견된 leak을 복구한 경우도 본래 성공한 run을 실패로 바꾸며, resource accounting이 깨끗하지 않으면 evidence를 보존한다. 기록된 잔여 resource가 하나도 없는 verification에서만 temporary control directory를 제거한다.

직렬 실행은 결과의 원인을 파악하기 쉽게 하고 Docker resource accounting을 결정적으로 유지한다. 이 command는 단순한 test 목록이 아니라 전체 verification lifecycle을 나타낸다. configuration은 유효해야 하고, 모든 behavioral scenario가 통과해야 하며, 각 command는 budget 안에 종료되어야 하고, runner는 자신이 소유한 container, volume, network, image를 남기지 않아야 한다.

## ci(stack): 커밋 범위 공백 검사 도구 추가
CI helper가 run을 trigger한 commit range에 `git diff --check`를 적용한다. 완전한 SHA-1 또는 SHA-256 object identifier만 허용하고, 요청한 base가 commit으로 사용 가능한지 검증한다. 사용할 수 없으면 `HEAD^`로 fallback하며, 비어 있거나 모든 값이 0인 event base도 같은 fallback을 사용한다. 이를 통해 검증되지 않은 revision expression을 Git command에 interpolation하지 않고 initial push와 unavailable base를 처리한다.

event range만 검사해 whitespace error enforcement를 새로 도입된 변경에 집중시키고 무관한 과거 이력까지 cleanup할 필요를 없앤다. 성공 시 선택한 base와 resolve된 head를 출력해 CI output에서 정확한 validation boundary를 확인할 수 있게 한다.

## ci(stack): 정적·런타임·복구 검증 자동화
GitHub Actions workflow가 pull request, main branch push, manual dispatch에서 스택의 전체 engineering contract를 실행한다. Ubuntu 24.04 runner를 사용하고 repository content에는 read access만 부여하며, persisted checkout credential을 비활성화한다. range validation을 위해 전체 history를 fetch하고, third-party action은 검토된 commit SHA에 pin하며, 동일 workflow/ref에 대한 이전 run은 superseded되면 취소한다.

static source check와 strict Compose rendering을 먼저 실행한 뒤 end-to-end behavior, 강제 bootstrap recovery, persistence, backup/restore, credential rotation, operations를 각각 다루는 여섯 runtime stage를 실행한다. 각 stage는 별도 timeout과 diagnostic directory를 가지며 모든 stage가 하나의 private project-record directory를 공유한다. 이를 통해 failure attribution을 유지하면서 마지막 always-run cleanup 단계가 job이 제거할 수 있는 정확한 resource 목록을 갖는다.

diagnostic upload는 failure 시에만 수행하며, redacted file과 cleanup report로 구성된 명시적인 allowlist만 사용한다. hidden file은 제외하고 retention도 짧게 설정한다. 따라서 workflow는 functional test뿐 아니라 bounded execution, scoped cleanup, minimum permission, immutable CI dependency, controlled failure evidence까지 자동화한다.

## test(ci): workflow 검증 계약 추가
static validation이 CI workflow와 support tool을 system security/lifecycle contract의 일부로 취급한다. 검토된 runner, top-level read-only permission, immutable action revision, complete-history checkout, 전용 diagnostic path를 사용하는 serial scenario command, 무조건 실행되는 scoped cleanup, 정확한 diagnostic artifact allowlist를 요구한다. secret context, `pull_request_target`, shell tracing, environment dumping, 광범위한 Docker pruning 같은 위험한 대안은 명시적으로 거부한다.

같은 검사에서 CI가 enforce해야 하는 source-level invariant도 강화한다. Compose를 정확한 service block으로 parse해 runtime secret mount, password-bearing environment, Nginx의 private WordPress configuration volume 접근을 막는다. Python AST inspection은 subprocess wait에 명시적인 timeout을 요구하고, startup이 project lock을 획득한 상태에서 secret을 읽는지 검증하며, mock으로 runtime main path를 실행해 preparation timeout, scenario failure, cleanup failure, unexpected exception에서도 올바른 exit/cleanup semantics가 유지되는지 확인한다. bootstrap 및 management tool 전체에서 credential이 포함된 process argument pattern도 금지한다.

verification 자체의 verification은 의도적으로 여러 계층으로 구성한다. text check는 안정적인 public mechanism과 critical failure stage를 보존하고, AST check는 단순 문자열 matching으로 확인하기 어려운 control-flow property를 검사한다. import한 unit-style probe는 result propagation을 검증하고, workflow-specific check는 permission, ordering, cleanup, evidence publication을 제한한다. 이를 통해 workflow나 orchestration tool의 겉보기에는 사소한 변경이 green CI를 더 약한 검증으로 만들지 못하게 한다.

## test(docs): README 운영 안내 계약 검증
static validation이 README에 stack identity, Docker Compose context, 세 service 모두, secret handling, 기본 `make test` 및 `make smoke` verification command가 유지되도록 요구한다. 저장소가 의도한 operator-facing language를 보존하기 위해 한국어 text도 필수로 요구한다.

이는 모든 documentation statement가 runtime behavior와 일치함을 증명하는 것이 아니라 최소 discoverability contract다. 이후 documentation rewrite에서 독자가 프로젝트를 식별하고 기본적으로 검증·운영하는 데 필요한 component와 command가 빠지지 않도록 하는 데 목적이 있다.

## fix(supply-chain): 보안 지원 runtime pin 갱신
immutable runtime input을 moving tag로 되돌리지 않고 하나의 조정된 set으로 갱신한다. 세 image 모두 검토된 digest의 날짜 지정 Debian `bookworm-20260803-slim` base와 `20260812T000000Z` Debian package snapshot을 사용한다. WordPress core는 6.7.1에서 6.7.7로 올리고 해당 archive checksum도 갱신하며, 독립적으로 pin된 WP-CLI version은 그대로 유지한다.

static pin check와 live WordPress version assertion도 artifact와 함께 갱신해 reproducibility와 verification을 같이 유지한다. 이 commit은 immutable supply-chain input이 만드는 maintenance requirement를 보여 준다. security 및 support update는 rebuild 중 보이지 않게 유입되는 대신 명시적이고 review 가능한 pin 변경으로 채택해야 한다.

## test(supply-chain): 검토된 runtime 최소 버전 검증
end-to-end scenario가 image를 구성하는 source pin뿐 아니라 빌드된 container 내부에 실제 설치된 package version을 검증한다. `dpkg-query`로 현재 Nginx, OpenSSL, `libssl3`, PHP-FPM, PHP CLI, MariaDB package version을 가져오고, `dpkg --compare-versions`로 각각 검토된 Debian 최소 버전을 충족하는지 확인한다. 관찰된 값은 audit할 수 있도록 출력한다.

WordPress도 실제 PHP version과 database server version을 보고한다. 이 값은 semantic version triple로 parse되어야 하고, 선언된 WordPress compatibility floor를 충족해야 하며, database가 MariaDB임을 식별해야 한다. Dockerfile에 올바른 문자열이 남아 있더라도 stale image cache, 예상치 못한 snapshot resolution, 의도한 package input을 우회한 build path를 잡아낼 수 있다.

static validation은 minimum-version table과 비교 mechanism 자체도 보존한다. 따라서 supply-chain contract는 세 계층으로 구성된다. immutable artifact identity, WordPress/WP-CLI runtime identity check, 실제 애플리케이션 실행 package 및 platform의 minimum supported version이다.
