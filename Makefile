CXX := c++
CXXFLAGS := -Wall -Wextra -Werror -std=c++98
CPPFLAGS := -Iinclude

BUILD_DIR := build
TEST_NAMES := test_containers test_vector_exceptions test_map_exceptions \
	test_map_iterators test_map_policy_exceptions test_map_randomized \
	test_complexity

TEST_SUPPORT_HEADERS := $(wildcard tests/support/*.hpp)
TEST_BINS := $(addprefix $(BUILD_DIR)/,$(TEST_NAMES))
HEADERS := $(wildcard include/*.hpp)
HEADER_TEST_SOURCES := $(wildcard tests/headers/*.cpp)
HEADER_TEST_OBJECTS := $(patsubst tests/headers/%.cpp,\
	$(BUILD_DIR)/headers/%.o,$(HEADER_TEST_SOURCES))

.PHONY: all test headers clean fclean re

all: $(TEST_BINS)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(BUILD_DIR)/headers:
	mkdir -p $@

$(BUILD_DIR)/%: tests/%.cpp $(HEADERS) $(TEST_SUPPORT_HEADERS) | $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) $< -o $@

$(BUILD_DIR)/headers/%.o: tests/headers/%.cpp $(HEADERS) \
		| $(BUILD_DIR)/headers
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c $< -o $@

test: $(TEST_BINS)
	@for test_bin in $(TEST_BINS); do ./$$test_bin || exit $$?; done

headers: $(HEADER_TEST_OBJECTS)

clean:
	rm -rf $(BUILD_DIR)

fclean: clean

re: fclean all
