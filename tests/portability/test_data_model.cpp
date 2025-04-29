#include <climits>
#include <cstddef>
#include <iostream>

int main()
{
    const bool lp64 =
        CHAR_BIT == 8 &&
        sizeof(short) == 2 &&
        sizeof(int) == 4 &&
        sizeof(long) == 8 &&
        sizeof(void *) == 8 &&
        sizeof(std::size_t) == 8;

    if (!lp64)
    {
        std::cerr << "지원하지 않는 데이터 모델:"
                  << " char_bit=" << CHAR_BIT
                  << " short=" << sizeof(short)
                  << " int=" << sizeof(int)
                  << " long=" << sizeof(long)
                  << " pointer=" << sizeof(void *)
                  << " size_t=" << sizeof(std::size_t)
                  << std::endl;
        return 1;
    }
    std::cout << "LP64 data model verified" << std::endl;
    return 0;
}
