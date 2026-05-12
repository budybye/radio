FROM oven/bun:slim

WORKDIR /app

COPY package.json ./
RUN bun install --allow-scripts

COPY . .
RUN bun run build

EXPOSE 5173
ENTRYPOINT [ "bun" ]
CMD [ "run", "preview", "--", "--host", "0.0.0.0" ]
