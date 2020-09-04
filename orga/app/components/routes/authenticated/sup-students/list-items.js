import { inject as service } from '@ember/service';
import Component from '@ember/component';
import { action } from '@ember/object';
import { computed } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import ENV from 'pix-orga/config/environment';


export default class ListItems extends Component {
  @service currentUser;
  @service session;

  @tracked student = null;
  @tracked isShowingEditStudentNumberModal = false;

  @computed('currentUser.organization.id')
  get urlToDownloadCsvTemplate() {
    return `${ENV.APP.API_HOST}/api/organizations/${this.currentUser.organization.id}/schooling-registrations/csv-template?accessToken=${this.session.data.authenticated.access_token}`;
  }

  @action
  openEditStudentNumberModal(student) {
    this.student = student;
    this.isShowingEditStudentNumberModal = true;
  }

  @action
  closeEditStudentNumberModal() {
    this.isShowingEditStudentNumberModal = false;
  }
}
