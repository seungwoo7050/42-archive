#ifndef CPP_FOUNDATION_FAILING_NEW_HPP
#define CPP_FOUNDATION_FAILING_NEW_HPP

#include <cstddef>

namespace failing_new
{

void resetAttempts();
void failOn(std::size_t attempt);
void disableFailure();
std::size_t attempts();
std::size_t liveBlocks();

}

#endif
