CXX := c++
CXXFLAGS := -Wall -Wextra -Werror -std=c++98
CPPFLAGS := -Iinclude

BUILD_DIR := build
TEST_NAMES := test_containers test_vector_exceptions test_map_exceptions \
	test_map_iterators test_map_policy_exceptions
TEST_BINS := $(addprefix $(BUILD_DIR)/,$(TEST_NAMES))
HEADERS := $(wildcard include/*.hpp)

.PHONY: all test clean fclean re

all: $(TEST_BINS)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(BUILD_DIR)/%: tests/%.cpp $(HEADERS) | $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) $< -o $@

test: $(TEST_BINS)
	@for test_bin in $(TEST_BINS); do ./$$test_bin || exit $$?; done

clean:
	rm -rf $(BUILD_DIR)

fclean: clean

re: fclean all
