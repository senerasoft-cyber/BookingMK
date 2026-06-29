#!/bin/sh
set -e

flask --app wsgi.py db upgrade
exec gunicorn wsgi:app --bind 0.0.0.0:5000 --workers 3 --timeout 60
