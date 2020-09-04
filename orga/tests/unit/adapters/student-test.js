import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import sinon from 'sinon';
import ENV from 'pix-orga/config/environment';

module('Unit | Adapters | student', function(hooks) {
  setupTest(hooks);

  let adapter;
  let ajaxStub;

  hooks.beforeEach(function() {
    adapter = this.owner.lookup('adapter:student');
    ajaxStub = sinon.stub();
    adapter.set('ajax', ajaxStub);
  });

  module('#urlForQuery', () => {
    test('should build query url from organization id', async function(assert) {
      const query = { filter: { organizationId: 'organizationId1' } };
      const url = await adapter.urlForQuery(query);

      assert.ok(url.endsWith('/api/organizations/organizationId1/students'));
      assert.equal(query.organizationId, undefined);
    });
  });

  module('#dissociateUser', function() {
    
    test('it performs the request to dissociate user from student', async function(assert) {
      const model = { id: 12345 };
      const data = {
        data: {
          attributes: {
            'schooling-registration-id': model.id,
          }
        }
      };
      const url = `${ENV.APP.API_HOST}/api/schooling-registration-user-associations`;

      await adapter.dissociateUser(model);

      assert.ok(ajaxStub.calledWith(url, 'DELETE', { data }));
    });
  });

  module('updateStudentNumber adapter', function() {

    test('it performs the request to update the student number', async function(assert) {
      const model = { 
        newStudentNumber: 54321,
        studentId: 10
      };
      const data = {
        data: {
          attributes: {
            'student-number': model.newStudentNumber,
          }
        }
      };
      const url = `${ENV.APP.API_HOST}/api/schooling-registration-user-associations/${model.studentId}`;

      await adapter.updateStudentNumber(model.studentId, model.newStudentNumber);

      assert.ok(ajaxStub.calledWith(url, 'PATCH', { data }));
    });
  });
});
