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

APP_SRC := $(sort $(wildcard apps/*.cpp))
APP_BIN := $(APP_SRC:apps/%.cpp=bin/%)

TEST_SRC := $(sort $(wildcard tests/test_*.cpp))
TEST_SUPPORT_SRC := tests/support/TestFormatter.cpp
TEST_BIN := build/tests/unit
FAILURE_BIN := build/tests/buffer_failure
FAILURE_SRC := tests/failure/test_buffer_failure.cpp \
	tests/support/FailingNew.cpp
FACTORY_FAILURE_BIN := build/tests/factory_failure
FACTORY_FAILURE_SRC := tests/failure/test_factory_failure.cpp \
	tests/support/FailingNew.cpp
NO_ELIDE_BIN := build/tests/unit_no_elide

.PHONY: all test-unit failure-test test-no-elide test-contract \
	test-integration test check clean fclean re

all: $(NAME) $(APP_BIN)

$(NAME): $(OBJ)
	$(RM) $@
	$(AR) $(ARFLAGS) $@ $(OBJ)

build/obj/%.o: src/%.cpp
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(DEPFLAGS) -c $< -o $@

bin/%: apps/%.cpp $(NAME)
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $< $(NAME) -o $@

$(TEST_BIN): $(TEST_SRC) $(TEST_SUPPORT_SRC) $(NAME)
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(TEST_SRC) $(TEST_SUPPORT_SRC) \
		$(NAME) -o $@

test-unit: $(TEST_BIN)
	./$(TEST_BIN)

$(FAILURE_BIN): $(FAILURE_SRC) $(NAME)
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(FAILURE_SRC) $(NAME) -o $@

$(FACTORY_FAILURE_BIN): $(FACTORY_FAILURE_SRC) $(NAME)
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(FACTORY_FAILURE_SRC) $(NAME) -o $@

failure-test: $(FAILURE_BIN) $(FACTORY_FAILURE_BIN)
	./$(FAILURE_BIN)
	./$(FACTORY_FAILURE_BIN)

$(NO_ELIDE_BIN): $(TEST_SRC) $(TEST_SUPPORT_SRC) $(NAME)
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -fno-elide-constructors \
		$(TEST_SRC) $(TEST_SUPPORT_SRC) $(NAME) -o $@

test-no-elide: $(NO_ELIDE_BIN)
	./$(NO_ELIDE_BIN)

test-contract:
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/contact_headers.cpp
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/format_headers.cpp
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/scalar_headers.cpp
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/runtime_headers.cpp
	@! $(CXX) $(CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/contact_private_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/formatter_abstract_fail.cpp >/dev/null 2>&1

test-integration: $(APP_BIN)
	sh tests/check_cli.sh

test: test-unit failure-test test-no-elide test-contract test-integration

check:
	git diff --check
	$(MAKE) fclean
	$(MAKE) all
	$(MAKE) test
	$(MAKE) -q all

clean:
	$(RMDIR) build bin

fclean: clean
	$(RM) $(NAME)

re: fclean all

-include $(DEP)
