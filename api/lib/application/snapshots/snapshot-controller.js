const authorizationToken = require('../../../lib/infrastructure/validators/jsonwebtoken-verify');
const validationErrorSerializer = require('../../infrastructure/serializers/jsonapi/validation-error-serializer');
const UserRepository = require('../../../lib/infrastructure/repositories/user-repository');
const OrganizationRepository = require('../../../lib/infrastructure/repositories/organization-repository');
const snapshotSerializer = require('../../../lib/infrastructure/serializers/jsonapi/snapshot-serializer');
const profileSerializer = require('../../../lib/infrastructure/serializers/jsonapi/profile-serializer');
const SnapshotService = require('../../../lib/domain/services/snapshot-service');
const profileService = require('../../domain/services/profile-service');
const logger = require('../../../lib/infrastructure/logger');
const { InvalidTokenError, NotFoundError, InvaliOrganizationIdError } = require('../../domain/errors');

module.exports = {

  create: function(request, reply) {

    if(!_hasAnAtuhorizationHeaders(request)) {
      return _replyErrorWithMessage(reply, 'Le token n’est pas valide', 400);
    }

    const token = request.headers.authorization;
    const organizationId = _extractOrganizationId(request);

    return authorizationToken
      .verify(token)
      .then((userId) => {
        return UserRepository.findUserById(userId);
      })
      .then((foundUser) => {
        return OrganizationRepository.isOrganizationIdExist(organizationId)
          .then((isOrganizationExist) => {
            if(!isOrganizationExist) {
              throw new InvaliOrganizationIdError();
            }
            return foundUser;
          });

      })
      .then((foundUser) => {
        return profileService.getByUserId(foundUser.id);
      })
      .then((profile) => {
        return profileSerializer.serialize(profile);
      })
      .then((serializedProfile) => {
        const snapshotDetails = {
          organizationId: organizationId,
          profile: serializedProfile
        };
        return SnapshotService.create(snapshotDetails);
      })
      .then((snapshotId) => {
        const insertedSnaphotId = { id: snapshotId };
        reply(snapshotSerializer.serialize(insertedSnaphotId)).code(201);
      }).catch((err) => {

        if(err instanceof InvalidTokenError) {
          return _replyErrorWithMessage(reply, 'Le token n’est pas valide', 401);
        }

        if(err instanceof NotFoundError) {
          return _replyErrorWithMessage(reply, 'Cet utilisateur est introuvable', 400);
        }

        if(err instanceof InvaliOrganizationIdError) {
          return _replyErrorWithMessage(reply, 'Cette organisation n’existe pas', 400);
        }
        logger.error(err);
        return _replyErrorWithMessage(reply, 'Une erreur est survenue lors de la création de l’instantané', 500);
      });
  }
};

const _replyErrorWithMessage = function(reply, errorMessage, statusCode) {
  reply(validationErrorSerializer.serialize(_handleWhenInvalidAuthorization(errorMessage))).code(statusCode);
};

function _handleWhenInvalidAuthorization(errorMessage) {
  return {
    data: {
      authorization: [errorMessage]
    }
  };
}

function _extractOrganizationId(request) {
  return request.hasOwnProperty('payload') && request.payload.data && request.payload.data.attributes['organization-id'] || '';
}

function _hasAnAtuhorizationHeaders(request) {
  return request && request.hasOwnProperty('headers') && request.headers.hasOwnProperty('authorization');
}
