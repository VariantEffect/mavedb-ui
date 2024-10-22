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
  'controlled-keywords-variant-search': {
    name: 'controlled-keywords-variant-library-search',
    restCollectionName: 'controlled-keywords',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/controlled-keywords/variant library creation method`
      }
    }
  },
  'controlled-keywords-endo-system-search': {
    name: 'controlled-keyword-endogenous-locus-library-method-system',
    restCollectionName: 'controlled-keywords',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/controlled-keywords/endogenous locus library method system`
      }
    }
  },
  'controlled-keywords-endo-mechanism-search': {
    name: 'controlled-keywords-endogenous-locus-library-method-mechanism',
    restCollectionName: 'controlled-keywords',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/controlled-keywords/endogenous locus library method mechanism`
      }
    }
  },
  'controlled-keywords-in-vitro-system-search': {
    name: 'controlled-keywords-in-vitro-construct-library-method-system',
    restCollectionName: 'controlled-keywords',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/controlled-keywords/in vitro construct library method system`
      }
    }
  },
  'controlled-keywords-in-vitro-mechanism-search': {
    name: 'controlled-keywords-in-vitro-construct-library-method-mechanism',
    restCollectionName: 'controlled-keywords',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/controlled-keywords/in vitro construct library method mechanism`
      }
    }
  },
  'controlled-keywords-delivery-search': {
    name: 'controlled-keywords-delivery-method',
    restCollectionName: 'controlled-keywords',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/controlled-keywords/delivery method`
      }
    }
  },
  'controlled-keywords-phenotypic-dimensionality-search': {
    name: 'controlled-keywords-phenotypic-assay-dimensionality',
    restCollectionName: 'controlled-keywords',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/controlled-keywords/phenotypic assay dimensionality`
      }
    }
  },
  'controlled-keywords-phenotypic-method-search': {
    name: 'controlled-keywords-phenotypic-assay-method',
    restCollectionName: 'controlled-keywords',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/controlled-keywords/phenotypic assay method`
      }
    }
  },
  'controlled-keywords-phenotypic-modle-system-search': {
    name: 'controlled-keywords-phenotypic-assay-model-system',
    restCollectionName: 'controlled-keywords',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/controlled-keywords/phenotypic assay model system`
      }
    }
  },
  'controlled-keywords-phenotypic-profiling-strategy-search': {
    name: 'controlled-keywords-phenotypic-assay-profiling-strategy',
    restCollectionName: 'controlled-keywords',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/controlled-keywords/phenotypic assay profiling strategy`
      }
    }
  },
  'controlled-keywords-phenotypic-sequencing-type-search': {
    name: 'controlled-keywords-phenotypic-assay-sequencing-read-type',
    restCollectionName: 'controlled-keywords',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/controlled-keywords/phenotypic assay sequencing read type`
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
  'active-license': {
    name: 'active-license', // TODO Redundant, change this structure
    restCollectionName: 'active-licenses',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/licenses/active`
      }
    }
  },
  'pubmedPublicationIdentifier': {
    name: 'pubmedPublicationIdentifier', // TODO Redundant, change this structure
    restCollectionName: 'publication-identifiers',
    primaryKey: 'identifier',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/publication-identifiers/PubMed`
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
        url: `${config.apiBaseUrl}/publication-identifiers/bioRxiv`
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
        url: `${config.apiBaseUrl}/publication-identifiers/medRxiv`
      }
    }
  },
  'crossrefPublicationIdentifier': {
    name: 'crossrefPublicationIdentifier', // TODO Redundant, change this structure
    restCollectionName: 'publication-identifiers',
    primaryKey: 'identifier',
    httpOptions: {
      list: {
        method: 'get',
        url: `${config.apiBaseUrl}/publication-identifiers/Crossref`
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
  'assemblies': {
    name: 'assemblies', // TODO Redundant, change this structure
    restCollectionName: 'hgvs/assemblies'
  },
  'gene-names': {
    name: 'gene-names', // TODO Redundant, change this structure
    restCollectionName: 'hgvs/genes'
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
  'taxonomy': {
    name: 'taxonomy', // TODO Redundant, change this structure
    restCollectionName: 'taxonomies'
  },
  'taxonomy-search': {
    name: 'taxonomy-search', // TODO Redundant, change this structure
    restCollectionName: 'taxonomies-search',
    httpOptions: {
      list: {
        method: 'post',
        url: `${config.apiBaseUrl}/taxonomies/search`
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
