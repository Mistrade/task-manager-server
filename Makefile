prod:
	docker-compose up --build
prod-d:
	docker-compose up -d --build
stop:
	docker-compose down