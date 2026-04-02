const https = require('https');
const fs = require('fs');

https.get('https://jbrimobiliaria.com.br/wp-json/wp/v2/properties?per_page=100', (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    const types = {};
    const biz = {};
    const metaKeys = new Set();
    
    data.forEach(p => {
      Object.keys(p).forEach(k => metaKeys.add(k));
      if (p.type_property) {
        types[p.type_property] = p.class_list.find(c => c.startsWith('tax_type-')) || 'Desconhecido';
      }
      if (p.business_property) {
        biz[p.business_property] = p.class_list.find(c => c.startsWith('tax_business-')) || 'Desconhecido';
      }
    });

    fs.writeFileSync('mappings.json', JSON.stringify({ types, biz, allMetaKeys: Array.from(metaKeys) }, null, 2));
  });
});
