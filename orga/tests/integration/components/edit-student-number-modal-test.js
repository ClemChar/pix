/* eslint-disable no-console */
import { module, test } from 'qunit';
import Service from '@ember/service';
import sinon from 'sinon';
import { setupRenderingTest } from 'ember-qunit';
import { fillIn, click, render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import EmberObject from '@ember/object';

module.only('Integration | Component | edit-student-number-modal', function(hooks) {
  setupRenderingTest(hooks);
  let closeStub;
  let refreshModelStub;
  let storeStub;
  let notificationsStub;
  let adapterStub;

  hooks.beforeEach(function() {
    this.student = EmberObject.create({
      id: '123',
      firstName: 'Lyanna',
      lastName: 'Mormont',
      studentNumber: '1234'
    });

    notificationsStub = this.owner.lookup('service:notifications');

    closeStub = sinon.stub();
    refreshModelStub = sinon.stub();
    
    adapterStub = {
      updateStudentNumber: sinon.stub()
    };

    storeStub = Service.extend({
      adapterFor: sinon.stub().withArgs('student').returns(adapterStub)
    });

    sinon.stub(notificationsStub, 'sendSuccess');

    this.set('display', true);
    this.set('refreshModel', refreshModelStub);
    this.set('close', closeStub);
    
    this.owner.unregister('service:store');
    this.owner.register('service:store', storeStub);

    return render(hbs`<EditStudentNumberModal @refreshModel={{refreshModel}} @display={{display}} @close={{close}} @student={{this.student}}/>`);
  });

  module('when the edit student number modal is open', function() {

    test('should render component with student number text', async function(assert) {
      assert.contains(`Numéro étudiant actuel de ${this.student.firstName} ${this.student.lastName} est : ${this.student.studentNumber}`);
    });

    test('should render component with student number input', async function(assert) {
      assert.dom('[data-test-input]').exists();
    });

    test('should render component with update button', async function(assert) {
      assert.contains('Mettre à jour');
    });

    module('When a student number is entered', function() {

      test('should have the update button enable', async function(assert) {
        // when
        await fillIn('[data-test-input]', this.student.studentNumber);
  
        // then
        assert.dom('[data-test-updateButton]').doesNotHaveAttribute('disabled');

      });
    });
  
    module('when a student number is not entered yet', function() {
  
      test('should have the update button disable', async function(assert) {
        // when
        await fillIn('[data-test-input]', '');
        await click('[data-test-updateButton]');
  
        // then
        assert.dom('[data-test-updateButton]').exists();
        assert.dom('[data-test-updateButton]').hasClass('disabled');
        assert.dom('[data-test-updateButton]').hasAttribute('disabled', 'true');

      });
    });

    module('when the update button is clicked and the student number is entered', function() {
      test('it display success notification', async function(assert) {
        // given
        adapterStub.updateStudentNumber.withArgs(this.student.id, 7777).resolves(); 
       
        // when
        await fillIn('[data-test-input]', 123456);
        await click('[data-test-updateButton]');
  
        // then
        assert.dom('[data-test-updateButton]').hasValue('');
        assert.dom('[data-test-error]').hasText('');
        sinon.assert.calledOnce(closeStub);
        sinon.assert.calledOnce(refreshModelStub);
        assert.ok(notificationsStub.sendSuccess.calledWith(`La modification du numéro étudiant ${this.student.firstName} ${this.student.lastName} a bien été effectué.`));
      });
    });

    module('when the update button is clicked with the student number and this student number already exist', function() {
      test('it display an error under student number input', async function(assert) {
        // given
        const error = {
          errors: [{
            status: '412',
            detail: 'Error occured'
          }]
        };
        adapterStub.updateStudentNumber.rejects(error);

        // when
        await fillIn('[data-test-input]', 77107);
        await click('[data-test-updateButton]');

        // then
        assert.contains('Error occured');
      });
    });

    module('when the update button is clicked with the student number and this student number already exist', function() {
      test('it remove errors when submitting is a success', async function(assert) {
        // given
        const error = {
          errors: [{
            status: '412',
            detail: 'Error occured'
          }]
        };
        adapterStub.updateStudentNumber.onFirstCall().rejects(error).onSecondCall().resolves();

        // when
        await fillIn('#studentNumber', 77107);
        await click('#updateStudentNumber');
        await fillIn('#studentNumber', 65432);
        await click('#updateStudentNumber');

        // then
        assert.notContains('Error occured');
      });
    });

    module('when the close button is clicked', function() {
      test('it remove errors and student number value', async function(assert) {
        // given
        const error = {
          errors: [{
            status: '412',
            detail: 'Error occured'
          }]
        };

        // when
        adapterStub.updateStudentNumber.rejects(error);
        await click('[data-test-dialogButtonClose]');

        // then
        assert.dom('[data-test-updateButton]').hasValue('');
        assert.dom('[data-test-error]').hasText('');
        sinon.assert.calledOnce(closeStub);
      });
    });

    module('when the cancel button is clicked', function() {
      test('it remove errors and student number value too', async function(assert) {
        // given
        const error = {
          errors: [{
            status: '412',
            detail: 'Error occured'
          }]
        };

        // when
        adapterStub.updateStudentNumber.rejects(error);
        await click('[data-test-cancel]');

        // then
        assert.dom('[data-test-updateButton]').hasValue('');
        assert.dom('[data-test-error]').hasText('');
        sinon.assert.calledOnce(closeStub);
      });
    });
  });
});
