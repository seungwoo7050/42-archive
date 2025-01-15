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

WRITE_OBJ_DIR := build/write-failure
WRITE_OUTPUT_OBJ := $(WRITE_OBJ_DIR)/ft_fd_output.o
WRITE_DEP := $(WRITE_OUTPUT_OBJ:.o=.d)
WRITE_BIN := tests/bin/test_write_failure
WRITE_TEST_SRC := tests/failure/test_fd_output_failure.c \
	tests/support/fail_write.c
WRITE_DEFINES := -Dwrite=test_write

.PHONY: all bonus clean fclean re test write-failure-test

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

clean:
	$(RMDIR) build tests/bin

fclean: clean
	$(RM) $(NAME)

re: fclean all

-include $(DEP) $(WRITE_DEP)
