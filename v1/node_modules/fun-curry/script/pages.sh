#!/bin/sh

rm -rf public coverage docs node_modules

npm install

npm run readme

npm run document

npm run coverage

mv coverage public/

mv img public/

npm run browserify

exit 0

