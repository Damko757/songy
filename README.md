# Songy - Self-Hosted YouTube dowloader, with song metadata!

The objective of this project is to create simple self-hosted YT downloader, that can fetch song metadata automatically.

# Instalation

Clone this repository:
`git clone https://github.com/Damko757/songy`

And start the containers (you need to have (Docker installed)[https://github.com/docker/docker-install]):
`sudo docker compose up --build`

# Technicalities

The project is separated into two parts: (WEB/UI)[#web] and (API/BE)[#api]. If needed, only the _api_ can be used (e. g. for custom scripts).

## Shared && .env

### .env options

| Key      | Description                 |
| -------- | --------------------------- |
| API_PORT | Port, the api will run on   |
| API_URL  | URL for _Web_ to connect to |

<a id="api"></a>

## API

> TODO
> This is the backbone, that will download, find metadata, convert, etc...
> <a id="web"></a>

## Web

> TODO
> This is web UI for simple usage of the (API)[#api]

# Contribution

is welcomed :)
