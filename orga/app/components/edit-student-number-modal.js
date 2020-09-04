import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class EditStudentNumberModal extends Component {
  @service notifications;
  @service store;
  @service session;

  @tracked error = null;
  @tracked newStudentNumber = null;

  get isDisable() {
    const emptyValues = ['', null];
    return emptyValues.includes(this.newStudentNumber);
  }

  @action
  async updateStudentNumber() {
    this.prescriber = await this.store.queryRecord('prescriber', this.session.data.authenticated.user_id);
    const adapter = this.store.adapterFor('student');
    try {
      await adapter.updateStudentNumber(this.args.student, this.newStudentNumber);
      this.notifications.sendSuccess(`La modification du numéro étudiant ${this.args.student.firstName} ${this.args.student.lastName} a bien été effectué.`);
      this._clean();
      this.args.close();
      this.args.refreshModel();
    } catch (errorResponse) {
      this._handleError(errorResponse);
    }
  }

  @action
  close() {
    this._clean();
    this.args.close();
  }
    
  _handleError(errorResponse) {
    errorResponse.errors.forEach((error) => {
      if (error.status === '412') {
        this.error = error.detail;
      }
    });
  }

  _clean() {
    this.newStudentNumber = null;
    this.error = null;
  }
}
