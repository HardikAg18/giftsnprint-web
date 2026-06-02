const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function updateContact() {
  const dir = path.join(__dirname, 'public');
  
  function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
      const filePath = path.join(currentDirPath, name);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        callback(filePath, stat);
      } else if (stat.isDirectory()) {
        walkSync(filePath, callback);
      }
    });
  }

  walkSync(dir, (filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      
      // Update phone
      if (content.includes('98765 43210')) { content = content.replaceAll('98765 43210', '87695 58589'); changed = true; }
      if (content.includes('9876543210')) { content = content.replaceAll('9876543210', '8769558589'); changed = true; }
      
      // Update location
      if (content.includes('Mumbai, Maharashtra')) { content = content.replaceAll('Mumbai, Maharashtra', 'Jaipur, Rajasthan'); changed = true; }
      if (content.includes('Mumbai, MH')) { content = content.replaceAll('Mumbai, MH', 'Jaipur, RJ'); changed = true; }
      
      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
      }
    }
  });

  // Update DB Settings
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_u3Rz7XpEwOKm@ep-lingering-frost-a57hps49-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require' });
    await pool.query(`UPDATE settings SET value = $1 WHERE key = 'phone'`, ['+91 87695 58589']);
    await pool.query(`UPDATE settings SET value = $1 WHERE key = 'address'`, ['Jaipur, Rajasthan']);
    console.log('Database settings updated successfully.');
    pool.end();
  } catch (err) {
    console.error('Database update failed:', err);
  }
}

updateContact();
