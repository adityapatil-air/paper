const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { supabase } = require('../supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { makeUploader, handleUpload, uploadFile, listFiles, sendStorageError } = require('../storage');
const { PAYMENT_ACCOUNT, APC } = require('../config/paymentAccount');
const { later, sendToMany, templates, getAdminRecipients } = require('../email');

const proofUpload = makeUploader({ proof: 'proof' });
const REFERENCE_MAX = 100;

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

// Article processing charges (Author Guidelines section 6) come from config/paymentAccount.js.
// They are set on the server only; the client picks the currency, never the amount.

const paymentsConfigured = () => {
    const id = process.env.RAZORPAY_KEY_ID || '';
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    return Boolean(id && secret && !/^YOUR_/i.test(id) && !/^YOUR_/i.test(secret));
};

// Created on first use so a missing key never stops the server from starting.
let razorpayClient = null;
const getRazorpay = () => {
    if (!razorpayClient) {
        razorpayClient = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpayClient;
};

// GET /api/payments/key - fees, the account authors pay into, and whether online checkout is on
router.get('/key', (req, res) => {
    const configured = paymentsConfigured();
    res.json({ key: configured ? process.env.RAZORPAY_KEY_ID : null, configured, fees: APC, account: PAYMENT_ACCOUNT });
});

// POST /api/payments/create-order  body: { paperId, currency: 'INR' | 'USD' }
router.post('/create-order', requireAuth, async (req, res) => {
    try {
        if (!paymentsConfigured()) {
            return res.status(503).json({ success: false, error: 'Online payment is not available yet. Please contact editor@ijepa.org.' });
        }

        const paper = await loadPayablePaper(req, res, req.body?.paperId);
        if (!paper) return;

        const currency = String(req.body?.currency || 'INR').toUpperCase();
        const amount = APC[currency];
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Choose INR or USD.' });
        }

        const options = {
            amount: Math.round(amount * 100), // smallest currency unit (paise / cents)
            currency,
            receipt: `receipt_paper_${paper.id}`,
            notes: {
                paperId: String(paper.id)
            }
        };

        const order = await getRazorpay().orders.create(options);

        if (!order) {
            return res.status(500).json({ success: false, error: "Failed to create Razorpay order" });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Payment proofs live in storage only, one folder per paper: payment-proofs/paper-<id>/.
// The author pays by bank transfer or UPI and uploads a screenshot/receipt; an admin checks it
// and publishes the paper. Nothing about the proof is stored in the database.
const proofFolder = (paperId) => `payment-proofs/paper-${paperId}`;

// POST /api/payments/proof/:paperId - the paper's author uploads proof of payment
router.post('/proof/:paperId', requireAuth, handleUpload(proofUpload.single('proof')), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Attach a screenshot or receipt of your payment (JPG, PNG, WebP or PDF).' });
        }
        const paper = await loadPayablePaper(req, res, req.params.paperId);
        if (!paper) return;

        const reference = String(req.body?.reference || '').trim().slice(0, REFERENCE_MAX);
        const proofUrl = await uploadFile(req.file, proofFolder(paper.id));

        // Let the admins know there is a payment to check (the reference only travels here).
        try {
            const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
            const rows = (admins || []).map((a) => ({
                user_id: a.id,
                title: 'Payment proof received',
                message: `The author sent payment proof for "${paper.title}" (paper #${paper.id})${reference ? `, transaction ID ${reference}` : ''}. Check it in the paper's details, then publish.`,
                type: 'info',
            }));
            if (rows.length) {
                const { error: notifError } = await supabase.from('notifications').insert(rows);
                if (notifError) console.error('Error inserting payment proof notifications', notifError);
            }
        } catch (notifErr) {
            console.error('Unexpected error while creating payment proof notifications', notifErr);
        }

        later(async () => {
            const admins = await getAdminRecipients();
            await sendToMany(admins, () => templates.paymentProofReceived({ paper, reference, proofUrl }));
        });

        return res.json({ success: true, proofUrl });
    } catch (err) {
        if (sendStorageError(res, err)) return;
        console.error('Unexpected error in POST /api/payments/proof/:paperId', err);
        return res.status(500).json({ success: false, error: 'Failed to upload the payment proof.' });
    }
});

// GET /api/payments/proof/:paperId - proofs sent for a paper (its author or an admin)
router.get('/proof/:paperId', requireAuth, async (req, res) => {
    try {
        const paperId = parseInt(req.params.paperId, 10);
        if (Number.isNaN(paperId)) return res.status(400).json({ success: false, error: 'Invalid paper id.' });
        if (req.user.role !== 'admin') {
            const { data: paper } = await supabase.from('papers').select('main_author_id').eq('id', paperId).maybeSingle();
            if (!paper || paper.main_author_id !== req.user.id) {
                return res.status(404).json({ success: false, error: 'Paper not found.' });
            }
        }
        const proofs = await listFiles(proofFolder(paperId));
        return res.json({ success: true, proofs });
    } catch (err) {
        if (sendStorageError(res, err)) return;
        console.error('Unexpected error in GET /api/payments/proof/:paperId', err);
        return res.status(500).json({ success: false, error: 'Failed to load payment proofs.' });
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
            const order = await getRazorpay().orders.fetch(razorpayOrderId);
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
