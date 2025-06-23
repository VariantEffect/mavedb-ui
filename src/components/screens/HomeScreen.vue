<template>
  <DefaultLayout>
    <div class="grid" style="margin: 10px 0;">
      <div v-if="config.PREVIEW_SITE" class="col-12">
        <Card>
          <template #title>MaveDB Beta Test Site</template>
          <template #content>
            <p>
              You are browsing MaveDB's preview site for beta testers. This site presents unreleased features that may
              have bugs, so if your purpose is not to test these features, please visit the main MaveDB site instead at
              <a href="https://mavedb.org/">mavedb.org</a>.
            </p>
            <p>
              If you are a beta tester, thanks in advance for your feedback! Please use the link in the toolbar to reach
              our Zulip message board, where you can leave notes for the development team about searches you ran that
              did not yield results, new features or changes that you would find valuable, and any other feedback you
              may have.
            </p>
            <h3>Getting started</h3>
            <ul>
              <li>
                Try searching for variants using HGVS strings like
                <span class="mave-hgvs-example" v-tooltip.top="'Click to copy'" @click="copyText">ENST00000473961.6:c.-19-2A>T</span>
                and
                <span class="mave-hgvs-example" v-tooltip.top="'Click to copy'" @click="copyText">NP_000242.1:p.Asn566Thr</span>.
                MaveDB supports a variety of HGVS formats for searching.
              </li>
              <li>
                Browse to a score set like
                <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00000050-a-1'}}">
                  MSH2 LOF Scores
                </router-link>.
                To support clinicians' needs, this view now includes information about ClinVar controls, as
                well as the option to view variant details in coordinates relative to transcripts rather than in the
                format uploaded by investigators, which is often relative to synthetic target sequences.
              </li>
            </ul>
            <h3>Curated score sets</h3>
            <p>The following data sets have been curated and include score range information.</p>
            <table>
              <tr>
                <th>Gene</th>
                <th>Experiment or score set</th>
              </tr>
              <tr>
                <td>ASPA</td>
                <td>
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00000657-a-1'}}">Aspartoacylase (ASPA) cellular abundance</router-link><br />
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00000657-b-1'}}">Aspartoacylase (ASPA) cellular toxicity</router-link>
                </td>
              </tr>
              <tr>
                <td>BRCA1</td>
                <td>
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00000097-0-2'}}">BRCA1 SGE Normalized Scores</router-link>
                  <!--
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00001208-a-2'}}">Multiplex HDR assay of BRCA1</router-link><br />
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00001209-a-2'}}">Cisplatin resistance assay of BRCA1</router-link>
                  -->
                </td>
              </tr>
              <tr>
                <td>BRCA2</td>
                <td><router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00001224-a-1'}}">Scores from arrayed screen of BRCA2 homology directed repair function in VC-8 cells</router-link></td>
              </tr>
              <tr>
                <td>CHEK2</td>
                <td><router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00001205-a-1'}}">CHEK2 Yeast Complementation in MMS</router-link></td>
              </tr>
              <tr>
                <td>FKRP</td>
                <td><router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00001197-a-4'}}">FKRP variants effects on alpha-DG glycosylation</router-link></td>
              </tr>
              <tr>
                <td>GCK</td>
                <td>
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00000096-a-1'}}">GCK activity measured by complementation</router-link><br />
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00000096-b-1'}}">GCK abundance measured by DHFR-PCA</router-link>
                </td>
              </tr>
              <tr>
                <td>KCNH2</td>
                <td>
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00001216-a-1'}}">KCNH2 MAVE Trafficking Scores</router-link><br />
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00001224-a-1'}}">Scores from arrayed screen of BRCA2 homology directed repair function in VC-8 cells</router-link><br />
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00001231-a-1'}}">Scores from cell surface expression deep mutational scan of KCNH2 in HEK293T cells</router-link>
                </td>
              </tr>
              <tr>
                <td>LARGE1</td>
                <td><router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00001197-a-4'}}">LARGE1 variants effects on alpha-DG glycosylation</router-link></td>
              </tr>
              <tr>
                <td>MSH2</td>
                <td><router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00000050-a-1'}}">MSH2 LOF scores (HAP1)</router-link></td>
              </tr>
              <tr>
                <td>OTC</td>
                <td><router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00000112-a-1'}}">SNV-accessible missense variant scores for OTC</router-link></td>
              </tr>
              <tr>
                <td>TP53</td>
                <td>
                  <!--
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00001211-0-2'}}">Yeast-based functional assay of p53 (median transactivation)</router-link>
                  -->
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00001234-0-1'}}">Median TP53 transcriptional activity scores</router-link>
                </td>
              </tr>
            </table>
          </template>
        </Card>
      </div>
      <div class="col-8">
        <Card>
          <template #title>About</template>
          <template #content>
            <p>
              MaveDB is a public repository for datasets from Multiplexed Assays of Variant Effect (MAVEs), such as those
              generated by deep mutational scanning (DMS) or massively parallel reporter assay (MPRA) experiments.
            </p>
            <p>
              MaveDB is open-source, released under the
              <a href="https://www.gnu.org/licenses/agpl-3.0.en.html">AGPLv3</a>
              license.
            </p>
            <p>
              MaveDB is hosted by the
              <a href="https://faculty.washington.edu/dfowler/index.html">Fowler Lab</a>
              in the
              <a href="https://www.gs.washington.edu/">Department of Genome Sciences</a>
              at the University of Washington. It is supported and developed by the
              <a href="https://www.washington.edu/">University of Washington</a>,
              the
              <a href="https://www.wehi.edu.au/">Walter and Eliza Hall Institute of Medical Research</a>,
              and the
              <a href="https://brotmanbaty.org/">Brotman Baty Institute.</a>
            </p>
            <p>
              If you have questions, comments, or suggestions, check out the <router-link to="/help">Help & Support</router-link> page
              for information about how to get in touch.
            </p>
          </template>
        </Card>
      </div>
      <div class="col-4">
        <Card>
          <template #title>Featured Searches</template>
          <template #content>
            <table>
              <thead>
                <tr>
                  <th>Organisms</th>
                  <th>Target genes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <ul>
                      <li><router-link :to="{name: 'search', query: {search: 'Homo sapiens'}}">Homo sapiens</router-link></li>
                      <li><router-link :to="{name: 'search', query: {search: 'Mus musculus'}}">Mus musculus</router-link></li>
                      <li><router-link :to="{name: 'search', query: {search: 'Saccharomyces cerevisiae S288C'}}">Saccharomyces cerevisiae S288C</router-link></li>
                    </ul>
                  </td>
                  <td>
                    <ul>
                      <li><router-link :to="{name: 'search', query: {search: 'HSP90'}}">HSP90</router-link></li>
                      <li><router-link :to="{name: 'search', query: {search: 'KCNQ4'}}">KCNQ4</router-link></li>
                      <li><router-link :to="{name: 'search', query: {search: 'TEM-1 β-lactamase'}}">TEM-1 β-lactamase</router-link></li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </Card>
      </div>
      <div class="col-12">
        <HighlightsView model="ScoreSet"></HighlightsView>
      </div>
      <div class="col-8">
        <HighlightsView model="Target"></HighlightsView>
      </div>
      <div class="col-4">
        <Card>
          <template #title>News</template>
          <template #content>
            <ul>
              <li>
                <p>Tracks for many score sets are now available on the UCSC Genome Browser.</p>
                <p>
                  Example:
                  <a href="https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=chr17:43051063-43051117&hubUrl=https://public.gi.ucsc.edu/~cline/mavedb/hub/hub.txt&Variant_Effect_Maps_hideKids=1&BRCA1_00000097-s-1=dense" target="_blank">
                    <img src="@/assets/logo-ucsc-genome-browser.png" alt="UCSC Genome Browser" style="height: 20px;" />
                    UCSC Genome Browser
                  </a>
                  track for
                  <router-link :to="{name: 'scoreSet', params: {urn: 'urn:mavedb:00000097-s-1'}}">BRCA1 SGE Exon 20 Replicate 1</router-link>
                </p>
              </li>
              <li>
                The complete set of MAVE data licensed under
                <a href="https://creativecommons.org/public-domain/cc0/" target="_blank">Creative Commons Zero</a>
                can now be downloaded from <a href="https://doi.org/10.5281/zenodo.11201736" target="_blank">Zenodo</a>.
              </li>
            </ul>
          </template>
        </Card>
      </div>
      <div class="col-12">
        <Card>
          <template #title>Citing MaveDB</template>
          <template #content>
            <p>
              To cite MaveDB, please cite our most recent publication:
            </p>
            <blockquote>
                Rubin, A.F., Stone, J., Bianchi, A.H. <i>et al.</i> MaveDB 2024: a curated community database with over seven million variant effects
                from multiplexed functional assays. <i>Genome Biol</i> <b>26</b>, 13 (2025). <a href=https://doi.org/10.1186/s13059-025-03476-y>https://doi.org/10.1186/s13059-025-03476-y</a>
            </blockquote>
            Previous MaveDB publications are listed below:
            <blockquote>
              Daniel Esposito, Jochen Weile, Jay Shendure, Lea M Starita, Anthony T Papenfuss, Frederick P Roth, Douglas M Fowler, Alan F Rubin.
              MaveDB: an open-source platform to distribute and interpret data from multiplexed assays of variant effect.
              <i>Genome Biol</i> <b>20</b>, 223 (2019). <a href="https://doi.org/10.1186/s13059-019-1845-6">https://doi.org/10.1186/s13059-019-1845-6</a>
            </blockquote>
          </template>
        </Card>
      </div>
    </div>
  </DefaultLayout>
</template>

<script>

import Card from 'primevue/card'

import config from '@/config'
import DefaultLayout from '@/components/layout/DefaultLayout'
import HighlightsView from '@/components/common/HighlightsView.vue';

export default {
  name: 'HomeScreen',
  components: {Card, DefaultLayout, HighlightsView},
  data: function() {
    return {config}
  },

  methods: {
    copyText: function(event, x) {
      const element = event.target
      if (element) {
        navigator.clipboard.writeText(element.innerText)
      }
    }
  }
}

</script>

<style scoped>

td, th {
  padding: 0 5px;
  vertical-align: top;
}

ul {
  padding-left: 1em;
}

.mave-hgvs-example {
  background: #eee;
  padding: 0 3px;
  cursor: pointer;
}

</style>
