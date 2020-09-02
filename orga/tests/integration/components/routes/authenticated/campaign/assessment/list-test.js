import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | routes/authenticated/campaign/assessment/list', function(hooks) {
  setupRenderingTest(hooks);

  let store;

  hooks.beforeEach(function() {
    store = this.owner.lookup('service:store');
  });

  test('it should display an assessment with results', async function(assert) {
    // given
    const campaign = store.createRecord('campaign', {
      id: 1,
      name: 'campagne 1',
    });

    const participations = [
      {
        firstName: 'John',
        lastName: 'Doe',
        masteryPercentage: 80,
        isShared: true,
      },
    ];
    participations.meta = {
      rowCount: 1
    };
    const goTo = function() {};

    this.set('campaign', campaign);
    this.set('participations', participations);
    this.set('goToAssessmentPage', goTo);

    // when
    await render(hbs`<Routes::Authenticated::Campaign::Assessment::List @campaign={{campaign}} @participations={{participations}} @goToAssessmentPage={{goToAssessmentPage}}/>`);

    // then
    assert.notContains('En attente de participants');
    assert.contains('Doe');
    assert.contains('John');
    assert.contains('80%');
  });

  test('it should display an assessment with results pending', async function(assert) {
    // given
    const campaign = store.createRecord('campaign', {
      id: 1,
      name: 'campagne 1',
    });

    const participations = [
      {
        firstName: 'John',
        lastName: 'Doe2',
        isCompleted: true,
        participantExternalId: '1234',
        isShared: false,
      },
    ];
    participations.meta = {
      rowCount: 1
    };
    const goTo = function() {};

    this.set('campaign', campaign);
    this.set('participations', participations);
    this.set('goToAssessmentPage', goTo);

    // when
    await render(hbs`<Routes::Authenticated::Campaign::Assessment::List @campaign={{campaign}} @participations={{participations}} @goToAssessmentPage={{goToAssessmentPage}}/>`);

    // then
    assert.contains('Doe2');
    assert.contains('John');
    assert.contains('En attente');
  });

  test('it should display an assessment not finished yet', async function(assert) {
    // given
    const campaign = store.createRecord('campaign', {
      id: 1,
      name: 'campagne 1',
    });

    const participations = [
      {
        firstName: 'John',
        lastName: 'Doe3',
        isCompleted: false,
        participantExternalId: '12345',
        isShared: false,
      },
    ];
    participations.meta = {
      rowCount: 3
    };
    const goTo = function() {};

    this.set('campaign', campaign);
    this.set('participations', participations);
    this.set('goToAssessmentPage', goTo);

    // when
    await render(hbs`<Routes::Authenticated::Campaign::Assessment::List @campaign={{campaign}} @participations={{participations}} @goToAssessmentPage={{goToAssessmentPage}}/>`);

    // then
    assert.contains('Doe3');
    assert.contains('John');
    assert.contains('En cours de test');
  });

  test('it should display the assessment list with external id', async function(assert) {
    // given
    const campaign = store.createRecord('campaign', {
      id: 1,
      name: 'campagne 1',
      idPixLabel: 'identifiant externe'
    });

    const participations = [{ firstName: 'John', lastName: 'Doe', participantExternalId: '123' }];
    participations.meta = {
      rowCount: 1
    };

    const goTo = function() {};

    this.set('campaign', campaign);
    this.set('participations', participations);
    this.set('goToAssessmentPage', goTo);

    // when
    await render(hbs`<Routes::Authenticated::Campaign::Assessment::List @campaign={{campaign}} @participations={{participations}} @goToAssessmentPage={{goToAssessmentPage}}/>`);

    // then
    assert.contains('identifiant externe');
    assert.contains('123');
  });

  test('it should display a sentence when there is no assessment yet', async function(assert) {
    // given
    const campaign = store.createRecord('campaign', {
      id: 1,
      name: 'campagne 1',
    });

    const participations = [];
    participations.meta = {
      rowCount: 0
    };

    this.set('campaign', campaign);
    this.set('participations', participations);

    // when
    await render(hbs`<Routes::Authenticated::Campaign::Assessment::List @campaign={{campaign}} @participations={{participations}}/>`);

    // then
    assert.contains('En attente de participants');
  });
});
