const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// The paper's author may pay only once it is accepted and not yet paid.
const loadPayablePaper = async (req, res, rawPaperId) => {
    const paperId = parseInt(rawPaperId, 10);
    if (Number.isNaN(paperId)) {
        res.status(400).json({ success: false, error: 'paperId is required.' });
        return null;
    }
    const { data: paper, error } = await supabase
        .from('papers')
        .select('id, title, status, main_author_id, submission_fee, payment_status')
        .eq('id', paperId)
        .maybeSingle();
    if (error) {
        console.error('Error loading paper for payment', error);
        res.status(500).json({ success: false, error: 'Failed to load paper.' });
        return null;
    }
    if (!paper || paper.main_author_id !== req.user.id) {
        res.status(404).json({ success: false, error: 'Paper not found.' });
        return null;
    }
    if (paper.status !== 'accepted') {
        res.status(409).json({ success: false, error: 'Payment is due only after the paper is accepted.' });
        return null;
    }
    if (paper.payment_status === 'paid') {
        res.status(409).json({ success: false, error: 'This paper is already paid.' });
        return null;
    }
    return paper;
};

 const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

// Initialize Razorpay
// Note: Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in your .env file
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// GET /api/payments/key
router.get('/key', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});

// POST /api/payments/create-order
// The amount comes from the paper's submission_fee, never from the client.
router.post('/create-order', requireAuth, async (req, res) => {
    try {
        const paper = await loadPayablePaper(req, res, req.body?.paperId);
        if (!paper) return;

        const amountInRupees = Number(paper.submission_fee);
        if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
            console.error('Paper has no valid submission_fee', { paperId: paper.id, submission_fee: paper.submission_fee });
            return res.status(500).json({ success: false, error: 'The fee for this paper is not configured.' });
        }

        const options = {
            amount: Math.round(amountInRupees * 100), // amount in the smallest currency unit (paise)
            currency: "INR",
            receipt: `receipt_paper_${paper.id}`,
            notes: {
                paperId: String(paper.id)
            }
        };

        const order = await razorpay.orders.create(options);

        if (!order) {
            return res.status(500).json({ success: false, error: "Failed to create Razorpay order" });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/payments/verify-payment
// A valid signature proves the payment belongs to the order; the order's own notes and
// status (fetched from Razorpay) prove it was for this paper and fully paid.
router.post('/verify-payment', requireAuth, async (req, res) => {
    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        } = req.body || {};

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ success: false, error: 'Missing payment details.' });
        }

        const paper = await loadPayablePaper(req, res, req.body?.paperId);
        if (!paper) return;

        const body = razorpayOrderId + "|" + razorpayPaymentId;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
            .update(body.toString())
            .digest('hex');

        const expectedBuf = Buffer.from(expectedSignature, 'utf8');
        const givenBuf = Buffer.from(String(razorpaySignature), 'utf8');
        const isAuthentic = expectedBuf.length === givenBuf.length && crypto.timingSafeEqual(expectedBuf, givenBuf);

        if (isAuthentic) {
            const order = await razorpay.orders.fetch(razorpayOrderId);
            if (String(order?.notes?.paperId) !== String(paper.id) || order?.status !== 'paid') {
                return res.status(400).json({ success: false, error: 'This payment does not match the paper.' });
            }

            const { error } = await supabase
                .from('papers')
                .update({ payment_status: 'paid' })
                .eq('id', paper.id);

            if (error) {
                console.error('Error updating payment status in Supabase', error);
                return res.status(500).json({
                    success: false,
                    message: "Payment verified but failed to update paper status in database"
                });
            }

            res.json({
                success: true,
                message: "Payment verified successfully",
                orderId: razorpayOrderId,
                paymentId: razorpayPaymentId,
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Invalid signature. Payment verification failed."
            });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

 // POST /api/payments/webhook
 // Note: index.js registers express.raw() for this route so req.body is a Buffer.
 router.post('/webhook', async (req, res) => {
     try {
         if (!WEBHOOK_SECRET) {
             return res.status(500).json({ success: false, message: 'Webhook secret is not configured' });
         }

         const signature = req.headers['x-razorpay-signature'];
         if (!signature) {
             return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
         }

         const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
         const expectedSignature = crypto
             .createHmac('sha256', WEBHOOK_SECRET)
             .update(rawBody)
             .digest('hex');

         const signatureOk = crypto.timingSafeEqual(
             Buffer.from(expectedSignature, 'utf8'),
             Buffer.from(String(signature), 'utf8')
         );

         if (!signatureOk) {
             return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
         }

         const payload = JSON.parse(rawBody.toString('utf8') || '{}');
         const event = payload.event;

         // For hosted payment links, you might only get payment.* events.
         if (event !== 'payment.captured' && event !== 'payment.authorized') {
             return res.json({ success: true, ignored: true });
         }

         const paymentEntity = payload?.payload?.payment?.entity;
         const paperId = paymentEntity?.notes?.paperId
             || payload?.payload?.order?.entity?.notes?.paperId
             || payload?.payload?.payment_link?.entity?.notes?.paperId;

         if (!paperId) {
             // Still acknowledge to avoid repeated retries, but log server-side.
             console.warn('[webhook] paperId not found in webhook notes. event=', event);
             return res.json({ success: true, updated: false, reason: 'paperId missing' });
         }

         if (!supabase) {
             console.warn('[webhook] Supabase not configured; cannot update payment status for paperId=', paperId);
             return res.status(500).json({ success: false, message: 'Database not configured' });
         }

         const { error } = await supabase
             .from('papers')
             .update({ payment_status: 'paid' })
             .eq('id', paperId);

         if (error) {
             console.error('[webhook] Error updating payment status in Supabase', error);
             return res.status(500).json({ success: false, message: 'Failed to update payment status' });
         }

         return res.json({ success: true, updated: true, paperId });
     } catch (error) {
         console.error('[webhook] Error processing webhook:', error);
         return res.status(500).json({ success: false, error: error.message });
     }
 });

module.exports = router;
