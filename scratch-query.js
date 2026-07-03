// Standalone script to resolve affiliate user email from UID
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.trim().match(/^([^#=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[match[1].trim()] = val;
  }
});

const projectId = env.FIREBASE_PROJECT_ID;
const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (getApps().length === 0) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

const db = getFirestore();

async function updateProductVariants() {
  const pid = 'JaOi0V0NL8uM1JiYNwo6';
  
  const colors = [
    { name: 'White', hex: '#ffffff' },
    { name: 'Black', hex: '#111111' },
    { name: 'Navy', hex: '#1a2436' },
    { name: 'Ash Grey', hex: '#b5b8bd' },
    { name: 'Coral Pink', hex: '#ff6b6b' }
  ];

  const sizes = ['S', 'M', 'L', 'XL'];
  const basePrice = 28.99;

  const variants = [];
  let idCounter = 18539;

  colors.forEach(color => {
    sizes.forEach(size => {
      variants.push({
        id: String(idCounter++),
        size: size,
        color: color.name,
        colorHex: color.hex,
        price: basePrice,
        available: true,
        printifyVariantId: String(idCounter)
      });
    });
  });

  try {
    const docRef = db.collection('products').doc(pid);
    const doc = await docRef.get();
    if (!doc.exists) {
      console.error(`Product not found: ${pid}`);
      return;
    }
    
    await docRef.update({
      variants: variants
    });
    console.log(`Successfully updated variants for product ${pid}. Added ${variants.length} color/size variants!`);
  } catch (err) {
    console.error('Error updating product variants:', err);
  }
}

updateProductVariants();
