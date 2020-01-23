const SibApiV3Sdk = require('sib-api-v3-sdk');
const MailingClient = require('./MailingProvider');
const { mailing } = require('../../config');

function _formatPayload(options) {
  const payload = {
    to: [{
      email: options.to,
    }],
    sender: {
      name: options.fromName,
      email: options.from,
    },
    subject: options.subject || '',
    templateId: parseInt(options.template),
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
    },
  };
  if (options.variables) {
    payload.params = options.variables;
  }
  return payload;
}

class SendinblueProvider extends MailingClient {

  constructor() {
    super();

    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    defaultClient.authentications['api-key'].apiKey = mailing.sendinblue.apiKey;

    this._client = SendinblueProvider.createSendinblueSMTPApi();
  }

  static createSendinblueSMTPApi() {
    return new SibApiV3Sdk.SMTPApi();
  }

  sendEmail(options) {
    const payload = _formatPayload(options);
    return this._client.sendTransacEmail(payload);
  }
}

module.exports = SendinblueProvider;
