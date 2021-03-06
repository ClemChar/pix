import Service from '@ember/service';
import { inject as service } from '@ember/service';
import ENV from 'pix-orga/config/environment';

export default class Url extends Service {
  @service currentDomain;
  definedCampaignsRootUrl = ENV.APP.CAMPAIGNS_ROOT_URL;
  pixAppUrlWithoutExtension = ENV.APP.PIX_APP_URL_WITHOUT_EXTENSION;
  definedHomeUrl = ENV.APP.HOME_URL;

  get campaignsRootUrl() {
    return this.definedCampaignsRootUrl ?
      this.definedCampaignsRootUrl :
      `${this.pixAppUrlWithoutExtension}${this.currentDomain.getExtension()}/campagnes/`;
  }

  get homeUrl() {
    const homeUrl = `https://orga.pix.${this.currentDomain.getExtension()}`;
    return this.definedHomeUrl || homeUrl;
  }

}
