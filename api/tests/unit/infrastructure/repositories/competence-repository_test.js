const { expect, sinon, domainBuilder } = require('../../../test-helper');

const competenceRepository = require('../../../../lib/infrastructure/repositories/competence-repository');
const competenceDatasource = require('../../../../lib/infrastructure/datasources/airtable/competence-datasource');
const areaDatasource = require('../../../../lib/infrastructure/datasources/airtable/area-datasource');

describe('Unit | Repository | CompetenceRepository', function() {

  describe('#get', () => {
    beforeEach(() => {
      sinon.stub(competenceDatasource, 'get');
      sinon.stub(areaDatasource, 'list');

      competenceDatasource.get.resolves(
        domainBuilder.buildCompetenceAirtableDataObject({
          id: 'recDomaine1',
          code: '1',
          nameFrFr: 'Gérer des données fr',
          nameEnUs: 'Gérer des données en',
          color: 'emerald',
          descriptionFrFr: 'description fr-FR',
          descriptionEnUs: 'description en-US',
          areaId: 'recArea',
        }),
      );

      areaDatasource.list.resolves([
        domainBuilder.buildAreaAirtableDataObject({
          id: 'recArea',
          titleFrFr: 'Domaine 1',
          titleEnUs: 'Area 1',
          name: '1. Domaine 1',
          color: 'emerald',
          competenceIds: [
            'recDomaine1',
          ],
        }),
      ]);
    });

    it('should get competences by id and locale', async () => {
      // given
      const id = 'id';
      const locale = 'fr';

      // when
      const competence = await competenceRepository.get({ id, locale });

      // then
      expect(competence.name).to.equal('Gérer des données fr');
      expect(competence.description).to.equal('description fr-FR');
      expect(competence.area.title).to.equal('Domaine 1');
    });
  });

  describe('#getCompetenceName', () => {
    beforeEach(() => {
      sinon.stub(competenceDatasource, 'get');

      competenceDatasource.get.resolves(
        domainBuilder.buildCompetenceAirtableDataObject({
          id: 'recDomaine1',
          code: '1',
          nameFrFr: 'Gérer des données fr',
          nameEnUs: 'Gérer des données en',
          color: 'emerald',
          descriptionFrFr: 'description fr-FR',
          descriptionEnUs: 'description en-US',
          areaId: 'recArea',
        }),
      );
    });

    it('should get competence name by id and locale', async () => {
      // given
      const id = 'id';
      const locale = 'fr';

      // when
      const competenceName = await competenceRepository.getCompetenceName({ id, locale });

      // then
      expect(competenceName).to.equal('Gérer des données fr');
    });
  });

  describe('#listPixCompetencesOnly', () => {
    beforeEach(() => {
      sinon.stub(competenceDatasource, 'list');
      sinon.stub(areaDatasource, 'list');

      competenceDatasource.list.resolves([
        domainBuilder.buildCompetenceAirtableDataObject({
          id: 'recDomaine1',
          code: '1',
          nameFrFr: 'Gérer des données fr',
          nameEnUs: 'Gérer des données en',
          color: 'emerald',
          descriptionFrFr: 'description fr-FR',
          descriptionEnUs: 'description en-US',
          areaId: 'recArea',
        })
      ]);

      areaDatasource.list.resolves([
        domainBuilder.buildAreaAirtableDataObject({
          id: 'recArea',
          titleFrFr: 'Domaine 1',
          titleEnUs: 'Area 1',
          name: '1. Domaine 1',
          color: 'emerald',
          competenceIds: [
            'recDomaine1',
          ],
        }),
      ]);
    });

    it('should get translated competence and area', async () => {
      // given
      const locale = 'en';

      // when
      const competences = await competenceRepository.listPixCompetencesOnly({ locale });

      // then
      expect(competences.length).to.equal(1);
      expect(competences[0].name).to.equal('Gérer des données en');
      expect(competences[0].description).to.equal('description en-US');
      expect(competences[0].area.title).to.equal('Area 1');
    });
  });

});
