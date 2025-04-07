NAME := libcpp_foundation.a

CXX := c++
override CXXFLAGS := -Wall -Wextra -Werror -Wpedantic -pedantic-errors \
	-std=c++98 -Wold-style-cast -Wcast-qual -Woverloaded-virtual \
	-Wnon-virtual-dtor -Wc++11-extensions
override CPPFLAGS := -Iinclude
DEPFLAGS := -MMD -MP
AR := ar
ARFLAGS := rcs
RM := rm -f
RMDIR := rm -rf
MKDIR := mkdir -p

SRC := $(sort $(wildcard src/*.cpp))
OBJ := $(SRC:src/%.cpp=build/obj/%.o)
DEP := $(OBJ:.o=.d)

.PHONY: all clean fclean re

all: $(NAME)

$(NAME): $(OBJ)
	$(RM) $@
	$(AR) $(ARFLAGS) $@ $(OBJ)

build/obj/%.o: src/%.cpp
	@$(MKDIR) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) $(DEPFLAGS) -c $< -o $@

clean:
	$(RMDIR) build

fclean: clean
	$(RM) $(NAME)

re: fclean all

-include $(DEP)
