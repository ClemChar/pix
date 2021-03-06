const { catchErr, expect } = require('../../../test-helper');
const tokenService = require('../../../../lib/domain/services/token-service');
const User = require('../../../../lib/domain/models/User');
const { InvalidTemporaryKeyError } = require('../../../../lib/domain/errors');
const settings = require('../../../../lib/config');
const jsonwebtoken = require('jsonwebtoken');
const _ = require('lodash');

describe('Unit | Domain | Service | Token Service', function() {

  describe('#createIdTokenForUserReconciliation', () => {

    it('should return a valid id token with firstName, lastName, samlId', () => {
      // given
      const externalUser = {
        samlId: 'IDO-for-adele',
        lastName: 'Lopez',
        firstName: 'Adèle',
      };
      const expectedTokenAttributes = {
        'first_name': 'Adèle',
        'last_name': 'Lopez',
        'saml_id': 'IDO-for-adele'
      };

      // when
      const token = tokenService.createIdTokenForUserReconciliation(externalUser);

      // then
      const decodedToken = jsonwebtoken.verify(token, settings.authentication.secret);
      expect(_.omit(decodedToken, ['iat', 'exp'])).to.deep.equal(expectedTokenAttributes);
    });
  });

  describe('#extractExternalUserFromIdToken', () => {

    it('should return external user if the id token is valid', async () => {
      // given
      const externalUser = {
        firstName: 'Saml',
        lastName: 'Jackson',
        samlId: 'SamlId',
      };

      const token = tokenService.createIdTokenForUserReconciliation(externalUser);

      // when
      const result = await tokenService.extractExternalUserFromIdToken(token);

      // then
      expect(result).to.deep.equal(externalUser);
    });

    it('should throw an InvalidTemporaryKeyError if the token is invalid', async () => {
      // given
      const token = 'eyJhbGciOiJIUzI1NiIsIgR5cCI6IkpXVCJ9.eyJ1c2VyX2lPIjoxMjMsImlhdCI6MTQ5OTA3Nzg2Mn0.FRAAoowTA8Bc6BOzD7wWh2viVN47VrPcGgLuHi_NmKw';

      // when
      const error = await catchErr(tokenService.extractExternalUserFromIdToken)(token);
      expect(error).to.be.an.instanceof(InvalidTemporaryKeyError);
    });

  });

  describe('#extractUserId', () => {

    it('should exist', () => {
      expect(tokenService.extractUserId).to.exist.and.to.be.a('function');
    });

    it('should return userId if the token passed is valid', () => {
      // given
      const user = new User({ id: 123 });
      const token = tokenService.createAccessTokenFromUser(user, 'pix');

      // when
      const result = tokenService.extractUserId(token);

      // then
      expect(result).to.equal(123);
    });

    it('should reject with Error if the token is invalid', () => {
      // given
      const token = 'eyJhbGciOiJIUzI1NiIsIgR5cCI6IkpXVCJ9.eyJ1c2VyX2lPIjoxMjMsImlhdCI6MTQ5OTA3Nzg2Mn0.FRAAoowTA8Bc6BOzD7wWh2viVN47VrPcGgLuHi_NmKw';

      // when
      const result = tokenService.extractUserId(token);

      // then
      expect(result).to.equal(null);
    });

  });

  describe('#extractUserIdForCampaignResults', () => {

    it('should return userId if the token passed is valid', () => {
      // given
      const userId = 123;
      const token = tokenService.createTokenForCampaignResults(userId);

      // when
      const result = tokenService.extractUserIdForCampaignResults(token);

      // then
      expect(result).to.equal(userId);
    });

    it('should reject with Error if the token is invalid', () => {
      // given
      const token = 'eyJhbGciOiJIUzI1NiIsIgR5cCI6IkpXVCJ9.eyJ1c2VyX2lPIjoxMjMsImlhdCI6MTQ5OTA3Nzg2Mn0.FRAAoowTA8Bc6BOzD7wWh2viVN47VrPcGgLuHi_NmKw';

      // when
      const result = tokenService.extractUserIdForCampaignResults(token);

      // then
      expect(result).to.equal(null);
    });

  });

  describe('#decodeIfValid', () => {

    it('should throw an Invalid token error, when token is not valid', () => {
      // given
      const token = 'eyJhbGciOiJIUzI1NiIsIgR5cCI6IkpXVCJ9.eyJ1c2VyX2lPIjoxMjMsImlhdCI6MTQ5OTA3Nzg2Mn0.FRAAoowTA8Bc6BOzD7wWh2viVN47VrPcGgLuHi_NmKw';

      // when
      const promise = tokenService.decodeIfValid(token);

      // then
      return promise.catch((result) => {
        expect(result).to.be.an.instanceof(InvalidTemporaryKeyError);
      });
    });

  });
});
