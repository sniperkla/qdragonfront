module.exports = {
  apps: [
    {
      name: 'qdragon-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Add your environment variables here
        MONGODB_URI: process.env.MONGODB_URI || '',
        JWT_SECRET: process.env.JWT_SECRET || '',
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
        EMAIL_USER: process.env.EMAIL_USER || '',
        EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
        ADMIN_KEY: process.env.ADMIN_KEY || '',
        RESEND_API_KEY: process.env.RESEND_API_KEY || '',
        EMAIL_FROM: process.env.EMAIL_FROM || '',
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || ''
      }
    }
  ]
}
