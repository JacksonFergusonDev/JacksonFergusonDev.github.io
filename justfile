set shell := ["bash", "-euc", "-o", "pipefail"]
set quiet

green := '\033[1;32m'
nc := '\033[0m'

default:
    @just --list

sync:
    npm ci

dev:
    npm run dev -- --force --open

format:
    npm run format

lint:
    npm run format:check
    npm run check
    npm run lint

lint-fix:
    npm run format
    npm run lint:fix

test:
    npm test

build:
    npm run build

browser-test:
    npm run test:browser

ci: lint build test
    @printf "{{ green }}✔ Local CI passed{{ nc }}\n"

ci-full: ci browser-test
    @printf "{{ green }}✔ Full local validation passed{{ nc }}\n"

clean:
    rm -rf dist .astro test-results
