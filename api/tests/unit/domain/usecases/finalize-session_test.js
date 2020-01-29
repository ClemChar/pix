const {
  sinon,
  expect,
  catchErr,
  domainBuilder,
} = require('../../../test-helper');

const finalizeSession = require('../../../../lib/domain/usecases/finalize-session');
const { SessionAlreadyFinalizedError, InvalidCertificationReportForFinalization } = require('../../../../lib/domain/errors');

describe('Unit | UseCase | finalize-session', () => {

  let sessionId;
  let updatedSession;
  let examinerGlobalComment;
  let sessionRepository;
  let certificationReportRepository;

  beforeEach(async () => {
    sessionId = 'dummy session id';
    updatedSession = Symbol('updated session');
    examinerGlobalComment = 'It was a fine session my dear.';
    sessionRepository = {
      updateStatusAndExaminerGlobalComment: sinon.stub(),
      isFinalized: sinon.stub(),
    };
    certificationReportRepository = {
      finalizeAll: sinon.stub(),
    };
  });

  context('When the session status is already finalized', () => {

    beforeEach(() => {
      sessionRepository.isFinalized.withArgs(sessionId).resolves(true);
    });

    it('should throw a SessionAlreadyFinalizedError error', async () => {
      // when
      const err = await catchErr(finalizeSession)({
        sessionId,
        examinerGlobalComment,
        sessionRepository,
        certificationReports: [],
        certificationReportRepository
      });

      // then
      expect(err).to.be.instanceOf(SessionAlreadyFinalizedError);
    });

  });

  context('When the session status is not finalized yet ', () => {
    let certificationReports;
    context('When the certificationReports are not valid', () => {
      beforeEach(() => {
        const courseWithoutHasSeenLastScreen = domainBuilder.buildCertificationReport();
        delete courseWithoutHasSeenLastScreen.hasSeenEndTestScreen;
        certificationReports = [courseWithoutHasSeenLastScreen];
      });

      it('should throw an InvalidCertificationReportForFinalization error', async () => {
        // when
        const err = await catchErr(finalizeSession)({
          sessionId,
          examinerGlobalComment,
          sessionRepository,
          certificationReports,
          certificationReportRepository
        });

        // then
        expect(err).to.be.instanceOf(InvalidCertificationReportForFinalization);
      });
    });

    context('When the certificationReports are valid', () => {
      beforeEach(() => {
        const validReportForFinalization = domainBuilder.buildCertificationReport({
          examinerComment: 'signalement sur le candidat',
          hasSeenEndTestScreen: false,
        });
        certificationReports = [validReportForFinalization];
        sessionRepository.isFinalized.withArgs(sessionId).resolves(false);
        certificationReportRepository.finalizeAll.withArgs(certificationReports).resolves();
        sessionRepository.updateStatusAndExaminerGlobalComment.withArgs({
          id: sessionId,
          status: 'finalized',
          examinerGlobalComment,
        }).resolves(updatedSession);
      });

      it('should return the updated session', async () => {
        // when
        const res = await finalizeSession({
          sessionId,
          examinerGlobalComment,
          sessionRepository,
          certificationReports,
          certificationReportRepository,
        });

        // then
        expect(res).to.deep.equal(updatedSession);
      });
    });

  });

});
