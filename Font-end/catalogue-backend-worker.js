// Candidate entry only. Production remains worker.js until the Railway package
// and the Free-plan CPU budget have both been verified.
import worker from './worker.js';
import manifest from './.catalogue-backend/manifest.json' with { type: 'json' };
import { catalogueStyles } from './.catalogue-ssr/styles.js';
export default {
  fetch(request, env, context) {
    return worker.fetch(request, { ...env, backendCatalogue: { rendererId: manifest.rendererId }, catalogueStyles }, context);
  },
};
