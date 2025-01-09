# Variables
CLIENT_DIR=client
SERVER_DIR=server

# Commandes
install:
	pnpm install --filter $(CLIENT_DIR)
	pnpm install --filter $(SERVER_DIR)

lint-client:
	cd $(CLIENT_DIR) && pnpm exec eslint "src/**/*.{js,jsx}"

lint-server:
	cd $(SERVER_DIR) && pnpm exec eslint "src/**/*.js"

lint: lint-client lint-server

format-client:
	cd $(CLIENT_DIR) && pnpm exec prettier --write .

format-server:
	cd $(SERVER_DIR) && pnpm exec prettier --write .

format: format-client format-server

start-client:
	cd $(CLIENT_DIR) && pnpm run dev

start-server:
	cd $(SERVER_DIR) && pnpm run dev

start:
	make start-server & make start-client

build-client:
	cd $(CLIENT_DIR) && pnpm run build

build:
	make build-client

clean:
	rm -rf $(CLIENT_DIR)/node_modules $(SERVER_DIR)/node_modules
	rm -rf $(CLIENT_DIR)/dist $(SERVER_DIR)/build
