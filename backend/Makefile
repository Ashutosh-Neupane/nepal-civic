.DEFAULT_GOAL := help
SHELL := /bin/bash

####

.PHONY: help
help:
	@echo "Use \`make <target>' where <target> is one of"
	@grep -E '^\.PHONY: [a-zA-Z_-]+ .*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = "(: |##)"}; {printf "\033[36m%-30s\033[0m %s\n", $$2, $$3}'

####
.PHONY: install ## Install dependencies.
install:
	npm cache clean --force
	npm install

.PHONY: lint ## Lint code.
lint:
	npx eslint --no-error-on-unmatched-pattern src/** test/**

.PHONY: test ## Test code with coverage.
test:
	CAPTCHA_ENABLED='0' npm run test

####

.PHONY: serve ## Serve the default application.
serve:
	npm start

.PHONY: migrate ## Run database migrations.
migrate:
	npm run migrate up

.PHONY: seed ## Load Nepal's provinces, districts, Palikas and grievance categories.
seed:
	npm run seed-nepal

.PHONY: demo ## Load demo officers and grievances for Kathmandu Metropolitan City.
demo:
	npm run seed-demo

.PHONY: fake-data ## Populate an empty database with fake data.
fake-data:
	npm run generate-fake-data

.PHONY: send-email ## Send an email with the email backend (for testing).
send-email:
	npm run send-test-email

.PHONY: send-sms ## Send an sms with the sms backend (for testing).
send-sms:
	npm run send-test-sms

.PHONY: send-dispatch-email ## Send an email with the higher-level dispatch function (for testing).
send-dispatch-email:
	TEST_DISPATCH_CHANNEL='email' npm run send-test-dispatch

.PHONY: send-dispatch-sms ## Send an sms with the higher-level dispatch function (for testing).
send-dispatch-sms:
	TEST_DISPATCH_CHANNEL='sms' npm run send-test-dispatch

####
