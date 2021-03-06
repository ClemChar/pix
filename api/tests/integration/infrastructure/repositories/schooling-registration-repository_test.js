const { expect, databaseBuilder, knex, catchErr } = require('../../../test-helper');
const _ = require('lodash');
const schoolingRegistrationRepository = require('../../../../lib/infrastructure/repositories/schooling-registration-repository');
const SchoolingRegistration = require('../../../../lib/domain/models/SchoolingRegistration');
const UserWithSchoolingRegistration = require('../../../../lib/domain/models/UserWithSchoolingRegistration');

const { NotFoundError, SameNationalStudentIdInOrganizationError, UserCouldNotBeReconciledError } = require('../../../../lib/domain/errors');

describe('Integration | Infrastructure | Repository | schooling-registration-repository', () => {

  describe('#findByOrganizationId', () => {

    it('should return instances of SchoolingRegistration', async () => {
      // given
      const organization = databaseBuilder.factory.buildOrganization();
      const schoolingRegistration = databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        userId: null,
      });

      await databaseBuilder.commit();

      // when
      const schoolingRegistrations = await schoolingRegistrationRepository.findByOrganizationId({ organizationId: organization.id });

      // then
      const anySchoolingRegistration = schoolingRegistrations[0];
      expect(anySchoolingRegistration).to.be.an.instanceOf(SchoolingRegistration);

      expect(anySchoolingRegistration.firstName).to.equal(schoolingRegistration.firstName);
      expect(anySchoolingRegistration.lastName).to.equal(schoolingRegistration.lastName);
      expect(anySchoolingRegistration.birthdate).to.deep.equal(schoolingRegistration.birthdate);
    });

    it('should return all the schoolingRegistrations for a given organization ID', async () => {
      // given
      const organization_1 = databaseBuilder.factory.buildOrganization();
      const organization_2 = databaseBuilder.factory.buildOrganization();

      const user = databaseBuilder.factory.buildUser();

      const schoolingRegistration_1 = databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization_1.id });
      const schoolingRegistration_2 = databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization_1.id, userId: user.id });
      databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization_2.id });

      await databaseBuilder.commit();

      // when
      const schoolingRegistrations = await schoolingRegistrationRepository.findByOrganizationId({ organizationId: organization_1.id });

      // then
      expect(_.map(schoolingRegistrations, 'id')).to.have.members([schoolingRegistration_1.id, schoolingRegistration_2.id]);
    });

    it('should order schoolingRegistrations by lastName and then by firstName with no sensitive case', async () => {
      // given
      const organization = databaseBuilder.factory.buildOrganization();

      const schoolingRegistration_1 = databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, lastName: 'Grenier' });
      const schoolingRegistration_2 = databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        lastName: 'Avatar',
        firstName: 'Xavier'
      });
      const schoolingRegistration_3 = databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        lastName: 'Avatar',
        firstName: 'Arthur'
      });
      const schoolingRegistration_4 = databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        lastName: 'Avatar',
        firstName: 'MATHURIN'
      });

      await databaseBuilder.commit();

      // when
      const schoolingRegistrations = await schoolingRegistrationRepository.findByOrganizationId({ organizationId: organization.id });

      // then
      expect(_.map(schoolingRegistrations, 'id')).to.deep.include.ordered.members([schoolingRegistration_3.id, schoolingRegistration_4.id, schoolingRegistration_2.id, schoolingRegistration_1.id]);
    });
  });

  describe('#findByUserId', () => {

    it('should return instances of SchoolingRegistration', async () => {
      // given
      const organization = databaseBuilder.factory.buildOrganization();
      const userId = databaseBuilder.factory.buildUser().id;
      const schoolingRegistration = databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        userId,
      });

      await databaseBuilder.commit();

      // when
      const schoolingRegistrations = await schoolingRegistrationRepository.findByUserId({ userId });

      // then
      const anySchoolingRegistration = schoolingRegistrations[0];
      expect(anySchoolingRegistration).to.be.an.instanceOf(SchoolingRegistration);

      expect(anySchoolingRegistration.firstName).to.equal(schoolingRegistration.firstName);
      expect(anySchoolingRegistration.lastName).to.equal(schoolingRegistration.lastName);
      expect(anySchoolingRegistration.birthdate).to.deep.equal(schoolingRegistration.birthdate);
    });

    it('should return all the schoolingRegistrations for a given user ID', async () => {
      // given
      const userId = databaseBuilder.factory.buildUser().id;

      const schoolingRegistration_1 = databaseBuilder.factory.buildSchoolingRegistration({ userId });
      const schoolingRegistration_2 = databaseBuilder.factory.buildSchoolingRegistration({ userId });

      await databaseBuilder.commit();

      // when
      const schoolingRegistrations = await schoolingRegistrationRepository.findByUserId({ userId });

      // then
      expect(_.map(schoolingRegistrations, 'id')).to.have.members([schoolingRegistration_1.id, schoolingRegistration_2.id]);
    });

    it('should order schoolingRegistrations by id', async () => {
      // given
      const userId = databaseBuilder.factory.buildUser().id;
      const schoolingRegistration_1 = databaseBuilder.factory.buildSchoolingRegistration({ userId });
      const schoolingRegistration_2 = databaseBuilder.factory.buildSchoolingRegistration({ userId });
      const schoolingRegistration_3 = databaseBuilder.factory.buildSchoolingRegistration({ userId });
      const schoolingRegistration_4 = databaseBuilder.factory.buildSchoolingRegistration({ userId });

      await databaseBuilder.commit();

      // when
      const schoolingRegistrations = await schoolingRegistrationRepository.findByUserId({ userId });

      // then
      expect(_.map(schoolingRegistrations, 'id')).to.deep.include.ordered.members([schoolingRegistration_1.id, schoolingRegistration_2.id, schoolingRegistration_3.id, schoolingRegistration_4.id]);
    });
  });

  describe('#addOrUpdateOrganizationSchoolingRegistrations', () => {

    context('when there are only schoolingRegistrations to create', () => {

      let schoolingRegistrations;
      let organizationId;
      let schoolingRegistration_1, schoolingRegistration_2;

      beforeEach(async () => {
        organizationId = databaseBuilder.factory.buildOrganization().id;
        await databaseBuilder.commit();

        schoolingRegistration_1 = new SchoolingRegistration({
          firstName: 'Lucy',
          lastName: 'Handmade',
          birthdate: '1990-12-31',
          nationalStudentId: 'INE1',
          organizationId,
        });

        schoolingRegistration_2 = new SchoolingRegistration({
          firstName: 'Harry',
          lastName: 'Covert',
          birthdate: '1990-01-01',
          nationalStudentId: 'INE2',
          organizationId,
        });

        schoolingRegistrations = [schoolingRegistration_1, schoolingRegistration_2];
      });

      afterEach(() => {
        return knex('schooling-registrations').delete();
      });

      it('should create all schoolingRegistrations', async function() {
        // when
        await schoolingRegistrationRepository.addOrUpdateOrganizationSchoolingRegistrations(schoolingRegistrations, organizationId);

        // then
        const actualSchoolingRegistrations = await knex('schooling-registrations').where({ organizationId });
        expect(actualSchoolingRegistrations).to.have.lengthOf(2);
        expect(_.map(actualSchoolingRegistrations, 'firstName')).to.have.members([schoolingRegistration_1.firstName, schoolingRegistration_2.firstName]);
      });
    });

    context('when there are only schoolingRegistrations to update', () => {
      let schoolingRegistration_1;
      let schoolingRegistration_2;
      let organizationId;

      beforeEach(async () => {
        organizationId = databaseBuilder.factory.buildOrganization().id;
        schoolingRegistration_1 = {
          firstName: 'Lucy',
          lastName: 'Handmade',
          birthdate: '1990-12-31',
          nationalStudentId: 'INE1',
          organizationId,
        };
        schoolingRegistration_2 = {
          firstName: 'Harry',
          lastName: 'Covert',
          birthdate: '1990-01-01',
          nationalStudentId: 'INE2',
          organizationId,
        };
        _.each([schoolingRegistration_1, schoolingRegistration_2], (schoolingRegistration) => databaseBuilder.factory.buildSchoolingRegistration(schoolingRegistration));

        await databaseBuilder.commit();
      });

      context('when a schoolingRegistration is already imported', async function() {

        let schoolingRegistration_1_updated, schoolingRegistration_2_updated;
        let schoolingRegistrations;

        beforeEach(() => {
          // given
          schoolingRegistration_1_updated = new SchoolingRegistration({
            firstName: 'Lili',
            lastName: schoolingRegistration_1.lastName,
            birthdate: schoolingRegistration_1.birthdate,
            nationalStudentId: schoolingRegistration_1.nationalStudentId,
            organizationId,
          });
          schoolingRegistration_2_updated = new SchoolingRegistration({
            firstName: 'Mimi',
            lastName: schoolingRegistration_2.lastName,
            birthdate: schoolingRegistration_2.birthdate,
            nationalStudentId: schoolingRegistration_2.nationalStudentId,
            organizationId,
          });

          schoolingRegistrations = [schoolingRegistration_1_updated, schoolingRegistration_2_updated];
        });

        it('should update schoolingRegistrations attributes', async () => {
          // when
          await schoolingRegistrationRepository.addOrUpdateOrganizationSchoolingRegistrations(schoolingRegistrations, organizationId);

          // then
          const updated_organization_schoolingRegistrations = await knex('schooling-registrations').where({ organizationId });

          expect(updated_organization_schoolingRegistrations).to.have.lengthOf(2);
          expect(_.find(updated_organization_schoolingRegistrations, { 'nationalStudentId': schoolingRegistration_1.nationalStudentId }).firstName).to.equal('Lili');
          expect(_.find(updated_organization_schoolingRegistrations, { 'nationalStudentId': schoolingRegistration_2.nationalStudentId }).firstName).to.equal('Mimi');
        });
      });

      context('when a schoolingRegistration is already imported in several organizations', async () => {

        let schoolingRegistration_1_updated;
        let schoolingRegistration_2_updated;
        let schoolingRegistration_1_bis;
        let otherOrganizationId;
        let schoolingRegistrations;

        beforeEach(async () => {
          otherOrganizationId = databaseBuilder.factory.buildOrganization().id;
          schoolingRegistration_1_bis = databaseBuilder.factory.buildSchoolingRegistration({
            firstName: 'Lucie',
            lastName: 'Handmad',
            birthdate: '1990-12-31',
            nationalStudentId: schoolingRegistration_1.nationalStudentId,
            organizationId: otherOrganizationId,
          });

          await databaseBuilder.commit();

          schoolingRegistration_1_updated = new SchoolingRegistration({
            firstName: 'Lili',
            lastName: schoolingRegistration_1.lastName,
            birthdate: schoolingRegistration_1.birthdate,
            nationalStudentId: schoolingRegistration_1.nationalStudentId,
            organizationId,
          });
          schoolingRegistration_2_updated = new SchoolingRegistration({
            firstName: 'Mimi',
            lastName: schoolingRegistration_2.lastName,
            birthdate: schoolingRegistration_2.birthdate,
            nationalStudentId: schoolingRegistration_2.nationalStudentId,
            organizationId,
          });

          schoolingRegistrations = [schoolingRegistration_1_updated, schoolingRegistration_2_updated];
        });

        it('should update the schoolingRegistration only in the organization that imports the file', async () => {
          // when
          await schoolingRegistrationRepository.addOrUpdateOrganizationSchoolingRegistrations(schoolingRegistrations, organizationId);

          // then
          const updated_organization_schoolingRegistrations = await knex('schooling-registrations').where({ organizationId });

          expect(updated_organization_schoolingRegistrations).to.have.lengthOf(2);
          expect(_.find(updated_organization_schoolingRegistrations, { 'nationalStudentId': schoolingRegistration_1.nationalStudentId }).firstName).to.equal(schoolingRegistration_1_updated.firstName);
          expect(_.find(updated_organization_schoolingRegistrations, { 'nationalStudentId': schoolingRegistration_2.nationalStudentId }).firstName).to.equal(schoolingRegistration_2_updated.firstName);

          const not_updated_organization_schoolingRegistrations = await knex('schooling-registrations').where({ organizationId: otherOrganizationId });

          expect(not_updated_organization_schoolingRegistrations).to.have.lengthOf(1);
          expect(not_updated_organization_schoolingRegistrations[0].firstName).to.equal(schoolingRegistration_1_bis.firstName);
        });
      });

    });

    context('when there are schoolingRegistrations in another organization', () => {
      let schoolingRegistrationInOtherOrganization, schoolingRegistrations;
      let organizationId;
      let schoolingRegistrationFromFile;
      let userId;
      let nationalStudentId;

      beforeEach(async () => {
        userId = databaseBuilder.factory.buildUser().id;
        organizationId = databaseBuilder.factory.buildOrganization().id;
        const otherOrganizationId = databaseBuilder.factory.buildOrganization().id;
        schoolingRegistrationInOtherOrganization = databaseBuilder.factory.buildSchoolingRegistration({ organizationId: otherOrganizationId });
        nationalStudentId = schoolingRegistrationInOtherOrganization.nationalStudentId;
        await databaseBuilder.commit();

        schoolingRegistrationFromFile = new SchoolingRegistration({
          firstName: 'Lucy',
          lastName: 'Handmade',
          birthdate: '1990-12-31',
          nationalStudentId,
          organizationId,
        });

        schoolingRegistrations = [schoolingRegistrationFromFile];
      });

      afterEach(() => {
        return knex('schooling-registrations').delete();
      });

      it('should create schoolingRegistration and reconcile it thanks to another schoolingRegistration', async () => {
        // given
        databaseBuilder.factory.buildSchoolingRegistration({ nationalStudentId, userId });
        databaseBuilder.factory.buildCertificationCourse({ userId });
        await databaseBuilder.commit();

        // when
        await schoolingRegistrationRepository.addOrUpdateOrganizationSchoolingRegistrations(schoolingRegistrations, organizationId);

        // then
        const newSchoolingRegistration = await knex('schooling-registrations').where({ organizationId, nationalStudentId });
        expect(newSchoolingRegistration[0].userId).to.equal(userId);
      });

      it('should update and reconcile schoolingRegistration thanks to another schoolingRegistration', async () => {
        // given
        databaseBuilder.factory.buildSchoolingRegistration({ organizationId, nationalStudentId, userId: null });
        databaseBuilder.factory.buildSchoolingRegistration({ nationalStudentId, userId });
        databaseBuilder.factory.buildCertificationCourse({ userId });
        await databaseBuilder.commit();

        // when
        await schoolingRegistrationRepository.addOrUpdateOrganizationSchoolingRegistrations(schoolingRegistrations, organizationId);

        // then
        const newSchoolingRegistration = await knex('schooling-registrations').where({ organizationId, nationalStudentId }).first();
        expect(newSchoolingRegistration.userId).to.equal(userId);
        expect(newSchoolingRegistration.firstName).to.equal(schoolingRegistrationFromFile.firstName);
      });

      context('when userId is already defined for a schoolingRegistration', () => {

        it('should update schoolingRegistration but not override userId', async () => {
          // given
          const expectedUserId = databaseBuilder.factory.buildSchoolingRegistration({ organizationId, nationalStudentId }).userId;
          await databaseBuilder.commit();

          // when
          await schoolingRegistrationRepository.addOrUpdateOrganizationSchoolingRegistrations(schoolingRegistrations, organizationId);

          // then
          const alreadyReconciledSchoolingRegistrations = await knex('schooling-registrations').where({ 'nationalStudentId': schoolingRegistrationFromFile.nationalStudentId, 'organizationId': organizationId }).first();
          expect(alreadyReconciledSchoolingRegistrations.userId).to.equal(expectedUserId);
          expect(alreadyReconciledSchoolingRegistrations.firstName).to.equal(schoolingRegistrationFromFile.firstName);
        });
      });
    });

    context('when there are schoolingRegistrations to create and schoolingRegistrations to update', () => {

      let schoolingRegistrations;
      let organizationId;
      let schoolingRegistrationToCreate, schoolingRegistrationUpdated;

      beforeEach(async () => {
        organizationId = databaseBuilder.factory.buildOrganization().id;
        databaseBuilder.factory.buildSchoolingRegistration({
          firstName: 'Lucy',
          lastName: 'Handmade',
          birthdate: '1990-12-31',
          nationalStudentId: 'INE1',
          organizationId,
        });
        await databaseBuilder.commit();

        schoolingRegistrationUpdated = new SchoolingRegistration({
          firstName: 'Lucy',
          lastName: 'Handmade',
          birthdate: '1990-12-31',
          nationalStudentId: 'INE1',
          organizationId,
        });

        schoolingRegistrationToCreate = new SchoolingRegistration({
          firstName: 'Harry',
          lastName: 'Covert',
          birthdate: '1990-01-01',
          nationalStudentId: 'INE2',
          organizationId,
        });

        schoolingRegistrations = [schoolingRegistrationUpdated, schoolingRegistrationToCreate];
      });

      afterEach(() => {
        return knex('schooling-registrations').delete();
      });

      it('should update and create all schoolingRegistrations', async function() {
        // when
        await schoolingRegistrationRepository.addOrUpdateOrganizationSchoolingRegistrations(schoolingRegistrations, organizationId);

        // then
        const actualSchoolingRegistrations = await knex('schooling-registrations').where({ organizationId });
        expect(actualSchoolingRegistrations).to.have.lengthOf(2);
        expect(_.map(actualSchoolingRegistrations, 'firstName')).to.have.members([schoolingRegistrationUpdated.firstName, schoolingRegistrationToCreate.firstName]);
      });
    });

    context('when the same nationalStudentId is twice in schoolingRegistrations to create', () => {

      let schoolingRegistrations;
      let organizationId;
      let schoolingRegistration_1, schoolingRegistration_2;
      const sameNationalStudentId = 'SAMEID123';

      beforeEach(async () => {
        organizationId = databaseBuilder.factory.buildOrganization().id;
        await databaseBuilder.commit();

        schoolingRegistration_1 = new SchoolingRegistration({
          firstName: 'Lucy',
          lastName: 'Handmade',
          birthdate: '1990-12-31',
          nationalStudentId: sameNationalStudentId,
          organizationId,
        });

        schoolingRegistration_2 = new SchoolingRegistration({
          firstName: 'Harry',
          lastName: 'Covert',
          birthdate: '1990-01-01',
          nationalStudentId: sameNationalStudentId,
          organizationId,
        });

        schoolingRegistrations = [schoolingRegistration_1, schoolingRegistration_2];
      });

      afterEach(() => {
        return knex('schooling-registrations').delete();
      });

      it('should return a SameNationalStudentIdInOrganizationError', async () => {
        // when
        const error = await catchErr(schoolingRegistrationRepository.addOrUpdateOrganizationSchoolingRegistrations, schoolingRegistrationRepository)(schoolingRegistrations, organizationId);

        // then
        expect(error).to.be.instanceof(SameNationalStudentIdInOrganizationError);
        expect(error.message).to.equal('L’INE SAMEID123 est déjà présent pour cette organisation.');
      });
    });
  });

  describe('#findByOrganizationIdAndUserData', () => {

    let organization;

    beforeEach(async () => {
      organization = databaseBuilder.factory.buildOrganization();
      databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        userId: null,
        preferredLastName: 'Lee',
        lastName: 'Lieber',
        firstName: 'Stanley',
        middleName: 'Martin',
        thirdName: 'Stan',
        birthdate: '2000-03-31',
        studentNumber: '123A',
      });
      databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        userId: null,
        lastName: 'See',
        firstName: 'Johnny',
        birthdate: '2000-03-31',
        studentNumber: '456A',
      });
      await databaseBuilder.commit();
    });

    context('find with user birthdate', () => {
      it('should return found schoolingRegistrations with birthdate', async () => {
        // given
        const reconciliationInfo = { birthdate: '2000-03-31' };

        // when
        const result = await schoolingRegistrationRepository.findByOrganizationIdAndUserData({
          organizationId: organization.id, reconciliationInfo
        });

        // then
        expect(result.length).to.be.equal(2);
      });

      it('should return empty array with wrong birthdate', async () => {
        // given
        const reconciliationInfo = { birthdate: '2001-03-31' };

        // when
        const result = await schoolingRegistrationRepository.findByOrganizationIdAndUserData({
          organizationId: organization.id, reconciliationInfo
        });

        // then
        expect(result.length).to.be.equal(0);
      });
    });

    context('find with user student number', () => {
      it('should return found schoolingRegistrations with studentNumber', async () => {
        // given
        const reconciliationInfo = { studentNumber: '123a' };

        // when
        const result = await schoolingRegistrationRepository.findByOrganizationIdAndUserData({
          organizationId: organization.id, reconciliationInfo
        });

        // then
        expect(result.length).to.be.equal(1);
      });

      it('should return empty array with wrong studentNumber', async () => {
        // given
        const reconciliationInfo = { studentNumber: '789B' };

        // when
        const result = await schoolingRegistrationRepository.findByOrganizationIdAndUserData({
          organizationId: organization.id, reconciliationInfo
        });

        // then
        expect(result.length).to.be.equal(0);
      });
    });

    it('should return empty array with fake organizationId', async () => {
      // given
      const reconciliationInfo = { birthdate: '2000-03-31' };

      // when
      const result = await schoolingRegistrationRepository.findByOrganizationIdAndUserData({
        organizationId: '999', reconciliationInfo
      });

      // then
      expect(result.length).to.be.equal(0);
    });
  });

  describe('#findSupernumeraryByOrganizationIdAndBirthdate', () => {

    let organization;

    beforeEach(async () => {
      organization = databaseBuilder.factory.buildOrganization();
      databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        birthdate: '2000-03-31',
      });
      await databaseBuilder.commit();
    });

    context('When there is some supernumerary', () => {

      beforeEach(async () => {
        databaseBuilder.factory.buildSchoolingRegistration({
          organizationId: organization.id,
          birthdate: '2000-03-31',
          isSupernumerary: true,
        });
        await databaseBuilder.commit();
      });

      it('should return found supernumerary schoolingRegistrations with birthdate and organizationId', async () => {
        // given
        const birthdate = '2000-03-31';

        // when
        const result = await schoolingRegistrationRepository.findSupernumeraryByOrganizationIdAndBirthdate({
          organizationId: organization.id, birthdate
        });

        // then
        expect(result.length).to.be.equal(1);
      });

      it('should return empty array with wrong birthdate', async () => {
        // given
        const birthdate = '2001-03-31' ;

        // when
        const result = await schoolingRegistrationRepository.findSupernumeraryByOrganizationIdAndBirthdate({
          organizationId: organization.id, birthdate
        });

        // then
        expect(result.length).to.be.equal(0);
      });

      it('should return empty array with wrong organizationId', async () => {
        // given
        const birthdate = '2000-03-31' ;

        // when
        const result = await schoolingRegistrationRepository.findSupernumeraryByOrganizationIdAndBirthdate({
          organizationId: '999', birthdate
        });

        // then
        expect(result.length).to.be.equal(0);
      });
    });

    context('When there is no supernumerary', () => {
      it('should return empty array when supernumerary is false', async () => {
        // given
        const birthdate = '2000-03-31';

        // when
        const result = await schoolingRegistrationRepository.findSupernumeraryByOrganizationIdAndBirthdate({
          organizationId: organization.id, birthdate
        });

        // then
        expect(result.length).to.be.equal(0);
      });
    });
  });

  describe('#dissociateUserAndSchoolingRegistration', () => {

    let schoolingRegistration;

    beforeEach(async () => {
      const user = databaseBuilder.factory.buildUser();
      schoolingRegistration = databaseBuilder.factory.buildSchoolingRegistration({ userId: user.id });
      await databaseBuilder.commit();
    });

    it('should delete association between user and schoolingRegistration', async () => {
      // when
      await schoolingRegistrationRepository.dissociateUserFromSchoolingRegistration(schoolingRegistration.id);

      // then
      const schoolingRegistrationPatched = await schoolingRegistrationRepository.get(schoolingRegistration.id);
      expect(schoolingRegistrationPatched.userId).to.equal(null);
    });
  });

  describe('#reconcileUserToSchoolingRegistration', () => {

    afterEach(() => {
      return knex('schooling-registrations').delete();
    });

    let organization;
    let schoolingRegistration;
    let user;

    beforeEach(async () => {
      organization = databaseBuilder.factory.buildOrganization();
      schoolingRegistration = databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        userId: null,
        firstName: 'Steeve',
        lastName: 'Roger'
      });
      user = databaseBuilder.factory.buildUser({ firstName: 'Steeve', lastName: 'Roger' });
      await databaseBuilder.commit();
    });

    it('should save association between user and schoolingRegistration', async () => {
      // when
      const schoolingRegistrationPatched = await schoolingRegistrationRepository.reconcileUserToSchoolingRegistration({ userId: user.id, schoolingRegistrationId: schoolingRegistration.id });

      // then
      expect(schoolingRegistrationPatched).to.be.instanceof(SchoolingRegistration);
      expect(schoolingRegistrationPatched.userId).to.equal(user.id);
    });

    it('should return an error when we don’t find the schoolingRegistration to update', async () => {
      // given
      const fakeStudentId = 1;

      // when
      const error = await catchErr(schoolingRegistrationRepository.reconcileUserToSchoolingRegistration)({ userId: user.id, schoolingRegistrationId: fakeStudentId });

      // then
      expect(error.message).to.be.equal('No Rows Updated');
    });

    it('should return an error when the userId to link don’t match a user', async () => {
      // given
      const fakeUserId = 1;

      // when
      const error = await catchErr(schoolingRegistrationRepository.reconcileUserToSchoolingRegistration)({
        userId: fakeUserId,
        schoolingRegistrationId: schoolingRegistration.id
      });

      // then
      expect(error.detail).to.be.equal(`Key (userId)=(${fakeUserId}) is not present in table "users".`);
    });
  });

  describe('#reconcileUserAndOrganization', () => {

    afterEach(() => {
      return knex('schooling-registrations').delete();
    });

    let organization;
    let schoolingRegistration;
    let user;

    beforeEach(async () => {
      organization = databaseBuilder.factory.buildOrganization();
      schoolingRegistration = databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        userId: null,
        firstName: 'Steeve',
        lastName: 'Roger'
      });
      user = databaseBuilder.factory.buildUser({ firstName: 'Steeve', lastName: 'Roger' });
      await databaseBuilder.commit();
    });

    it('should save association between user and organization', async () => {
      // when
      const schoolingRegistrationPatched = await schoolingRegistrationRepository.reconcileUserByNationalStudentIdAndOrganizationId({
        userId: user.id,
        nationalStudentId: schoolingRegistration.nationalStudentId,
        organizationId: organization.id
      });

      // then
      expect(schoolingRegistrationPatched).to.be.instanceof(SchoolingRegistration);
      expect(schoolingRegistrationPatched.userId).to.equal(user.id);
    });

    it('should return an error when we don’t find the schoolingRegistration for this organization to update', async () => {
      // given
      const fakeOrganizationId = 1;

      // when
      const error = await catchErr(schoolingRegistrationRepository.reconcileUserByNationalStudentIdAndOrganizationId)({
        userId: user.id,
        nationalStudentId: schoolingRegistration.nationalStudentId,
        organizationId: fakeOrganizationId
      });

      // then
      expect(error).to.be.instanceof(UserCouldNotBeReconciledError);
    });

    it('should return an error when we don’t find the schoolingRegistration for this nationalStudentId to update', async () => {
      // given
      const fakeNationalStudentId = 1;

      // when
      const error = await catchErr(schoolingRegistrationRepository.reconcileUserByNationalStudentIdAndOrganizationId)({
        userId: user.id,
        nationalStudentId: fakeNationalStudentId,
        organizationId: organization.id
      });

      // then
      expect(error).to.be.instanceof(UserCouldNotBeReconciledError);
    });

    it('should return an error when the userId to link don’t match a user', async () => {
      // given
      const fakeUserId = 1;

      // when
      const error = await catchErr(schoolingRegistrationRepository.reconcileUserByNationalStudentIdAndOrganizationId)({
        userId: fakeUserId,
        nationalStudentId: schoolingRegistration.nationalStudentId,
        organizationId: organization.id
      });

      // then
      expect(error).to.be.instanceof(UserCouldNotBeReconciledError);
    });
  });

  describe('#findOneByUserIdAndOrganizationId', () => {

    let userId;
    let organizationId;

    beforeEach(() => {
      organizationId = databaseBuilder.factory.buildOrganization().id;
      userId = databaseBuilder.factory.buildUser().id;
      databaseBuilder.factory.buildSchoolingRegistration({ organizationId, userId });
      return databaseBuilder.commit();
    });

    it('should return instance of SchoolingRegistration linked to the given userId and organizationId', async () => {
      // when
      const schoolingRegistration = await schoolingRegistrationRepository.findOneByUserIdAndOrganizationId({ userId, organizationId });

      // then
      expect(schoolingRegistration).to.be.an.instanceOf(SchoolingRegistration);
      expect(schoolingRegistration.userId).to.equal(userId);
    });

    it('should return null if there is no schoolingRegistration linked to the given userId', async () => {
      // given
      const otherUserId = databaseBuilder.factory.buildUser().id;
      await databaseBuilder.commit();

      // when
      const result = await schoolingRegistrationRepository.findOneByUserIdAndOrganizationId({ userId: otherUserId, organizationId });

      // then
      expect(result).to.equal(null);
    });

    it('should return null if there is no schoolingRegistration linked to the given organizationId', async () => {
      // given
      const otherOrganizationId = databaseBuilder.factory.buildOrganization().id;
      await databaseBuilder.commit();

      // when
      const result = await schoolingRegistrationRepository.findOneByUserIdAndOrganizationId({ userId, organizationId: otherOrganizationId });

      // then
      expect(result).to.equal(null);
    });
  });

  describe('#get', () => {

    let schoolingRegistrationId;

    beforeEach(() => {
      schoolingRegistrationId = databaseBuilder.factory.buildSchoolingRegistration().id;
      return databaseBuilder.commit();
    });

    it('should return an instance of SchoolingRegistration', async () => {
      // when
      const schoolingRegistration = await schoolingRegistrationRepository.get(schoolingRegistrationId);

      // then
      expect(schoolingRegistration).to.be.an.instanceOf(SchoolingRegistration);
      expect(schoolingRegistration.id).to.equal(schoolingRegistrationId);
    });

    it('should return a NotFoundError if no schoolingRegistration is found', async () => {
      // given
      const nonExistentStudentId = 678;

      // when
      const result = await catchErr(schoolingRegistrationRepository.get)(nonExistentStudentId);

      // then
      expect(result).to.be.instanceOf(NotFoundError);
    });
  });

  describe('#findPaginatedFilteredSchoolingRegistrations', () => {

    it('should return instances of UserWithSchoolingRegistration', async () => {
      // given
      const organization = databaseBuilder.factory.buildOrganization();
      databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        userId: null,
      });
      await databaseBuilder.commit();

      // when
      const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({ organizationId: organization.id });

      // then
      expect(data[0]).to.be.an.instanceOf(UserWithSchoolingRegistration);
    });

    it('should return all the UserWithSchoolingRegistration for a given organization ID', async () => {
      // given
      const organization_1 = databaseBuilder.factory.buildOrganization();
      const organization_2 = databaseBuilder.factory.buildOrganization();

      const user = databaseBuilder.factory.buildUser();

      const schoolingRegistration_1 = databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization_1.id });
      const schoolingRegistration_2 = databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization_1.id, userId: user.id });
      databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization_2.id });

      await databaseBuilder.commit();

      // when
      const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({ organizationId: organization_1.id });

      // then
      expect(_.map(data, 'id')).to.have.members([schoolingRegistration_1.id, schoolingRegistration_2.id]);
    });

    it('should order schoolingRegistrations by lastName and then by firstName with no sensitive case', async () => {
      // given
      const organization = databaseBuilder.factory.buildOrganization();

      const schoolingRegistration_1 = databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, lastName: 'Grenier' });
      const schoolingRegistration_2 = databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        lastName: 'Avatar',
        firstName: 'Xavier'
      });
      const schoolingRegistration_3 = databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        lastName: 'Avatar',
        firstName: 'Arthur'
      });
      const schoolingRegistration_4 = databaseBuilder.factory.buildSchoolingRegistration({
        organizationId: organization.id,
        lastName: 'Avatar',
        firstName: 'MATHURIN'
      });

      await databaseBuilder.commit();

      // when
      const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({
        organizationId: organization.id
      });

      // then
      expect(_.map(data, 'id')).to.deep.include.ordered.members([schoolingRegistration_3.id, schoolingRegistration_4.id, schoolingRegistration_2.id, schoolingRegistration_1.id]);
    });

    describe('When schoolingRegistration is filtered' , () => {
      it('should return schooling registrations filtered by lastname', async () => {
        // given
        const organization = databaseBuilder.factory.buildOrganization();

        databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, lastName: 'Grenier' });
        databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, lastName: 'Avatar' });
        databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, lastName: 'UvAtur' });
        await databaseBuilder.commit();

        // when
        const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({
          organizationId: organization.id,
          filter: { lastName: 'Vat' },
        });

        // then
        expect(_.map(data, 'lastName')).to.deep.equal(['Avatar', 'UvAtur']);
      });

      it('should return school registrations filtered by firstname', async () => {
        // given
        const organization = databaseBuilder.factory.buildOrganization();

        databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, firstName: 'Foo', lastName: '1' });
        databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, firstName: 'Bar', lastName: '2' });
        databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, firstName: 'Baz', lastName: '3' });
        await databaseBuilder.commit();

        // when
        const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({
          organizationId: organization.id,
          filter: { firstName: 'ba' },
        });

        // then
        expect(_.map(data, 'firstName')).to.deep.equal(['Bar', 'Baz']);
      });

      it('should return school registrations filtered by firstname AND lastname', async () => {
        // given
        const organization = databaseBuilder.factory.buildOrganization();

        databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, firstName: 'John', lastName: 'Rambo' });
        databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, firstName: 'Jane', lastName: 'Rambo' });
        databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, firstName: 'Chuck', lastName: 'Norris' });
        await databaseBuilder.commit();

        // when
        const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({
          organizationId: organization.id,
          filter: { firstName: 'ja', lastName: 'ram' },
        });

        // then
        expect(_.map(data, 'firstName')).to.deep.equal(['Jane']);
      });

      describe('When schoolingRegistration is filtered by user connexion type' , () => {
        let organizationId;

        beforeEach(async () => {
          // given
          organizationId = databaseBuilder.factory.buildOrganization().id;

          databaseBuilder.factory.buildSchoolingRegistrationWithUser({ organizationId, lastName: 'Rambo', user: { email: 'john@rambo.com',  username: null } });
          databaseBuilder.factory.buildSchoolingRegistrationWithUser({ organizationId, lastName: 'Willis', user: { email: null, username: 'willy' } });
          databaseBuilder.factory.buildSchoolingRegistrationWithUser({ organizationId, lastName: 'Norris', user: { email: null, username: null, samlId: 'chucky' } });
          databaseBuilder.factory.buildSchoolingRegistrationWithUser({ organizationId, lastName: 'Lee', user: { email: null, username: null } });
          await databaseBuilder.commit();
        });

        it('should return school registrations filtered by "none" user connexion', async () => {
          // when
          const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({
            organizationId,
            filter: { connexionType: 'none' },
          });

          // then
          expect(_.map(data, 'lastName')).to.deep.equal(['Lee']);
        });

        it('should return school registrations filtered by "identifiant" user connexion', async () => {
          // when
          const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({
            organizationId,
            filter: { connexionType: 'identifiant' },
          });

          // then
          expect(_.map(data, 'lastName')).to.deep.equal(['Willis']);
        });

        it('should return school registrations filtered by "email" user connexion', async () => {
          // when
          const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({
            organizationId,
            filter: { connexionType: 'email' },
          });

          // then
          expect(_.map(data, 'lastName')).to.deep.equal(['Rambo']);
        });

        it('should return school registrations filtered by "mediacentre" user connexion', async () => {
          // when
          const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({
            organizationId,
            filter: { connexionType: 'mediacentre' },
          });

          // then
          expect(_.map(data, 'lastName')).to.deep.equal(['Norris']);
        });
      });

      it('should return school registrations paginated', async () => {
        // given
        const organization = databaseBuilder.factory.buildOrganization();

        databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, firstName: 'Foo', lastName: '1' });
        databaseBuilder.factory.buildSchoolingRegistration({ organizationId: organization.id, firstName: 'Bar', lastName: '2' });
        await databaseBuilder.commit();

        // when
        const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({
          organizationId: organization.id,
          page: { number: 2, size: 1 }
        });

        // then
        expect(_.map(data, 'firstName')).to.deep.equal(['Bar']);
      });
    });

    describe('When schoolingRegistration is reconciled and authenticated by email (and/or) username' , () => {

      it('should return all schoolingRegistration properties including the reconciled user:email,username', async () => {

        // given
        const organization = databaseBuilder.factory.buildOrganization();
        const user = databaseBuilder.factory.buildUser({
          organizationId: organization.id,
        });
        const schoolingRegistration = databaseBuilder.factory.buildSchoolingRegistration({
          organizationId: organization.id,
          userId: user.id,
        });
        const expectedUserWithSchoolingRegistration = new UserWithSchoolingRegistration({
          id: schoolingRegistration.id,
          firstName: schoolingRegistration.firstName,
          lastName: schoolingRegistration.lastName,
          birthdate: schoolingRegistration.birthdate,
          organizationId: schoolingRegistration.organizationId,
          username: user.username,
          userId: schoolingRegistration.userId,
          email: user.email,
          isAuthenticatedFromGAR: false,
          studentNumber: schoolingRegistration.studentNumber,
        });
        await databaseBuilder.commit();

        // when
        const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({ organizationId: organization.id });

        // then
        expect(data[0]).to.deep.equal(expectedUserWithSchoolingRegistration);

      });

    });

    describe('When schoolingRegistration is reconciled  and  authenticated from GAR' , () => {

      it('should return isAuthenticatedFromGAR property equal to true', async () => {

        // given
        const organization = databaseBuilder.factory.buildOrganization();
        const user = databaseBuilder.factory.buildUser({
          organizationId: organization.id,
          samlId: 'samlId',
          username: null,
          email: null,
        });
        const schoolingRegistration = databaseBuilder.factory.buildSchoolingRegistration({
          organizationId: organization.id,
          userId: user.id,
        });
        const expectedUserWithSchoolingRegistration = new UserWithSchoolingRegistration({
          id: schoolingRegistration.id,
          firstName: schoolingRegistration.firstName,
          lastName: schoolingRegistration.lastName,
          birthdate: schoolingRegistration.birthdate,
          organizationId: schoolingRegistration.organizationId,
          username: null,
          email: null,
          userId: schoolingRegistration.userId,
          isAuthenticatedFromGAR: true,
          studentNumber: schoolingRegistration.studentNumber,
        });
        await databaseBuilder.commit();

        // when
        const { data } = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({ organizationId: organization.id });

        // then
        expect(data[0]).to.deep.equal(expectedUserWithSchoolingRegistration);

      });

    });

    describe('When schoolingRegistration is not reconciled' , () => {

      it('should return empty email, username, userId', async () => {

        // given
        const organization = databaseBuilder.factory.buildOrganization();
        const schoolingRegistration = databaseBuilder.factory.buildSchoolingRegistration({
          organizationId: organization.id,
          userId: null,
        });

        const expectedUserWithSchoolingRegistration = new UserWithSchoolingRegistration({
          id : schoolingRegistration.id,
          firstName : schoolingRegistration.firstName,
          lastName : schoolingRegistration.lastName,
          birthdate : schoolingRegistration.birthdate,
          organizationId : schoolingRegistration.organizationId,
          username : null,
          email : null,
          userId: schoolingRegistration.userId,
          isAuthenticatedFromGAR : false,
          studentNumber: schoolingRegistration.studentNumber,
        });
        await databaseBuilder.commit();

        // when
        const { data }  = await schoolingRegistrationRepository.findPaginatedFilteredSchoolingRegistrations({ organizationId: organization.id });

        // then
        expect(data[0]).to.deep.equal(expectedUserWithSchoolingRegistration);

      });

    });

  });

});
