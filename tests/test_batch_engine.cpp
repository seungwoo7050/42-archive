#include "cppf/BatchEngine.hpp"
#include "support/Test.hpp"

#include <ios>
#include <locale>
#include <sstream>
#include <stdexcept>
#include <string>

namespace
{

class CommaPunctuation : public std::numpunct<char>
{
protected:
    virtual char do_decimal_point() const
    {
        return ',';
    }
};

std::string writeBatch(const cppf::BatchEngine &engine)
{
    std::ostringstream output;

    engine.write(output);
    return output.str();
}

}

void testBatchEngine(test_support::Suite &suite)
{
    const cppf::JobResult empty;
    const cppf::JobResult alpha("alpha", 5);
    const cppf::JobResult alpha_copy("alpha", 5);
    const cppf::JobResult beta("beta", 5);

    suite.check(empty.name().empty() && empty.value() == 0,
                "job result has empty default value");
    suite.check(alpha.name() == "alpha" && alpha.value() == 5,
                "job result preserves name and value");
    suite.check(alpha == alpha_copy && !(alpha == beta),
                "job result equality compares both fields");

    cppf::BatchEngine engine;
    suite.check(engine.results().empty() && writeBatch(engine).empty(),
                "batch engine starts empty");

    {
        std::istringstream input(
            "zeta | 2 3 +\n"
            "alpha | 10 5 -\n"
            "beta | 3 4 +");

        engine.replace(input);
    }
    suite.check(engine.results().size() == 3,
                "batch engine owns parsed jobs after input lifetime");
    suite.check(engine.results()[0] == cppf::JobResult("alpha", 5) &&
                    engine.results()[1] == cppf::JobResult("zeta", 5) &&
                    engine.results()[2] == cppf::JobResult("beta", 7),
                "batch engine sorts by value then name");
    const std::string original =
        "5 | alpha\n5 | zeta\n7 | beta\n";
    suite.check(writeBatch(engine) == original,
                "batch engine writes deterministic decimal rows");

    const cppf::JobResult *original_first = &engine.results()[0];
    bool duplicate = false;
    try
    {
        std::istringstream input(
            "other | 1\nother | 2\n");
        engine.replace(input);
    }
    catch (const std::invalid_argument &error)
    {
        duplicate =
            std::string(error.what()) == "invalid batch input";
    }
    suite.check(duplicate && &engine.results()[0] == original_first &&
                    writeBatch(engine) == original,
                "duplicate name preserves prior batch and references");

    bool invalid_rpn = false;
    try
    {
        std::istringstream input(
            "other | 1\nsecond | 1 +\n");
        engine.replace(input);
    }
    catch (const std::invalid_argument &error)
    {
        invalid_rpn =
            std::string(error.what()) == "invalid rpn expression";
    }
    suite.check(invalid_rpn && &engine.results()[0] == original_first &&
                    writeBatch(engine) == original,
                "invalid rpn preserves prior batch and references");

    bool empty_input = false;
    try
    {
        std::istringstream input("");
        engine.replace(input);
    }
    catch (const std::invalid_argument &error)
    {
        empty_input =
            std::string(error.what()) == "invalid batch input";
    }
    suite.check(empty_input && writeBatch(engine) == original,
                "empty input preserves prior batch");

    std::ostringstream configured;
    configured.setf(std::ios::hex, std::ios::basefield);
    configured.setf(std::ios::showpos);
    configured.setf(std::ios::left, std::ios::adjustfield);
    configured.fill('#');
    configured.width(80);
    configured.precision(2);
    configured.imbue(std::locale(std::locale::classic(),
                                new CommaPunctuation));
    const std::ios::fmtflags flags = configured.flags();
    const char fill = configured.fill();
    const std::streamsize width = configured.width();
    const std::streamsize precision = configured.precision();

    engine.write(configured);
    suite.check(configured.str() == original,
                "batch output ignores caller formatting and locale");
    suite.check(configured.flags() == flags && configured.fill() == fill &&
                    configured.width() == width &&
                    configured.precision() == precision,
                "batch output preserves caller formatting state");
}
