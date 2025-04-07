#ifndef CPP_FOUNDATION_TEST_HPP
#define CPP_FOUNDATION_TEST_HPP

#include <iostream>

namespace test_support
{

class Suite
{
public:
    Suite() : checks_(0), failures_(0)
    {
    }

    void check(bool condition, const char *label)
    {
        ++checks_;
        if (!condition)
        {
            ++failures_;
            std::cerr << "FAIL: " << label << std::endl;
        }
    }

    unsigned int checks() const
    {
        return checks_;
    }

    int result() const
    {
        if (failures_ != 0)
            return 1;
        std::cout << checks_ << " checks passed" << std::endl;
        return 0;
    }

private:
    unsigned int checks_;
    unsigned int failures_;
};

}

#endif
