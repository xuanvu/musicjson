all:	hint test

hint:
	node_modules/.bin/jshint bin lib
test:
	node_modules/.bin/nodeunit tests/*.js