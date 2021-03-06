import Service from '@ember/service';
import { expect } from 'chai';
import { beforeEach, describe, it } from 'mocha';
import { setupTest } from 'ember-mocha';
import createGlimmerComponent from '../../helpers/create-glimmer-component';

describe('Unit | Component | Navbar Desktop Header Component', function() {
  setupTest();
  const sessionStubResolve = Service.create({ isAuthenticated: true });
  const sessionStubReject = Service.create({ isAuthenticated: false });

  let component;

  describe('When user is logged', function() {
    beforeEach(function() {
      component = createGlimmerComponent('component:navbar-desktop-header');
      component.session = sessionStubResolve;
    });

    context('#isUserLogged', function() {
      it('should return true', function() {
        // then
        expect(component.isUserLogged).to.equal(true);
      });
    });

    context('#menu', function() {
      it('should only contains permanent menu items', function() {
        // given
        const expectedLoggedUserMenu = [];

        // then
        expect(component.menu).to.deep.equal(expectedLoggedUserMenu);
      });
    });
  });

  describe('When user is not logged', function() {
    beforeEach(function() {
      component = createGlimmerComponent('component:navbar-desktop-header');
      component.session = sessionStubReject;
    });

    context('#isUserLogged', function() {
      it('should return false, when user is unauthenticated', function() {
        // then
        expect(component.isUserLogged).to.equal(false);
      });
    });

    context('#menu', function() {
      it('should set with default values (including connexion link)', function() {
        // given
        const expectedUnloggedUserMenu = [
          { link: 'login' },
          { link: 'inscription' }
        ];

        // then
        expect(component.menu).to.have.lengthOf(expectedUnloggedUserMenu.length);
        expect(component.menu[0].link).to.equal(expectedUnloggedUserMenu[0].link);
        expect(component.menu[1].link).to.equal(expectedUnloggedUserMenu[1].link);
      });
    });
  });
});
