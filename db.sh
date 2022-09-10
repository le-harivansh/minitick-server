#! /usr/bin/env sh

docker run --rm --interactive --tty --publish "27017:27017" mongo:latest
