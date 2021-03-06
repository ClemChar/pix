const faker = require('faker');
const buildSkill = require('./build-skill');
const TargetProfile = require('../../../../lib/domain/models/TargetProfile');

module.exports = function buildTargetProfile({
  id = faker.random.number(),
  name = faker.name.jobTitle(),
  imageUrl = faker.internet.url(),
  isPublic = faker.random.boolean(),
  skills = [buildSkill()],
  organizationId = faker.random.number(),
  organizationsSharedId = [],
  outdated = false,
  stages = [],
} = {}) {
  return new TargetProfile({
    id,
    name,
    imageUrl,
    isPublic,
    skills,
    organizationId,
    organizationsSharedId,
    outdated,
    stages,
  });
};
