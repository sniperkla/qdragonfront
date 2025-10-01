{
  /* Modern Points & Rewards System */
}
;<div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-3xl shadow-2xl p-8 lg:p-12 mb-12 border border-indigo-100/50">
  {/* Background Decorations */}
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-indigo-400/10 to-pink-400/10 rounded-full blur-2xl" />
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-300/5 to-purple-300/5 rounded-full blur-3xl" />
  </div>

  <div className="relative z-10">
    {/* Header Section */}
    <div className="text-center mb-12">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl shadow-indigo-600/30 mb-6">
        <svg
          className="w-10 h-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 mb-4">
        {language === 'th' ? 'ระบบเครดิตและรางวัล' : 'Points & Rewards System'}
      </h2>
      <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
        {language === 'th'
          ? 'เติมเงินเพื่อรับเครดิต แลกเครดิตเป็นใบอนุญาต และรับสิทธิพิเศษมากมาย'
          : 'Top-up for points, redeem for licenses, and unlock exclusive benefits'}
      </p>
    </div>

    {/* Points Balance Card */}
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 mb-10 text-white shadow-2xl shadow-indigo-600/25">
      <div className="flex flex-col lg:flex-row items-center justify-between">
        <div className="text-center lg:text-left mb-6 lg:mb-0">
          <h3 className="text-2xl lg:text-3xl font-bold mb-2">
            {language === 'th' ? 'เครดิตของคุณ' : 'Your Points Balance'}
          </h3>
          <div className="text-5xl lg:text-6xl font-black tracking-tight mb-2">
            {user?.points || 0}
            <span className="text-2xl lg:text-3xl font-semibold ml-2 opacity-80">
              {language === 'th' ? 'เครดิต' : 'pts'}
            </span>
          </div>
          <p className="text-indigo-100/80 text-base lg:text-lg">
            {language === 'th' ? 'มูลค่าเท่ากับ' : 'Equivalent to'} $
            {user?.points || 0} {language === 'th' ? 'ดอลลาร์' : 'THB'}
          </p>
        </div>
        <div className="flex flex-col items-center lg:items-end space-y-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3">
            <p className="text-sm font-semibold opacity-90">
              {language === 'th' ? 'อัตราแลกเปลี่ยน' : 'Exchange Rate'}
            </p>
            <p className="text-lg font-bold">
              1 {language === 'th' ? 'เครดิต' : 'Point'} = 1{' '}
              {language === 'th' ? 'วัน' : 'Day'}
            </p>
          </div>
          <button
            onClick={() => refreshUserData()}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {language === 'th' ? 'รีเฟรช' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>

    {/* Main Action Cards */}
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Top-up Card */}
      <div className="group bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white/60 hover:shadow-2xl hover:shadow-emerald-200/20 transition-all duration-300">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mr-4 group-hover:scale-110 transition-transform duration-300">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {language === 'th' ? 'เติมเครดิต' : 'Add Points'}
            </h3>
            <p className="text-gray-600">
              {language === 'th'
                ? 'เติมเงินเพื่อรับเครดิต'
                : 'Top-up to earn points'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
              {language === 'th' ? 'จำนวนเงิน (THB)' : 'Amount (THB)'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500 text-lg font-semibold">$</span>
              </div>
              <input
                type="number"
                min="1"
                max="1000"
                placeholder="10"
                className="w-full pl-8 pr-4 py-4 text-lg font-semibold bg-gray-50/80 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
                id="topupAmount"
              />
            </div>
            <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-sm text-emerald-700 font-medium flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {language === 'th'
                  ? '1 ดอลลาร์ = 1 เครดิต = 1 วันใบอนุญาต'
                  : '1 THB = 1 Point = 1 Day License'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const amount = document.getElementById('topupAmount').value
              if (!amount || amount < 1) {
                showModalAlert(
                  language === 'th'
                    ? 'กรุณากรอกจำนวนเงิน'
                    : 'Please enter an amount',
                  'warning'
                )
                return
              }
              handleTopUpRequest(parseFloat(amount))
            }}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center text-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:scale-[1.02]"
          >
            <svg
              className="w-6 h-6 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {language === 'th' ? 'ส่งคำขอเติมเงิน' : 'Submit Top-up Request'}
          </button>
        </div>
      </div>

      {/* Quick Points Purchase */}
      <div className="group bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white/60 hover:shadow-2xl hover:shadow-blue-200/20 transition-all duration-300">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mr-4 group-hover:scale-110 transition-transform duration-300">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {language === 'th' ? 'แลกเครดิต' : 'Redeem Points'}
            </h3>
            <p className="text-gray-600">
              {language === 'th'
                ? 'ใช้เครดิตซื้อใบอนุญาต'
                : 'Use points for licenses'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
              {language === 'th' ? 'แผนใบอนุญาต' : 'License Plan'}
            </label>
            <select
              className="w-full px-4 py-4 text-lg font-semibold bg-gray-50/80 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              id="pointsPlan"
              value={codeForm.plan}
              onChange={(e) =>
                setCodeForm((prev) => ({ ...prev, plan: e.target.value }))
              }
            >
              <option value="7">
                7 {language === 'th' ? 'วัน' : 'Days'} (7{' '}
                {language === 'th' ? 'เครดิต' : 'Points'})
              </option>
              <option value="30">
                30 {language === 'th' ? 'วัน' : 'Days'} (30{' '}
                {language === 'th' ? 'เครดิต' : 'Points'})
              </option>
              <option value="60">
                60 {language === 'th' ? 'วัน' : 'Days'} (60{' '}
                {language === 'th' ? 'เครดิต' : 'Points'})
              </option>
              <option value="90">
                90 {language === 'th' ? 'วัน' : 'Days'} (90{' '}
                {language === 'th' ? 'เครดิต' : 'Points'})
              </option>
              <option value="180">
                180 {language === 'th' ? 'วัน' : 'Days'} (180{' '}
                {language === 'th' ? 'เครดิต' : 'Points'})
              </option>
              <option value="365">
                365 {language === 'th' ? 'วัน' : 'Days'} (365{' '}
                {language === 'th' ? 'เครดิต' : 'Points'})
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
              {language === 'th'
                ? 'หมายเลขบัญชีเทรดดิ้ง'
                : 'Trading Account Number'}
            </label>
            <input
              type="text"
              placeholder={
                language === 'th' ? 'กรอกหมายเลขบัญชี' : 'Enter account number'
              }
              className="w-full px-4 py-4 text-lg font-semibold bg-gray-50/80 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              id="pointsAccountNumber"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-sm font-semibold text-blue-700 mb-1">
                {language === 'th' ? 'เครดิตที่ต้องการ' : 'Points Required'}
              </p>
              <p className="text-xl font-bold text-blue-900">
                {parseInt(codeForm.plan || '7')}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                {language === 'th' ? 'เครดิตคงเหลือ' : 'Remaining'}
              </p>
              <p className="text-xl font-bold text-gray-900">
                {Math.max(
                  0,
                  (user?.points || 0) - parseInt(codeForm.plan || '7')
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const plan = document.getElementById('pointsPlan').value
              const accountNumber = document.getElementById(
                'pointsAccountNumber'
              )?.value
              if (!accountNumber) {
                showModalAlert(
                  language === 'th'
                    ? 'กรุณากรอกหมายเลขบัญชี'
                    : 'Please enter account number',
                  'warning'
                )
                return
              }
              handlePointsPurchase(parseInt(plan), accountNumber)
            }}
            disabled={
              (user?.points || 0) < parseInt(codeForm.plan || '7') ||
              generatingCode
            }
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center text-lg shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-600/40 hover:scale-[1.02] disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
          >
            {generatingCode ? (
              <>
                <svg
                  className="w-6 h-6 mr-3 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {language === 'th' ? 'กำลังสร้าง...' : 'Generating...'}
              </>
            ) : (user?.points || 0) < parseInt(codeForm.plan || '7') ? (
              <>
                <svg
                  className="w-6 h-6 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                {language === 'th' ? 'เครดิตไม่เพียงพอ' : 'Insufficient Points'}
              </>
            ) : (
              <>
                <svg
                  className="w-6 h-6 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {language === 'th' ? 'แลกเครดิตทันที' : 'Redeem Instantly'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>

    {/* Features Grid */}
    <div className="grid md:grid-cols-3 gap-6 mt-10">
      <div className="text-center p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {language === 'th' ? 'เปิดใช้งานทันที' : 'Instant Activation'}
        </h3>
        <p className="text-gray-600 text-sm">
          {language === 'th'
            ? 'ไม่ต้องรอการชำระเงิน ใช้เครดิตแล้วเปิดใช้งานทันที'
            : 'No payment waiting, activate instantly with points'}
        </p>
      </div>
      <div className="text-center p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {language === 'th' ? 'ปลอดภัย 100%' : '100% Secure'}
        </h3>
        <p className="text-gray-600 text-sm">
          {language === 'th'
            ? 'ระบบเข้ารหัสแบบ SSL และการตรวจสอบแบบ 2FA'
            : 'SSL encryption and 2FA verification system'}
        </p>
      </div>
      <div className="text-center p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.18l6.364 6.364a9 9 0 010 12.728L12 21.82l-6.364-6.364a9 9 0 010-12.728L12 2.18z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {language === 'th' ? 'รางวัลพิเศษ' : 'Special Rewards'}
        </h3>
        <p className="text-gray-600 text-sm">
          {language === 'th'
            ? 'สะสมเครดิตได้โบนัสพิเศษ และส่วนลดสำหรับลูกค้า VIP'
            : 'Earn bonus points and VIP customer discounts'}
        </p>
      </div>
    </div>
  </div>
</div>
