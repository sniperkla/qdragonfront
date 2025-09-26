import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
  // Check if environment variables are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email configuration missing: EMAIL_USER and EMAIL_PASSWORD must be set');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Production specific settings
    pool: true, // use pooled connections
    maxConnections: 1, // limit to 1 connection
    maxMessages: 3, // limit to 3 messages per connection
    rateDelta: 20000, // limit to 3 messages per 20 seconds
    rateLimit: 3
  });
};

// Send verification email
export const sendVerificationEmail = async (email, username, verificationToken) => {
  try {
    console.log('Attempting to send verification email to:', email);
    console.log('Email user configured:', process.env.EMAIL_USER ? 'Yes' : 'No');
    console.log('Email password configured:', process.env.EMAIL_PASSWORD ? 'Yes' : 'No');
    
    const transporter = createTransporter();
    
    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('Email transporter verified successfully');
    } catch (verifyError) {
      console.error('Email transporter verification failed:', verifyError);
      throw new Error(`Email configuration invalid: ${verifyError.message}`);
    }
    
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
              
              <!-- Features -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0;">What's Next?</h3>
                <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Verify your email address</li>
                  <li>Complete your trader profile</li>
                  <li>Access professional XAU/USD trading tools</li>
                  <li>Start your gold trading journey</li>
                </ul>
              </div>
              
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

    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully:', result.messageId);
    
    // Close the transporter
    transporter.close();
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return { success: false, error: error.message };
  }
};