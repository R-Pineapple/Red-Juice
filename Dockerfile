FROM node:10
WORKDIR /usr/src/app

# giac install, soon on red-juice service
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libmpfr-dev \
    libgmp-dev \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/ \
  && rm -rf /tmp/downloaded_packages/ /tmp/*.rds
RUN JOBS=4 npm install giac@latest

RUN mv node_modules/giac/build .

COPY package*.json ./
RUN npm install

COPY . .
