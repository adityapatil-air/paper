const { PAYMENT_ACCOUNT, APC } = require('../config/paymentAccount');

// Branded, table-based HTML (works in Gmail/Outlook) plus a plain-text version for every email.
// Anything that comes from users (names, titles, notes) is escaped.

const siteUrl = () => String(process.env.SITE_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:3005').replace(/\/+$/, '');
const link = (path) => `${siteUrl()}${path}`;
const CONTACT = 'editor@ijepa.org';

const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';
const paperLabel = (paper) => `“${paper.title}” (paper #${paper.id})`;

const button = (label, url) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="border-radius:8px;background:#0a6acb">
    <a href="${esc(url)}" style="display:inline-block;padding:12px 22px;font:600 15px Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px">${esc(label)}</a>
  </td></tr></table>`;

const infoBox = (rowsHtml) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:#f3f8fd;border:1px solid #d9e7f5;border-radius:10px">
    <tr><td style="padding:14px 18px;font:14px/1.6 Arial,sans-serif;color:#1f2f40">${rowsHtml}</td></tr>
  </table>`;

const layout = ({ heading, paragraphs = [], box, cta, footnote }) => {
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#eef2f6">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dde6ef">
      <tr><td style="background:#062f50;padding:18px 24px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td><img src="${esc(link('/logo192.png'))}" width="40" height="40" alt="IJEPA" style="display:block;border-radius:50%;background:#ffffff"></td>
          <td style="padding-left:12px;font:700 18px Arial,sans-serif;color:#ffffff">IJEPA<br><span style="font:12px Arial,sans-serif;color:#b9d6ef">International Journal of Engineering Practices and Applications</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:28px 28px 8px">
        <h1 style="margin:0 0 14px;font:700 21px Arial,sans-serif;color:#062f50">${esc(heading)}</h1>
        ${paragraphs.map((p) => `<p style="margin:0 0 12px;font:15px/1.6 Arial,sans-serif;color:#1f2f40">${p}</p>`).join('')}
        ${box ? infoBox(box) : ''}
        ${cta ? button(cta.label, cta.url) : ''}
        ${footnote ? `<p style="margin:14px 0 0;font:13px/1.6 Arial,sans-serif;color:#5b6b7c">${footnote}</p>` : ''}
      </td></tr>
      <tr><td style="padding:20px 28px 26px;border-top:1px solid #eef2f6;font:12px/1.6 Arial,sans-serif;color:#7a8898">
        IJEPA Editorial Office · <a href="mailto:${CONTACT}" style="color:#0a6acb">${CONTACT}</a> · <a href="${esc(siteUrl())}" style="color:#0a6acb">${esc(siteUrl().replace(/^https?:\/\//, ''))}</a><br>
        This is an automated message about your activity on IJEPA.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
  return html;
};

// Plain-text body: strips tags from the same paragraphs.
const plain = (heading, lines, cta) => [heading, '', ...lines.map((l) => String(l).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")), cta ? `\n${cta.label}: ${cta.url}` : '', '', `IJEPA Editorial Office · ${CONTACT}`].join('\n');

const build = ({ subject, heading, paragraphs, box, boxText, cta, footnote }) => ({
  subject,
  html: layout({ heading, paragraphs, box, cta, footnote }),
  text: plain(heading, [...paragraphs, ...(boxText ? ['', boxText] : []), ...(footnote ? ['', footnote] : [])], cta),
});

const paymentBox = () => ({
  html: `<strong>Amount:</strong> INR ${APC.INR.toLocaleString('en-IN')} (Indian authors) or USD ${APC.USD} (international authors)<br>
    <strong>UPI ID:</strong> ${esc(PAYMENT_ACCOUNT.upiId)}<br>
    <strong>Account name:</strong> ${esc(PAYMENT_ACCOUNT.accountName)}<br>
    <strong>Account number:</strong> ${esc(PAYMENT_ACCOUNT.accountNumber)}<br>
    <strong>Bank:</strong> ${esc(PAYMENT_ACCOUNT.bankName)}<br>
    <strong>IFSC:</strong> ${esc(PAYMENT_ACCOUNT.ifsc)}`,
  text: `Amount: INR ${APC.INR} (Indian authors) or USD ${APC.USD} (international authors)\nUPI ID: ${PAYMENT_ACCOUNT.upiId}\nAccount name: ${PAYMENT_ACCOUNT.accountName}\nAccount number: ${PAYMENT_ACCOUNT.accountNumber}\nBank: ${PAYMENT_ACCOUNT.bankName}\nIFSC: ${PAYMENT_ACCOUNT.ifsc}`,
});

const templates = {
  verificationCode: ({ name, code }) => build({
    subject: `${code} is your IJEPA verification code`,
    heading: 'Confirm your email address',
    paragraphs: [`Hi ${esc(firstName(name))},`, 'Enter this code on the registration page to create your IJEPA account:'],
    box: `<span style="font:700 30px/1.2 'Courier New',monospace;letter-spacing:8px;color:#062f50">${esc(code)}</span>`,
    boxText: `Your code: ${code}`,
    footnote: 'The code expires in 15 minutes. If you didn’t try to create an account, you can ignore this email.',
  }),

  submissionReceivedAuthor: ({ name, paper }) => build({
    subject: `Submission received: ${paper.title}`,
    heading: 'We received your manuscript',
    paragraphs: [`Hi ${esc(firstName(name))},`, `Thank you for submitting ${esc(paperLabel(paper))} to IJEPA. Our editors will check it and assign it for double-blind peer review.`, 'You can follow its progress on your dashboard. We’ll email you at each step.'],
    cta: { label: 'Open your dashboard', url: link('/author-dashboard') },
  }),

  submissionReceivedAdmin: ({ paper, authorName, authorEmail }) => build({
    subject: `New submission: ${paper.title}`,
    heading: 'A new paper was submitted',
    paragraphs: [`${esc(authorName || 'An author')}${authorEmail ? ` (${esc(authorEmail)})` : ''} submitted ${esc(paperLabel(paper))}.`, 'Assign a reviewer to start the peer review.'],
    cta: { label: 'Open the admin dashboard', url: link('/admin-dashboard') },
  }),

  reviewerAssigned: ({ name, paper }) => build({
    subject: `Review request: ${paper.title}`,
    heading: 'You’ve been assigned a paper to review',
    paragraphs: [`Hi ${esc(firstName(name))},`, `The editorial office has assigned you ${esc(paperLabel(paper))} for double-blind peer review.`, 'Please sign in to read the manuscript and submit your review.'],
    cta: { label: 'Open your reviewer dashboard', url: link('/reviewer-dashboard') },
  }),

  reviewCompletedAuthor: ({ name, paper }) => build({
    subject: `Review completed: ${paper.title}`,
    heading: 'A review of your paper is complete',
    paragraphs: [`Hi ${esc(firstName(name))},`, `A reviewer has completed their review of ${esc(paperLabel(paper))}. The editor will consider it and let you know the decision.`],
    cta: { label: 'Open your dashboard', url: link('/author-dashboard') },
  }),

  reviewCompletedAdmin: ({ paper, reviewerName, recommendation }) => build({
    subject: `Review submitted: ${paper.title}`,
    heading: 'A review was submitted',
    paragraphs: [`${esc(reviewerName || 'A reviewer')} submitted a review for ${esc(paperLabel(paper))}${recommendation ? ` with the recommendation <strong>${esc(String(recommendation).replace(/_/g, ' '))}</strong>` : ''}.`, 'Read it and decide: accept, request revisions or reject.'],
    cta: { label: 'Open the admin dashboard', url: link('/admin-dashboard') },
  }),

  revisionsRequested: ({ name, paper, note }) => build({
    subject: `Revisions requested: ${paper.title}`,
    heading: 'The editor has requested revisions',
    paragraphs: [`Hi ${esc(firstName(name))},`, `The editor has asked for revisions to ${esc(paperLabel(paper))}. Please read the comments and upload a revised manuscript from your dashboard.`],
    box: note ? `<strong>Editor’s note:</strong><br>${esc(note).replace(/\n/g, '<br>')}` : null,
    boxText: note ? `Editor’s note: ${note}` : null,
    cta: { label: 'Upload your revision', url: link('/author-dashboard') },
  }),

  revisionUploaded: ({ name, paper, forReviewer }) => build({
    subject: `Revised manuscript: ${paper.title}`,
    heading: 'A revised manuscript was uploaded',
    paragraphs: [`Hi ${esc(firstName(name))},`, `The author uploaded a revised version of ${esc(paperLabel(paper))}.`],
    cta: forReviewer ? { label: 'Open your reviewer dashboard', url: link('/reviewer-dashboard') } : { label: 'Open the admin dashboard', url: link('/admin-dashboard') },
  }),

  paperAccepted: ({ name, paper }) => {
    const pay = paymentBox();
    return build({
      subject: `Accepted: ${paper.title}`,
      heading: 'Congratulations, your paper has been accepted',
      paragraphs: [
        `Hi ${esc(firstName(name))},`,
        `We’re pleased to accept ${esc(paperLabel(paper))} for publication in IJEPA. Two steps remain, both from your dashboard:`,
        `<strong>1. Pay the article processing charge</strong> using the account below, writing <strong>IJEPA #${esc(paper.id)}</strong> in the remarks, then upload your payment proof (a screenshot or receipt).`,
        `<strong>2. Upload the signed copyright form</strong> — download it from your dashboard, sign it, and upload the PDF.`,
      ],
      box: pay.html,
      boxText: pay.text,
      cta: { label: 'Open your dashboard to pay & upload the copyright form', url: link('/author-dashboard') },
      footnote: 'Once your payment proof and copyright form are in, the editorial office verifies them and publishes your paper.',
    });
  },

  paymentProofReceived: ({ paper, reference, proofUrl }) => build({
    subject: `Payment proof received: ${paper.title}`,
    heading: 'An author sent payment proof',
    paragraphs: [`The author of ${esc(paperLabel(paper))} uploaded proof of payment${reference ? ` (transaction ID <strong>${esc(reference)}</strong>)` : ''}.`, 'Open the paper on your dashboard to view the proof, then mark the fee as paid and publish.'],
    cta: { label: 'See the payment proof', url: link(`/admin-dashboard?paper=${paper.id}`) },
  }),

  paymentMarkedPaid: ({ name, paper }) => build({
    subject: `Payment received: ${paper.title}`,
    heading: 'We received your payment',
    paragraphs: [`Hi ${esc(firstName(name))},`, `Your article processing charge for ${esc(paperLabel(paper))} has been received. Your paper will be published shortly.`],
    cta: { label: 'Open your dashboard', url: link('/author-dashboard') },
  }),

  paperRejected: ({ name, paper, note }) => build({
    subject: `Decision on your paper: ${paper.title}`,
    heading: 'Decision on your submission',
    paragraphs: [`Hi ${esc(firstName(name))},`, `After peer review, the editor decided not to accept ${esc(paperLabel(paper))} for publication. Thank you for considering IJEPA.`],
    box: note ? `<strong>Editor’s note:</strong><br>${esc(note).replace(/\n/g, '<br>')}` : null,
    boxText: note ? `Editor’s note: ${note}` : null,
    cta: { label: 'Open your dashboard', url: link('/author-dashboard') },
  }),

  paperPublishedAuthor: ({ name, paper }) => build({
    subject: `Published: ${paper.title}`,
    heading: 'Your paper is published',
    paragraphs: [`Hi ${esc(firstName(name))},`, `${esc(paperLabel(paper))} is now published in IJEPA and freely available to read.`, 'Your Certificate of Publication is ready to download.'],
    cta: { label: 'Download your certificate', url: link(`/certificate/author/${paper.id}`) },
    footnote: `Paper page: <a href="${esc(link(`/p/${paper.id}`))}" style="color:#0a6acb">${esc(link(`/p/${paper.id}`))}</a>`,
  }),

  paperPublishedReviewer: ({ name, paper }) => build({
    subject: `A paper you reviewed is published: ${paper.title}`,
    heading: 'Thank you for your review',
    paragraphs: [`Hi ${esc(firstName(name))},`, `${esc(paperLabel(paper))}, which you reviewed, is now published in IJEPA. Thank you for your contribution to the peer-review process.`, 'Your Certificate of Reviewing is ready to download.'],
    cta: { label: 'Download your certificate', url: link(`/certificate/review/${paper.id}`) },
  }),

  reviewerInvite: ({ name }) => build({
    subject: 'Invitation to review for IJEPA',
    heading: 'You’re invited to join IJEPA as a reviewer',
    paragraphs: [`Hi ${esc(firstName(name))},`, 'The IJEPA editorial office has invited you to review manuscripts for the International Journal of Engineering Practices and Applications.', 'Create your account with <strong>this email address</strong> (or sign in with Google using it) and you’ll get reviewer access automatically.'],
    cta: { label: 'Create your reviewer account', url: link('/register') },
  }),

  reviewerAccessGranted: ({ name }) => build({
    subject: 'You now have reviewer access on IJEPA',
    heading: 'Reviewer access granted',
    paragraphs: [`Hi ${esc(firstName(name))},`, 'The editorial office has given your IJEPA account reviewer access. Please sign out and sign in again to see your reviewer dashboard.'],
    cta: { label: 'Sign in', url: link('/login') },
  }),
};

module.exports = { templates, siteUrl };
