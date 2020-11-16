build:
	docker build -t red-juice .

test:
	docker run \
		--stop-timeout 310 \
		-v ${PWD}/tests:/usr/src/app/tests:ro \
		-v ${PWD}/src:/usr/src/app/src:ro \
		-v ${PWD}/package.json:/usr/src/app/package.json:ro \
		-v ${PWD}/coverage:/usr/src/app/coverage \
		-t red-juice "npx" "jest" "--coverage"

lint:
	npx eslint .

lint-fix:
	npx eslint . --fix
