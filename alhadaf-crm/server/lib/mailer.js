const { Resend } = require('resend');

// Wraps Resend (https://resend.com) for the one transactional email this
// system sends: password-reset links. RESEND_API_KEY is optional on
// purpose — an install that hasn't configured it yet still works for
// everything except self-service password reset, instead of crashing.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

async function sendPasswordResetEmail(to, resetUrl, tenantName) {
  if (!resend) {
    console.warn('⚠️  RESEND_API_KEY غير مضبوط بملف .env — رابط استرجاع كلمة المرور ما راح يُرسل فعليًا. رابط الاختبار:', resetUrl);
    return { sent: false };
  }

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `استرجاع كلمة المرور - ${tenantName}`,
      html: `
        <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#17181A">استرجاع كلمة المرور</h2>
          <p>وصلنا طلب استرجاع كلمة المرور لحسابك في <strong>${tenantName}</strong>.</p>
          <p>اضغط الرابط التالي لاختيار كلمة مرور جديدة (صالح لمدة ساعة واحدة فقط):</p>
          <p><a href="${resetUrl}" style="display:inline-block; background:#BD8E54; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none">تعيين كلمة مرور جديدة</a></p>
          <p style="color:#777; font-size:13px">لو ما طلبت هذا، تجاهل الرسالة — حسابك بأمان ولن يتغير شيء.</p>
        </div>
      `,
    });
    return { sent: true };
  } catch (err) {
    console.error('فشل إرسال إيميل استرجاع كلمة المرور:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendPasswordResetEmail };
