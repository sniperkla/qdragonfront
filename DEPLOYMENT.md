# Q-DRAGON CentOS Deployment Commands

## 1. Initial Server Setup (run as root)
```bash
chmod +x deploy-centos.sh
./deploy-centos.sh
```

## 2. Upload Application Files
```bash
# Using SCP from your local machine
scp -r /Users/katanyooangsupanich/Desktop/register/regis/* root@your-server-ip:/var/www/q-dragon/

# Or using rsync
rsync -avz --exclude node_modules /Users/katanyooangsupanich/Desktop/register/regis/ root@your-server-ip:/var/www/q-dragon/
```

## 3. Server Deployment Commands (run on CentOS server)
```bash
# Navigate to application directory
cd /var/www/q-dragon

# Copy environment file
cp .env.production.template .env.local
nano .env.local  # Edit with your production values

# Install dependencies
npm install --production

# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the generated command output

# View application status
pm2 status
pm2 logs q-dragon-app
```

## 4. Nginx Configuration (optional, for reverse proxy)
```bash
# Install Nginx
yum install -y nginx

# Create Nginx config
cat > /etc/nginx/conf.d/q-dragon.conf << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx
```

## 5. Firewall Configuration
```bash
# Allow HTTP and HTTPS traffic
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
```

## 6. SSL Certificate (optional, using Let's Encrypt)
```bash
# Install Certbot
yum install -y epel-release
yum install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com
```

## 7. Useful PM2 Commands
```bash
# View logs
pm2 logs q-dragon-app

# Restart application
pm2 restart q-dragon-app

# Stop application
pm2 stop q-dragon-app

# Monitor resources
pm2 monit

# Reload application (zero downtime)
pm2 reload q-dragon-app

# Delete application from PM2
pm2 delete q-dragon-app
```

## 8. Database Backup (optional)
```bash
# Create backup script
cat > /usr/local/bin/backup-qdragon.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/qdragon"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mongodump --db qdragon_production --out $BACKUP_DIR/backup_$DATE
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
EOF

chmod +x /usr/local/bin/backup-qdragon.sh

# Add to crontab for daily backups
echo "0 2 * * * /usr/local/bin/backup-qdragon.sh" | crontab -
```

## 9. Monitoring Setup
```bash
# Install htop for system monitoring
yum install -y htop

# View system resources
htop

# Check application processes
ps aux | grep node
```