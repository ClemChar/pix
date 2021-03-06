const {
  MINIMUM_COMPETENCE_LEVEL_FOR_CERTIFIABILITY,
} = require('../constants');

const Skill = require('./Skill');
const _ = require('lodash');

class UserCompetence {

  constructor({
    id,
    // attributes
    index,
    name,
    area,
    pixScore,
    estimatedLevel,
    // includes
    // references
  } = {}) {
    this.id = id;
    // attributes
    this.index = index;
    this.name = name;
    this.area = area;
    this.pixScore = pixScore;
    this.estimatedLevel = estimatedLevel;
    // includes
    this.skills = [];
    // references
  }

  addSkill(newSkill) {
    const hasAlreadySkill = _(this.skills).filter((skill) => skill.name === newSkill.name).size();

    if (!hasAlreadySkill) {
      this.skills.push(newSkill);
    }
  }

  isCertifiable() {
    return this.estimatedLevel >= MINIMUM_COMPETENCE_LEVEL_FOR_CERTIFIABILITY;
  }

  static orderSkillsOfCompetenceByDifficulty(userCompetences) {
    return _.map(userCompetences, (userCompetence) => {
      userCompetence.skills = Skill.sortByDecreasingDifficulty(userCompetence.skills);
      return userCompetence;
    });
  }
}

module.exports = UserCompetence;
