# Database connection (MariaDB)

## Production (app on the same VPS as MariaDB)

On the server `.env`:

```env
NODE_ENV=production
DATABASE_DRIVER=mariadb
DATABASE_URL=mysql://r_clones_cloud:YOUR_PASSWORD@127.0.0.1:3306/r_clones_cloud
```

Use **127.0.0.1** (not the public VPS IP). App and MariaDB must run on the **same server**.

If the password contains `@`, `:`, `/`, or `#`, URL-encode it in `DATABASE_URL`  
(e.g. `@` → `%40`, `!` → `%21`).

---

## Local development (app on your Mac, DB on VPS)

Remote MariaDB **blocks** direct connections (`ECONNRESET`). You **must** use an SSH tunnel.

### Step 1 — Open a terminal and start the tunnel

```bash
cd /path/to/catalogus
npm run db:tunnel
```

Enter your **VPS SSH password** when prompted (or set up SSH keys once with `ssh-copy-id root@89.116.38.197`).

**Leave that terminal open.**

### Step 2 — Test the database

In another terminal:

```bash
npm run db:check
```

You should see: `OK — connected. Users in DB: 3`

### Step 3 — Run the app

```env
DB_HOST=127.0.0.1
DB_PORT=3306
```

```bash
npm run dev
```

Login: http://localhost:3000/login

---

## If you need true remote MySQL (optional, on VPS)

On the VPS as root:

1. MariaDB must listen on all interfaces (or your app IP):

```ini
# /etc/mysql/mariadb.conf.d/50-server.cnf
bind-address = 0.0.0.0
```

2. User must be allowed from your IP:

```sql
CREATE USER IF NOT EXISTS 'r_clones_cloud'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON r_clones_cloud.* TO 'r_clones_cloud'@'%';
FLUSH PRIVILEGES;
```

3. Open firewall port 3306 only if required (less secure than SSH tunnel).

Restart MariaDB: `systemctl restart mariadb`
