dev:
	docker-compose -f docker-compose.yml -f docker-compose.development.yml up --build
dev-d:
	docker-compose -f docker-compose.yml -f docker-compose.development.yml up -d
stop:
	docker-compose down
prod:
	docker-compose -f docker-compose.yml -f docker-compose.production.yml up
prod-d:
	docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
