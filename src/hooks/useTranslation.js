// Translation hook for Thai/English language support
import { useState, useEffect } from 'react'

const translations = {
  en: {
    // Navigation and General
    admin_panel: 'Admin Panel',
    dashboard: 'Dashboard',
    logout: 'Logout',
    language: 'Language',
    loading: 'Loading...',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    actions: 'Actions',
    status: 'Status',
    created_at: 'Created At',
    updated_at: 'Updated At',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    refresh: 'Refresh',
    auto_refresh: 'Auto Refresh',

    // Authentication
    admin_key: 'Admin Key',
    enter_admin_key: 'Enter Admin Key',
    login: 'Login',
    invalid_admin_key: 'Invalid admin key',

    // Tabs
    codes: 'Trading Codes',
    customers: 'Customer Accounts',
    extensions: 'Extension Requests',
    manual_account: 'Manual Account',

    // Status
    pending: 'Pending',
    activated: 'Activated',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
    active: 'Active',
    approved: 'Approved',
    rejected: 'Rejected',
  valid: 'Valid',
  suspended: 'Suspended',
  suspend_action: 'Suspend',
  reactivate_action: 'Reactivate',
  renew_action: 'Renew',
  customer_account_suspended: 'Customer account suspended',
  customer_account_reactivated: 'Customer account reactivated',
  customer_account_status_updated: 'Customer account status updated',

    // Trading Codes
    code: 'Code',
    user: 'User',
    platform: 'Platform',
    plan: 'Plan',
    account_number: 'Account Number',
    update_status: 'Update Status',
    delete_code: 'Delete Code',

    // Customer Accounts
    username: 'Username',
    license: 'License',
    account: 'Account',
    source: 'Source',
    expire_date: 'Expire Date',
    time_left: 'Time Left',
    extend_account: 'Extend Account',
    delete_account: 'Delete Account',
    days: 'days',
    hours: 'hours',
    minutes: 'minutes',
    lifetime: 'Lifetime',

    // Extension Requests
    current_expiry: 'Current Expiry',
    requested_extension: 'Requested Extension',
    requested: 'Requested',
    request_date: 'Request Date',
    requested_days: 'Requested Days',
    approve: 'Approve',
    reject: 'Reject',

    // Manual Account Creation
    generate_license_key: 'Generate License Key',
    create_trading_license:
      'Create a trading license directly for existing customers',
    trading_platform: 'Trading Platform',
    plan_duration: 'Plan Duration (Days)',
    extend_days_optional: 'Extend Days (Optional)',
    additional_days: 'Additional days (e.g., 15)',
    add_extra_days: 'Add extra days on top of the selected plan duration',
    license_generation_notice: 'License Generation Notice',
    unique_license_generated:
      'A unique license key will be generated automatically',
    immediately_activated:
      'License will be immediately activated with the selected plan',
    expiry_calculated:
      'Expiry date will be calculated from today + plan duration + extend days (if specified)',
    no_user_account: 'No user account creation required - license only',
    direct_trading_access:
      'Customer can use the license key directly for trading access',
    extend_days_note:
      'Extend Days: Optionally add extra days on top of the selected plan',
    generating_license: 'Generating License...',
    generate_license: 'Generate License',
    create_manual_account: 'Create Manual Account',
    enter_username: 'Enter username',
    enter_account_number: 'Enter account number',
    select_platform: 'Select platform',
    select_plan: 'Select plan',
    create_account: 'Create Account',

    // Notifications
    websocket_connected: 'WebSocket connected - Live updates',
    websocket_disconnected: 'WebSocket disconnected',
    new_trading_code: 'New trading code request',
    new_extension_request: 'New extension request',
    code_updated: 'Code status updated successfully',
    account_extended: 'Account extended successfully',
    account_created: 'Account created successfully',
    account_deleted: 'Account deleted successfully',

    // Confirmations
    delete_confirmation: 'Delete Confirmation',
    delete_code_confirm: 'Are you sure you want to delete this trading code?',
    delete_account_confirm:
      'Are you sure you want to delete this customer account?',
    type_delete_confirm: 'Type "DELETE" to confirm',

    // Table headers and filters
    search_placeholder: 'Search...',
    filter_by_status: 'Filter by status',
    no_data: 'No data available',
    // User Auth / General (Customer Side)
    login_title: 'Sign In to Your Account',
    platform_tagline: 'Gold Trading Platform',
    sub_tagline: 'XAU/USD Professional Trading',
    username_label: 'Username',
    password_label: 'Password',
    username_placeholder: 'Enter your username',
    password_placeholder: 'Enter your password',
    signing_in: 'Signing In...',
    sign_in_cta: 'Sign In to Trade',
    new_to_platform: 'New to Q-Dragon?',
    create_new_account: 'Create New Account',
    forgot_password: 'Forgot Password?',
    checking_auth: 'Checking authentication...',
    auth_check_title: 'Checking Session',
    auth_check_description: 'Verifying your session securely...',
  auth_check_slow_title: 'Still Checking...',
  auth_check_slow_message: 'This is taking longer than expected. You can wait, retry, or skip and log in manually.',
  auth_check_retry: 'Retry',
  auth_check_skip: 'Skip for now',
    secure_reliable: 'Secure • Professional • Reliable',
    copyright: '© 2025 Q-Dragon Trading Platform',
    login_failed: 'Username or password incorrect',
    network_error: 'Network error. Please try again.',
    register_title: 'Create Your Trading Account',
    email_label: 'Email',
    email_placeholder: 'Enter your email address',
    confirm_password_label: 'Confirm Password',
    passwords_do_not_match: 'Passwords do not match',
    password_too_short: 'Password must be at least 6 characters',
    username_too_short: 'Username must be at least 3 characters',
    registering: 'Registering...',
    register_cta: 'Create Account',
    already_have_account: 'Already have an account?',
    go_to_login: 'Go to Login',
    forgot_password_title: 'Reset Your Password',
    send_reset_link: 'Send Reset Link',
    sending_reset_link: 'Sending Reset Link...',
    back_to_login: 'Back to Login',
    no_account_register: 'No account found. Create one?',
    email_verification_required: 'Please verify your email first.',
    reset_email_sent: 'Password reset email sent successfully',
    check_your_email: 'Check Your Email',
    reset_next_steps_title: 'Next Steps:',
    if_account_exists_reset_link_sent:
      'If an account with that email exists, we have sent a password reset link.',
    reset_step_1: '1. Check your email inbox',
    reset_step_2: '2. Click the password reset link',
    reset_step_3: '3. Create a new password',
    reset_step_4: '4. Log in with your new password',
    enter_email_associated:
      'Enter the email address associated with your Q-DRAGON account',
    no_account_found_with_email: 'No account found with this email address.',
    failed_send_reset_email: 'Failed to send password reset email',
    secure_password_reset_tagline:
      'Secure Password Reset • Q-DRAGON Trading Platform',
    purchase_trading_license: 'Purchase Trading License',
    purchase_subtitle: 'Unlock professional trading capabilities instantly',
    trading_account_number: 'Trading Account Number',
    trading_platform_label: 'Trading Platform',
    subscription_plan: 'Subscription Plan',
    purchase_license_now: 'Purchase License Now',
    purchasing_license: 'Purchasing License...',
    instant_activation: 'Instant activation',
    license_created_success: 'License Successfully Created!',
    license_code: 'License Code',
    activate_within_24h: 'Activate within 24 hours',
    secure_payment_required: 'Secure payment required',
    copy_to_clipboard: 'Copy to clipboard',
    extend_trading_license: 'Extend Trading License',
    extension_plan: 'Extension Plan *',
    submit_extension_request: 'Submit Extension Request',
    extension_request_submitted: 'Extension request submitted successfully!',
    please_select_extension_plan: 'Please select an extension plan',
    license_purchase_success: 'License purchased successfully',
    account_number_required: 'Please enter your trading account number',
    // Email Verification
    verify_your_email: 'Verify Your Email',
    email_verification_required_notice:
      'Email verification required to access your account',
    must_verify_before_login: '⚠️ You must verify your email before logging in',
    complete_account_setup: 'Complete your account setup',
    check_email_for_code: 'Check your email for the verification code',
    email_address: 'Email Address',
    verification_code: 'Verification Code',
    enter_verification_code: 'Enter verification code',
    check_inbox_and_spam: 'Check your email inbox and spam folder',
    verifying: 'Verifying...',
    verify_email_cta: 'Verify Email',
    didnt_receive_code: "Didn't receive the code?",
    resend_verification_email: 'Resend Verification Email',
    back_to_login_arrow: '← Back to Login',
    verification_link_expires: 'Verification link expires in 24 hours',
    verification_success_login:
      'Email verified successfully! You can now log in.',
    verification_success_redirect:
      'Email verified successfully! Redirecting to login...',
    resend_verification_success:
      'Verification email sent! Please check your inbox.',
    resend_verification_failed: 'Failed to resend verification',
    no_email_provided: 'No email address provided. Please register again.',
    verification_failed: 'Verification failed',
    // Dashboard / Landing (Customer)
    welcome: 'Welcome',
    welcome_dashboard_heading: 'Welcome to Your Q-DRAGON Dashboard',
    dashboard_subtitle:
      'Professional XAU/USD Trading Platform - Purchase your trading licenses below.',
    live_trading: 'Live Trading',
    premium: 'Premium',
    enter_account_number_placeholder: 'Enter your account number',
    license_ready_for_payment_activation:
      'Your trading license is ready for payment activation',
    active_licenses: 'Active Licenses',
    pending_payment: 'Pending Payment',
    expired_cancelled: 'Expired/Cancelled',
    expiring_soon: 'Expiring Soon',
    no_licenses_yet: 'No trading licenses purchased yet',
    purchase_first_license_hint:
      'Purchase your first trading license above to get started',
    license_header: 'License',
    my_trading_licenses: 'My Trading Licenses',
    platform_header: 'Platform',
    account_header: 'Account',
    plan_header: 'Plan',
    status_header: 'Status',
    expires_header: 'Expires',
    time_left_header: 'Time Left',
    actions_header: 'Actions',
  total_codes: 'Total Codes',
  paid: 'Paid',
  confirm_payment: 'Confirm Payment',
  activate_action: 'Activate',
  cancel_action: 'Cancel',
    pay_to_activate: 'Pay to activate',
    pay_to_see_countdown: 'Pay to see countdown',
    extend: 'Extend',
    extend_now: 'Extend Now',
    licenses_expiring_soon: 'Licenses Expiring Soon',
    code_label: 'Code:',
    current_plan_label: 'Current Plan:',
    extension_plan_helper:
      'Select extension plan to add to your current trading license validity',
    admin_approval_required: 'Admin Approval Required',
    extension_bullet_admin_verification:
      'Extension request requires admin verification',
    extension_bullet_request_submitted:
      'Request will be submitted for admin approval',
    extension_bullet_effect_after_approval:
      'Extension takes effect only after admin approval',
    extension_bullet_receive_notification:
      'You will receive notification once processed',
    extension_bullet_same_license_key:
      'Extended codes maintain the same license key',
    extending: 'Extending...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    information: 'Information',
    ok: 'OK',
    license_list_updated: 'License list updated',
    license_updated_broadcast: 'License updated (broadcast)'
    ,
    account_creation_agreement: 'By creating an account, you agree to our Terms of Service',
    email_verification_required_secure: 'Email verification required • Secure Trading Platform'
  },

  th: {
    // Navigation and General
    admin_panel: 'แผงควบคุมผู้ดูแลระบบ',
    dashboard: 'แดชบอร์ด',
    logout: 'ออกจากระบบ',
    language: 'ภาษา',
    loading: 'กำลังโหลด...',
    search: 'ค้นหา',
    filter: 'กรอง',
    all: 'ทั้งหมด',
    actions: 'การกระทำ',
    status: 'สถานะ',
    created_at: 'วันที่สร้าง',
    updated_at: 'วันที่อัปเดต',
    confirm: 'ยืนยัน',
    cancel: 'ยกเลิก',
    save: 'บันทึก',
    delete: 'ลบ',
    edit: 'แก้ไข',
    view: 'ดู',
    refresh: 'รีเฟรช',
    auto_refresh: 'รีเฟรชอัตโนมัติ',

    // Authentication
    admin_key: 'รหัสผู้ดูแลระบบ',
    enter_admin_key: 'กรอกรหัสผู้ดูแลระบบ',
    login: 'เข้าสู่ระบบ',
    invalid_admin_key: 'รหัสผู้ดูแลระบบไม่ถูกต้อง',

    // Tabs
    codes: 'รหัสเทรดดิ้ง',
    customers: 'บัญชีลูกค้า',
    extensions: 'คำขอขยายเวลา',
    manual_account: 'สร้างบัญชีด้วยตนเอง',

    // Status
    pending: 'รอดำเนินการ',
    activated: 'เปิดใช้งานแล้ว',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิกแล้ว',
    expired: 'หมดอายุแล้ว',
    active: 'ใช้งานอยู่',
    approved: 'อนุมัติแล้ว',
    rejected: 'ปฏิเสธแล้ว',
  valid: 'ใช้งานได้',
  suspended: 'ถูกระงับ',
  suspend_action: 'ระงับ',
  reactivate_action: 'เปิดใช้งานอีกครั้ง',
  renew_action: 'ต่ออายุ',
  customer_account_suspended: 'ระงับบัญชีลูกค้าแล้ว',
  customer_account_reactivated: 'เปิดใช้งานบัญชีลูกค้าอีกครั้งแล้ว',
  customer_account_status_updated: 'อัปเดตสถานะบัญชีลูกค้าแล้ว',

    // Trading Codes
    code: 'รหัส',
    user: 'ผู้ใช้',
    platform: 'แพลตฟอร์ม',
    plan: 'แผน',
    account_number: 'หมายเลขบัญชี',
    update_status: 'อัปเดตสถานะ',
    delete_code: 'ลบรหัส',

    // Customer Accounts
    username: 'ชื่อผู้ใช้',
    license: 'ใบอนุญาต',
    account: 'บัญชี',
    source: 'แหล่งที่มา',
    expire_date: 'วันหมดอายุ',
    time_left: 'เวลาที่เหลือ',
    extend_account: 'ขยายบัญชี',
    delete_account: 'ลบบัญชี',
    days: 'วัน',
    hours: 'ชั่วโมง',
    minutes: 'นาที',
    lifetime: 'ตลอดชีพ',

    // Extension Requests
    current_expiry: 'หมดอายุปัจจุบัน',
    requested_extension: 'ขยายเวลาที่ขอ',
    requested: 'วันที่ขอ',
    request_date: 'วันที่ขอ',
    requested_days: 'วันที่ขอ',
    approve: 'อนุมัติ',
    reject: 'ปฏิเสธ',

    // Manual Account Creation
    generate_license_key: 'สร้างคีย์ใบอนุญาต',
    create_trading_license: 'สร้างใบอนุญาตเทรดดิ้งโดยตรงสำหรับลูกค้าที่มีอยู่',
    username: 'ชื่อผู้ใช้',
    account_number: 'หมายเลขบัญชี',
    trading_platform: 'แพลตฟอร์มเทรดดิ้ง',
    plan_duration: 'ระยะเวลาแผน (วัน)',
    extend_days_optional: 'ขยายวัน (ทางเลือก)',
    additional_days: 'วันเพิ่มเติม (เช่น 15)',
    add_extra_days: 'เพิ่มวันพิเศษเหนือระยะเวลาแผนที่เลือก',
    license_generation_notice: 'ประกาศการสร้างใบอนุญาต',
    unique_license_generated:
      'คีย์ใบอนุญาตที่ไม่ซ้ำกันจะถูกสร้างขึ้นโดยอัตโนมัติ',
    immediately_activated: 'ใบอนุญาตจะถูกเปิดใช้งานทันทีด้วยแผนที่เลือก',
    expiry_calculated:
      'วันหมดอายุจะคำนวณจากวันนี้ + ระยะเวลาแผน + วันขยาย (หากระบุ)',
    no_user_account: 'ไม่จำเป็นต้องสร้างบัญชีผู้ใช้ - เฉพาะใบอนุญาต',
    direct_trading_access:
      'ลูกค้าสามารถใช้คีย์ใบอนุญาตโดยตรงสำหรับการเข้าถึงการเทรด',
    extend_days_note: 'ขยายวัน: เลือกเพิ่มวันพิเศษเหนือแผนที่เลือก',
    generating_license: 'กำลังสร้างใบอนุญาต...',
    generate_license: 'สร้างใบอนุญาต',
    create_manual_account: 'สร้างบัญชีด้วยตนเอง',
    enter_username: 'กรอกชื่อผู้ใช้',
    enter_account_number: 'กรอกหมายเลขบัญชี',
    select_platform: 'เลือกแพลตฟอร์ม',
    select_plan: 'เลือกแผน',
    create_account: 'สร้างบัญชี',

    // Notifications
    websocket_connected: 'WebSocket เชื่อมต่อแล้ว - อัปเดตแบบเรียลไทม์',
    websocket_disconnected: 'WebSocket ขาดการเชื่อมต่อ',
    new_trading_code: 'คำขอรหัสเทรดดิ้งใหม่',
    new_extension_request: 'คำขอขยายเวลาใหม่',
    code_updated: 'อัปเดตสถานะรหัสเรียบร้อยแล้ว',
    account_extended: 'ขยายบัญชีเรียบร้อยแล้ว',
    account_created: 'สร้างบัญชีเรียบร้อยแล้ว',
    account_deleted: 'ลบบัญชีเรียบร้อยแล้ว',

    // Confirmations
    delete_confirmation: 'ยืนยันการลบ',
    delete_code_confirm: 'คุณแน่ใจหรือไม่ว่าต้องการลบรหัสเทรดดิ้งนี้?',
    delete_account_confirm: 'คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีลูกค้านี้?',
    type_delete_confirm: 'พิมพ์ "DELETE" เพื่อยืนยัน',

    // Table headers and filters
    search_placeholder: 'ค้นหา...',
    filter_by_status: 'กรองตามสถานะ',
    no_data: 'ไม่มีข้อมูล',
    // User Auth / General (Customer Side)
    login_title: 'เข้าสู่บัญชีของคุณ',
    platform_tagline: 'แพลตฟอร์มเทรดทองคำ',
    sub_tagline: 'การเทรด XAU/USD ระดับมืออาชีพ',
    username_label: 'ชื่อผู้ใช้',
    password_label: 'รหัสผ่าน',
    username_placeholder: 'กรอกชื่อผู้ใช้',
    password_placeholder: 'กรอกรหัสผ่าน',
    signing_in: 'กำลังเข้าสู่ระบบ...',
    sign_in_cta: 'เข้าสู่ระบบ',
    new_to_platform: 'ยังใหม่กับ Q-Dragon?',
    create_new_account: 'สร้างบัญชีใหม่',
    forgot_password: 'ลืมรหัสผ่าน?',
    checking_auth: 'กำลังตรวจสอบการเข้าสู่ระบบ...',
    auth_check_title: 'กำลังตรวจสอบเซสชัน',
    auth_check_description: 'กำลังยืนยันเซสชันของคุณอย่างปลอดภัย...',
  auth_check_slow_title: 'ยังคงกำลังตรวจสอบ...',
  auth_check_slow_message: 'ใช้เวลานานกว่าปกติ คุณสามารถรอ ลองใหม่ หรือข้ามแล้วเข้าสู่ระบบเองได้',
  auth_check_retry: 'ลองใหม่',
  auth_check_skip: 'ข้ามก่อน',
    secure_reliable: 'ปลอดภัย • มืออาชีพ • เชื่อถือได้',
    copyright: '© 2025 แพลตฟอร์ม Q-Dragon',
    login_failed: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    network_error: 'เครือข่ายมีปัญหา โปรดลองอีกครั้ง',
    register_title: 'สร้างบัญชีเทรดของคุณ',
    email_label: 'อีเมล',
    email_placeholder: 'กรอกอีเมลของคุณ',
    confirm_password_label: 'ยืนยันรหัสผ่าน',
    passwords_do_not_match: 'รหัสผ่านไม่ตรงกัน',
    password_too_short: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
    username_too_short: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร',
    registering: 'กำลังสร้างบัญชี...',
    register_cta: 'สร้างบัญชี',
    already_have_account: 'มีบัญชีอยู่แล้ว?',
    go_to_login: 'ไปหน้าเข้าสู่ระบบ',
    forgot_password_title1: 'ลืมรหัสผ่านใช่หรือไม่?',

    forgot_password_title: 'รีเซ็ตรหัสผ่านของคุณ',
    send_reset_link: 'ส่งลิงก์รีเซ็ต',
    sending_reset_link: 'กำลังส่งลิงก์...',
    back_to_login: 'กลับสู่หน้าเข้าสู่ระบบ',
    no_account_register: 'ไม่พบบัญชี ต้องการสร้างใหม่หรือไม่?',
    email_verification_required: 'กรุณายืนยันอีเมลก่อน',
    reset_email_sent: 'ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว',
    check_your_email: 'ตรวจสอบอีเมลของคุณ',
    reset_next_steps_title: 'ขั้นตอนถัดไป:',
    if_account_exists_reset_link_sent:
      'หากมีบัญชีที่ใช้อีเมลนี้ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปแล้ว',
    reset_step_1: '1. ตรวจสอบกล่องอีเมลของคุณ',
    reset_step_2: '2. คลิกลิงก์รีเซ็ตรหัสผ่าน',
    reset_step_3: '3. สร้างรหัสผ่านใหม่',
    reset_step_4: '4. เข้าสู่ระบบด้วยรหัสผ่านใหม่',
    enter_email_associated: 'กรอกอีเมลที่ผูกกับบัญชี Q-DRAGON ของคุณ',
    no_account_found_with_email: 'ไม่พบบัญชีด้วยอีเมลนี้',
    failed_send_reset_email: 'ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้',
    secure_password_reset_tagline:
      'รีเซ็ตรหัสผ่านอย่างปลอดภัย • แพลตฟอร์ม Q-DRAGON',
    purchase_trading_license: 'ซื้อใบอนุญาตเทรด',
    purchase_subtitle: 'ปลดล็อกศักยภาพการเทรดระดับมืออาชีพทันที',
    trading_account_number: 'หมายเลขบัญชีเทรด',
    trading_platform_label: 'แพลตฟอร์มเทรด',
    subscription_plan: 'แผนการสมัคร',
    purchase_license_now: 'ซื้อใบอนุญาตตอนนี้',
    purchasing_license: 'กำลังซื้อใบอนุญาต...',
    instant_activation: 'เปิดใช้งานทันที',
    license_created_success: 'สร้างใบอนุญาตสำเร็จ!',
    license_code: 'โค้ดใบอนุญาต',
    activate_within_24h: 'เปิดใช้งานภายใน 24 ชั่วโมง',
    secure_payment_required: 'ต้องชำระเงินอย่างปลอดภัย',
    copy_to_clipboard: 'คัดลอก',
    extend_trading_license: 'ขยายใบอนุญาตเทรด',
    extension_plan: 'แผนการขยาย *',
    submit_extension_request: 'ส่งคำขอขยายเวลา',
    extension_request_submitted: 'ส่งคำขอขยายเวลาเรียบร้อย!',
    please_select_extension_plan: 'โปรดเลือกแผนการขยาย',
    license_purchase_success: 'ซื้อใบอนุญาตสำเร็จ',
    account_number_required: 'กรุณากรอกหมายเลขบัญชีเทรด',
    // Email Verification
    verify_your_email: 'ยืนยันอีเมลของคุณ',
    email_verification_required_notice:
      'ต้องยืนยันอีเมลเพื่อเข้าถึงบัญชีของคุณ',
    must_verify_before_login: '⚠️ คุณต้องยืนยันอีเมลก่อนเข้าสู่ระบบ',
    complete_account_setup: 'ทำการตั้งค่าบัญชีให้เสร็จสมบูรณ์',
    check_email_for_code: 'ตรวจสอบอีเมลของคุณเพื่อรับโค้ดยืนยัน',
    email_address: 'ที่อยู่อีเมล',
    verification_code: 'โค้ดยืนยัน',
    enter_verification_code: 'กรอกโค้ดยืนยัน',
    check_inbox_and_spam: 'ตรวจสอบกล่องจดหมายและสแปม',
    verifying: 'กำลังยืนยัน...',
    verify_email_cta: 'ยืนยันอีเมล',
    didnt_receive_code: 'ไม่ได้รับโค้ด?',
    resend_verification_email: 'ส่งอีเมลยืนยันอีกครั้ง',
    back_to_login_arrow: '← กลับสู่หน้าเข้าสู่ระบบ',
    verification_link_expires: 'ลิงก์ยืนยันจะหมดอายุใน 24 ชั่วโมง',
    verification_success_login:
      'ยืนยันอีเมลสำเร็จ! คุณสามารถเข้าสู่ระบบได้แล้ว',
    verification_success_redirect:
      'ยืนยันอีเมลสำเร็จ! กำลังนำไปยังหน้าเข้าสู่ระบบ...',
    resend_verification_success: 'ส่งอีเมลยืนยันแล้ว โปรดตรวจสอบกล่องอีเมล',
    resend_verification_failed: 'ไม่สามารถส่งอีเมลยืนยันได้',
    no_email_provided: 'ไม่มีอีเมล กรุณาสมัครใหม่อีกครั้ง',
    verification_failed: 'การยืนยันล้มเหลว',
    // Dashboard / Landing (Customer)
    welcome: 'ยินดีต้อนรับ',
    welcome_dashboard_heading: 'ยินดีต้อนรับสู่แดชบอร์ด Q-DRAGON',
    dashboard_subtitle:
      'แพลตฟอร์มการเทรด XAU/USD ระดับมืออาชีพ - ซื้อใบอนุญาตการเทรดของคุณด้านล่าง',
    live_trading: 'เทรดสด',
    premium: 'พรีเมียม',
    enter_account_number_placeholder: 'กรอกหมายเลขบัญชีของคุณ',
    license_ready_for_payment_activation:
      'ใบอนุญาตเทรดของคุณพร้อมสำหรับการชำระเงินเพื่อเปิดใช้งาน',
    active_licenses: 'ใบอนุญาตที่ใช้งาน',
    pending_payment: 'รอการชำระเงิน',
    expired_cancelled: 'หมดอายุ/ยกเลิก',
    expiring_soon: 'ใกล้หมดอายุ',
    no_licenses_yet: 'ยังไม่มีการซื้อใบอนุญาตเทรด',
    purchase_first_license_hint: 'ซื้อใบอนุญาตเทรดแรกของคุณด้านบนเพื่อเริ่มต้น',
    license_header: 'ใบอนุญาต',
    my_trading_licenses: 'ใบอนุญาตเทรดของฉัน',
    platform_header: 'แพลตฟอร์ม',
    account_header: 'บัญชี',
    plan_header: 'แผน',
    status_header: 'สถานะ',
    expires_header: 'วันหมดอายุ',
    time_left_header: 'เวลาที่เหลือ',
    actions_header: 'การกระทำ',
  total_codes: 'โค้ดทั้งหมด',
  paid: 'ชำระแล้ว',
  confirm_payment: 'ยืนยันการชำระเงิน',
  activate_action: 'เปิดใช้งาน',
  cancel_action: 'ยกเลิก',
    pay_to_activate: 'ชำระเงินเพื่อเปิดใช้งาน',
    pay_to_see_countdown: 'ชำระเงินเพื่อดูเวลานับถอยหลัง',
    extend: 'เพิ่มเวลา',
    extend_now: 'ขยายเวลาทันที',
    licenses_expiring_soon: 'ใบอนุญาตใกล้หมดอายุ',
    code_label: 'โค้ด:',
    current_plan_label: 'แผนปัจจุบัน:',
    extension_plan_helper: 'เลือกแผนการขยายเพื่อเพิ่มระยะเวลาของใบอนุญาตเทรด',
    admin_approval_required: 'ต้องได้รับการอนุมัติจากผู้ดูแลระบบ',
    extension_bullet_admin_verification:
      'คำขอขยายเวลาต้องผ่านการตรวจสอบโดยผู้ดูแลระบบ',
    extension_bullet_request_submitted: 'คำขอจะถูกส่งเพื่อรอการอนุมัติ',
    extension_bullet_effect_after_approval:
      'การขยายจะมีผลหลังจากได้รับการอนุมัติ',
    extension_bullet_receive_notification:
      'คุณจะได้รับการแจ้งเตือนเมื่อดำเนินการเสร็จ',
    extension_bullet_same_license_key: 'รหัสใบอนุญาตยังคงเดิมหลังจากขยาย',
    extending: 'กำลังขยาย...',
    error: 'ข้อผิดพลาด',
    success: 'สำเร็จ',
    warning: 'คำเตือน',
    information: 'ข้อมูล',
    ok: 'ตกลง',
    license_list_updated: 'อัปเดตรายการใบอนุญาตแล้ว',
    license_updated_broadcast: 'อัปเดตใบอนุญาต (บรอดแคสต์)'
    ,
    account_creation_agreement: 'เมื่อสร้างบัญชีแสดงว่าคุณยอมรับเงื่อนไขการให้บริการของเรา',
    email_verification_required_secure: 'ต้องยืนยันอีเมล • แพลตฟอร์มการเทรดที่ปลอดภัย'
  }
}

export function useTranslation() {
  const [language, setLanguage] = useState('th') // Default to Thai

  useEffect(() => {
    // Load saved language preference
    const savedLang = localStorage.getItem('admin_language')
    if (savedLang && ['en', 'th'].includes(savedLang)) {
      setLanguage(savedLang)
    }
  }, [])

  const changeLanguage = (lang) => {
    if (['en', 'th'].includes(lang)) {
      setLanguage(lang)
      localStorage.setItem('admin_language', lang)
    }
  }

  const t = (key) => {
    return translations[language][key] || key
  }

  return { t, language, changeLanguage }
}

export default useTranslation
