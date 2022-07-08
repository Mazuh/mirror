#!/bin/bash
set -e;
set -x;

npm run clear-dist

git diff --exit-code
git diff --cached --exit-code
git checkout main

git branch -D gh-pages || echo '...'
git checkout -b gh-pages

npm run build -- --out-dir docs/ --public-url https://mazuh.github.io/mirror/

git add docs/
git commit -m "deploy to gh-pages -- aka, gambiarra"
git push origin gh-pages -f

git checkout main
git branch -D gh-pages

npm run clear-dist
