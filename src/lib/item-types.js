import config from '@/config'

const itemTypes = {
  'my-access-key': {
    name: 'access-key', // TODO Redundant, change this structure
    restCollectionName: 'access-keys',
    httpOptions: {
      list: {
        url: `${config.apiBaseUrl}/users/me/access-keys`
      }
    }
  },
  'doi-identifier-search': {
    name: 'doi-identifier', // TODO Redundant, change this structure
    restCollectionName: 'doiIdentifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/doiIdentifiers/search`
      }
    }
  },
  'experiment': {
    name: 'experiment', // TODO Redundant, change this structure
    restCollectionName: 'experiments',
    primaryKey: 'urn'
  },
  'experimentSet': {
    name: 'experimentSet',
    restCollectionName: 'experimentSets',
    primaryKey: 'urn'
  },
  'license': {
    name: 'license', // TODO Redundant, change this structure
    restCollectionName: 'licenses'
  },
  'publication-identifier-search': {
    name: 'publication-identifier', // TODO Redundant, change this structure
    restCollectionName: 'publicationIdentifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/publicationIdentifiers/search`
      }
    }
  },
  'raw-read-identifier-search': {
    name: 'raw-read-identifier', // TODO Redundant, change this structure
    restCollectionName: 'rawReadIdentifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/rawReadIdentifiers/search`
      }
    }
  },
  'reference-genome': {
    name: 'reference-genome', // TODO Redundant, change this structure
    restCollectionName: 'referenceGenomes'
  },
  'scoreSet': {
    name: 'scoreSet', // TODO Redundant, change this structure
    restCollectionName: 'score-sets',
    primaryKey: 'urn'
  },
  'target-gene-search': {
    name: 'target-gene', // TODO Redundant, change this structure
    restCollectionName: 'targetGenes',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/targetGenes/search`
      }
    }
  },
  'uniprot-identifier-search': {
    name: 'uniprot-identifier', // TODO Redundant, change this structure
    restCollectionName: 'targetGeneIdentifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/targetGeneIdentifiers/search?db_name=UniProt`
      }
    }
  },
  'ensembl-identifier-search': {
    name: 'ensembl-identifier', // TODO Redundant, change this structure
    restCollectionName: 'targetGeneIdentifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/targetGeneIdentifiers/search?db_name=Ensembl`
      }
    }
  },
  'refseq-identifier-search': {
    name: 'refseq-identifier', // TODO Redundant, change this structure
    restCollectionName: 'targetGeneIdentifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/targetGeneIdentifiers/search?db_name=RefSeq`
      }
    }
  },
  'user': {
    name: 'user',
    restCollectionName: 'users',
    title: 'user',
    commonTitle: 'user',
    schema: {
      type: 'object',
      properties: {
        orcidId: {type: 'string'},
        email: {type: 'string'},
        lastName: {type: 'string'},
        firstName: {type: 'string'}
      }
    },
    primaryKey: 'id',
    views: {
      table: {
        default: {
          columns: [
            {path: 'orcidId', title: 'ORCID ID'},
            {path: 'roles'},
            {path: 'lastName'},
            {path: 'firstName'},
            {path: 'email'}
          ]
        }
      },
      detail: {
        default: {
          fields: [
            {path: 'orcidId', title: 'ORCID ID', readonly: true},
            {path: 'email'},
            {path: 'lastName'},
            {path: 'firstName'},
            {path: 'roles', inputType: 'tags'}
          ]
        }
      }
    }
  },
  'me': {
    name: 'me',
    restCollectionName: 'users',
    primaryKey: () => 'me'
  }
}

export default itemTypes
