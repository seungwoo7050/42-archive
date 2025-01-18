NAME := libft.a

CC := cc
override CFLAGS := -Wall -Wextra -Werror -Wpedantic -std=c99 \
	-fno-builtin
override CPPFLAGS := -I.
DEPFLAGS := -MMD -MP
AR := ar
ARFLAGS := rcs
RM := rm -f
RMDIR := rm -rf
MKDIR := mkdir -p

SRC := \
	src/char/ft_char.c \
	src/memory/ft_memory_fill.c \
	src/memory/ft_memory_copy.c \
	src/memory/ft_memory_move.c \
	src/memory/ft_memory_scan.c \
	src/string/ft_string_bounds.c \
	src/string/ft_string_search.c \
	src/string/ft_string_build.c \
	src/string/ft_split.c \
	src/string/ft_string_transform.c \
	src/convert/ft_atoi.c \
	src/convert/ft_itoa.c \
	src/alloc/ft_allocate.c \
	src/io/ft_fd_output.c \
	src/list/ft_list_basic.c \
	src/list/ft_list_lifecycle.c \
	src/list/ft_list_map.c

OBJ_DIR := build/obj
OBJ := $(SRC:%.c=$(OBJ_DIR)/%.o)
DEP := $(OBJ:.o=.d)

TEST_BIN := tests/bin/test_libft
TEST_SRC := $(wildcard tests/test_*.c)

FAIL_OBJ_DIR := build/failure
FAIL_OBJ := $(SRC:%.c=$(FAIL_OBJ_DIR)/%.o)
FAIL_DEP := $(FAIL_OBJ:.o=.d)
FAIL_BIN := tests/bin/test_failure
FAIL_TEST_SRC := tests/failure/test_failure.c tests/support/fail_alloc.c
FAIL_DEFINES := -Dmalloc=test_malloc -Dfree=test_free

WRITE_OBJ_DIR := build/write-failure
WRITE_OUTPUT_OBJ := $(WRITE_OBJ_DIR)/ft_fd_output.o
WRITE_DEP := $(WRITE_OUTPUT_OBJ:.o=.d)
WRITE_BIN := tests/bin/test_write_failure
WRITE_TEST_SRC := tests/failure/test_fd_output_failure.c \
	tests/support/fail_write.c
WRITE_DEFINES := -Dwrite=test_write

ASAN_OBJ_DIR := build/asan
ASAN_OBJ := $(SRC:%.c=$(ASAN_OBJ_DIR)/%.o)
ASAN_DEP := $(ASAN_OBJ:.o=.d)
ASAN_BIN := tests/bin/test_asan
ASAN_FLAGS := -fsanitize=address -fno-omit-frame-pointer
ASAN_OPTIONS ?= detect_leaks=0:halt_on_error=1

UBSAN_OBJ_DIR := build/ubsan
UBSAN_OBJ := $(SRC:%.c=$(UBSAN_OBJ_DIR)/%.o)
UBSAN_DEP := $(UBSAN_OBJ:.o=.d)
UBSAN_BIN := tests/bin/test_ubsan
UBSAN_FLAGS := -fsanitize=undefined -fno-omit-frame-pointer

.PHONY: all bonus clean fclean re test failure-test write-failure-test \
	asan ubsan sanitize leak check-archive check-compilers

all: $(NAME)

bonus: all

$(NAME): $(OBJ)
	$(AR) $(ARFLAGS) $@ $(OBJ)

$(OBJ_DIR)/%.o: %.c libft.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) \
		$(DEPFLAGS) -c $< -o $@

$(TEST_BIN): $(NAME) $(TEST_SRC) tests/test.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) \
		$(TEST_SRC) $(NAME) -o $@

test: $(TEST_BIN)
	./$(TEST_BIN)

$(FAIL_OBJ_DIR)/%.o: %.c libft.h tests/support/fail_alloc.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(FAIL_DEFINES) $(CFLAGS) $(DEPFLAGS) -c $< -o $@

$(FAIL_BIN): $(FAIL_OBJ) $(FAIL_TEST_SRC) tests/support/fail_alloc.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) \
		$(FAIL_TEST_SRC) $(FAIL_OBJ) -o $@

failure-test: $(FAIL_BIN)
	./$(FAIL_BIN)

$(WRITE_OUTPUT_OBJ): src/io/ft_fd_output.c libft.h \
		tests/support/fail_write.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(WRITE_DEFINES) $(CFLAGS) \
		$(DEPFLAGS) -c $< -o $@

$(WRITE_BIN): $(NAME) $(WRITE_OUTPUT_OBJ) $(WRITE_TEST_SRC) \
		tests/support/fail_write.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) \
		$(WRITE_TEST_SRC) $(WRITE_OUTPUT_OBJ) $(NAME) -o $@

write-failure-test: $(WRITE_BIN)
	./$(WRITE_BIN)

$(ASAN_OBJ_DIR)/%.o: %.c libft.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) \
		$(ASAN_FLAGS) $(DEPFLAGS) -c $< -o $@

$(ASAN_BIN): $(ASAN_OBJ) $(TEST_SRC) tests/test.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) \
		$(ASAN_FLAGS) $(TEST_SRC) $(ASAN_OBJ) -o $@

asan: $(ASAN_BIN)
	ASAN_OPTIONS=$(ASAN_OPTIONS) ./$(ASAN_BIN)

$(UBSAN_OBJ_DIR)/%.o: %.c libft.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) \
		$(UBSAN_FLAGS) $(DEPFLAGS) -c $< -o $@

$(UBSAN_BIN): $(UBSAN_OBJ) $(TEST_SRC) tests/test.h
	@$(MKDIR) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) \
		$(UBSAN_FLAGS) $(TEST_SRC) $(UBSAN_OBJ) -o $@

ubsan: $(UBSAN_BIN)
	UBSAN_OPTIONS=halt_on_error=1:print_stacktrace=1 ./$(UBSAN_BIN)

sanitize: ubsan

leak: $(TEST_BIN)
	@if command -v leaks >/dev/null 2>&1; then \
		leaks --atExit -- ./$(TEST_BIN); \
	elif command -v valgrind >/dev/null 2>&1; then \
		valgrind --leak-check=full --errors-for-leak-kinds=all \
			--error-exitcode=1 ./$(TEST_BIN); \
	else \
		echo "no supported leak checker found" >&2; \
		exit 1; \
	fi

check-archive: $(NAME)
	CC="$(CC)" sh tests/check_archive.sh $(NAME)

check-compilers:
	sh tests/check_compilers.sh

clean:
	$(RMDIR) build tests/bin

fclean: clean
	$(RM) $(NAME)

re: fclean all

-include $(DEP) $(FAIL_DEP) $(WRITE_DEP) $(ASAN_DEP) $(UBSAN_DEP)
