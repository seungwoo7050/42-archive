# 검증 경계

이 문서는 저장소에 현재 존재하는 test와 release 검사가 무엇을 판정하고 무엇을
보장하지 않는지 구분한다. 아래 명령은 사용자를 위한 검증 안내다.

## 기능과 경계

`make test`는 `BUFFER_SIZE=1,2,42,1024`로 같은 suite를 반복한다.

| 검사 | 확인하는 범위 |
| --- | --- |
| reader 기본 | 빈 입력, 마지막 비개행 line, 여러 chunk의 긴 line, 잘못되거나 쓰기 전용인 fd |
| line 경계 | chunk 직전·경계·직후 개행, 연속 `"\n"`, 큰 인접 line, 반복 EOF |
| 여러 fd | legacy API로 서로 다른 fd를 번갈아 호출해 remainder가 섞이지 않음 |
| 반환 소유권 | 두 반환 line이 별도 저장소이며 이후 호출이 앞 line을 바꾸지 않음 |
| explicit 결과 | `BLR_LINE/EOF/ERROR`, reset 뒤 재읽기, destroy가 fd를 닫지 않음 |
| descriptor 규칙 | 새 context를 만든 fd 재사용 경로와 dup alias 하나에 context 하나를 쓰는 올바른 경로 |
| nonblocking | 실제 `O_NONBLOCK` pipe의 partial byte 보존, `BLR_AGAIN`, EOF tail |
| thread | 네 스레드가 서로 다른 pipe와 explicit context를 각각 단독 사용 |

dup와 fd 재사용 검사는 문서화한 올바른 사용 순서를 확인한다. 라이브러리가 open
file description alias나 번호 재사용을 자동 검출한다는 증거가 아니다. thread
검사도 같은 context나 legacy 전역 목록의 동시 안전성을 확인하지 않는다.

현재 test 데이터는 NUL 종료 text를 사용한다. embedded NUL이 포함된 record를
public API로 온전히 표현할 수 있는지는 검사하지 않으며 계약상 지원하지 않는다.

## 결정적 실패 주입

`make failure-test`는 제품 소스를 다음 macro 치환으로 별도 컴파일한다.

```text
malloc → test_malloc
free   → test_free
read   → test_read
```

할당 시도를 차례로 실패시켜 legacy 경로가 노출 자원을 남기지 않는지, explicit
경로가 line과 EOF tail의 추출 실패 뒤 같은 byte를 다시 반환하는지 확인한다.
`free`는 실패를 주입하는 함수가 아니라 live allocation, 잘못된 free와 double
free를 계측한다.

scripted read는 짧은 양수 반환, `EINTR → 짧은 읽기 → EAGAIN`, 일부 byte 뒤
`EIO`를 만든다. explicit context가 `BLR_AGAIN/ERROR` 뒤 누적 byte를 보존하는
특정 순서를 검증한다. 모든 OS 오류, 실제 signal timing, fd가 동시에 닫히는
경쟁을 포괄하지 않는다.

line 할당 실패 때 `scan`을 `begin`으로 되돌리므로 재시도는 같은 구간을 다시
검색한다. 정상 실행에서 검색량이 선형이라는 설명을 실패 재시도 횟수와 무관한
보장으로 확대하면 안 된다.

## 작업량 metric

`make metrics`는 `BUFFER_SIZE=4096`으로 4MiB 개행 없는 입력을 읽고 결과를
`tests/manifests/metrics-4mib.txt`와 비교한다.

```text
read_calls=1025
allocation_calls=13
copy_calls=11
copy_bytes=12533760
```

벽시계가 아니라 read·할당·내부 copy 작업량을 판정해, 매 chunk마다 누적 전체를
복사하거나 성장 정책이 우연히 바뀌는 퇴행을 찾는다. 이 수치는 다양한 line
분포, 많은 활성 fd에서 legacy 목록을 찾는 O(n) 비용, allocator의 실제 peak
resident memory를 측정하지 않는다.

현재 peak memory에는 성장 순간 old/new buffer, line 추출 순간 내부 buffer와
반환 line, 그리고 모든 활성 context의 buffer가 함께 기여할 수 있다. metric의
누적 allocation byte는 이 순간 최대치와 같은 값이 아니다.

## archive와 외부 소비자

- `make check-buffer-size`는 0과 음수를 거절하고 1을 허용하는 전처리 경계를
  확인한다.
- `make check-archive`는 member, 공개 정의 symbol과 허용된 undefined symbol을
  manifest와 비교한다.
- `make check-consumer`는 header와 archive만 임시 배포 위치로 복사해 legacy와
  explicit API를 링크·실행한다.

이 검사는 한 toolchain에서 현재 archive 모양과 소비자 연결을 고정한다.
다른 ABI·libc·compiler의 이식성이나 소비자가 정의한 `BUFFER_SIZE`로 이미 만든
archive의 동작이 바뀐다는 것을 보장하지 않는다. archive의 읽기 크기를 바꾸려면
제품 객체를 다시 컴파일해야 한다.

Makefile은 `build/obj/<BUFFER_SIZE>`처럼 값별 object를 두지만 archive target은
`libbuffered_line_reader.a` 하나다. 이미 cache된 예전 값의 object로 되돌아갈
때 archive가 그 object보다 새로우면 단순 `make BUFFER_SIZE=<value>`는 no-op이
될 수 있다. 확실한 값 전환 절차는 다음과 같다.

```sh
make fclean
make BUFFER_SIZE=<value>
```

`check-archive`의 symbol·member manifest는 archive가 의도한 읽기 크기로 다시
컴파일됐는지 판별하지 않는다.

## sanitizer와 누수 검사

`make asan`, `make ubsan`, `make leak`가 별도로 있다. macOS에서 ASan은 기본적으로
실행 파일만 만들고 `RUN_ASAN=1`이 없으면 실행을 건너뛴다. 누수 검사도 macOS에서
`RUN_LEAKS=1`이 필요하며, `leaks`나 `valgrind`가 없으면 다른 환경에서도
건너뛸 수 있다. target 성공 여부뿐 아니라 출력에서 실제 실행 여부를 확인한다.

sanitizer 통과는 정의되지 않은 동작이나 race가 없다는 일반 증명이 아니다.
현재 suite가 도달한 경로와 해당 toolchain의 검출 범위에 한정된다.

## 전체 명령

```sh
make check
```

이 target은 `git diff --check`, clean rebuild, buffer-size·archive·consumer,
기능·실패 test, sanitizer, metric, leak 검사와 최종 up-to-date 판정을 잇는다.
문서 링크와 Git 이력의 정확성은 이 target이 검사하지 않으므로 별도 정적 감사가
필요하다.
