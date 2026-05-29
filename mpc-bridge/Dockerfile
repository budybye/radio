FROM alpine:3.20

RUN apk add --no-cache netcat-openbsd python3

COPY server.py /server.py
RUN chmod +x /server.py

EXPOSE 8080

CMD ["python3", "/server.py"]
