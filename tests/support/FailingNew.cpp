#include "support/FailingNew.hpp"

#include <cstdlib>
#include <new>

namespace
{

std::size_t allocation_attempts = 0;
std::size_t failure_attempt = 0;
std::size_t live_blocks = 0;

void *allocateBlock(std::size_t size)
{
    void *block;

    ++allocation_attempts;
    if (failure_attempt != 0 && allocation_attempts == failure_attempt)
        throw std::bad_alloc();
    block = std::malloc(size == 0 ? 1 : size);
    if (block == 0)
        throw std::bad_alloc();
    ++live_blocks;
    return block;
}

void freeBlock(void *block) throw()
{
    if (block != 0)
    {
        --live_blocks;
        std::free(block);
    }
}

}

void *operator new(std::size_t size) throw(std::bad_alloc)
{
    return allocateBlock(size);
}

void *operator new[](std::size_t size) throw(std::bad_alloc)
{
    return allocateBlock(size);
}

void operator delete(void *block) throw()
{
    freeBlock(block);
}

void operator delete[](void *block) throw()
{
    freeBlock(block);
}

namespace failing_new
{

void resetAttempts()
{
    allocation_attempts = 0;
    failure_attempt = 0;
}

void failOn(std::size_t attempt)
{
    allocation_attempts = 0;
    failure_attempt = attempt;
}

void disableFailure()
{
    failure_attempt = 0;
}

std::size_t attempts()
{
    return allocation_attempts;
}

std::size_t liveBlocks()
{
    return live_blocks;
}

}
