#!/bin/bash

if [ "$TRAVIS_REPO_SLUG" == "ThibWeb/twilight-sparql" ] && [ "$TRAVIS_BRANCH" == "master" ]; then

  echo -e "Deploying to GitHub Pages...\n"

  git config --global user.email "travis@travis-ci.org"
  git config --global user.name "travis-ci"

  cd dist
  git init .
  git add -f .
  git commit -m "Travis deploy $TRAVIS_BUILD_NUMBER to gh-pages"
  git push -fq "https://${GH_TOKEN}@github.com/ThibWeb/twilight-sparql" "master:gh-pages"

  echo -e "Finished deploy to GitHub Pages...\n"

fi
