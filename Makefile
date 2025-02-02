NAME := libbuffered_line_reader.a

CC := cc
override CFLAGS := -Wall -Wextra -Werror -Wpedantic -std=c99 \
	-fno-builtin
THREAD_FLAGS := -pthread
BUFFER_SIZE ?= 42
override CPPFLAGS := -I. -DBUFFER_SIZE=$(BUFFER_SIZE)
DEPFLAGS := -MMD -MP
AR := ar
ARFLAGS := rcs
RM := rm -f
RMDIR := rm -rf
MKDIR := mkdir -p

SRC := get_next_line.c
OBJ_DIR := build/obj/$(BUFFER_SIZE)
OBJ := $(SRC:%.c=$(OBJ_DIR)/%.o)
DEP := $(OBJ:.o=.d)

TEST_BIN := tests/bin/test_reader_$(BUFFER_SIZE)
TEST_SRC := tests/test_main.c tests/test_reader.c tests/test_boundaries.c \
	tests/test_context.c tests/test_nonblocking.c tests/test_threads.c
MATRIX_SIZES := 1 2 42 1024

FAULT_OBJ_DIR := build/fault/$(BUFFER_SIZE)
FAULT_READER_OBJ := $(FAULT_OBJ_DIR)/get_next_line.o
FAULT_RUNTIME_OBJ := $(FAULT_OBJ_DIR)/fault_runtime.o
FAULT_TEST_OBJ := $(FAULT_OBJ_DIR)/test_failure.o
FAULT_OBJ := $(FAULT_READER_OBJ) $(FAULT_RUNTIME_OBJ) $(FAULT_TEST_OBJ)
FAULT_DEP := $(FAULT_OBJ:.o=.d)
FAULT_BIN := tests/bin/test_failure_$(BUFFER_SIZE)
FAULT_CPPFLAGS := $(CPPFLAGS) -Itests/support
FAULT_DEFINES := -Dmalloc=test_malloc -Dfree=test_free -Dread=test_read
ASAN_FLAGS := -fsanitize=address -fno-omit-frame-pointer
ASAN_BIN := tests/bin/test_asan_$(BUFFER_SIZE)
UBSAN_FLAGS := -fsanitize=undefined -fno-sanitize-recover=all
UBSAN_BIN := tests/bin/test_ubsan_$(BUFFER_SIZE)

.PHONY: all bonus clean fclean re test-run test failure-run failure-test \
	asan-run asan ubsan-run ubsan sanitize leak-run leak check-archive \
	check-consumer check-buffer-size check

all: $(NAME)

bonus: all

$(NAME): $(OBJ)
	$(AR) $(ARFLAGS) $@ $(OBJ)

$(OBJ_DIR)/%.o: %.c get_next_line.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) $(DEPFLAGS) -c $< -o $@

$(TEST_BIN): $(OBJ) $(TEST_SRC) tests/test.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) $(THREAD_FLAGS) $(TEST_SRC) $(OBJ) -o $@

test-run: $(TEST_BIN)
	./$(TEST_BIN)

test:
	@set -e; for size in $(MATRIX_SIZES); do \
		$(MAKE) --no-print-directory test-run BUFFER_SIZE=$$size; \
	done

$(FAULT_READER_OBJ): get_next_line.c get_next_line.h
	@$(MKDIR) $(dir $@)
	$(CC) $(FAULT_CPPFLAGS) $(FAULT_DEFINES) $(CFLAGS) $(DEPFLAGS) \
		-c $< -o $@

$(FAULT_RUNTIME_OBJ): tests/support/fault_runtime.c \
		tests/support/fault_runtime.h
	@$(MKDIR) $(dir $@)
	$(CC) $(FAULT_CPPFLAGS) $(CFLAGS) $(DEPFLAGS) -c $< -o $@

$(FAULT_TEST_OBJ): tests/failure/test_failure.c get_next_line.h \
		tests/support/fault_runtime.h
	@$(MKDIR) $(dir $@)
	$(CC) $(FAULT_CPPFLAGS) $(CFLAGS) $(DEPFLAGS) -c $< -o $@

$(FAULT_BIN): $(FAULT_OBJ)
	@$(MKDIR) $(dir $@)
	$(CC) $(CFLAGS) $(FAULT_OBJ) -o $@

failure-run: $(FAULT_BIN)
	./$(FAULT_BIN)

failure-test:
	@set -e; for size in $(MATRIX_SIZES); do \
		$(MAKE) --no-print-directory failure-run BUFFER_SIZE=$$size; \
	done

$(ASAN_BIN): $(SRC) $(TEST_SRC) get_next_line.h tests/test.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) $(THREAD_FLAGS) $(ASAN_FLAGS) $(SRC) \
		$(TEST_SRC) -o $@

asan-run: $(ASAN_BIN)
	@if [ "$$(uname -s)" = Darwin ] && [ "$(RUN_ASAN)" != 1 ]; then \
		echo "ASan binary built; execution skipped on Darwin (set RUN_ASAN=1 to force)"; \
	else \
		./$(ASAN_BIN); \
	fi

asan:
	@set -e; for size in $(MATRIX_SIZES); do \
		$(MAKE) --no-print-directory asan-run BUFFER_SIZE=$$size; \
	done

$(UBSAN_BIN): $(SRC) $(TEST_SRC) get_next_line.h tests/test.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) $(THREAD_FLAGS) $(UBSAN_FLAGS) $(SRC) \
		$(TEST_SRC) -o $@

ubsan-run: $(UBSAN_BIN)
	./$(UBSAN_BIN)

ubsan:
	@set -e; for size in $(MATRIX_SIZES); do \
		$(MAKE) --no-print-directory ubsan-run BUFFER_SIZE=$$size; \
	done

sanitize: asan ubsan

leak-run: $(TEST_BIN)
	@if [ "$$(uname -s)" = Darwin ] && [ "$(RUN_LEAKS)" != 1 ]; then \
		echo "leaks execution skipped on Darwin (set RUN_LEAKS=1 to force)"; \
	elif command -v leaks >/dev/null 2>&1; then \
		leaks --atExit -- ./$(TEST_BIN); \
	elif command -v valgrind >/dev/null 2>&1; then \
		valgrind --quiet --leak-check=full --errors-for-leak-kinds=all \
			--error-exitcode=1 ./$(TEST_BIN); \
	else \
		echo "leak check skipped: install leaks or valgrind"; \
	fi

leak:
	@set -e; for size in $(MATRIX_SIZES); do \
		$(MAKE) --no-print-directory leak-run BUFFER_SIZE=$$size; \
	done

check-archive: $(NAME)
	sh tests/check_archive.sh $(NAME)

check-consumer: $(NAME) tests/check_consumer.sh tests/smoke/consumer.c \
		get_next_line.h
	CC="$(CC)" sh tests/check_consumer.sh $(NAME) get_next_line.h \
		tests/smoke/consumer.c

check-buffer-size:
	@! $(CC) -I. -DBUFFER_SIZE=0 $(CFLAGS) -fsyntax-only get_next_line.c \
		>/dev/null 2>&1
	@! $(CC) -I. -DBUFFER_SIZE=-1 $(CFLAGS) -fsyntax-only get_next_line.c \
		>/dev/null 2>&1
	@$(CC) -I. -DBUFFER_SIZE=1 $(CFLAGS) -fsyntax-only get_next_line.c

check:
	git diff --check
	$(MAKE) fclean
	$(MAKE) all
	$(MAKE) check-buffer-size
	$(MAKE) check-archive
	$(MAKE) check-consumer
	$(MAKE) test
	$(MAKE) failure-test
	$(MAKE) sanitize
	$(MAKE) leak
	$(MAKE) -q all

clean:
	$(RMDIR) build tests/bin

fclean: clean
	$(RM) $(NAME)

re: fclean all

-include $(DEP) $(FAULT_DEP)
