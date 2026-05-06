FROM alpine:3.20

RUN apk add --no-cache mpd mpc ncmpcpp && \
    mkdir -p /var/lib/mpd/playlists /music && \
    touch /var/lib/mpd/mpd.pid \
        /var/lib/mpd/state \
        /var/lib/mpd/sticker.sql && \
    chown -R mpd:audio /var/lib/mpd

COPY config/mpd.conf /etc/mpd.conf
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 6600 8000

ENTRYPOINT ["/entrypoint.sh"]
