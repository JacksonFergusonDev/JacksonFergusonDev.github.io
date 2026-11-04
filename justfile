set shell := ["bash", "-euc", "-o", "pipefail"]
set quiet

green := '\033[1;32m'
nc := '\033[0m'

default:
    @just --list

sync:
    pnpm install --frozen-lockfile

dev:
    pnpm run dev --force --open

format:
    pnpm run format

lint:
    pnpm run format:check
    pnpm run check
    pnpm run lint

lint-fix:
    pnpm run format
    pnpm run lint:fix

test:
    pnpm test

build:
    pnpm run build

browser-test:
    pnpm run test:browser

zizmor:
    uvx zizmor==1.31.1 --offline --no-progress --strict-collection .

ci: zizmor lint build test
    @printf "{{ green }}✔ Local CI passed{{ nc }}\n"

ci-full: ci browser-test
    @printf "{{ green }}✔ Full local validation passed{{ nc }}\n"

clean:
    rm -rf dist .astro test-results
