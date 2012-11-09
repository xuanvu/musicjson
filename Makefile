all:	hint test

hint:
	node_modules/.bin/jshint {lib,bin}
test:
	node_modules/.bin/nodeunit tests/*.js