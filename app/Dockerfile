FROM node:slim

WORKDIR /app

RUN npm install -g bun

COPY package.json ./
RUN bun install

COPY . .

RUN bun run build

EXPOSE 5173
ENTRYPOINT [ "bun" ]
CMD [ "run", "preview", "--", "--host", "0.0.0.0" ]
