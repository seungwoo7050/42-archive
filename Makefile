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
CONSUMER_SOURCES := $(wildcard tests/consumer/*.cpp)
CONSUMER_OBJECTS := $(patsubst tests/consumer/%.cpp,\
	$(BUILD_DIR)/consumer/%.o,$(CONSUMER_SOURCES))
CONSUMER_BIN := $(BUILD_DIR)/consumer_test

.PHONY: all test headers consumer check clean fclean re

all: $(TEST_BINS)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(BUILD_DIR)/headers:
	mkdir -p $@

$(BUILD_DIR)/consumer:
	mkdir -p $@

$(BUILD_DIR)/%: tests/%.cpp $(HEADERS) $(TEST_SUPPORT_HEADERS) | $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) $< -o $@

$(BUILD_DIR)/headers/%.o: tests/headers/%.cpp $(HEADERS) \
		| $(BUILD_DIR)/headers
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c $< -o $@

$(BUILD_DIR)/consumer/%.o: tests/consumer/%.cpp $(HEADERS) \
		tests/consumer/consumer_api.hpp | $(BUILD_DIR)/consumer
	$(CXX) $(CXXFLAGS) $(CPPFLAGS) -c $< -o $@

$(CONSUMER_BIN): $(CONSUMER_OBJECTS)
	$(CXX) $(CXXFLAGS) $(CONSUMER_OBJECTS) -o $@

test: $(TEST_BINS)
	@for test_bin in $(TEST_BINS); do ./$$test_bin || exit $$?; done

headers: $(HEADER_TEST_OBJECTS)

consumer: $(CONSUMER_BIN)
	./$(CONSUMER_BIN)

check: test headers consumer

clean:
	rm -rf $(BUILD_DIR)

fclean: clean

re: fclean all
