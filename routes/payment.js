// routes/payment.js — Razorpay order creation + verification + email + Telegram
const express = require('express');
const router = express.Router();
const https = require('https');
const crypto = require('crypto');

// ── CREATE ORDER ──────────────────────────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  try {
    const { amount, name, email, phone, product } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ success: false, message: 'Invalid amount.' });
    }

    const payload = JSON.stringify({
      amount: amount * 100, // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { name, email, phone, product }
    });

    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');

    const order = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.razorpay.com',
        path: '/v1/orders',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      }, r => {
        let d = '';
        r.on('data', chunk => d += chunk);
        r.on('end', () => resolve({ status: r.statusCode, data: JSON.parse(d) }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    if (order.status !== 200) {
      console.error('Razorpay order error:', order.data);
      return res.status(500).json({ success: false, message: 'Failed to create order.' });
    }

    console.log(`✅ Razorpay order created: ${order.data.id} for ₹${amount}`);

    res.json({
      success: true,
      orderId: order.data.id,
      amount: order.data.amount,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── VERIFY PAYMENT ────────────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name, email, phone, product, amount
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Payment signature mismatch');
      return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
    }

    console.log(`✅ Payment verified: ${razorpay_payment_id} — ₹${amount} — ${name}`);

    // Fire and forget: send email + Telegram
    sendPaymentEmail({ name, email, phone, product, amount, paymentId: razorpay_payment_id });
    notifyTelegram({ name, email, phone, product, amount, paymentId: razorpay_payment_id });

    res.json({ success: true, paymentId: razorpay_payment_id });

  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ success: false, message: 'Verification failed.' });
  }
});

// ── SEND CONFIRMATION EMAIL TO CUSTOMER ──────────────────────────────────────
async function sendPaymentEmail({ name, email, phone, product, amount, paymentId }) {
  const firstName = name.split(' ')[0];
  const formattedAmount = Number(amount).toLocaleString('en-IN');

  const htmlContent = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:12px;overflow:hidden;">

    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px;">
      <div style="font-size:0.75rem;letter-spacing:0.15em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:8px;">Anburam.Digital · Payment Confirmed</div>
      <h1 style="margin:0;font-size:1.5rem;color:#fff;">Payment Successful! 🎉</h1>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:0.85rem;">Thank you, ${firstName}. Let's get started!</p>
    </div>

    <div style="padding:32px;">
      <p style="color:#e2e8f0;font-size:0.92rem;line-height:1.7;margin-bottom:24px;">
        Hi ${firstName}, your payment has been received and confirmed. We're excited to work with you!
        I'll personally reach out within 24 hours to schedule your onboarding call.
      </p>

      <div style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="color:#a855f7;font-size:0.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px;">Payment Details</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#64748b;padding:6px 0;font-size:0.85rem;">Plan</td><td style="color:#e2e8f0;font-size:0.85rem;text-align:right;">${product}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:0.85rem;">Amount Paid</td><td style="color:#a855f7;font-size:0.95rem;font-weight:700;text-align:right;">₹${formattedAmount}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:0.85rem;">Payment ID</td><td style="color:#e2e8f0;font-size:0.8rem;text-align:right;font-family:monospace;">${paymentId}</td></tr>
        </table>
      </div>

      <div style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="color:#a855f7;font-size:0.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:12px;">What Happens Next</div>
        <div style="display:flex;gap:8px;margin:8px 0;color:#e2e8f0;font-size:0.85rem;"><span style="color:#a855f7;">1.</span> I'll WhatsApp you within 24 hours to schedule your onboarding call</div>
        <div style="display:flex;gap:8px;margin:8px 0;color:#e2e8f0;font-size:0.85rem;"><span style="color:#a855f7;">2.</span> We'll set up your accounts, access, and strategy together</div>
        <div style="display:flex;gap:8px;margin:8px 0;color:#e2e8f0;font-size:0.85rem;"><span style="color:#a855f7;">3.</span> Campaign goes live within 5 working days</div>
      </div>

    </div>

    <div style="padding:20px 32px;background:#111118;border-top:1px solid #1e1e2e;text-align:center;">
      <a href="https://wa.me/919715461981?text=Hi%20Anburam%2C%20I%20just%20paid%20for%20${encodeURIComponent(product)}!"
         style="display:inline-block;background:#25d366;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.82rem;letter-spacing:0.06em;text-transform:uppercase;">
        💬 WhatsApp Us Now
      </a>
    </div>

    <div style="padding:16px 32px;text-align:center;font-size:0.7rem;color:#475569;">
      Anburam.Digital · Coimbatore, Tamil Nadu · Grow Beyond Usual<br/>
      +91 97154 61981 · anburam.digital@gmail.com
    </div>
  </div>`;

  const emailPayload = JSON.stringify({
    sender: { name: 'Anburam.Digital', email: 'anburam.digital@gmail.com' },
    to: [{ email, name }],
    subject: `✅ Payment Confirmed — ${product} | Anburam.Digital`,
    htmlContent,
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_KEY,
        'Content-Length': Buffer.byteLength(emailPayload),
      },
    }, r => {
      let d = '';
      r.on('data', chunk => d += chunk);
      r.on('end', () => {
        console.log(`📧 Payment email sent to ${email} (status: ${r.statusCode})`);
        resolve(r.statusCode);
      });
    });
    req.on('error', e => { console.error('Payment email error:', e.message); resolve(0); });
    req.write(emailPayload);
    req.end();
  });
}

// ── TELEGRAM ALERT TO YOU ─────────────────────────────────────────────────────
async function notifyTelegram({ name, email, phone, product, amount, paymentId }) {
  const formattedAmount = Number(amount).toLocaleString('en-IN');
  const msg = JSON.stringify({
    name,
    email,
    phone: phone || 'Not provided',
    service: product,
    message: `💰 PAYMENT RECEIVED | Amount: ₹${formattedAmount} | Payment ID: ${paymentId}`,
    source: 'payment',
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'n8n-5l8h.onrender.com',
      path: '/webhook/lead-alert',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(msg) },
    }, r => { resolve(r.statusCode); });
    req.on('error', () => resolve(0));
    req.write(msg);
    req.end();
  });
}

module.exports = router;
