const _ = require('lodash');
const { AlreadyExistingEntity } = require('../../domain/errors');

module.exports = async function updateStudentNumber({
  schoolingRegistrationRepository,
  student
}) {
  //  check if userId has rights
  console.log(student);
  const { studentNumber } = student;
  const { organizationId } = await schoolingRegistrationRepository.get(student.id);

  if (!organizationId) {
    throw new AlreadyExistingEntity();
  }

  const doesNotExist = _.isEmpty(await schoolingRegistrationRepository.findByOrganizationIdAndUserData({ organizationId, reconciliationInfo: { birthDate: null, studentNumber } }));

  if (doesNotExist) {
    console.log('go update');
  } else {
    console.log('no go');
  }
  // await schoolingRegistrationRepository.updateStudentNumber(studentId, studentNumber);
};

