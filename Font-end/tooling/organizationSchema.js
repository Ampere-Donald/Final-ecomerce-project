import { organizationJSON } from '../src/storefront/organizationData.js';

export default function organizationSchema() {
  return {
    name: 'newoteg-public-organization', apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const clean = html.replace(/<script\b(?=[^>]*\sdata-newoteg-organization(?:\s|=|>))[^>]*>[\s\S]*?<\/script>/gi, '');
        const tag = `<script type="application/ld+json" data-newoteg-organization>${organizationJSON()}</script>`;
        return clean.replace('</head>', tag + '\n</head>');
      },
    },
  };
}
