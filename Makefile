NAME := libcpp_foundation.a

CXX := c++
override CXXFLAGS := -Wall -Wextra -Werror -Wpedantic -pedantic-errors \
	-std=c++98 -Wold-style-cast -Wcast-qual -Woverloaded-virtual \
	-Wnon-virtual-dtor -Wc++11-extensions
override CPPFLAGS := -Iinclude -Itests
PUBLIC_CPPFLAGS := -Iinclude
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
BATCH_FAILURE_BIN := build/tests/batch_failure
BATCH_FAILURE_SRC := tests/failure/test_batch_failure.cpp \
	tests/support/FailingNew.cpp
PIPELINE_FAILURE_BIN := build/tests/pipeline_failure
PIPELINE_FAILURE_SRC := tests/failure/test_pipeline_failure.cpp \
	tests/support/TestFormatter.cpp
CONTACT_FAILURE_BIN := build/tests/contact_failure
CONTACT_FAILURE_SRC := tests/failure/test_contact_failure.cpp \
	tests/support/FailingNew.cpp
NO_ELIDE_BIN := build/tests/unit_no_elide
PUBLIC_CONTRACT_BIN := build/tests/public_contract
PUBLIC_CONTRACT_SRC := tests/integration/test_public_contract.cpp
SANITIZER_BIN := build/tests/unit_sanitize
SANITIZER_FLAGS := -O1 -fsanitize=undefined -fno-sanitize-recover=all \
	-fno-omit-frame-pointer -g
RELEASE_BIN := $(APP_BIN) $(PUBLIC_CONTRACT_BIN)

.PHONY: all test-unit failure-test test-no-elide test-contract \
	test-integration test-consumer test-sanitize test-leak check-archive \
	check-dependencies check-determinism test check clean fclean re

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

$(BATCH_FAILURE_BIN): $(BATCH_FAILURE_SRC) $(NAME)
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(BATCH_FAILURE_SRC) $(NAME) -o $@

$(PIPELINE_FAILURE_BIN): $(PIPELINE_FAILURE_SRC) $(NAME)
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(PIPELINE_FAILURE_SRC) $(NAME) -o $@

$(CONTACT_FAILURE_BIN): $(CONTACT_FAILURE_SRC) $(NAME)
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(CONTACT_FAILURE_SRC) $(NAME) -o $@

failure-test: $(FAILURE_BIN) $(FACTORY_FAILURE_BIN) $(BATCH_FAILURE_BIN) \
	$(PIPELINE_FAILURE_BIN) $(CONTACT_FAILURE_BIN)
	./$(FAILURE_BIN)
	./$(FACTORY_FAILURE_BIN)
	./$(BATCH_FAILURE_BIN)
	./$(PIPELINE_FAILURE_BIN)
	./$(CONTACT_FAILURE_BIN)

$(NO_ELIDE_BIN): $(TEST_SRC) $(TEST_SUPPORT_SRC) $(NAME)
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -fno-elide-constructors \
		$(TEST_SRC) $(TEST_SUPPORT_SRC) $(NAME) -o $@

test-no-elide: $(NO_ELIDE_BIN)
	./$(NO_ELIDE_BIN)

$(PUBLIC_CONTRACT_BIN): $(PUBLIC_CONTRACT_SRC) $(NAME)
	@$(MKDIR) $(dir $@)
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) $(PUBLIC_CONTRACT_SRC) \
		$(NAME) -o $@

test-contract:
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/public_headers.cpp
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/contact_headers.cpp
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/text_buffer_headers.cpp
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/format_headers.cpp
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/factory_headers.cpp
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/scalar_headers.cpp
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/runtime_headers.cpp
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/serializer_headers.cpp
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/template_headers.cpp
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/rpn_headers.cpp
	$(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/batch_headers.cpp
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/contact_private_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/formatter_abstract_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/runtime_inspector_private_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/runtime_unrelated_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/runtime_integer_kind_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/serializer_private_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/serializer_const_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/rpn_evaluator_private_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/batch_results_mutation_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/contact_book_const_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/text_buffer_const_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/text_buffer_storage_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/text_buffer_implicit_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/formatter_creator_abstract_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/pipeline_builder_private_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/scalar_converter_private_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/runtime_base_constructor_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/template_const_iterator_fail.cpp >/dev/null 2>&1
	@! $(CXX) $(PUBLIC_CPPFLAGS) $(CXXFLAGS) -fsyntax-only \
		tests/compile/template_list_sort_fail.cpp >/dev/null 2>&1

test-consumer: $(NAME)
	sh tests/check_external_consumer.sh "$(CXX)" "$(abspath $(NAME))"

test-integration: $(APP_BIN) $(PUBLIC_CONTRACT_BIN) test-consumer
	sh tests/check_cli.sh
	./$(PUBLIC_CONTRACT_BIN)

$(SANITIZER_BIN): $(SRC) $(TEST_SRC) $(TEST_SUPPORT_SRC)
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(SANITIZER_FLAGS) \
		$(SRC) $(TEST_SRC) $(TEST_SUPPORT_SRC) -o $@

test-sanitize: $(SANITIZER_BIN)
	UBSAN_OPTIONS=halt_on_error=1:print_stacktrace=1 \
		./$(SANITIZER_BIN)

test-leak: $(TEST_BIN) $(NO_ELIDE_BIN) $(PUBLIC_CONTRACT_BIN)
	sh tests/check_leaks.sh $(TEST_BIN) $(NO_ELIDE_BIN) \
		$(PUBLIC_CONTRACT_BIN)

check-archive: $(NAME)
	sh tests/check_archive.sh $(NAME)

check-dependencies: $(RELEASE_BIN)
	sh tests/check_dependencies.sh $(RELEASE_BIN)

check-determinism: $(APP_BIN)
	LC_ALL=C LANG=C TZ=UTC sh tests/check_cli.sh
	LC_ALL=C LANG=C TZ=UTC sh tests/check_cli.sh

test: test-unit failure-test test-no-elide test-contract test-integration

check:
	git diff --check
	$(MAKE) fclean
	$(MAKE) all
	$(MAKE) test
	$(MAKE) check-archive
	$(MAKE) check-dependencies
	$(MAKE) check-determinism
	$(MAKE) test-sanitize
	$(MAKE) test-leak
	$(MAKE) -q all

clean:
	$(RMDIR) build bin

fclean: clean
	$(RM) $(NAME)

re: fclean all

-include $(DEP)
