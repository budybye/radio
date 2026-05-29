FROM golang:1.23-alpine AS build

WORKDIR /src
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /mpc-bridge .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates wget

COPY --from=build /mpc-bridge /usr/local/bin/mpc-bridge

EXPOSE 8080
ENV PORT=8080
CMD ["mpc-bridge"]
