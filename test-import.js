const fs = require('fs');

async function testUpload() {
  const form = new FormData();
  const fileBuffer = fs.readFileSync('produits_import_v4.csv');
  const blob = new Blob([fileBuffer], { type: 'text/csv' });
  form.append('file', blob, 'produits_import_v4.csv');

  try {
    console.log('Sending request...');
    const res = await fetch('http://localhost:3000/api/produits/import', {
      method: 'POST',
      body: form,
    });
    const data = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.log('Error:', err.message);
  }
}
testUpload();
