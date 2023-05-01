build: 
	docker build -t tgchatbot .

run:
	docker run -d -p 3000:3000 --name tgchatbot --rm tgchatbot