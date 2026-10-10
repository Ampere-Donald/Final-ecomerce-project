// Experimental entry: the production Wrangler configuration remains worker.js
// until correctness, performance and runtime limits have been verified.
import worker from './worker.js';
import { renderCatalogue } from './.catalogue-ssr/renderer.js';
import { catalogueStyles } from './.catalogue-ssr/styles.js';
export default {
  fetch(request, env, context) {
    return worker.fetch(request, { ...env, renderCatalogue, catalogueStyles }, context);
  },
};
