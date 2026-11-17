ARG NGINX_IMAGE=nginx:stable-alpine
FROM ${NGINX_IMAGE}
COPY nginx.conf /etc/nginx/nginx.conf
USER 101:101
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
