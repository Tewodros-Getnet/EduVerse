/**
 * Test script for email functionality
 * Tests both old (Resend/dev mode) and new (Brevo) implementations
 */

require('dotenv').config();
const { sendOTPEmail } = require('./src/lib/email');

async function testEmail() {
    console.log('\n🧪 Testing Email Service...\n');
    
    // Check configuration
    console.log('📋 Configuration:');
    console.log('  BREVO_API_KEY:', process.env.BREVO_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('  BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL || '❌ Missing');
    console.log('  Old RESEND_API_KEY:', process.env.RESEND_API_KEY ? '⚠️ Still present' : '✅ Not set');
    console.log('');
    
    // Test sending OTP
    const testEmail = 'test@example.com';
    const testName = 'Test User';
    const testOTP = '123456';
    
    console.log(`📧 Attempting to send OTP to: ${testEmail}`);
    console.log(`   Name: ${testName}`);
    console.log(`   OTP: ${testOTP}`);
    console.log('');
    
    try {
        const result = await sendOTPEmail(testEmail, testName, testOTP);
        
        console.log('✅ Result:', JSON.stringify(result, null, 2));
        
        if (result.dev) {
            console.log('\n⚠️  DEV MODE: Email not sent, OTP logged to console only');
            console.log('   To enable real emails, set BREVO_API_KEY and BREVO_SENDER_EMAIL in .env');
        } else if (result.success) {
            console.log('\n✅ SUCCESS: Email sent via Brevo!');
            console.log(`   Message ID: ${result.messageId}`);
        } else {
            console.log('\n❌ FAILED:', result.error);
        }
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
    }
}

testEmail();
