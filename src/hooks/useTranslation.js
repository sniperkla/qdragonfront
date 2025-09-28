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
    create_trading_license: 'Create a trading license directly for existing customers',
    trading_platform: 'Trading Platform',
    plan_duration: 'Plan Duration (Days)',
    extend_days_optional: 'Extend Days (Optional)',
    additional_days: 'Additional days (e.g., 15)',
    add_extra_days: 'Add extra days on top of the selected plan duration',
    license_generation_notice: 'License Generation Notice',
    unique_license_generated: 'A unique license key will be generated automatically',
    immediately_activated: 'License will be immediately activated with the selected plan',
    expiry_calculated: 'Expiry date will be calculated from today + plan duration + extend days (if specified)',
    no_user_account: 'No user account creation required - license only',
    direct_trading_access: 'Customer can use the license key directly for trading access',
    extend_days_note: 'Extend Days: Optionally add extra days on top of the selected plan',
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
    delete_account_confirm: 'Are you sure you want to delete this customer account?',
    type_delete_confirm: 'Type "DELETE" to confirm',
    
    // Table headers and filters
    search_placeholder: 'Search...',
    filter_by_status: 'Filter by status',
    no_data: 'No data available'
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
    unique_license_generated: 'คีย์ใบอนุญาตที่ไม่ซ้ำกันจะถูกสร้างขึ้นโดยอัตโนมัติ',
    immediately_activated: 'ใบอนุญาตจะถูกเปิดใช้งานทันทีด้วยแผนที่เลือก',
    expiry_calculated: 'วันหมดอายุจะคำนวณจากวันนี้ + ระยะเวลาแผน + วันขยาย (หากระบุ)',
    no_user_account: 'ไม่จำเป็นต้องสร้างบัญชีผู้ใช้ - เฉพาะใบอนุญาต',
    direct_trading_access: 'ลูกค้าสามารถใช้คีย์ใบอนุญาตโดยตรงสำหรับการเข้าถึงการเทรด',
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
    no_data: 'ไม่มีข้อมูล'
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