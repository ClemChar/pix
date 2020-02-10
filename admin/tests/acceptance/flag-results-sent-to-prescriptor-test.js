import { module, test, only } from 'qunit';
import { click, currentURL, visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import { authenticateSession } from 'ember-simple-auth/test-support';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import { FINALIZED, statusToDisplayName } from 'pix-admin/models/session';

module('Acceptance | Session page', function(hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function() {
    await authenticateSession({ userId: 1 });
  });

  module('Access', function() {

    test('Session page should be accessible from /certification/sessions', async function(assert) {
      // when
      await visitSessionsPage();

      // then
      assert.equal(currentURL(), '/certifications/sessions');
    });
  });

  module('Rendering', function(hooks) {

    const STATUS_SECTION = 9;
    const FINALISATION_DATE_SECTION = 10;
    const SENT_TO_PRESCRIPTEUR_DATE_SECTION = 11;

    hooks.beforeEach(async function() {
      await visitSessionsPage();
    });

    test('Should not have a "Date de finalisation" section', async function(assert) {

      const session = this.server.create('session');

      // when
      await visit(`/certifications/sessions/${session.id}`);
      assert.dom('div.certifications-session-info__details').exists();
      assert.dom('.row:nth-child(10) .col:nth-child(1)').doesNotExist();
    });

    only('Should have "Date de finalisation" and "Date d\'envoi au prescripteur" section', async function(assert) {

      const finalizedDate = new Date('2019-03-10T01:03:04Z');
      const session = this.server.create('session', { status: FINALIZED, finalizedAt: finalizedDate });
      // when
      await visit(`/certifications/sessions/${session.id}`);
      assert.dom('div.certifications-session-info__details').exists();
      assert.dom(`.row:nth-child(${STATUS_SECTION}) .col:nth-child(2)`).containsText(statusToDisplayName[FINALIZED]);
      assert.dom(`.row:nth-child(${FINALISATION_DATE_SECTION}) .col:nth-child(2)`).containsText(finalizedDate.toLocaleString('fr-FR'));
      assert.dom(`.row:nth-child(${SENT_TO_PRESCRIPTEUR_DATE_SECTION}) .col:nth-child(2)`).doesNotExist();
    });

    test('Should add "Date d\'envoi au prescripteur" section', async function(assert) {
      const session = this.server.create('session', {
        status: FINALIZED,
        finalizedAt: new Date('2019-03-10T01:03:04Z'),
      });
        // when
      await visit(`/certifications/sessions/${session.id}`);
      await click('.certifications-session-info__actions button:nth-child(2)');
        
      assert.dom(`.row:nth-child(${SENT_TO_PRESCRIPTEUR_DATE_SECTION}) .col:nth-child(2)`).exists();
    });

  });

  async function visitSessionsPage() {
    return visit('/certifications/sessions');
  }

});