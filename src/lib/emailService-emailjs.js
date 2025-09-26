// Alternative email service using fetch (no external dependencies)
// This version uses EmailJS service as an alternative to Nodemailer

// EmailJS configuration
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY

// Validate configuration
const validateEmailConfig = () => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
    throw new Error(
      'EmailJS configuration missing: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, and EMAILJS_PRIVATE_KEY must be set'
    )
  }
}

// Send verification email using EmailJS
export const sendVerificationEmail = async (
  email,
  username,
  verificationToken
) => {
  try {
    console.log('Attempting to send verification email to:', email)
    console.log('EmailJS Service ID configured:', EMAILJS_SERVICE_ID ? 'Yes' : 'No')

    // Validate configuration
    validateEmailConfig()

    const emailData = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: email,
        to_name: username,
        verification_code: verificationToken,
        from_name: 'Q-DRAGON Trading Platform',
        subject: 'Verify Your Q-DRAGON Trading Account'
      }
    }

    console.log('Sending email with EmailJS:', {
      service_id: emailData.service_id,
      template_id: emailData.template_id,
      to_email: email
    })

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('EmailJS API error:', response.status, errorText)
      throw new Error(`Failed to send email: ${response.status} ${errorText}`)
    }

    const result = await response.text()
    console.log('Verification email sent successfully:', result)

    return { success: true, messageId: result }
  } catch (error) {
    console.error('Error sending verification email:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    })
    return { success: false, error: error.message }
  }
}