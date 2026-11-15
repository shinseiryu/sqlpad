# Redis session store

Runs SQLPad with user sessions (`SQLPAD_SESSION_STORE=redis`) and query results (`SQLPAD_QUERY_RESULT_STORE=redis`) stored in Redis.

The default session store is `database`, which needs no extra service. Use Redis when you run more than one SQLPad instance behind a load balancer, so a user's session is valid on every instance.

```sh
docker compose up
```

Then open http://localhost:3000 and sign in as `admin@sqlpad.com` / `admin`.

Redis is started with append-only persistence (`--appendonly yes`) so sessions survive a Redis restart. Do not expose Redis outside the compose network without authentication; if you need to, set a password and use `SQLPAD_REDIS_URI=redis://:password@host:6379`.
