build:
	docker build -t red-juice .

start:
	docker run \
		-v ${PWD}/src:/usr/src/app/src:ro \
		-v ${PWD}/package.json:/usr/src/app/package.json:ro \
		-p 8274:8274 \
		-it red-juice "npm" "start"

test:
	docker run \
		--stop-timeout 310 \
		-v ${PWD}/src:/usr/src/app/src:ro \
		-v ${PWD}/package.json:/usr/src/app/package.json:ro \
		-v ${PWD}/tests:/usr/src/app/tests:ro \
		-v ${PWD}/coverage:/usr/src/app/coverage \
		red-juice "npx" "jest" "--coverage" "--runInBand" "--colors" "--verbose"

lint:
	npx eslint .

lint-install:
	npm install --no-package-lock --no-save eslint

lint-fix:
	npx eslint . --fix
