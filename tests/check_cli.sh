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
