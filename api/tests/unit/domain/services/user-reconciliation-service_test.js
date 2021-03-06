const { expect, sinon, domainBuilder, catchErr } = require('../../../test-helper');
const userReconciliationService = require('../../../../lib/domain/services/user-reconciliation-service');
const {
  NotFoundError, SchoolingRegistrationAlreadyLinkedToUserError, AlreadyRegisteredUsernameError
} = require('../../../../lib/domain/errors');

describe('Unit | Service | user-reconciliation-service', () => {

  let schoolingRegistrations;

  beforeEach(() => {
    schoolingRegistrations = [
      domainBuilder.buildSchoolingRegistration({
        firstName: 'firstName',
        middleName: 'middleName',
        thirdName: 'thirdName',
        lastName: 'lastName',
        preferredLastName: 'preferredLastName',
      }),
      domainBuilder.buildSchoolingRegistration({
        firstName: 'secondRegistration_firstName',
        middleName: 'secondRegistration_middleName',
        thirdName: 'secondRegistration_thirdName',
        lastName: 'secondRegistration_lastName',
        preferredLastName: 'secondRegistration_preferredLastName',
      }),
    ];
  });

  describe('#findMatchingCandidateIdForGivenUser', () => {

    const user = {
      firstName: 'Joe',
      lastName: 'Poe',
    };

    context('When schoolingRegistration list is empty', () => {
      it('should return null', async () => {
        // when
        const result = await userReconciliationService.findMatchingCandidateIdForGivenUser([], user);

        // then
        expect(result).to.equal(null);
      });
    });

    context('When schoolingRegistration list is not empty', () => {

      context('When no schoolingRegistration matched on names', () => {

        it('should return null if name is completely different', async () => {
          // given
          user.firstName = 'Sam';

          schoolingRegistrations[0].firstName = 'Joe';
          schoolingRegistrations[0].lastName = user.lastName;

          // when
          const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

          // then
          expect(result).to.equal(null);
        });

        it('should return null if name is not close enough', async () => {
          // given
          user.firstName = 'Frédérique';

          schoolingRegistrations[0].firstName = 'Frédéric';
          schoolingRegistrations[0].lastName = user.lastName;

          // when
          const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

          // then
          expect(result).to.equal(null);
        });

      });

      context('When one schoolingRegistration matched on names', () => {

        context('When schoolingRegistration found based on his...', () => {

          it('...firstName', async () => {
            // given
            schoolingRegistrations[0].firstName = user.firstName;
            schoolingRegistrations[0].lastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[0].id);
          });

          it('...middleName', async () => {
            // given
            schoolingRegistrations[0].middleName = user.firstName;
            schoolingRegistrations[0].lastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[0].id);
          });

          it('...thirdName', async () => {
            // given
            schoolingRegistrations[0].thirdName = user.firstName;
            schoolingRegistrations[0].lastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[0].id);
          });

          it('...lastName', async () => {
            // given
            schoolingRegistrations[0].firstName = user.firstName;
            schoolingRegistrations[0].lastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[0].id);
          });

          it('...preferredLastName', async () => {
            // given
            schoolingRegistrations[0].firstName = user.firstName;
            schoolingRegistrations[0].preferredLastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[0].id);
          });

          it('...firstName with empty middleName', async () => {
            // given
            schoolingRegistrations[0].firstName = user.firstName;
            schoolingRegistrations[0].middleName = null;
            schoolingRegistrations[0].lastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[0].id);
          });

          it('...preferredLastName with empty lastName', async () => {
            // given
            schoolingRegistrations[0].firstName = user.firstName;
            schoolingRegistrations[0].preferredLastName = user.lastName;
            schoolingRegistrations[0].lastName = null;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[0].id);
          });

          it('...lastName with empty preferredLastName', async () => {
            // given
            schoolingRegistrations[0].firstName = user.firstName;
            schoolingRegistrations[0].preferredLastName = null;
            schoolingRegistrations[0].lastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[0].id);
          });
        });

        context('When schoolingRegistration found even if there is...', () => {

          it('...an accent', async () => {
            // given
            user.firstName = 'Joé';

            schoolingRegistrations[0].firstName = 'Joe';
            schoolingRegistrations[0].lastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[0].id);
          });

          it('...a white space', async () => {
            // given
            user.firstName = 'Jo e';

            schoolingRegistrations[0].firstName = 'Joe';
            schoolingRegistrations[0].lastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[0].id);
          });

          it('...a special character', async () => {
            // given
            user.firstName = 'Jo~e';

            schoolingRegistrations[0].firstName = 'Joe';
            schoolingRegistrations[0].lastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[0].id);
          });
        });

        context('When multiple matches', () => {

          it('should prefer firstName over middleName', async () => {
            // given
            schoolingRegistrations[0].middleName = user.firstName;
            schoolingRegistrations[0].lastName = user.lastName;

            schoolingRegistrations[1].firstName = user.firstName;
            schoolingRegistrations[1].lastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[1].id);
          });

          it('should prefer middleName over thirdName', async () => {
            // given
            schoolingRegistrations[0].thirdName = user.firstName;
            schoolingRegistrations[0].lastName = user.lastName;

            schoolingRegistrations[1].middleName = user.firstName;
            schoolingRegistrations[1].lastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(schoolingRegistrations[1].id);
          });

          it('should prefer nobody with same lastName and preferredLastName', async () => {
            // given
            schoolingRegistrations[0].firstName = user.firstName;
            schoolingRegistrations[0].lastName = user.lastName;

            schoolingRegistrations[1].firstName = user.firstName;
            schoolingRegistrations[1].preferredLastName = user.lastName;

            // when
            const result = await userReconciliationService.findMatchingCandidateIdForGivenUser(schoolingRegistrations, user);

            // then
            expect(result).to.equal(null);
          });
        });
      });
    });
  });

  describe('#findMatchingSchoolingRegistrationIdForGivenOrganizationIdAndUser', () => {

    let user;
    let organizationId;
    let schoolingRegistrationRepositoryStub;
    let userRepositoryStub;
    let obfuscationServiceStub;

    beforeEach(() => {
      organizationId = domainBuilder.buildOrganization().id;
      schoolingRegistrationRepositoryStub = {
        findByOrganizationIdAndUserData: sinon.stub(),
      };
    });

    context('When schooling registrations are found for organization and birthdate', () => {

      beforeEach(() => {
        schoolingRegistrationRepositoryStub.findByOrganizationIdAndUserData.resolves(schoolingRegistrations);
      });

      context('When no schooling registrations matched on names', () => {

        it('should throw NotFoundError', async () => {
          // given
          user = {
            firstName: 'fakeFirstName',
            lastName: 'fakeLastName',
          };

          // when
          const result = await catchErr(userReconciliationService.findMatchingSchoolingRegistrationIdForGivenOrganizationIdAndUser)({ organizationId, reconciliationInfo: user, schoolingRegistrationRepository: schoolingRegistrationRepositoryStub });

          // then
          expect(result).to.be.instanceOf(NotFoundError);
          expect(result.message).to.equal('There were no schoolingRegistrations matching with names');
        });

      });

      context('When one schooling registration matched on names', () => {

        beforeEach(() => {
          user = {
            firstName: schoolingRegistrations[0].firstName,
            lastName: schoolingRegistrations[0].lastName,
          };
        });

        context('When schoolingRegistration is already linked', () => {
          beforeEach(() => {
            schoolingRegistrations[0].userId = '123';
            userRepositoryStub = {
              getUserAuthenticationMethods: sinon.stub().resolves(),
            };
            obfuscationServiceStub = {
              getUserAuthenticationMethodWithObfuscation: sinon.stub().returns({ authenticatedBy: 'email' }),
            };
          });

          it('should throw OrganizationStudentAlreadyLinkedToUserError', async () => {
            // given
            schoolingRegistrationRepositoryStub.findByOrganizationIdAndUserData.resolves(schoolingRegistrations);

            // when
            const result = await catchErr(userReconciliationService.findMatchingSchoolingRegistrationIdForGivenOrganizationIdAndUser)({ organizationId, reconciliationInfo: user, schoolingRegistrationRepository: schoolingRegistrationRepositoryStub, userRepository: userRepositoryStub, obfuscationService: obfuscationServiceStub });

            // then
            expect(result).to.be.instanceOf(SchoolingRegistrationAlreadyLinkedToUserError);
          });
        });

        context('When schoolingRegistration is not already linked', () => {

          it('should return matchedSchoolingRegistration', async () => {
            // when
            const result = await userReconciliationService.findMatchingSchoolingRegistrationIdForGivenOrganizationIdAndUser({ organizationId, reconciliationInfo: user, schoolingRegistrationRepository: schoolingRegistrationRepositoryStub });

            // then
            expect(result).to.equal(schoolingRegistrations[0]);
          });
        });
      });
    });

    context('When schooling registrations are found for organization and student number', () => {
      it('should return the schooling registration for the given student number', async () => {
        // given
        schoolingRegistrationRepositoryStub.findByOrganizationIdAndUserData.resolves([schoolingRegistrations[0]]);
        user = {
          studentNumber: '123A',
        };

        // when
        const result = await userReconciliationService.findMatchingSchoolingRegistrationIdForGivenOrganizationIdAndUser({ organizationId, reconciliationInfo: user, schoolingRegistrationRepository: schoolingRegistrationRepositoryStub });

        // then
        expect(result).to.equal(schoolingRegistrations[0]);
      });

      it('should return an error when no schooling registration found for the given student number', async () => {
        // given
        schoolingRegistrationRepositoryStub.findByOrganizationIdAndUserData.resolves([]);
        user = {
          studentNumber: '123A',
        };

        // when
        const result = await catchErr(userReconciliationService.findMatchingSchoolingRegistrationIdForGivenOrganizationIdAndUser)({ organizationId, reconciliationInfo: user, schoolingRegistrationRepository: schoolingRegistrationRepositoryStub });

        // then
        expect(result).to.be.instanceOf(NotFoundError);
        expect(result.message).to.equal('There are no schooling registrations found');
      });

      it('should return an error when the schooling registration was already associated with another user', async () => {
        // given
        schoolingRegistrations[0].userId = '123';
        userRepositoryStub = {
          getUserAuthenticationMethods: sinon.stub().resolves(),
        };
        obfuscationServiceStub = {
          getUserAuthenticationMethodWithObfuscation: sinon.stub().returns({ authenticatedBy: 'email' }),
        };
        schoolingRegistrationRepositoryStub.findByOrganizationIdAndUserData.resolves([schoolingRegistrations[0]]);
        user = {
          studentNumber: '123A',
        };

        // when
        const result = await catchErr(userReconciliationService.findMatchingSchoolingRegistrationIdForGivenOrganizationIdAndUser)({ organizationId, reconciliationInfo: user, schoolingRegistrationRepository: schoolingRegistrationRepositoryStub, userRepository: userRepositoryStub, obfuscationService: obfuscationServiceStub });

        // then
        expect(result).to.be.instanceOf(SchoolingRegistrationAlreadyLinkedToUserError);
      });
    });

    context('When no schooling registrations found', () => {

      beforeEach(() => {
        schoolingRegistrationRepositoryStub.findByOrganizationIdAndUserData.resolves([]);
      });

      it('should throw NotFoundError', async () => {
        // given
        user = {
          firstName: 'fakeFirstName',
          lastName: 'fakeLastName',
        };

        // when
        const result = await catchErr(userReconciliationService.findMatchingSchoolingRegistrationIdForGivenOrganizationIdAndUser)({ organizationId, reconciliationInfo: user, schoolingRegistrationRepository: schoolingRegistrationRepositoryStub });

        // then
        expect(result).to.be.instanceOf(NotFoundError, 'There were no schoolingRegistrations matching');
      });
    });
  });

  describe('#generateUsernameUntilAvailable', () => {

    let userRepository;

    beforeEach(() => {
      userRepository = {
        isUsernameAvailable: sinon.stub()
      };
    });

    it('should generate a username with original inputs', async () => {
      // given
      const firstPart = 'firstname.lastname';
      const secondPart = '0101';

      userRepository.isUsernameAvailable.resolves();
      const expectedUsername = firstPart + secondPart;

      // when
      const result = await userReconciliationService.generateUsernameUntilAvailable({ firstPart, secondPart, userRepository });

      // then
      expect(result).to.equal(expectedUsername);
    });

    it('should generate an other username when exist with original inputs', async () => {
      // given
      const firstPart = 'firstname.lastname';
      const secondPart = '0101';

      userRepository.isUsernameAvailable
        .onFirstCall().rejects(new AlreadyRegisteredUsernameError())
        .onSecondCall().resolves();

      const originalUsername = firstPart + secondPart;

      // when
      const result = await userReconciliationService.generateUsernameUntilAvailable({ firstPart, secondPart, userRepository });

      // then
      expect(result).to.not.equal(originalUsername);
    });

  });

  describe('#createUsernameByUserAndStudentId', () => {

    const user = {
      firstName: 'fakeFirst-Name',
      lastName: 'fake LastName',
      birthdate: '2008-03-01'
    };
    const originaldUsername = 'fakefirstname.fakelastname0103';

    let userRepository;

    beforeEach(() => {
      userRepository = {
        isUsernameAvailable: sinon.stub()
      };
    });

    it('should generate a username with original user properties', async () => {
      // given
      userRepository.isUsernameAvailable.resolves();

      // when
      const result = await userReconciliationService.createUsernameByUser({ user, userRepository });

      // then
      expect(result).to.equal(originaldUsername);
    });

    it('should generate a other username when exist whith original inputs', async () => {
      // given
      userRepository.isUsernameAvailable
        .onFirstCall().rejects(new AlreadyRegisteredUsernameError())
        .onSecondCall().resolves();

      // when
      const result = await userReconciliationService.createUsernameByUser({ user, userRepository });

      // then
      expect(result).to.not.equal(originaldUsername);
    });
  });

  describe('#doesSupernumerarySchoolingRegistrationExist', () => {

    let user;
    let organizationId;
    let schoolingRegistrationRepositoryStub;

    beforeEach(() => {
      organizationId = domainBuilder.buildOrganization().id;
      schoolingRegistrationRepositoryStub = {
        findSupernumeraryByOrganizationIdAndBirthdate: sinon.stub(),
      };
    });

    context('When schooling registrations are found for organization and birthdate', () => {

      beforeEach(() => {
        schoolingRegistrationRepositoryStub.findSupernumeraryByOrganizationIdAndBirthdate.resolves(schoolingRegistrations);
        user = {
          firstName: schoolingRegistrations[0].firstName,
          lastName: schoolingRegistrations[0].lastName,
        };
      });

      it('should return true', async () => {
        // when
        const result = await userReconciliationService.doesSupernumerarySchoolingRegistrationExist({ organizationId, reconciliationInfo: user, schoolingRegistrationRepository: schoolingRegistrationRepositoryStub });

        // then
        expect(result).to.be.true;
      });
    });

    context('When no schooling registrations found', () => {

      beforeEach(() => {
        schoolingRegistrationRepositoryStub.findSupernumeraryByOrganizationIdAndBirthdate.resolves([]);
      });

      it('should return false', async () => {
        // given
        user = {
          firstName: 'fakeFirstName',
          lastName: 'fakeLastName',
        };

        // when
        const result = await userReconciliationService.doesSupernumerarySchoolingRegistrationExist({ organizationId, reconciliationInfo: user, schoolingRegistrationRepository: schoolingRegistrationRepositoryStub });

        // then
        expect(result).to.be.false;
      });
    });
  });
});
