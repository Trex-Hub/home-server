FROM denoland/deno:2-alpine

WORKDIR /app

COPY server/main.ts .

# Cache dependencies (none currently, but keeps the layer warm)
RUN deno cache --allow-net --allow-env main.ts

USER deno

CMD ["run", "--allow-net", "--allow-env", "main.ts"]
