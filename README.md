# SQLPad

A web app for writing and running SQL queries and visualizing the results. Supports Postgres, Redshift, MySQL, MariaDB, SQL Server, ClickHouse, Trino, Presto, Pinot, Drill, SAP HANA, Google BigQuery, SQLite and TiDB.

![SQLPad Query Editor](https://user-images.githubusercontent.com/303966/99915755-32f78e80-2ccb-11eb-9f74-b18846d6108d.png)

## About this fork

The original [sqlpad/sqlpad](https://github.com/sqlpad/sqlpad) was archived by its maintainer in 2025. This fork keeps SQLPad maintained: current Node, updated dependencies and fewer, better-supported drivers. Progress is tracked in the [modernization roadmap](https://github.com/shinseiryu/sqlpad/issues/23).

**As of version 7, semver is no longer followed**. Going forward patch updates may require major Node.js version updates, or contain removal of functionality.

## Docker Image

```sh
docker pull ghcr.io/shinseiryu/sqlpad:master
```

The docker image runs on port 3000 and uses `/var/lib/sqlpad` for the embedded database directory.

See [docker-examples](https://github.com/shinseiryu/sqlpad/tree/master/docker-examples) for docker-compose examples.

## Project Documentation

The most recently used documentation site's astro code is located under `/docs` directory. 

## Development

For instructions on installing/running SQLPad from git repo see [DEVELOPER-GUIDE.md](https://github.com/shinseiryu/sqlpad/blob/master/DEVELOPER-GUIDE.md)

## License

MIT
