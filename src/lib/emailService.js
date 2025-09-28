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
  verificationToken,
  language = 'en'
) => {
  try {
    console.log('Attempting to send verification email to:', email)
    console.log('Resend API Key configured:', process.env.RESEND_API_KEY ? 'Yes' : 'No')
    console.log('Email FROM configured:', process.env.EMAIL_FROM ? 'Yes' : 'No')

    // Validate configuration
    validateEmailConfig()

    const lang = ['en', 'th'].includes(language) ? language : 'en'
    const subjects = {
      en: 'Verify Your Q-DRAGON Trading Account',
      th: 'ยืนยันบัญชีเทรด Q-DRAGON ของคุณ'
    }
    const expiresText = {
      en: 'This code expires in 24 hours',
      th: 'โค้ดนี้หมดอายุภายใน 24 ชั่วโมง'
    }
    const welcomeHeadline = {
      en: `Welcome to Q-DRAGON, ${username}!`,
      th: `ยินดีต้อนรับสู่ Q-DRAGON, ${username}!`
    }
    const introParagraph = {
      en: 'Thank you for registering with Q-DRAGON, the professional XAU/USD trading platform. To complete your account setup and start trading, please verify your email address.',
      th: 'ขอบคุณที่ลงทะเบียนกับ Q-DRAGON แพลตฟอร์มเทรด XAU/USD ระดับมืออาชีพ กรุณายืนยันอีเมลเพื่อเริ่มใช้งานและเทรด'
    }
    const codeLabel = { en: 'Your Verification Code', th: 'โค้ดยืนยันของคุณ' }
    const nextTitle = { en: "What's Next?", th: 'ขั้นตอนถัดไป' }
    const nextItems = {
      en: [
        'Verify your email address',
        'Complete your trader profile',
        'Access professional XAU/USD trading tools',
        'Start your gold trading journey'
      ],
      th: [
        'ยืนยันอีเมลของคุณ',
        'กรอกโปรไฟล์นักเทรดให้สมบูรณ์',
        'เข้าถึงเครื่องมือเทรด XAU/USD ระดับมืออาชีพ',
        'เริ่มต้นการเทรดทองคำ'
      ]
    }
    const securityNoticeStrong = {
      en: 'Security Notice:',
      th: 'ประกาศด้านความปลอดภัย:'
    }
    const securityBody = {
      en: 'Never share your verification code with anyone. Q-DRAGON staff will never ask for your verification code via phone or email.',
      th: 'ห้ามเปิดเผยโค้ดยืนยันแก่ผู้อื่น ทีมงาน Q-DRAGON จะไม่สอบถามโค้ดยืนยันผ่านโทรศัพท์หรืออีเมล'
    }
    const footerLine = {
      en: 'This email was sent to',
      th: 'อีเมลนี้ถูกส่งไปยัง'
    }
    const ignoreLine = {
      en: "If you didn't request this, please ignore this email.",
      th: 'หากคุณไม่ได้ร้องขอให้เพิกเฉยอีเมลนี้'
    }

    const listItemsHtml = nextItems[lang]
      .map((li) => `<li>${li}</li>`)
      .join('')

    const emailData = {
      from: `Q-DRAGON Trading Platform <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: subjects[lang],
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subjects[lang]}</title>
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
              <h2 style="color: #333; margin-bottom: 20px;">${welcomeHeadline[lang]}</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">${introParagraph[lang]}</p>
              
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                <h3 style="color: #92400e; margin: 0 0 15px 0;">${codeLabel[lang]}</h3>
                <div style="font-size: 32px; font-weight: bold; color: #92400e; letter-spacing: 3px; font-family: monospace;">
                  ${verificationToken}
                </div>
                <p style="color: #92400e; margin: 15px 0 0 0; font-size: 14px;">${expiresText[lang]}</p>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
                ${lang === 'en'
                  ? `Enter this verification code on the verification page to activate your trading account. If you didn't create an account with Q-DRAGON, please ignore this email.`
                  : 'นำโค้ดยืนยันนี้ไปกรอกในหน้าการยืนยันเพื่อเปิดใช้งานบัญชี หากคุณไม่ได้สมัครสมาชิก โปรดเพิกเฉยอีเมลนี้'}
              </p>
              
              <!-- Features -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0;">${nextTitle[lang]}</h3>
                <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">${listItemsHtml}</ul>
              </div>
              
              <!-- Security Note -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #991b1b; margin: 0; font-size: 14px;">
                  <strong>${securityNoticeStrong[lang]}</strong> ${securityBody[lang]}
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
                ${footerLine[lang]} ${email}. ${ignoreLine[lang]}.
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
  resetToken,
  language = 'en'
) => {
  try {
    console.log('Attempting to send password reset email to:', email)
    
    // Validate configuration
    validateEmailConfig()

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

    const lang = ['en', 'th'].includes(language) ? language : 'en'
    const subjects = {
      en: 'Reset Your Q-DRAGON Password',
      th: 'รีเซ็ตรหัสผ่าน Q-DRAGON ของคุณ'
    }
    const headline = { en: 'Password Reset Request', th: 'คำขอรีเซ็ตรหัสผ่าน' }
    const greeting = {
      en: `Hello ${username},`,
      th: `สวัสดี ${username}`
    }
    const intro = {
      en: 'We received a request to reset your password for your Q-DRAGON trading account. If you made this request, click the button below to reset your password.',
      th: 'เราพบคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี Q-DRAGON ของคุณ หากเป็นคุณที่ทำ กรุณาคลิกปุ่มด้านล่างเพื่อรีเซ็ต'
    }
    const buttonText = { en: 'Reset Password', th: 'รีเซ็ตรหัสผ่าน' }
    const orCopy = {
      en: 'Or copy and paste this link into your browser:',
      th: 'หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:'
    }
    const securityInfoTitle = { en: 'Security Information', th: 'ข้อมูลความปลอดภัย' }
    const securityList = {
      en: [
        'This password reset link expires in 1 hour',
        "If you didn't request this reset, please ignore this email",
        'Never share your password reset link with anyone',
        'Contact support if you have concerns about your account security'
      ],
      th: [
        'ลิงก์รีเซ็ตรหัสผ่านหมดอายุภายใน 1 ชั่วโมง',
        'หากไม่ได้เป็นผู้ร้องขอให้เพิกเฉยอีเมลนี้',
        'อย่าแชร์ลิงก์รีเซ็ตรหัสผ่านให้ใคร',
        'ติดต่อฝ่ายสนับสนุนหากกังวลเกี่ยวกับความปลอดภัยบัญชี'
      ]
    }
    const footerNotice = {
      en: 'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.',
      th: 'หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่าน สามารถเพิกเฉยอีเมลนี้ได้ รหัสผ่านของคุณจะยังไม่ถูกเปลี่ยน'
    }
    const footerLine = {
      en: 'This email was sent to',
      th: 'อีเมลนี้ถูกส่งไปยัง'
    }
    const ignoreLine = {
      en: "If you didn't request this, please ignore this email.",
      th: 'หากคุณไม่ได้ร้องขอให้เพิกเฉยอีเมลนี้'
    }
    const securityListHtml = securityList[lang]
      .map((li) => `<li>${li}</li>`)
      .join('')

    const emailData = {
      from: `Q-DRAGON Trading Platform <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: subjects[lang],
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subjects[lang]}</title>
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
              <h2 style="color: #333; margin-bottom: 20px;">${headline[lang]}</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">${greeting[lang]}<br><br>${intro[lang]}</p>
              
              <!-- Reset Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">${buttonText[lang]}</a>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">${orCopy[lang]}</p>
              
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 20px 0; word-break: break-all;">
                <a href="${resetUrl}" style="color: #f59e0b; text-decoration: none;">${resetUrl}</a>
              </div>
              
              <!-- Security Info -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 30px 0;">
                <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">${securityInfoTitle[lang]}</h3>
                <ul style="color: #991b1b; margin: 0; padding-left: 20px; font-size: 14px;">${securityListHtml}</ul>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 30px; font-size: 14px;">${footerNotice[lang]}</p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 30px 20px; border-top: 1px solid #e5e7eb; margin-top: 40px;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                © 2025 Q-DRAGON Trading Platform<br>
                Professional • Secure • Reliable
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                ${footerLine[lang]} ${email}. ${ignoreLine[lang]}.
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
