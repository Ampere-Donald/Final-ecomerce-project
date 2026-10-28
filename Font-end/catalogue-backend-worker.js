// Production entry. The matching release-owned Railway package renders React;
// the Worker only fetches and injects its anonymous, versioned HTML fragments.
import worker from './worker.js';
import manifest from './.catalogue-backend/manifest.json' with { type: 'json' };
import { catalogueStyles } from './.catalogue-ssr/styles.js';
export default {
  fetch(request, env, context) {
    return worker.fetch(request, { ...env, backendCatalogue: { rendererId: manifest.rendererId }, catalogueStyles }, context);
  },
};
