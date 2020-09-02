const _ = require('lodash');
const CertificationChallenge = require('../models/CertificationChallenge');
const {
  MAX_CHALLENGES_PER_SKILL_FOR_CERTIFICATION,
} = require('../constants');

const KnowledgeElement = require('../models/KnowledgeElement');
const UserCompetence = require('../models/UserCompetence');
const Challenge = require('../models/Challenge');
const challengeRepository = require('../../infrastructure/repositories/challenge-repository');
const skillRepository = require('../../infrastructure/repositories/skill-repository');
const answerRepository = require('../../infrastructure/repositories/answer-repository');
const knowledgeElementRepository = require('../../infrastructure/repositories/knowledge-element-repository');

function _challengeSnapshotsFromAnswersAndKnowledgeElements(answers, knowledgeElements) {
  return answers.map((answer) => {
    const associatedKnowledgeElements = knowledgeElements.filter((knowledgeElement) => knowledgeElement.answerId === answer.id);
    return {
      challengeId: answer.challengeId,
      competenceId: associatedKnowledgeElements[0].competenceId, // Ici on doit être confiant dans le fait qu'une answer lié à plusieurs KE (QROCmDep) soit liés à des skills de la même compétence
      skillIds : associatedKnowledgeElements.map((knowledgeElement) => knowledgeElement.skillId)
    };
  });
}

module.exports = {

  async pickCertificationChallenges(placementProfile) {
    const knowledgeElementsByCompetence = await knowledgeElementRepository
      .findUniqByUserIdGroupedByCompetenceId({ userId: placementProfile.userId, limitDate: placementProfile.profileDate });

    const knowledgeElements = KnowledgeElement.findDirectlyValidatedFromGroups(knowledgeElementsByCompetence);
    const answerIds = _.map(knowledgeElements, 'answerId');
    const answers = await answerRepository.findByIds(answerIds);
    const skillIds = _.map(knowledgeElements, 'skillId');
    const skills = await skillRepository.findOperativeByIds(skillIds);

    const correctlyAnsweredChallengeSnapshots =
      _challengeSnapshotsFromAnswersAndKnowledgeElements(answers, knowledgeElements);

    const allChallenges = await challengeRepository.findFrenchFranceOperative();
    const challengesAlreadyAnswered = correctlyAnsweredChallengeSnapshots.map((challengeSnapshot) => {
      const challenge = _(allChallenges).find({ id: challengeSnapshot.challengeId });
      if (!challenge) {
        return null;
      }
      const challengeAssociatedSkills = skills.filter((skill) => challengeSnapshot.skillIds.includes(skill.id));
      return {
        id: challengeSnapshot.challengeId,
        skills: challengeAssociatedSkills,
        competenceId: challengeSnapshot.competenceId,
      };
    });

    challengesAlreadyAnswered.forEach((challenge) => {
      if (!challenge) {
        return;
      }

      const userCompetence = _getUserCompetenceByChallengeCompetenceId(placementProfile.userCompetences, challenge);

      if (!userCompetence || !userCompetence.isCertifiable()) {
        return;
      }

      challenge.skills
        .filter((skill) => _skillHasAtLeastOneChallenge(skill, allChallenges))
        .forEach((publishedSkill) => userCompetence.addSkill(publishedSkill));
    });

    const userCompetences = UserCompetence.orderSkillsOfCompetenceByDifficulty(placementProfile.userCompetences);
    let certificationChallengesByCompetence = {};

    userCompetences.forEach((userCompetence) => {
      userCompetence.skills.forEach((skill) => {
        if (!_hasCompetenceEnoughCertificationChallenges(userCompetence.id, certificationChallengesByCompetence)) {
          const challengesToValidateCurrentSkill = Challenge.findBySkill({ challenges: allChallenges, skill });
          const challengesLeftToAnswer = _.differenceBy(challengesToValidateCurrentSkill, challengesAlreadyAnswered, 'id');

          const challengesPoolToPickChallengeFrom = (_.isEmpty(challengesLeftToAnswer)) ? challengesToValidateCurrentSkill : challengesLeftToAnswer;
          const challenge = _.sample(challengesPoolToPickChallengeFrom);
          const certificationChallenge = new CertificationChallenge({
            challengeId: challenge.id,
            competenceId: userCompetence.id,
            associatedSkillName: skill.name,
            associatedSkillId: skill.id
          });
          certificationChallengesByCompetence = _addUniqueCertificationChallengeForCompetence(certificationChallengesByCompetence, certificationChallenge);
        }
      });
    });

    return _.flatten(Object.values(certificationChallengesByCompetence));
  },
};

function _hasCompetenceEnoughCertificationChallenges(competenceId, certificationChallengesByCompetence) {
  const certificationChallengesForGivenCompetence = certificationChallengesByCompetence[competenceId] || [];
  return certificationChallengesForGivenCompetence.length >= MAX_CHALLENGES_PER_SKILL_FOR_CERTIFICATION;
}

function _addUniqueCertificationChallengeForCompetence(certificationChallengesByCompetence, certificationChallenge) {
  const mutatedCertificationChallengesByCompetence = _.cloneDeep(certificationChallengesByCompetence);
  const certificationChallengesForGivenCompetence = mutatedCertificationChallengesByCompetence[certificationChallenge.competenceId] || [];
  if (!_.some(certificationChallengesForGivenCompetence, { challengeId: certificationChallenge.challengeId })) {
    certificationChallengesForGivenCompetence.push(certificationChallenge);
  }
  mutatedCertificationChallengesByCompetence[certificationChallenge.competenceId] = certificationChallengesForGivenCompetence;
  return mutatedCertificationChallengesByCompetence;
}

function _getUserCompetenceByChallengeCompetenceId(userCompetences, challenge) {
  return challenge ? userCompetences.find((userCompetence) => userCompetence.id === challenge.competenceId) : null;
}

function _skillHasAtLeastOneChallenge(skill, challenges) {
  const challengesBySkill = Challenge.findBySkill({ challenges, skill });
  return challengesBySkill.length > 0;
}
