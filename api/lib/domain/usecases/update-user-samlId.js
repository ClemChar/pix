const { InvalidExternalUserTokenError } = require('../../domain/errors');

module.exports = function updateUserSamlId({
  userId,
  externalUserToken,
  tokenService,
  userRepository,
}) {
  const samlId = tokenService.extractSamlId(externalUserToken);
  if (!samlId) {
    throw new InvalidExternalUserTokenError();
  }

  return userRepository.updateSamlId({ userId, samlId });
};
