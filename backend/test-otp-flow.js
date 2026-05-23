// Quick API integration test for OTP flow
const BASE = 'http://localhost:5001'

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  return { status: res.status, data }
}

async function runTest() {
  const testEmail = `test_${Date.now()}@example.com`
  console.log('\n=== OTP FLOW INTEGRATION TEST ===')
  console.log('Test email:', testEmail)

  // 1. Signup (initiate OTP)
  console.log('\n[1] POST /api/auth/signup ...')
  const signupRes = await post('/api/auth/signup', {
    fullName: 'Test User',
    email: testEmail,
    password: 'test123456',
    confirmPassword: 'test123456'
  })
  console.log('   Status:', signupRes.status)
  console.log('   Response:', JSON.stringify(signupRes.data, null, 2))

  if (!signupRes.data.otpRequired) {
    console.error('\n❌ Expected otpRequired=true')
    return
  }

  const otp = signupRes.data.devOtp
  if (!otp) {
    console.error('\n❌ No devOtp in response (dev mode should return OTP)')
    return
  }
  console.log('\n✅ OTP received from server:', otp)

  // 2. Verify OTP
  console.log('\n[2] POST /api/auth/verify-otp ...')
  const verifyRes = await post('/api/auth/verify-otp', {
    email: testEmail,
    otp: otp
  })
  console.log('   Status:', verifyRes.status)
  console.log('   Success:', verifyRes.data.success)
  console.log('   User:', verifyRes.data.user ? `${verifyRes.data.user.fullName} (${verifyRes.data.user.email})` : 'none')
  console.log('   Token:', verifyRes.data.token ? verifyRes.data.token.substring(0, 30) + '...' : 'none')

  if (verifyRes.data.success) {
    console.log('\n🎉 COMPLETE SUCCESS! OTP flow works end-to-end.')
  } else {
    console.error('\n❌ OTP verification failed:', verifyRes.data.error)
  }

  // 3. Test wrong OTP
  console.log('\n[3] Testing wrong OTP on a new signup...')
  const email2 = `test2_${Date.now()}@example.com`
  await post('/api/auth/signup', {
    fullName: 'Test User 2', email: email2,
    password: 'test123456', confirmPassword: 'test123456'
  })
  const wrongRes = await post('/api/auth/verify-otp', { email: email2, otp: '000000' })
  console.log('   Wrong OTP response:', wrongRes.data.error || 'unexpected success')
  console.log(wrongRes.data.error?.includes('Invalid') ? '   ✅ Wrong OTP correctly rejected' : '   ❌ Wrong OTP not rejected')
}

runTest().catch(console.error)
