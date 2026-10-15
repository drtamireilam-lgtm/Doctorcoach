# Contextual rehabilitation navigation

My File shows episode-specific links to the return plan/history and measurements,
plus the recorded stage when a plan exists. Active episodes appear beside My
Program, including when training is medically blocked. No extra primary navigation
destination or automatic plan selection is introduced.

Links use the existing recovery hash route with validated tab, episode UUID and
return destination. Native hash/popstate navigation supports direct opening,
refresh and back/forward. The recovery workspace mounts for the requested target:
return plan selection, measurement filter, body region and the active-episode
measurement form are initialized accordingly. Explicit back links return to My
File, My Program or Progress.

Closed episodes remain accessible through My File for read-only follow-up.
The legacy general return plan keeps its own link. When a requested episode
is absent from the current authorized bundle, the workspace shows an unavailable
message rather than a different plan. Query values cannot select another client
or introduce arbitrary return URLs. Existing server ownership and clinical
permissions remain unchanged.

Verification: TypeScript and all 163 tests passed. Three route tests cover
round-trip context, legacy links, unrelated/invalid routes and exclusion of client
selectors, personal content and external return URLs. Production build runs in
the publishing workflow. Browser layout, browser back/forward and signed-in
end-to-end flows have not been tested in a browser.
