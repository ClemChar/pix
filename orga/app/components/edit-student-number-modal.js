import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class EditStudentNumberModal extends Component {
  @service notifications;
  @service store;

  @tracked newStudentNumber = null;

  @action
  updateStudentNumber(newStudentNumber) {
    const adapter = this.store.adapterFor('student');

    console.log(newStudentNumber);

    this.notifications.sendSuccess(`Le numéro de l’élève ${this.args.student.lastName} ${this.args.student.firstName} a bien été modifié.`);
    // try {
    //   await adapter.dissociateUser(this.args.student);
    //   this.notifications.sendSuccess(`La dissociation du compte de l’élève ${this.args.student.lastName} ${this.args.student.firstName} est réussie.`);
    // } catch (e) {
    //   this.notifications.sendError(`La dissociation du compte de l’élève ${this.args.student.lastName} ${this.args.student.firstName} a échoué. Veuillez réessayer.`);
    // }

    // this.args.close();
    // this.args.refreshModel();
  }
}
