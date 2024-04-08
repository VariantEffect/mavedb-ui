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
    restCollectionName: 'doi-identifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/doi-identifiers/search`
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
    restCollectionName: 'experiment-sets',
    primaryKey: 'urn'
  },
  'license': {
    name: 'license', // TODO Redundant, change this structure
    restCollectionName: 'licenses'
  },
  'pubmedPublicationIdentifier': {
    name: 'pubmedPublicationIdentifier', // TODO Redundant, change this structure
    restCollectionName: 'publication-identifiers',
    primaryKey: 'identifier',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/publication-identifiers/pubmed`
      }
    }
  },
  'biorxivPublicationIdentifier': {
    name: 'biorxivPublicationIdentifier', // TODO Redundant, change this structure
    restCollectionName: 'publication-identifiers',
    primaryKey: 'identifier',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/publication-identifiers/biorxiv`
      }
    }
  },
  'medrxivPublicationIdentifier': {
    name: 'medrxivPublicationIdentifier', // TODO Redundant, change this structure
    restCollectionName: 'publication-identifiers',
    primaryKey: 'identifier',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/publication-identifiers/medrxiv`
      }
    }
  },
  'publication-identifier-search': {
    name: 'publication-identifier', // TODO Redundant, change this structure
    restCollectionName: 'publication-identifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/publication-identifiers/search`
      }
    }
  },
  'external-publication-identifier-search': {
    name: 'publication-identifier', // TODO Redundant, change this structure
    restCollectionName: 'publication-identifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/publication-identifiers/search-external`
      }
    }
  },
  'raw-read-identifier-search': {
    name: 'raw-read-identifier', // TODO Redundant, change this structure
    restCollectionName: 'raw-read-identifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/raw-read-identifiers/search`
      }
    }
  },
  'reference-genome': {
    name: 'reference-genome', // TODO Redundant, change this structure
    restCollectionName: 'reference-genomes'
  },
  'assemblies': {
    name: 'assemblies', // TODO Redundant, change this structure
    restCollectionName: 'hgvs/assemblies'
  },
  'gene-names': {
    name: 'gene-names', // TODO Redundant, change this structure
    restCollectionName: 'hgvs/genes'
  },
  'grouped-assemblies': {
    name: 'grouped-assemblies', // TODO Redundant, change this structure
    restCollectionName: 'hgvs/grouped-assemblies'
  },
  'scoreSet': {
    name: 'scoreSet', // TODO Redundant, change this structure
    restCollectionName: 'score-sets',
    primaryKey: 'urn'
  },
  'target-gene-search': {
    name: 'target-gene', // TODO Redundant, change this structure
    restCollectionName: 'target-genes',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/target-genes/search`
      }
    }
  },
  'target-gene-statistics': {
    name: 'target-gene-statistics',
    restCollectionName: 'target-gene-statistics',
    primaryKey: 'field',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/statistics/target/gene`
      }
    }
  },
  'target-accession-statistics': {
    name: 'target-accession-statistics',
    restCollectionName: 'target-accession-statistics',
    primaryKey: 'field',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/statistics/target/accession`
      }
    }
  },
  'uniprot-identifier-search': {
    name: 'uniprot-identifier', // TODO Redundant, change this structure
    restCollectionName: 'target-gene-identifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/target-gene-identifiers/search?db_name=UniProt`
      }
    }
  },
  'ensembl-identifier-search': {
    name: 'ensembl-identifier', // TODO Redundant, change this structure
    restCollectionName: 'targetGeneIdentifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/target-gene-identifiers/search?db_name=Ensembl`
      }
    }
  },
  'refseq-identifier-search': {
    name: 'refseq-identifier', // TODO Redundant, change this structure
    restCollectionName: 'target-gene-identifiers',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/target-gene-identifiers/search?db_name=RefSeq`
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
