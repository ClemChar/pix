import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Model | campaignAssessmentParticipationResult', function(hooks) {
  setupTest(hooks);

  module('maxTotalSkillsCount', function() {

    test('should calculate max total skills', function(assert) {
      const store = this.owner.lookup('service:store');
      const competenceResult1 = store.createRecord('campaign-assessment-participation-competence-result', {
        totalSkillsCount: 2
      });
      const competenceResult2 = store.createRecord('campaign-assessment-participation-competence-result', {
        totalSkillsCount: 11
      });
      const competenceResult3 = store.createRecord('campaign-assessment-participation-competence-result', {
        totalSkillsCount: 10
      });

      const model = store.createRecord('campaign-assessment-participation-result', {});
      model.set('competenceResults', [competenceResult1, competenceResult2, competenceResult3]);

      // when
      const maxTotalSkillsCount = model.get('maxTotalSkillsCount');

      // then
      assert.equal(maxTotalSkillsCount, 11);
    });
  });
});
