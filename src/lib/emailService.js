import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Validate configuration
const validateEmailConfig = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Email configuration missing: RESEND_API_KEY must be set')
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
    console.log(
      'Resend API Key configured:',
      process.env.RESEND_API_KEY ? 'Yes' : 'No'
    )
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

    const listItemsHtml = nextItems[lang].map((li) => `<li>${li}</li>`).join('')

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
                ${
                  lang === 'en'
                    ? `Enter this verification code on the verification page to activate your trading account. If you didn't create an account with Q-DRAGON, please ignore this email.`
                    : 'นำโค้ดยืนยันนี้ไปกรอกในหน้าการยืนยันเพื่อเปิดใช้งานบัญชี หากคุณไม่ได้สมัครสมาชิก โปรดเพิกเฉยอีเมลนี้'
                }
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
    const securityInfoTitle = {
      en: 'Security Information',
      th: 'ข้อมูลความปลอดภัย'
    }
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

// Send purchase confirmation (initial purchase created - pending payment or activated)
export const sendPurchaseConfirmationEmail = async (
  email,
  username,
  {
    licenseCode,
    planDays,
    price,
    status = 'pending_payment',
    currency = 'USD',
    language = 'en'
  }
) => {
  try {
    validateEmailConfig()

    const lang = ['en', 'th'].includes(language) ? language : 'en'
    const subjects = {
      en: `Your Q-DRAGON License Purchase (${licenseCode})`,
      th: `การสั่งซื้อใบอนุญาต Q-DRAGON ของคุณ (${licenseCode})`
    }
    const statusLabelMap = {
      pending_payment: { en: 'Pending Payment', th: 'รอการชำระเงิน' },
      paid: { en: 'Paid', th: 'ชำระแล้ว' },
      activated: { en: 'Activated', th: 'เปิดใช้งานแล้ว' }
    }
    const statusLabel = statusLabelMap[status]?.[lang] || status
    const intro = {
      en: `Hi ${username}, your license purchase has been created successfully.`,
      th: `สวัสดี ${username}, การสั่งซื้อใบอนุญาตของคุณถูกสร้างเรียบร้อยแล้ว`
    }
    const nextSteps = {
      en:
        status === 'pending_payment'
          ? 'Please complete the payment to activate your license.'
          : 'Your license is now active. You can start using it immediately.',
      th:
        status === 'pending_payment'
          ? 'กรุณาชำระเงินเพื่อเปิดใช้งานใบอนุญาตของคุณ.'
          : 'ใบอนุญาตของคุณใช้งานได้แล้ว สามารถเริ่มใช้งานได้ทันที.'
    }
    const summaryLabel = { en: 'Purchase Summary', th: 'สรุปคำสั่งซื้อ' }
    const licenseLabel = { en: 'License Code', th: 'รหัสใบอนุญาต' }
    const planLabel = { en: 'Plan', th: 'แผน' }
    const priceLabel = { en: 'Price', th: 'ราคา' }
    const statusLabelText = { en: 'Status', th: 'สถานะ' }

    const emailData = {
      from: `Q-DRAGON Trading Platform <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: subjects[lang],
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${subjects[lang]}</title></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">\n<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;padding:24px;">\n  <h2 style="margin-top:0;color:#111827;">${subjects[lang]}</h2>\n  <p style="color:#374151;line-height:1.55;">${intro[lang]}</p>\n  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:24px 0;">\n    <h3 style="margin:0 0 12px 0;color:#111827;">${summaryLabel[lang]}</h3>\n    <table style="width:100%;border-collapse:collapse;">\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#374151;">${licenseLabel[lang]}</td><td style="padding:6px 4px;font-family:monospace;color:#1d4ed8;font-weight:600;">${licenseCode}</td></tr>\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#374151;">${planLabel[lang]}</td><td style="padding:6px 4px;color:#374151;">${planDays} days</td></tr>\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#374151;">${priceLabel[lang]}</td><td style="padding:6px 4px;color:#374151;">${price} ${currency}</td></tr>\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#374151;">${statusLabelText[lang]}</td><td style="padding:6px 4px;">\n        <span style="display:inline-block;padding:4px 10px;border-radius:16px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;">${statusLabel}</span>\n      </td></tr>\n    </table>\n  </div>\n  <p style="color:#374151;line-height:1.55;">${nextSteps[lang]}</p>\n  <p style="color:#9ca3af;font-size:12px;margin-top:40px;">© 2025 Q-DRAGON Trading Platform</p>\n</div>\n</body></html>`
    }

    const result = await resend.emails.send(emailData)
    if (result.error) throw new Error(result.error.message)
    return { success: true, messageId: result.data?.id }
  } catch (err) {
    console.error('Error sending purchase confirmation email:', err)
    return { success: false, error: err.message }
  }
}

// Send extension decision email (approved or rejected)
export const sendExtensionDecisionEmail = async (
  email,
  username,
  {
    licenseCode,
    decision, // 'approved' | 'rejected'
    addedDays,
    newExpiry,
    rejectionReason,
    language = 'en'
  }
) => {
  try {
    validateEmailConfig()
    const lang = ['en', 'th'].includes(language) ? language : 'en'
    const isApproved = decision === 'approved'
    const subjects = {
      en: isApproved
        ? `Extension Approved: ${licenseCode}`
        : `Extension Rejected: ${licenseCode}`,
      th: isApproved
        ? `อนุมัติการขยายวัน: ${licenseCode}`
        : `ปฏิเสธการขยายวัน: ${licenseCode}`
    }
    const greeting = {
      en: `Hello ${username},`,
      th: `สวัสดี ${username},`
    }
    const bodyApproved = {
      en: `Your extension request has been approved. ${addedDays} extra days have been added to your license.`,
      th: `คำขอขยายวันของคุณได้รับการอนุมัติ เพิ่มวันใช้งานจำนวน ${addedDays} วันแล้ว`
    }
    const bodyRejected = {
      en: `Unfortunately, your extension request was rejected.`,
      th: `ขออภัย คำขอขยายวันของคุณถูกปฏิเสธ`
    }
    const newExpiryLabel = { en: 'New Expiry', th: 'วันหมดอายุใหม่' }
    const addedDaysLabel = { en: 'Days Added', th: 'จำนวนวันที่เพิ่ม' }
    const reasonLabel = { en: 'Reason', th: 'เหตุผล' }
    const licenseLabel = { en: 'License Code', th: 'รหัสใบอนุญาต' }
    const summaryLabel = { en: 'Extension Summary', th: 'สรุปการขยายวัน' }

    const decisionBadge = isApproved
      ? `<span style="display:inline-block;padding:4px 10px;border-radius:16px;background:#dcfce7;color:#166534;font-size:12px;font-weight:600;">${lang === 'en' ? 'Approved' : 'อนุมัติ'}</span>`
      : `<span style="display:inline-block;padding:4px 10px;border-radius:16px;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:600;">${lang === 'en' ? 'Rejected' : 'ปฏิเสธ'}</span>`

    const extraRows = isApproved
      ? `<tr><td style="padding:6px 4px;font-weight:bold;color:#374151;">${addedDaysLabel[lang]}</td><td style="padding:6px 4px;color:#374151;">${addedDays}</td></tr><tr><td style="padding:6px 4px;font-weight:bold;color:#374151;">${newExpiryLabel[lang]}</td><td style="padding:6px 4px;color:#374151;">${newExpiry}</td></tr>`
      : `<tr><td style="padding:6px 4px;font-weight:bold;color:#374151;">${reasonLabel[lang]}</td><td style="padding:6px 4px;color:#b91c1c;">${rejectionReason || '-'}</td></tr>`

    const mainLine = isApproved ? bodyApproved[lang] : bodyRejected[lang]

    const emailData = {
      from: `Q-DRAGON Trading Platform <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: subjects[lang],
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${subjects[lang]}</title></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">\n<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;padding:24px;">\n  <h2 style="margin-top:0;color:#111827;">${subjects[lang]}</h2>\n  <p style="color:#374151;line-height:1.55;">${greeting[lang]}<br/><br/>${mainLine}</p>\n  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:24px 0;">\n    <h3 style="margin:0 0 12px 0;color:#111827;">${summaryLabel[lang]} ${decisionBadge}</h3>\n    <table style="width:100%;border-collapse:collapse;">\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#374151;">${licenseLabel[lang]}</td><td style="padding:6px 4px;font-family:monospace;color:#1d4ed8;font-weight:600;">${licenseCode}</td></tr>\n      ${extraRows}\n    </table>\n  </div>\n  <p style="color:#9ca3af;font-size:12px;margin-top:40px;">© 2025 Q-DRAGON Trading Platform</p>\n</div>\n</body></html>`
    }
    const result = await resend.emails.send(emailData)
    if (result.error) throw new Error(result.error.message)
    return { success: true, messageId: result.data?.id }
  } catch (err) {
    console.error('Error sending extension decision email:', err)
    return { success: false, error: err.message }
  }
}

// Send activation email when admin activates a license
export const sendLicenseActivatedEmail = async (
  email,
  username,
  {
    licenseCode,
    planDays,
    expireDateThai, // Thai formatted date
    language = 'en'
  }
) => {
  try {
    validateEmailConfig()
    const lang = ['en', 'th'].includes(language) ? language : 'en'
    const subjects = {
      en: `License Activated: ${licenseCode}`,
      th: `เปิดใช้งานใบอนุญาตแล้ว: ${licenseCode}`
    }
    const greeting = { en: `Hello ${username},`, th: `สวัสดี ${username},` }
    const body = {
      en: `Your license has been activated and is now ready for use. The current plan includes ${planDays} days of access.`,
      th: `ใบอนุญาตของคุณถูกเปิดใช้งานแล้วและพร้อมใช้งาน แผนปัจจุบันมีระยะเวลา ${planDays} วัน.`
    }
    const expiryLine = {
      en: `Expiry (Thai calendar): ${expireDateThai}`,
      th: `วันหมดอายุ (ปฏิทินไทย): ${expireDateThai}`
    }
    const summaryLabel = { en: 'Activation Summary', th: 'สรุปการเปิดใช้งาน' }
    const licenseLabel = { en: 'License Code', th: 'รหัสใบอนุญาต' }
    const planLabel = { en: 'Plan (days)', th: 'แผน (วัน)' }
    const expiryLabel = { en: 'Expire Date (TH)', th: 'วันหมดอายุ (ไทย)' }

    const emailData = {
      from: `Q-DRAGON Trading Platform <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: subjects[lang],
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${subjects[lang]}</title></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">\n<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;padding:24px;">\n  <h2 style="margin-top:0;color:#15803d;">${subjects[lang]}</h2>\n  <p style="color:#374151;line-height:1.55;">${greeting[lang]}<br/><br/>${body[lang]}<br/>${expiryLine[lang]}</p>\n  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:24px 0;">\n    <h3 style="margin:0 0 12px 0;color:#166534;">${summaryLabel[lang]}</h3>\n    <table style="width:100%;border-collapse:collapse;">\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#166534;">${licenseLabel[lang]}</td><td style="padding:6px 4px;font-family:monospace;color:#065f46;font-weight:600;">${licenseCode}</td></tr>\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#166534;">${planLabel[lang]}</td><td style="padding:6px 4px;color:#065f46;">${planDays}</td></tr>\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#166534;">${expiryLabel[lang]}</td><td style="padding:6px 4px;color:#065f46;">${expireDateThai}</td></tr>\n    </table>\n  </div>\n  <p style="color:#9ca3af;font-size:12px;margin-top:40px;">© 2025 Q-DRAGON Trading Platform</p>\n</div>\n</body></html>`
    }
    const result = await resend.emails.send(emailData)
    if (result.error) throw new Error(result.error.message)
    return { success: true, messageId: result.data?.id }
  } catch (err) {
    console.error('Error sending activation email:', err)
    return { success: false, error: err.message }
  }
}

// Send email when admin manually extends a customer license (not via user request flow)
export const sendAdminExtensionEmail = async (
  email,
  username,
  {
    licenseCode,
    addedDays,
    oldExpiry, // Thai formatted before extension
    newExpiry, // Thai formatted after extension
    language = 'en'
  }
) => {
  try {
    validateEmailConfig()
    const lang = ['en', 'th'].includes(language) ? language : 'en'
    const subjects = {
      en: `License Extended: ${licenseCode}`,
      th: `ขยายวันใบอนุญาตแล้ว: ${licenseCode}`
    }
    const greeting = { en: `Hello ${username},`, th: `สวัสดี ${username},` }
    const body = {
      en: `Your license has been extended by ${addedDays} days by an administrator.`,
      th: `ใบอนุญาตของคุณถูกขยายเพิ่ม ${addedDays} วันโดยผู้ดูแลระบบ.`
    }
    const summaryLabel = { en: 'Extension Summary', th: 'สรุปการขยายวัน' }
    const licenseLabel = { en: 'License Code', th: 'รหัสใบอนุญาต' }
    const addedDaysLabel = { en: 'Days Added', th: 'จำนวนวันที่เพิ่ม' }
    const oldExpiryLabel = { en: 'Previous Expiry', th: 'วันหมดอายุก่อนหน้า' }
    const newExpiryLabel = { en: 'New Expiry', th: 'วันหมดอายุใหม่' }

    const emailData = {
      from: `Q-DRAGON Trading Platform <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: subjects[lang],
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${subjects[lang]}</title></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">\n<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;padding:24px;">\n  <h2 style="margin-top:0;color:#1d4ed8;">${subjects[lang]}</h2>\n  <p style="color:#374151;line-height:1.55;">${greeting[lang]}<br/><br/>${body[lang]}</p>\n  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:24px 0;">\n    <h3 style="margin:0 0 12px 0;color:#0c4a6e;">${summaryLabel[lang]}</h3>\n    <table style="width:100%;border-collapse:collapse;">\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#0c4a6e;">${licenseLabel[lang]}</td><td style="padding:6px 4px;font-family:monospace;color:#0369a1;font-weight:600;">${licenseCode}</td></tr>\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#0c4a6e;">${addedDaysLabel[lang]}</td><td style="padding:6px 4px;color:#0369a1;">${addedDays}</td></tr>\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#0c4a6e;">${oldExpiryLabel[lang]}</td><td style="padding:6px 4px;color:#0369a1;">${oldExpiry || '-'}</td></tr>\n      <tr><td style="padding:6px 4px;font-weight:bold;color:#0c4a6e;">${newExpiryLabel[lang]}</td><td style="padding:6px 4px;color:#0369a1;">${newExpiry}</td></tr>\n    </table>\n  </div>\n  <p style="color:#9ca3af;font-size:12px;margin-top:40px;">© 2025 Q-DRAGON Trading Platform</p>\n</div>\n</body></html>`
    }
    const result = await resend.emails.send(emailData)
    if (result.error) throw new Error(result.error.message)
    return { success: true, messageId: result.data?.id }
  } catch (err) {
    console.error('Error sending admin extension email:', err)
    return { success: false, error: err.message }
  }
}

// Send top-up approval email notification
export const sendTopUpApprovalEmail = async (
  email,
  username,
  {
    amount,
    credits,
    newBalance,
    language = 'en'
  }
) => {
  try {
    validateEmailConfig()
    const lang = ['en', 'th'].includes(language) ? language : 'en'
    const subjects = {
      en: 'Top-Up Approved - Credits Added',
      th: 'เติมเครดิตสำเร็จ - เครดิตถูกเพิ่มแล้ว'
    }
    const greeting = { en: `Hello ${username},`, th: `สวัสดี ${username},` }
    const body = {
      en: `Great news! Your top-up request has been approved by our admin team. Your credits have been added to your account.`,
      th: `ข่าวดี! คำขอเติมเครดิตของคุณได้รับการอนุมัติจากทีมผู้ดูแลระบบแล้ว เครดิตถูกเพิ่มเข้าบัญชีของคุณเรียบร้อยแล้ว`
    }
    const summaryLabel = { en: 'Top-Up Summary', th: 'สรุปการเติมเครดิต' }
    const amountLabel = { en: 'Amount Paid', th: 'จำนวนเงินที่ชำระ' }
    const creditsLabel = { en: 'Credits Added', th: 'เครดิตที่เพิ่ม' }
    const newBalanceLabel = { en: 'New Balance', th: 'ยอดเครดิตใหม่' }
    const nextStepsTitle = { en: "What's Next?", th: 'ขั้นตอนถัดไป' }
    const nextSteps = {
      en: [
        'Use credits to purchase new licenses',
        'Extend existing licenses',
        'Change your account number (if needed)',
        'Access all premium features'
      ],
      th: [
        'ใช้เครดิตซื้อใบอนุญาตใหม่',
        'ขยายระยะเวลาใบอนุญาตที่มีอยู่',
        'เปลี่ยนหมายเลขบัญชี (ถ้าต้องการ)',
        'เข้าถึงฟีเจอร์พรีเมียมทั้งหมด'
      ]
    }
    const footerNote = {
      en: 'Your credits are now active and ready to use. Log in to your account to start using them.',
      th: 'เครดิตของคุณพร้อมใช้งานแล้ว เข้าสู่ระบบเพื่อเริ่มใช้งาน'
    }

    const nextStepsHtml = nextSteps[lang]
      .map((step) => `<li style="margin-bottom:8px;color:#374151;">${step}</li>`)
      .join('')

    const emailData = {
      from: `Q-DRAGON Trading Platform <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: subjects[lang],
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjects[lang]}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">
    <!-- Header -->
    <div style="text-align: center; padding: 30px 0; background: linear-gradient(135deg, #10b981, #059669); border-radius: 10px; margin-bottom: 30px;">
      <div style="display: inline-block; width: 60px; height: 60px; background-color: white; border-radius: 50%; line-height: 60px; font-size: 24px; font-weight: bold; color: #059669; margin-bottom: 10px;">
        ✓
      </div>
      <h1 style="color: white; margin: 0; font-size: 28px;">Q-DRAGON</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Gold Trading Platform</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 0 20px;">
      <h2 style="color: #059669; margin-bottom: 20px;">${subjects[lang]}</h2>
      <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">${greeting[lang]}<br><br>${body[lang]}</p>
      
      <!-- Top-Up Summary -->
      <div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h3 style="color: #065f46; margin: 0 0 15px 0;">${summaryLabel[lang]}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #065f46;">${amountLabel[lang]}</td>
            <td style="padding: 8px 0; color: #065f46; text-align: right; font-size: 18px;">$${amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #065f46;">${creditsLabel[lang]}</td>
            <td style="padding: 8px 0; color: #065f46; text-align: right; font-size: 18px;">+${credits}</td>
          </tr>
          <tr style="border-top: 2px solid #10b981;">
            <td style="padding: 12px 0 0 0; font-weight: bold; color: #065f46; font-size: 18px;">${newBalanceLabel[lang]}</td>
            <td style="padding: 12px 0 0 0; color: #065f46; text-align: right; font-size: 24px; font-weight: bold;">${newBalance}</td>
          </tr>
        </table>
      </div>
      
      <!-- Next Steps -->
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h3 style="color: #065f46; margin: 0 0 15px 0;">${nextStepsTitle[lang]}</h3>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          ${nextStepsHtml}
        </ul>
      </div>
      
      <p style="color: #6b7280; line-height: 1.6; margin-bottom: 30px; font-size: 14px; text-align: center; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
        ${footerNote[lang]}
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 30px 20px; border-top: 1px solid #e5e7eb; margin-top: 40px;">
      <p style="color: #9ca3af; font-size: 14px; margin: 0;">
        © 2025 Q-DRAGON Trading Platform<br>
        Professional • Secure • Reliable
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
        ${lang === 'en' ? 'This email was sent to' : 'อีเมลนี้ถูกส่งไปยัง'} ${email}
      </p>
    </div>
  </div>
</body>
</html>`
    }

    const result = await resend.emails.send(emailData)
    if (result.error) {
      console.error('Resend API error:', result.error)
      throw new Error(`Failed to send email: ${result.error.message}`)
    }

    console.log('Top-up approval email sent successfully:', result.data?.id)
    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Error sending top-up approval email:', error)
    return { success: false, error: error.message }
  }
}
