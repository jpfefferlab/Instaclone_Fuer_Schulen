FROM python:3.12-slim

# set work directory
WORKDIR /app

#COPY ./app /app

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies required for building Python packages
RUN apt-get update
RUN apt-get install -y gcc
RUN apt-get install -y libffi-dev
RUN apt-get install -y libssl-dev
RUN rm -rf /var/lib/apt/lists/*

# Upgrade pip and install setuptools and wheel
RUN pip install --upgrade pip setuptools wheel

# install dependencies
COPY requirements.lock .
RUN pip3 install --no-cache-dir -r requirements.lock

# copy project
COPY . .

# Run collectstatic to collect static files before starting the app
RUN python manage.py collectstatic --noinput

# Expose internal gunicorn server
EXPOSE 8000

# Initialize the application (migrations / tenant setup) at container start
# and then run the Gunicorn server. This merges the previous one-off
# `backend-setup` service into the main backend image so there is no
# dangling container.
#
# The init script is expected at /scripts/init_django.py (mounted at runtime
# from the repository root). The command waits for the init step to
# complete, then execs Gunicorn so signals are handled correctly.
CMD sh -c "python /scripts/init_django.py && exec gunicorn --bind 0.0.0.0:8000 InstaClone.wsgi:application --reload"
