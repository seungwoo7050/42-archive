#!/bin/sh

set -eu

temporary_directory=$(mktemp -d "${TMPDIR:-/tmp}/cpp-foundation-cli.XXXXXX")
trap 'rm -rf "$temporary_directory"' EXIT HUP INT TERM

./bin/ex00_contact_book < tests/fixtures/contact-session.in \
    > "$temporary_directory/contact.out"
diff -u tests/fixtures/contact-session.out "$temporary_directory/contact.out"

./bin/ex01_text_buffer hello world > "$temporary_directory/text.out"
printf 'helloworld\n' > "$temporary_directory/text.expected"
diff -u "$temporary_directory/text.expected" "$temporary_directory/text.out"

./bin/ex02_format_pipeline mixed > "$temporary_directory/format.out"
printf '[MIXED]\n' > "$temporary_directory/format.expected"
diff -u "$temporary_directory/format.expected" "$temporary_directory/format.out"

./bin/ex03_pipeline_factory mixed 'prefix=[' upper 'suffix=]' \
    > "$temporary_directory/factory.out"
printf '[MIXED]\n' > "$temporary_directory/factory.expected"
diff -u "$temporary_directory/factory.expected" \
    "$temporary_directory/factory.out"

if ./bin/ex03_pipeline_factory mixed reverse \
    > "$temporary_directory/factory-failure.out" \
    2> "$temporary_directory/factory-failure.err"
then
    exit 1
fi
test ! -s "$temporary_directory/factory-failure.out"
printf 'unknown formatter\n' > "$temporary_directory/factory-failure.expected"
diff -u "$temporary_directory/factory-failure.expected" \
    "$temporary_directory/factory-failure.err"

./bin/ex04_type_boundary scalar 42.5 \
    > "$temporary_directory/scalar.out"
printf "char: '*'\nint: 42\nfloat: 42.5f\ndouble: 42.5\n" \
    > "$temporary_directory/scalar.expected"
diff -u "$temporary_directory/scalar.expected" \
    "$temporary_directory/scalar.out"

if ./bin/ex04_type_boundary scalar 42f \
    > "$temporary_directory/scalar-failure.out" \
    2> "$temporary_directory/scalar-failure.err"
then
    exit 1
fi
test ! -s "$temporary_directory/scalar-failure.out"
printf 'invalid scalar literal\n' \
    > "$temporary_directory/scalar-failure.expected"
diff -u "$temporary_directory/scalar-failure.expected" \
    "$temporary_directory/scalar-failure.err"
