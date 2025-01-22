NAME := libftprintf.a

CC := cc
CFLAGS := -Wall -Wextra -Werror
CPPFLAGS := -Iinclude
AR := ar
ARFLAGS := rcs
RM := rm -f

SRC := src/ft_printf.c \
	src/ft_output.c \
	src/ft_parse.c \
	src/ft_measure.c \
	src/ft_dispatch.c \
	src/ft_text.c \
	src/ft_numeric_layout.c \
	src/ft_number.c \
	src/ft_hex.c
OBJ := $(SRC:.c=.o)
HEADER := include/ft_printf.h src/ft_printf_internal.h
TEST_BIN := tests/bin/test_ft_printf
FAULT_TEST_BIN := tests/bin/test_output_faults
SANITIZER_TEST_BIN := tests/bin/test_ft_printf_sanitize
SANITIZER_FAULT_BIN := tests/bin/test_output_faults_sanitize
SANITIZER_FLAGS := -g -fno-omit-frame-pointer -fsanitize=address,undefined
UBSAN_TEST_BIN := tests/bin/test_ft_printf_ubsan
UBSAN_FAULT_BIN := tests/bin/test_output_faults_ubsan
UBSAN_FLAGS := -g -fno-omit-frame-pointer -fsanitize=undefined
SANITIZER_CC ?= $(CC)

all: $(NAME)

$(NAME): $(OBJ)
	$(AR) $(ARFLAGS) $@ $^

%.o: %.c $(HEADER)
	$(CC) $(CFLAGS) $(CPPFLAGS) -c $< -o $@

test: $(NAME)
	mkdir -p tests/bin
	$(CC) $(CFLAGS) $(CPPFLAGS) tests/test_ft_printf.c $(NAME) -o $(TEST_BIN)
	./$(TEST_BIN)
	$(CC) $(CFLAGS) $(CPPFLAGS) -DFT_PRINTF_TEST_WRITE \
		tests/test_output_faults.c $(SRC) -o $(FAULT_TEST_BIN)
	./$(FAULT_TEST_BIN)

release-check: $(NAME)
	CC="$(CC)" sh tests/check_release.sh $(NAME) include \
		tests/test_consumer.c

sanitize-address:
	mkdir -p tests/bin
	$(SANITIZER_CC) $(CFLAGS) $(CPPFLAGS) $(SANITIZER_FLAGS) \
		tests/test_ft_printf.c $(SRC) -o $(SANITIZER_TEST_BIN)
	ASAN_OPTIONS=halt_on_error=1 \
		UBSAN_OPTIONS=halt_on_error=1 ./$(SANITIZER_TEST_BIN)
	$(SANITIZER_CC) $(CFLAGS) $(CPPFLAGS) $(SANITIZER_FLAGS) \
		-DFT_PRINTF_TEST_WRITE tests/test_output_faults.c $(SRC) \
		-o $(SANITIZER_FAULT_BIN)
	ASAN_OPTIONS=halt_on_error=1 \
		UBSAN_OPTIONS=halt_on_error=1 ./$(SANITIZER_FAULT_BIN)

sanitize-undefined:
	mkdir -p tests/bin
	$(CC) $(CFLAGS) $(CPPFLAGS) $(UBSAN_FLAGS) \
		tests/test_ft_printf.c $(SRC) -o $(UBSAN_TEST_BIN)
	UBSAN_OPTIONS=halt_on_error=1 ./$(UBSAN_TEST_BIN)
	$(CC) $(CFLAGS) $(CPPFLAGS) $(UBSAN_FLAGS) \
		-DFT_PRINTF_TEST_WRITE tests/test_output_faults.c $(SRC) \
		-o $(UBSAN_FAULT_BIN)
	UBSAN_OPTIONS=halt_on_error=1 ./$(UBSAN_FAULT_BIN)

sanitize: sanitize-undefined
	@printf '%s\n' \
		'AddressSanitizer는 make sanitize-linux에서 별도로 검증합니다.'

sanitize-linux:
	docker run --rm -v "$(CURDIR):/source:ro" gcc:14-bookworm \
		sh -c 'cp -R /source /tmp/format-printer-fix && \
		cd /tmp/format-printer-fix && \
		make sanitize-address SANITIZER_CC=gcc'

check: test release-check sanitize
	git diff --check

clean:
	$(RM) $(OBJ)
	rm -rf tests/bin

fclean: clean
	$(RM) $(NAME) $(TEST_BIN) $(FAULT_TEST_BIN)
	$(RM) $(SANITIZER_TEST_BIN) $(SANITIZER_FAULT_BIN)
	$(RM) $(UBSAN_TEST_BIN) $(UBSAN_FAULT_BIN)

re: fclean all

.PHONY: all clean fclean re test release-check sanitize-address
.PHONY: sanitize-undefined sanitize sanitize-linux check
