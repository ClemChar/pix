const _ = require('lodash');
const { expect, databaseBuilder, sinon, knex } = require('../../../test-helper');
const Assessment = require('../../../../lib/domain/models/Assessment');
const KnowledgeElement = require('../../../../lib/domain/models/KnowledgeElement');
const CampaignAssessmentParticipation = require('../../../../lib/domain/read-models/CampaignAssessmentParticipation');
const skillDatasource = require('../../../../lib/infrastructure/datasources/airtable/skill-datasource');
const campaignAssessmentParticipationRepository = require('../../../../lib/infrastructure/repositories/campaign-assessment-participation-repository');

describe('Integration | Repository | Campaign Assessment Participation', () => {

  describe('#getByCampaignIdAndCampaignParticipationId', () => {

    beforeEach(() => {
      sinon.stub(skillDatasource, 'findOperativeByRecordIds').resolves([]);
    });

    afterEach(() => {
      skillDatasource.findOperativeByRecordIds.restore();
      return knex('knowledge-element-snapshots').delete();
    });

    let campaignId, campaignParticipationId;

    context('When there is an assessment for another campaign and another participation', () => {
      const participant = {
        firstName: 'Josette',
        lastName: 'Gregorio',
      };
      const participation = {
        participantExternalId: '123AZ',
        createdAt: new Date('2020-10-10'),
        isShared: true,
        sharedAt: new Date('2020-12-12'),
      };
      beforeEach(async () => {
        campaignId = databaseBuilder.factory.buildAssessmentCampaign({}).id;

        campaignParticipationId = databaseBuilder.factory.buildAssessmentFromParticipation({
          ...participation,
          campaignId
        }, participant).campaignParticipationId;

        databaseBuilder.factory.buildAssessmentFromParticipation({
          campaignId: campaignId
        }, {});

        const otherCampaign = databaseBuilder.factory.buildCampaign();
        databaseBuilder.factory.buildAssessmentFromParticipation({
          campaignId: otherCampaign.id
        }, {});

        await databaseBuilder.commit();
      });

      it('matches the given campaign and given participation', async () => {
        const campaignAssessmentParticipation = await campaignAssessmentParticipationRepository.getByCampaignIdAndCampaignParticipationId({ campaignId, campaignParticipationId });

        expect(campaignAssessmentParticipation.campaignId).to.equal(campaignId);
        expect(campaignAssessmentParticipation.campaignParticipationId).to.equal(campaignParticipationId);
      });

      it('create CampaignAssessmentParticipation with attributes', async () => {
        const expectedResult = {
          ...participant,
          ...participation,
          campaignId,
          campaignParticipationId,
          totalSkillsCount: 0,
          validatedSkillsCount: 0,
          masteryPercentage: 0,
          progression: 100,
        };

        const campaignAssessmentParticipation = await campaignAssessmentParticipationRepository.getByCampaignIdAndCampaignParticipationId({ campaignId, campaignParticipationId });

        expect(campaignAssessmentParticipation).to.be.instanceOf(CampaignAssessmentParticipation);
        expect(_.omit(campaignAssessmentParticipation, ['campaignAnalysis', 'campaignAssessmentParticipationResult'])).to.deep.equal(expectedResult);
      });
    });

    context('When campaign participation is not shared', () => {
      beforeEach(async () => {
        const skills = [{ id: 'skill1', name: '@Acquis1' },];
        skillDatasource.findOperativeByRecordIds.restore();
        sinon.stub(skillDatasource, 'findOperativeByRecordIds').resolves(skills);
        campaignId = databaseBuilder.factory.buildAssessmentCampaign({}, skills).id;
        campaignParticipationId = databaseBuilder.factory.buildAssessmentFromParticipation({
          isShared: false,
          sharedAt: null,
          campaignId
        }, {}).campaignParticipationId;

        await databaseBuilder.commit();
      });

      it('create CampaignAssessmentParticipation with empty results', async () => {
        const campaignAssessmentParticipation = await campaignAssessmentParticipationRepository.getByCampaignIdAndCampaignParticipationId({ campaignId, campaignParticipationId });

        expect(campaignAssessmentParticipation.totalSkillsCount).to.equal(1);
        expect(campaignAssessmentParticipation.validatedSkillsCount).to.equal(undefined);
      });
    });

    context('When campaign participation is shared', () => {

      context('totalSkillsCount', () => {
        beforeEach(async () => {
          const skills = [
            { id: 'skill1', name: '@Acquis1' },
            { id: 'skill2', name: '@Acquis2' }
          ];
          skillDatasource.findOperativeByRecordIds.restore();
          sinon.stub(skillDatasource, 'findOperativeByRecordIds').resolves(skills);

          campaignId = databaseBuilder.factory.buildAssessmentCampaignForSkills({}, skills).id;
          campaignParticipationId = databaseBuilder.factory.buildCampaignParticipation({ campaignId }).id;
          databaseBuilder.factory.buildAssessment({ campaignParticipationId });

          await databaseBuilder.commit();
        });
        it('should equal 2', async () => {
          const campaignAssessmentParticipation = await campaignAssessmentParticipationRepository.getByCampaignIdAndCampaignParticipationId({ campaignId, campaignParticipationId });

          expect(campaignAssessmentParticipation.totalSkillsCount).to.equal(2);
        });
      });

      context('validatedSkillsCount', () => {
        beforeEach(async () => {
          const skills = [
            { id: 'skill1', name: '@Acquis1' },
            { id: 'skill2', name: '@Acquis2' },
          ];
          skillDatasource.findOperativeByRecordIds.restore();
          sinon.stub(skillDatasource, 'findOperativeByRecordIds').resolves(skills);

          campaignId = databaseBuilder.factory.buildAssessmentCampaignForSkills({}, skills).id;
          const userId = databaseBuilder.factory.buildUser().id;
          campaignParticipationId = databaseBuilder.factory.buildCampaignParticipation({
            campaignId,
            userId,
            isShared: true,
            sharedAt: new Date('2020-01-02')
          }).id;

          databaseBuilder.factory.buildAssessment({ campaignParticipationId, userId });

          databaseBuilder.factory.buildKnowledgeElement({
            userId,
            skillId: skills[0].id,
            createdAt: new Date('2020-01-01')
          });
          databaseBuilder.factory.buildKnowledgeElement({
            userId,
            skillId: skills[1].id,
            createdAt: new Date('2020-01-03')
          });

          await databaseBuilder.commit();
        });

        it('should equal 1', async () => {
          const campaignAssessmentParticipation = await campaignAssessmentParticipationRepository.getByCampaignIdAndCampaignParticipationId({ campaignId, campaignParticipationId });

          expect(campaignAssessmentParticipation.validatedSkillsCount).to.equal(1);
        });
      });

      context('masteryPercentage', () => {
        beforeEach(async () => {
          const skills = [
            { id: 'skill1', name: '@Acquis1' },
            { id: 'skill2', name: '@Acquis2' },
          ];
          skillDatasource.findOperativeByRecordIds.restore();
          sinon.stub(skillDatasource, 'findOperativeByRecordIds').resolves(skills);

          campaignId = databaseBuilder.factory.buildAssessmentCampaignForSkills({}, skills).id;
          const userId = databaseBuilder.factory.buildUser().id;
          campaignParticipationId = databaseBuilder.factory.buildCampaignParticipation({
            campaignId,
            userId,
            isShared: true,
            sharedAt: new Date('2020-01-02')
          }).id;

          databaseBuilder.factory.buildAssessment({ campaignParticipationId, userId });

          databaseBuilder.factory.buildKnowledgeElement({
            userId,
            skillId: skills[0].id,
            createdAt: new Date('2020-01-01')
          });
          databaseBuilder.factory.buildKnowledgeElement({
            userId,
            skillId: skills[1].id,
            createdAt: new Date('2020-01-03')
          });

          await databaseBuilder.commit();
        });

        it('should equal 50', async () => {
          const campaignAssessmentParticipation = await campaignAssessmentParticipationRepository.getByCampaignIdAndCampaignParticipationId({ campaignId, campaignParticipationId });

          expect(campaignAssessmentParticipation.masteryPercentage).to.equal(50);
        });
      });

      context('progression', () => {
        let userId;
        beforeEach(async () => {
          const skills = [
            { id: 'skill1', name: '@Acquis1' },
            { id: 'skill2', name: '@Acquis2' },
            { id: 'skill3', name: '@Acquis3' },
          ];
          skillDatasource.findOperativeByRecordIds.restore();
          sinon.stub(skillDatasource, 'findOperativeByRecordIds').resolves(skills);

          campaignId = databaseBuilder.factory.buildAssessmentCampaignForSkills({}, skills).id;
          userId = databaseBuilder.factory.buildUser().id;
          campaignParticipationId = databaseBuilder.factory.buildCampaignParticipation({
            campaignId,
            userId,
            isShared: false,
            sharedAt: null
          }).id;

          databaseBuilder.factory.buildKnowledgeElement({
            status: KnowledgeElement.StatusType.VALIDATED,
            userId,
            skillId: skills[0].id,
            createdAt: new Date('2020-01-01')
          });
          databaseBuilder.factory.buildKnowledgeElement({
            status: KnowledgeElement.StatusType.INVALIDATED,
            userId,
            skillId: skills[1].id,
            createdAt: new Date('2020-01-01')
          });
          await databaseBuilder.commit();
        });

        it('should equal 100', async () => {
          databaseBuilder.factory.buildAssessment({ campaignParticipationId, userId, state: Assessment.states.COMPLETED });
          await databaseBuilder.commit();

          const campaignAssessmentParticipation = await campaignAssessmentParticipationRepository.getByCampaignIdAndCampaignParticipationId({ campaignId, campaignParticipationId });

          expect(campaignAssessmentParticipation.progression).to.equal(100);
        });

        it('should equal 67', async () => {
          databaseBuilder.factory.buildAssessment({ campaignParticipationId, userId, state: Assessment.states.STARTED });
          await databaseBuilder.commit();

          const campaignAssessmentParticipation = await campaignAssessmentParticipationRepository.getByCampaignIdAndCampaignParticipationId({ campaignId, campaignParticipationId });

          expect(campaignAssessmentParticipation.progression).to.equal(67);
        });
      });
    });
  });
});
