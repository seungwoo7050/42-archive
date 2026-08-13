# buffered-line-reader

파일 디스크립터에서 입력을 한 줄씩 꺼내는 C99 정적 라이브러리다. 간단한
`get_next_line` 호환 함수와 오류·대기·수명을 구분하는 명시적 컨텍스트 API를
함께 제공한다.

소스의 언어 모드는 C99지만 입력 모델은 ISO C stream이 아니라 POSIX다.
파일 디스크립터, `read`, `ssize_t`, `dup`, `lseek`와
`EINTR`·`EAGAIN`·`EWOULDBLOCK` 오류를 전제로 한다.

## 빌드와 산출물

```sh
make
```

기존 build에서 `BUFFER_SIZE` 값을 확실히 바꾸려면 다음처럼 정리한 뒤 다시
컴파일한다.

```sh
make fclean
make BUFFER_SIZE=1024
```

산출물은 `libbuffered_line_reader.a`, 공개 헤더는 `get_next_line.h`다.
`BUFFER_SIZE`는 양의 정수이며 기본값은 42다. 이 값은 `get_next_line.c`를
컴파일할 때 구현에 들어가므로 이미 만든 archive를 사용하는 소비자가 매크로만
다시 정의해도 읽기 크기는 바뀌지 않는다. 다른 값을 쓰려면 archive를 다시
빌드해야 한다. Makefile은 값별 object 디렉터리를 쓰지만 archive 이름은 하나다.
예전에 만든 object 값으로 되돌아갈 때 archive가 더 새로우면 `make`가 no-op으로
판단할 수 있어 `fclean`이 값 전환을 확실하게 만든다.

## 최소 사용

```c
char *line;

line = get_next_line(fd);
if (line != NULL)
{
    /* line은 개행이 있었다면 개행까지 포함한다. */
    free(line);
}
```

`get_next_line`의 `NULL`은 EOF, 오류, 비차단 대기를 구분하지 못한다. 구분이
필요하거나 EOF 전에 읽기를 취소해야 한다면 다음 명시적 API를 사용한다.

```c
t_blr_reader *reader;
char         *line;
t_blr_result result;

reader = blr_reader_create(fd);
result = blr_reader_next(reader, &line);
if (result == BLR_LINE)
    free(line);
blr_reader_destroy(reader);
```

`BLR_LINE`이면 호출자가 `*line`을 `free`한다. non-NULL 출력 인자 `&line`을
넘겼다면 `BLR_EOF`, `BLR_AGAIN`, `BLR_ERROR`에서 `line`은 `NULL`이다.
출력 인자 자체가 `NULL`인 호출도 `BLR_ERROR`지만 이때는 값을 쓸 대상이 없다.
컨텍스트는 fd를 빌릴 뿐 닫지 않는다. 오류와 소유권 전체 계약은
[API 계약](docs/api-contracts.md)에 있다.

## 사용 경계

- 같은 open file description을 공유하는 `dup` 계열 fd에는 컨텍스트 하나만 둔다.
- fd 번호를 닫아 재사용하기 전에 기존 컨텍스트를 폐기한다.
- 명시적 컨텍스트의 fd 위치를 외부에서 바꿨다면 `blr_reader_reset`으로 선행 읽기
  상태도 버린다. legacy 함수에는 reset할 handle이 없다.
- 서로 독립된 명시적 컨텍스트는 다른 스레드에서 사용할 수 있다. 같은 컨텍스트의
  동시 호출과 전역 목록을 쓰는 `get_next_line`의 병렬 호출은 지원하지 않는다.
- 반환값은 NUL 종료 C 문자열이므로 embedded NUL을 포함한 바이너리 record의
  길이를 표현할 수 없다.

## 학습 순서

이 저장소는 다음 `c-foundation-fix` 문서를 선행 지식으로 삼는다.

- [공개 API 계약](https://github.com/woopinbell/c-foundation-fix/blob/main/docs/api-contracts.md)
- [바이트·문자열과 경계](https://github.com/woopinbell/c-foundation-fix/blob/main/devlog/01-bytes-strings-and-bounds.md)
- [할당·소유권과 rollback](https://github.com/woopinbell/c-foundation-fix/blob/main/devlog/02-allocation-and-rollback.md)
- [descriptor 출력과 실패 경계](https://github.com/woopinbell/c-foundation-fix/blob/main/devlog/04-descriptor-output.md)

여기서는 포인터·할당·부분 시스템 호출의 일반 원리를 반복하지 않고, `read`가
호출 사이에 남기는 버퍼 상태, fd별 수명, EOF·오류·대기의 구분을 새로 다룬다.

현재 구조의 한 장 지도는
[컨텍스트와 descriptor lifecycle](architecture/context-and-descriptor-lifecycle.md),
검증 항목과 비보장은 [검증 경계](docs/verification.md)에서 확인한다.

## 검증 명령

전체 검증 명령은 `make check`이며 세부 target과 각 검사가 증명하지 않는 범위는
[검증 경계](docs/verification.md)에 정리했다.
