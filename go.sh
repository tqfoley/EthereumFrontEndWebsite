docker run -it \
  -v $(pwd):/app \
  -w /app \
  -p 3001:3000 \
  node:18-alpine sh
