import nodemailer from 'nodemailer';

// Create email transporter with enhanced production configuration
const createTransporter = (useAlternative = false) => {
  // Check if environment variables are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email configuration missing: EMAIL_USER and EMAIL_PASSWORD must be set');
  }

  // Primary configuration (Gmail with service)
  const primaryConfig = {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use false for port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Enhanced timeout settings for production
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds  
    socketTimeout: 60000, // 60 seconds
    // TLS settings
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    // Disable pooling for serverless environments
    pool: false,
    maxConnections: 1,
    maxMessages: Infinity,
    // Debug settings
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development'
  };

  // Alternative configuration (Gmail without service)
  const alternativeConfig = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use true for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    tls: {
      rejectUnauthorized: false
    },
    pool: false,
    maxConnections: 1,
    maxMessages: Infinity,
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development'
  };

  const config = useAlternative ? alternativeConfig : primaryConfig;
  
  console.log('Creating transporter with config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    service: config.service || 'none',
    user: process.env.EMAIL_USER ? 'configured' : 'missing',
    connectionTimeout: config.connectionTimeout,
    alternative: useAlternative
  });

  return nodemailer.createTransporter(config);
};

// Send verification email with improved error handling and retry
export const sendVerificationEmail = async (email, username, verificationToken) => {
  let lastError = null;
  
  // Try both configurations
  for (const useAlternative of [false, true]) {
    try {
      console.log(`Attempting email send with ${useAlternative ? 'alternative' : 'primary'} configuration`);
      console.log('Email details:', { to: email, username });
      console.log('Environment check:', {
        emailUser: process.env.EMAIL_USER ? 'configured' : 'missing',
        emailPassword: process.env.EMAIL_PASSWORD ? 'configured' : 'missing'
      });
      
      const transporter = createTransporter(useAlternative);
      
      // Skip verification for now to avoid timeout issues
      console.log('Skipping transporter verification to avoid timeout issues');
      
      const mailOptions = {
        from: {
          name: 'Q-DRAGON Trading Platform',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'Verify Your Q-DRAGON Trading Account',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Q-DRAGON Account</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">
              <!-- Header -->
              <div style="text-align: center; padding: 30px 0; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 10px; margin-bottom: 30px;">
                <div style="display: inline-block; width: 60px; height: 60px; background-color: white; border-radius: 50%; line-height: 60px; font-size: 24px; font-weight: bold; color: #f59e0b; margin-bottom: 10px;">
                  Q
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px;">Q-DRAGON</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Gold Trading Platform</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 0 20px;">
                <h2 style="color: #333; margin-bottom: 20px;">Welcome to Q-DRAGON, ${username}!</h2>
                
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                  Thank you for registering with Q-DRAGON, the professional XAU/USD trading platform. 
                  To complete your account setup and start trading, please verify your email address.
                </p>
                
                <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                  <h3 style="color: #92400e; margin: 0 0 15px 0;">Your Verification Code</h3>
                  <div style="font-size: 32px; font-weight: bold; color: #92400e; letter-spacing: 3px; font-family: monospace;">
                    ${verificationToken}
                  </div>
                  <p style="color: #92400e; margin: 15px 0 0 0; font-size: 14px;">
                    This code expires in 24 hours
                  </p>
                </div>
                
                <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
                  Enter this verification code on the verification page to activate your trading account.
                  If you didn't create an account with Q-DRAGON, please ignore this email.
                </p>
                
                <!-- Security Note -->
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="color: #991b1b; margin: 0; font-size: 14px;">
                    <strong>Security Notice:</strong> Never share your verification code with anyone. 
                    Q-DRAGON staff will never ask for your verification code via phone or email.
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="text-align: center; padding: 30px 20px; border-top: 1px solid #e5e7eb; margin-top: 40px;">
                <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                  © 2025 Q-DRAGON Trading Platform<br>
                  Professional • Secure • Reliable
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                  This email was sent to ${email}. If you didn't request this, please ignore this email.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      console.log('Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });

      // Use Promise wrapper with retry mechanism
      const sendEmailWithRetry = async (retries = 2) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            console.log(`Email send attempt ${attempt}/${retries} with ${useAlternative ? 'alternative' : 'primary'} config`);
            
            const result = await new Promise((resolve, reject) => {
              // Set a timeout for the send operation
              const timeout = setTimeout(() => {
                reject(new Error('Send operation timeout after 45 seconds'));
              }, 45000);
              
              transporter.sendMail(mailOptions, (err, info) => {
                clearTimeout(timeout);
                if (err) {
                  console.error(`sendMail error (attempt ${attempt}):`, err.message);
                  reject(err);
                } else {
                  console.log(`sendMail success (attempt ${attempt}):`, info.messageId);
                  resolve(info);
                }
              });
            });
            
            return result; // Success - return result
            
          } catch (error) {
            console.error(`Email send attempt ${attempt} failed:`, error.message);
            
            if (attempt === retries) {
              throw error; // Last attempt failed - throw error
            }
            
            // Wait before retry
            const waitTime = 3000 * attempt; // 3s, 6s
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      };
      
      const result = await sendEmailWithRetry();
      
      console.log('Verification email sent successfully:', result.messageId);
      
      // Close the transporter
      try {
        transporter.close();
      } catch (closeError) {
        console.warn('Error closing transporter:', closeError.message);
      }
      
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error(`Email sending failed with ${useAlternative ? 'alternative' : 'primary'} config:`, error.message);
      lastError = error;
      
      // If this was the primary config, try alternative
      if (!useAlternative) {
        console.log('Trying alternative email configuration...');
        continue;
      }
    }
  }
  
  // Both configurations failed
  console.error('All email configurations failed. Last error:', lastError?.message);
  console.error('Error details:', {
    code: lastError?.code,
    command: lastError?.command,
    response: lastError?.response,
    responseCode: lastError?.responseCode
  });
  
  return { success: false, error: lastError?.message || 'Email sending failed' };
};