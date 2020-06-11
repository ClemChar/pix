import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import Object, { action } from '@ember/object';
import { validator, buildValidations } from 'ember-cp-validations';
import { getOwner } from '@ember/application';
import { inject as service } from '@ember/service';

const Validations = buildValidations({
  firstName: {
    validators: [
      validator('presence', {
        presence: true,
        ignoreBlank: true,
        message: 'Le prénom ne peut pas être vide.'
      }),
      validator('length', {
        min: 1,
        max: 255,
        message: 'La longueur du prénom ne doit pas excéder 255 caractères.'
      })
    ]
  },
  lastName: {
    validators: [
      validator('presence', {
        presence: true,
        ignoreBlank: true,
        message: 'Le nom ne peut pas être vide.'
      }),
      validator('length', {
        min: 1,
        max: 255,
        message: 'La longueur du nom ne doit pas excéder 255 caractères.'
      })
    ]
  },
  email: {
    validators: [
      validator('presence', {
        presence: true,
        ignoreBlank: true,
        message: 'L\'e-mail ne peut pas être vide.'
      }),
      validator('length', {
        max: 255,
        message: 'La longueur de l\'email ne doit pas excéder 255 caractères.'
      }),
      validator('format', {
        ignoreBlank: true,
        type: 'email',
        message: 'L\'e-mail n\'a pas le bon format.'
      })
    ]
  },
});

class Form extends Object.extend(Validations) {
  @tracked firstName;
  @tracked lastName;
  @tracked email;
}

export default class UserDetailPersonalInformationComponent extends Component {

  @tracked isEditionMode = false;
  @service notifications;

  constructor() {
    super(...arguments);
    this.form = Form.create(getOwner(this).ownerInjection());
  }

  get canAdministratorModifyUserDetails() {
    return !((this.args.user.username !== null) || this.args.user.isAuthenticatedFromGAR);
  }

  @action
  changeEditionMode(event) {
    event.preventDefault();
    this._initForm();
    this.isEditionMode = !this.isEditionMode;
  }

  @action
  cancelEdit() {
    this._initForm();
    this.isEditionMode = false;
  }

  @action
  async updateUserDetails(event) {
    event.preventDefault();

    const { validations } = await this.form.validate();
    if (!validations.isValid) {
      return;
    }
    this.args.user.firstName = this.form.firstName.trim();
    this.args.user.lastName = this.form.lastName.trim();
    this.args.user.email = !this.form.email ? null : this.form.email.trim();

    try {
      await this.args.user.save();
      this.notifications.success('L’utilisateur a été mis à jour avec succès.');
      this.isEditionMode = false;
    } catch (response) {
      this.args.user.rollbackAttributes();
      const messageValidationError = response.errors[0].detail || 'une erreur est survenue, vos modifications n\'ont pas été enregistrées';
      this.notifications.error(messageValidationError);
    }
  }

  _initForm() {
    this.form.firstName = this.args.user.firstName;
    this.form.lastName = this.args.user.lastName;
    this.form.email = this.args.user.email;
  }
}
