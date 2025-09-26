import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Validate configuration
const validateEmailConfig = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      'Email configuration missing: RESEND_API_KEY must be set'
    )
  }
  
  if (!process.env.EMAIL_FROM) {
    throw new Error(
      'Email configuration missing: EMAIL_FROM must be set (e.g., noreply@yourdomain.com)'
    )
  }
}

// Send verification email
export const sendVerificationEmail = async (
  email,
  username,
  verificationToken
) => {
  try {
    console.log('Attempting to send verification email to:', email)
    console.log('Resend API Key configured:', process.env.RESEND_API_KEY ? 'Yes' : 'No')
    console.log('Email FROM configured:', process.env.EMAIL_FROM ? 'Yes' : 'No')

    // Validate configuration
    validateEmailConfig()

    const emailData = {
      from: `Q-DRAGON Trading Platform <${process.env.EMAIL_FROM}>`,
      to: [email],
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
    }

    console.log('Sending email with Resend:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject
    })

    const result = await resend.emails.send(emailData)

    if (result.error) {
      console.error('Resend API error:', result.error)
      throw new Error(`Failed to send email: ${result.error.message}`)
    }

    console.log('Verification email sent successfully:', result.data?.id)

    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Error sending verification email:', error)
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    })
    return { success: false, error: error.message }
  }
}

// Send password reset email
export const sendPasswordResetEmail = async (
  email,
  username,
  resetToken
) => {
  try {
    console.log('Attempting to send password reset email to:', email)
    
    // Validate configuration
    validateEmailConfig()

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

    const emailData = {
      from: `Q-DRAGON Trading Platform <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: 'Reset Your Q-DRAGON Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Q-DRAGON Password</title>
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
              <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Hello ${username},<br><br>
                We received a request to reset your password for your Q-DRAGON trading account. 
                If you made this request, click the button below to reset your password.
              </p>
              
              <!-- Reset Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Or copy and paste this link into your browser:
              </p>
              
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 20px 0; word-break: break-all;">
                <a href="${resetUrl}" style="color: #f59e0b; text-decoration: none;">${resetUrl}</a>
              </div>
              
              <!-- Security Info -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 30px 0;">
                <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">Security Information</h3>
                <ul style="color: #991b1b; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>This password reset link expires in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Never share your password reset link with anyone</li>
                  <li>Contact support if you have concerns about your account security</li>
                </ul>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 30px; font-size: 14px;">
                If you didn't request a password reset, you can safely ignore this email. 
                Your password will remain unchanged.
              </p>
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
    }

    console.log('Sending password reset email with Resend:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject
    })

    const result = await resend.emails.send(emailData)

    if (result.error) {
      console.error('Resend API error:', result.error)
      throw new Error(`Failed to send email: ${result.error.message}`)
    }

    console.log('Password reset email sent successfully:', result.data?.id)

    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return { success: false, error: error.message }
  }
}
