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

function _challengeSnapshotsFromAnswersAndKnowledgeElements(answers, knowledgeElements) {
  // ici, enrichir avec skillId pour passer d'une answerSnapshot à un challengeSnapshot
  return answers.map((answer) => {
    const knowledgeElement = knowledgeElements.find((knowledgeElement) => knowledgeElement.answerId === answer.id);
    return {
      challengeId: answer.challengeId,
      competenceId: knowledgeElement.competenceId
      // TODO [1] : skills : [knowledgeElement.skillId]
    };
  });
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
      _challengeSnapshotsFromAnswersAndKnowledgeElements(answers, knowledgeElements);

    const allChallenges = await challengeRepository.findFrenchFranceOperative();
    const challengesAlreadyAnswered = correctlyAnsweredChallengeSnapshots.map((challengeSnapshot) => {
      const challenge = _(allChallenges).find({ id: challengeSnapshot.challengeId });
      if (!challenge) {
        return null;
      }
      /* FIXME: Pourquoi on fait un find sur le challenge du référentiel si c'est pour n'utiliser que les infos du KE ?
      L'impact que ça a c'est de ne pas tenir compte des questions qui seraient devenues non-opérationnelles dans le choix des skills à tester
      Ex. Je suis positionné sur la question 4 associée à l'époque à la skill 12
      Si la question 4 est périmée entre temps, je ne serai pas testé sur la skill 12...
      On devrait avoir cette restriction de questions opérationnelles seulement au moment du sample pas au moment de la determination des skills à tester
      */
      return {
        // ici on veut l'ancienne compétence (et skill ?)
        id: challengeSnapshot.challengeId,
        skills: challenge.skills, // TODO [2] : challenge.skills -> challengeSnapshot.skills
        competenceId: challengeSnapshot.competenceId,
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
