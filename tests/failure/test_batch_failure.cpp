#include "cppf/BatchEngine.hpp"
#include "support/FailingNew.hpp"

#include <iostream>
#include <new>
#include <sstream>
#include <string>

namespace
{

unsigned int checks = 0;
unsigned int failures = 0;
unsigned int first_failure = 0;

void check(bool condition)
{
    ++checks;
    if (!condition)
    {
        if (first_failure == 0)
            first_failure = checks;
        ++failures;
    }
}

void seed(cppf::BatchEngine &engine, const std::string &text)
{
    std::istringstream input(text);

    engine.replace(input);
}

void testAllocationFailureSweep()
{
    const std::string seed_text = "seed | 7";
    const std::string replacement_text =
        "long_alpha_name_0123456789 | 10 20 +\n"
        "long_beta_name_abcdefghijklmnopqrstuvwxyz | 50 8 -\n"
        "long_gamma_name_ABCDEFGHIJKLMNOPQRSTUVWXYZ | 6 7 *";
    const std::string expected_seed = "7 | seed\n";
    const std::size_t outer_baseline = failing_new::liveBlocks();
    std::size_t observed = 0;
    std::size_t index;

    {
        std::istringstream seed_input(seed_text);
        std::istringstream replacement_input(replacement_text);
        cppf::BatchEngine engine;

        engine.replace(seed_input);
        failing_new::resetAttempts();
        engine.replace(replacement_input);
        observed = failing_new::attempts();
        check(engine.results().size() == 3);
    }
    check(observed != 0);
    check(failing_new::liveBlocks() == outer_baseline);

    for (index = 1; index <= observed; ++index)
    {
        {
            std::istringstream replacement_input(replacement_text);
            cppf::BatchEngine engine;
            bool bad_allocation = false;
            bool unexpected_exception = false;
            std::size_t reached_attempt;
            std::size_t baseline;

            seed(engine, seed_text);
            baseline = failing_new::liveBlocks();
            failing_new::failOn(index);
            try
            {
                engine.replace(replacement_input);
            }
            catch (const std::bad_alloc &)
            {
                bad_allocation = true;
            }
            catch (...)
            {
                unexpected_exception = true;
            }
            failing_new::disableFailure();
            reached_attempt = failing_new::attempts();

            check(bad_allocation);
            check(!unexpected_exception);
            check(reached_attempt == index);
            check(engine.results().size() == 1);
            check(engine.results()[0] == cppf::JobResult("seed", 7));
            {
                std::ostringstream output;

                engine.write(output);
                check(output.str() == expected_seed);
            }
            check(failing_new::liveBlocks() == baseline);
        }
        check(failing_new::liveBlocks() == outer_baseline);
    }
}

}

int main()
{
    testAllocationFailureSweep();
    if (failures != 0)
    {
        std::cerr << failures << " batch failure checks failed; first: "
                  << first_failure << std::endl;
        return 1;
    }
    std::cout << checks << " batch failure checks passed" << std::endl;
    return 0;
}
