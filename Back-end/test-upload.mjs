import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function run() {
    try {
        console.log("Fetching products...");
        const res = await axios.get('http://localhost:3000/api/produits');
        if (res.data.length === 0) {
            console.log("No products found.");
            return;
        }
        
        const productId = res.data[0].id; // Test sur le premier produit
        console.log(`Uploading image for product ${productId}...`);

        const form = new FormData();
        form.append('file', fs.createReadStream('C:\\Users\\Donald\\.gemini\\antigravity\\brain\\d9cba469-046c-415d-8882-c203a41a4b5a\\product_pompe_1773786693747.png'));

        const uploadRes = await axios.post(`http://localhost:3000/api/produits/${productId}/image`, form, {
            headers: form.getHeaders(),
        });
        
        console.log("Upload Success:", uploadRes.data);
    } catch (err) {
        console.error("Upload Error:", err.response ? err.response.data : err.message);
    }
}

run();
