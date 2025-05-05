# Flight Upload Tool - Deployment Guide

This guide outlines the steps required to deploy the Flight Upload Tool to production environments.

## Prerequisites

Before deploying, ensure the following prerequisites are met:

- Node.js v14.x or higher
- PostgreSQL v12.x or higher
- Redis (optional, for caching)
- Minimum 4GB RAM for backend services
- Minimum 2GB RAM for frontend services

## Environment Configuration

Create environment configuration files for both backend and frontend:

### Backend Configuration (.env)

```
# Database configuration
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=airport_capacity_planner
DB_USER=db_user
DB_PASSWORD=your-password

# Server configuration
PORT=3001
NODE_ENV=production
UPLOAD_MAX_SIZE=52428800 # 50MB in bytes
CHUNK_SIZE=5242880 # 5MB for chunked uploads

# Caching (optional)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Logging
LOG_LEVEL=info
```

### Frontend Configuration (.env)

```
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_MAX_UPLOAD_SIZE=50
NEXT_PUBLIC_UPLOAD_CHUNK_SIZE=5
```

## Backend Deployment

1. **Build the Backend**

```bash
cd backend
npm install --production
npm run build
```

2. **Database Migration**

```bash
npm run migrate:latest
```

3. **Start the Production Server**

```bash
npm run start:prod
```

For production environments, we recommend using a process manager like PM2:

```bash
npm install -g pm2
pm2 start dist/server.js --name "airport-backend" -i max
```

## Frontend Deployment

1. **Build the Frontend**

```bash
cd frontend
npm install --production
npm run build
```

2. **Start the Production Server**

```bash
npm run start
```

For production environments, we recommend using a reverse proxy like Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Containerized Deployment

For Docker-based deployments, use the included Dockerfile and docker-compose.yml:

```bash
docker-compose up -d
```

## Monitoring and Scaling

### Monitoring

- Set up application monitoring using tools like New Relic, Datadog, or Prometheus
- Configure log aggregation using ELK stack or a similar solution
- Set up alerts for high memory usage, slow response times, or error rates

### Scaling

The Flight Upload Tool is designed to scale horizontally. To accommodate higher load:

1. Increase the number of backend instances
2. Set up a load balancer in front of the backend services
3. Optimize database performance with read replicas for reporting
4. Implement a caching layer for validation results

## Performance Optimization

For optimal performance in production:

1. Enable compression for API responses
2. Use a CDN for static assets
3. Configure database connection pooling
4. Adjust chunk size based on network conditions
5. Implement rate limiting for upload endpoints

## Backup and Recovery

Implement a regular backup strategy:

1. Daily database backups
2. Regular backups of uploaded files
3. Document recovery procedures
4. Test recovery processes periodically

## Security Considerations

1. Enable HTTPS for all connections
2. Implement proper authentication and authorization
3. Validate all file uploads on the server-side
4. Set appropriate file size limits
5. Scan uploaded files for malware
6. Implement API rate limiting

## Troubleshooting

Common issues and their solutions:

- **Upload Timeouts**: Increase server timeout settings for large files
- **Memory Issues**: Adjust Node.js memory limits with `--max-old-space-size`
- **Slow Processing**: Check database indexing and query performance
- **Chunked Upload Failures**: Verify client-side chunk size and network stability

## Maintenance

Regular maintenance tasks:

1. Clean up temporary files periodically
2. Archive old uploads
3. Monitor disk space usage
4. Update dependencies regularly
5. Review and optimize database queries 