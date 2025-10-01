// Alternative email service using SendGrid API
// This version uses SendGrid's Web API v3 with fetch (no external dependencies)

// Validate configuration
const validateEmailConfig = () => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error(
      'SendGrid configuration missing: SENDGRID_API_KEY must be set'
    )
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error(
      'Email configuration missing: EMAIL_FROM must be set (must be verified in SendGrid)'
    )
  }
}

// Send verification email using SendGrid
export const sendVerificationEmail = async (
  email,
  username,
  verificationToken
) => {
  try {
    console.log('Attempting to send verification email to:', email)
    console.log(
      'SendGrid API Key configured:',
      process.env.SENDGRID_API_KEY ? 'Yes' : 'No'
    )
    console.log('Email FROM configured:', process.env.EMAIL_FROM ? 'Yes' : 'No')

    // Validate configuration
    validateEmailConfig()

    const emailData = {
      personalizations: [
        {
          to: [
            {
              email: email,
              name: username
            }
          ],
          subject: 'Verify Your Q-DRAGON Trading Account'
        }
      ],
      from: {
        email: process.env.EMAIL_FROM,
        name: 'Q-DRAGON Trading Platform'
      },
      content: [
        {
          type: 'text/html',
          value: `
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
        }
      ]
    }

    console.log('Sending email with SendGrid:', {
      from: emailData.from,
      to: emailData.personalizations[0].to[0].email,
      subject: emailData.personalizations[0].subject
    })

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: 'Unknown error' }))
      console.error('SendGrid API error:', response.status, errorData)
      throw new Error(
        `Failed to send email: ${response.status} ${errorData.message || errorData}`
      )
    }

    // SendGrid returns 202 with no body on success
    const messageId = response.headers.get('x-message-id') || 'sent'
    console.log('Verification email sent successfully via SendGrid:', messageId)

    return { success: true, messageId }
  } catch (error) {
    console.error('Error sending verification email:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    })
    return { success: false, error: error.message }
  }
}
