NAME := libcpp_foundation.a

CXX := c++
override CXXFLAGS := -Wall -Wextra -Werror -Wpedantic -pedantic-errors \
	-std=c++98 -Wold-style-cast -Wcast-qual -Woverloaded-virtual \
	-Wnon-virtual-dtor -Wc++11-extensions
override CPPFLAGS := -Iinclude -Itests
DEPFLAGS := -MMD -MP
AR := ar
ARFLAGS := rcs
RM := rm -f
RMDIR := rm -rf
MKDIR := mkdir -p

SRC := $(sort $(wildcard src/*.cpp))
OBJ := $(SRC:src/%.cpp=build/obj/%.o)
DEP := $(OBJ:.o=.d)

TEST_SRC := $(sort $(wildcard tests/test_*.cpp))
TEST_BIN := build/tests/unit

.PHONY: all test check clean fclean re

all: $(NAME)

$(NAME): $(OBJ)
	$(RM) $@
	$(AR) $(ARFLAGS) $@ $(OBJ)

build/obj/%.o: src/%.cpp
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(DEPFLAGS) -c $< -o $@

$(TEST_BIN): $(TEST_SRC) $(NAME)
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(TEST_SRC) $(NAME) -o $@

test: $(TEST_BIN)
	./$(TEST_BIN)

check:
	git diff --check
	$(MAKE) fclean
	$(MAKE) all
	$(MAKE) test
	$(MAKE) -q all

clean:
	$(RMDIR) build

fclean: clean
	$(RM) $(NAME)

re: fclean all

-include $(DEP)
