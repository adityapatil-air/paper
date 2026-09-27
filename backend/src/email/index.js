const { sendEmail, sendToMany, describeProvider } = require('./mailer');
const { templates, siteUrl } = require('./templates');
const recipients = require('./recipients');

// Fire-and-forget: run email work after the response without ever failing the request.
const later = (fn) => {
  Promise.resolve()
    .then(fn)
    .catch((err) => console.error('[email] background send failed:', err.message || err));
};

module.exports = { sendEmail, sendToMany, describeProvider, templates, siteUrl, later, ...recipients };
