import {watch, type Ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'

/**
 * Keep the address bar on the URN the record actually answers to.
 *
 * Publishing a dataset replaces the `tmp:` URN it was created with by a permanent one, and the API
 * forwards a read of the retired URN to the published record with a 308. The request follows that
 * redirect on its own, so the record loads, but the URL in front of the user still names a URN that no
 * longer resolves -- and it is the URL they would copy, bookmark or share. Replacing the route once the
 * record arrives puts the canonical URN there instead.
 *
 * Replacing rather than pushing, so that the retired URN does not become a history entry to go back to.
 *
 * The replacement changes the `urn` route param, which reloads the record under its canonical URN. That
 * duplicate load is the cost of arriving by a retired link, which is a rare path and previously a 404.
 *
 * @param item The loaded record. Nothing happens until it arrives and reports a URN.
 * @param itemId The URN the route asked for.
 */
export function useCanonicalUrn<T extends {urn?: string | null}>(item: Ref<T | null>, itemId: Ref<string>): void {
  const route = useRoute()
  const router = useRouter()

  watch(item, (loaded) => {
    const canonicalUrn = loaded?.urn
    if (!canonicalUrn || !itemId.value || canonicalUrn === itemId.value) {
      return
    }
    // Routes this is used on are all named, and rebuilding from the name carries the rest of the path:
    // /score-sets/:urn/calibrations keeps its suffix, and the query and hash come along untouched.
    if (!route.name) {
      return
    }

    router.replace({
      name: route.name,
      params: {...route.params, urn: canonicalUrn},
      query: route.query,
      hash: route.hash
    })
  })
}
