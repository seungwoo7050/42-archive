NAME := push_swap
CHECKER := checker
CC := cc
CFLAGS := -std=c99 -Wall -Wextra -Werror -Wpedantic
CPPFLAGS := -Iinclude
RM := rm -f
RMDIR := rm -rf
OBJ_DIR := .build

COMMON_SRCS := \
	src/parser.c \
	src/stack.c \
	src/operations.c \
	src/runtime.c \
	src/utils.c
PUSH_SRCS := src/push_swap.c src/sort.c
CHECKER_SRCS := src/checker.c src/checker_reader.c
OPERATION_TEST := $(OBJ_DIR)/operation_invariants

COMMON_OBJS := $(COMMON_SRCS:src/%.c=$(OBJ_DIR)/%.o)
PUSH_OBJS := $(PUSH_SRCS:src/%.c=$(OBJ_DIR)/%.o)
CHECKER_OBJS := $(CHECKER_SRCS:src/%.c=$(OBJ_DIR)/%.o)
FAULT_DIR := $(OBJ_DIR)/fault
FAULT_COMMON_OBJS := $(COMMON_SRCS:src/%.c=$(FAULT_DIR)/%.o)
FAULT_PUSH_OBJS := $(PUSH_SRCS:src/%.c=$(FAULT_DIR)/%.o)
FAULT_CHECKER_OBJS := $(CHECKER_SRCS:src/%.c=$(FAULT_DIR)/%.o)
FAULT_PUSH_SWAP := $(FAULT_DIR)/push_swap
FAULT_CHECKER := $(FAULT_DIR)/checker
SANITIZE_DIR := $(OBJ_DIR)/sanitize
SANITIZE_CFLAGS := $(CFLAGS) -O1 -g -fno-omit-frame-pointer \
	-fsanitize=address,undefined
SANITIZE_COMMON_OBJS := $(COMMON_SRCS:src/%.c=$(SANITIZE_DIR)/%.o)
SANITIZE_PUSH_OBJS := $(PUSH_SRCS:src/%.c=$(SANITIZE_DIR)/%.o)
SANITIZE_CHECKER_OBJS := $(CHECKER_SRCS:src/%.c=$(SANITIZE_DIR)/%.o)
SANITIZE_PUSH_SWAP := $(SANITIZE_DIR)/push_swap
SANITIZE_CHECKER := $(SANITIZE_DIR)/checker
SANITIZE_OPERATION_TEST := $(SANITIZE_DIR)/operation_invariants

.DELETE_ON_ERROR:
.PHONY: all clean fclean re test sanitize

all: $(NAME) $(CHECKER)

$(NAME): $(COMMON_OBJS) $(PUSH_OBJS)
	$(CC) $(CFLAGS) $(COMMON_OBJS) $(PUSH_OBJS) -o $@

$(CHECKER): $(COMMON_OBJS) $(CHECKER_OBJS)
	$(CC) $(CFLAGS) $(COMMON_OBJS) $(CHECKER_OBJS) -o $@

$(OBJ_DIR)/%.o: src/%.c include/push_swap.h | $(OBJ_DIR)
	$(CC) $(CFLAGS) $(CPPFLAGS) -c $< -o $@

$(OPERATION_TEST): tests/operation_invariants.c \
		$(OBJ_DIR)/stack.o $(OBJ_DIR)/operations.o $(OBJ_DIR)/runtime.o \
		$(OBJ_DIR)/utils.o
	$(CC) $(CFLAGS) $(CPPFLAGS) $^ -o $@

$(FAULT_PUSH_SWAP): $(FAULT_COMMON_OBJS) $(FAULT_PUSH_OBJS)
	$(CC) $(CFLAGS) $^ -o $@

$(FAULT_CHECKER): $(FAULT_COMMON_OBJS) $(FAULT_CHECKER_OBJS)
	$(CC) $(CFLAGS) $^ -o $@

$(FAULT_DIR)/%.o: src/%.c include/push_swap.h | $(FAULT_DIR)
	$(CC) $(CFLAGS) $(CPPFLAGS) -DPS_FAULT_INJECTION -c $< -o $@

$(SANITIZE_PUSH_SWAP): $(SANITIZE_COMMON_OBJS) $(SANITIZE_PUSH_OBJS)
	$(CC) $(SANITIZE_CFLAGS) $^ -o $@

$(SANITIZE_CHECKER): $(SANITIZE_COMMON_OBJS) $(SANITIZE_CHECKER_OBJS)
	$(CC) $(SANITIZE_CFLAGS) $^ -o $@

$(SANITIZE_OPERATION_TEST): tests/operation_invariants.c \
		$(SANITIZE_DIR)/stack.o $(SANITIZE_DIR)/operations.o \
		$(SANITIZE_DIR)/runtime.o $(SANITIZE_DIR)/utils.o
	$(CC) $(SANITIZE_CFLAGS) $(CPPFLAGS) $^ -o $@

$(SANITIZE_DIR)/%.o: src/%.c include/push_swap.h | $(SANITIZE_DIR)
	$(CC) $(SANITIZE_CFLAGS) $(CPPFLAGS) -c $< -o $@

$(OBJ_DIR):
	mkdir -p $(OBJ_DIR)

$(FAULT_DIR): | $(OBJ_DIR)
	mkdir -p $(FAULT_DIR)

$(SANITIZE_DIR): | $(OBJ_DIR)
	mkdir -p $(SANITIZE_DIR)

clean:
	$(RMDIR) $(OBJ_DIR) tests/__pycache__ .pytest_cache

fclean: clean
	$(RM) $(NAME) $(CHECKER)

re: fclean all

test: all $(OPERATION_TEST) $(FAULT_PUSH_SWAP) $(FAULT_CHECKER)
	$(OPERATION_TEST)
	python3 tests/run_tests.py
	PS_PUSH_SWAP=$(FAULT_PUSH_SWAP) PS_CHECKER=$(FAULT_CHECKER) \
		python3 tests/fault_tests.py
	PS_PUSH_SWAP=$(FAULT_PUSH_SWAP) python3 tests/resource_tests.py

sanitize: $(SANITIZE_PUSH_SWAP) $(SANITIZE_CHECKER) \
		$(SANITIZE_OPERATION_TEST)
	ASAN_OPTIONS=halt_on_error=1 \
		UBSAN_OPTIONS=halt_on_error=1:print_stacktrace=1 \
		$(SANITIZE_OPERATION_TEST)
	ASAN_OPTIONS=halt_on_error=1 \
		UBSAN_OPTIONS=halt_on_error=1:print_stacktrace=1 \
		PS_PUSH_SWAP=$(SANITIZE_PUSH_SWAP) PS_CHECKER=$(SANITIZE_CHECKER) \
		python3 tests/run_tests.py
