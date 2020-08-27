const fs = require('fs');
const _ = require('lodash');
const bookshelfToDomainConverter = require('../lib/infrastructure/utils/bookshelf-to-domain-converter');
const CertificationChallengeBookshelf = require('../lib/infrastructure/data/certification-challenge');
const KnowledgeElementBookshelf = require('../lib/infrastructure/data/knowledge-element');

const FILENAME = 'competence-details.html';
const HEADCONTENT = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8">
    <link rel="stylesheet" type="text/css" href="competence-details.css">
    <title>Cheat view</title>
  </head>
<body>\n`;
const ENDCONTENT = '\n</body>\n</html>\n';

function initializeDOM(dom) { return dom + HEADCONTENT; }

async function completeUserCompetences(dom, userId, courseId) {
  const KEs = await getAllKE(userId);
  const testedChallenges = await getAllTestedChallenges(courseId);
  dom += createCompetencesDivByKEs(userId, KEs, testedChallenges);
  return dom;
}

async function getAllKE(userId) {
  const KEs = await KnowledgeElementBookshelf
    // id, createdAt, source, status, earnedPix, answerId, assessmentId, userId, competenceId
    .where({ userId, source: 'direct', status: 'validated' })
    .fetchAll();
  return KEs.map((ke) => bookshelfToDomainConverter.buildDomainObject(KnowledgeElementBookshelf, ke));
}
async function getAllTestedChallenges(courseId) {
  const challengeList = await CertificationChallengeBookshelf
    // id, associatedSkillName, associatedSkillId, challengeId, competenceId
    .where({ courseId })
    .fetchAll();
  return challengeList.map((challenge) => bookshelfToDomainConverter.buildDomainObject(CertificationChallengeBookshelf, challenge));
}

function createCompetencesDivByKEs(userId, KEs, testedChallenges) {
  let acc = '<h1>Positionnement de l\'utilisateur : ' + userId + '</h1>';
  const competences = mergeTestedChallengeAndKeByCompetences({ KEs, testedChallenges });

  _.forIn(competences, (competence) => {
    acc += '<div class="competence-box">'
    acc += '<h2>CompetenceId: ' + competence.competenceId + '</h2>'

    _.forIn(competence.skills, (skill) => {
      if(skill.skillWasTestedInCertif) {
        acc += '<p class="skill-tested-in-certif">SkillId: ' + skill.skillId + '  ('+ skill.mbTestedChallenge.associatedSkillName + ')</p>';
      } else {
        acc += '<p>SkillId: ' + skill.skillId + '</p>';
      }
      // console.log({skill})
    });
    acc +='</div>'
  });
  return acc;
}

function mergeTestedChallengeAndKeByCompetences({KEs, testedChallenges}) {
  const keGroupedByCompetences = _.groupBy(KEs, 'competenceId');
  const keAndCertifChallengePerCompetence = _.map(keGroupedByCompetences, (KEs, competenceId) => {
    const keGroupBySkill = _.groupBy(KEs, 'skillId');
    const keGroup = _.map(keGroupBySkill, (ke, skillId) => {
      const mbTestedChallenge = _.find(testedChallenges, (challenge) => challenge.associatedSkillId == ke[0].skillId.toString());
      return { skillId, skillWasTestedInCertif: Boolean(mbTestedChallenge), ke, mbTestedChallenge }
    });
    return { competenceId, skills: keGroup };
  });
  console.log({keAndCertifChallengePerCompetence})
  return keAndCertifChallengePerCompetence;
}

function finalizeDOM(dom) { return dom + ENDCONTENT; }

function createWebPageWithRowDom(dom) {
  fs.writeFile(FILENAME, dom, function (err) {
    if (err) throw err;
    console.log('Competence-detail page created !');
  });
}

async function main() {
  try {
    const userId = parseInt(process.argv[2]);
    if(!userId) throw Error('Please give a correct userId !');

    const certifCourseId = parseInt(process.argv[3]);
    if(!certifCourseId) throw Error('Please give a correct certifCourseId !');
  
    let dom = '';
    dom = initializeDOM(dom);
    dom = await completeUserCompetences(dom, userId, certifCourseId);
    dom = finalizeDOM(dom);
  
    createWebPageWithRowDom(dom);
  } catch (error) {
    console.error(error);
  }
  
}

main();
