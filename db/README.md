## Local database SQL bootstrap

Import these files into your MariaDB database `r_clones_cloud` (in order):

1. `db/r_clones_cloud_init.sql` — tables + product/category seed
2. `db/r_clones_cloud_users.sql` — login users (admin, buyer, seller)

No real passwords are stored in the repo. The SQL file contains **bcrypt password hashes** only.

After import, set `DB_*` credentials in `.env` on the VPS (never commit `.env`).

