const _ = require('lodash');
const CertificationChallenge = require('../models/CertificationChallenge');
const {
  MAX_CHALLENGES_PER_SKILL_FOR_CERTIFICATION,
} = require('../constants');

const KnowledgeElement = require('../models/KnowledgeElement');
const UserCompetence = require('../models/UserCompetence');
const Challenge = require('../models/Challenge');
const challengeRepository = require('../../infrastructure/repositories/challenge-repository');
const answerRepository = require('../../infrastructure/repositories/answer-repository');
const knowledgeElementRepository = require('../../infrastructure/repositories/knowledge-element-repository');

function _challengeSnapshotsFromChallengesAndKnowledgeElements(answers, knowledgeElements) {
  // ici, enrichir avec competenceId et skillId pour passer d'une answerSnapshot à un challengeSnapshot
  return answers;
}
module.exports = {

  async pickCertificationChallenges(placementProfile) {
    const knowledgeElementsByCompetence = await knowledgeElementRepository
      .findUniqByUserIdGroupedByCompetenceId({ userId: placementProfile.userId, limitDate: placementProfile.profileDate });

    // TODOMAYBE: answerSnapshot = {answerId, competenceId, skillId}
    const knowledgeElements = KnowledgeElement.findDirectlyValidatedFromGroups(knowledgeElementsByCompetence);
    const answerIds = _.map(knowledgeElements, 'answerId');
    const answers = await answerRepository.findByIds(answerIds);

    const correctlyAnsweredChallengeSnapshots =
      _challengeSnapshotsFromChallengesAndKnowledgeElements(answers, knowledgeElements);

    const allChallenges = await challengeRepository.findFrenchFranceOperative();
    const challengesAlreadyAnswered = correctlyAnsweredChallengeSnapshots.map((challengeSnapshot) => {
      const challenge = _(allChallenges).find({ id: challengeSnapshot.challengeId });
      if (!challenge) {
        return null;
      }
      return {
        // ici on veut l'ancienne compétence (et skill ?)
        id: challenge.id,
        skills: challenge.skills,
        competenceId: challenge.competenceId,
      };
    });

    challengesAlreadyAnswered.forEach((challenge) => {
      if (!challenge) {
        return;
      }

      // grâce au boulot ci-dessus ici ça doit fonctionner
      const userCompetence = _getUserCompetenceByChallengeCompetenceId(placementProfile.userCompetences, challenge);

      if (!userCompetence || !userCompetence.isCertifiable()) {
        return;
      }

      challenge.skills
        .filter((skill) => _skillHasAtLeastOneChallenge(skill, allChallenges))
        // ici c'est la skill archivée (qu'on est censé avoir dans le ke) qu'on veut lister
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
            competenceId: skill.competenceId,
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
