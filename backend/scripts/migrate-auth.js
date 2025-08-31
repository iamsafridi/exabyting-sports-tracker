const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database', 'sports_tracker.db');

const db = new sqlite3.Database(DB_PATH);

console.log('Starting authentication migration...');

db.serialize(() => {
    // Add authentication columns to matches table
    db.run(`ALTER TABLE matches ADD COLUMN created_by_email TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding created_by_email column:', err.message);
        } else {
            console.log('✓ Added created_by_email column to matches table');
        }
    });

    db.run(`ALTER TABLE matches ADD COLUMN created_by_name TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding created_by_name column:', err.message);
        } else {
            console.log('✓ Added created_by_name column to matches table');
        }
    });

    // Create index for creator email
    db.run(`CREATE INDEX IF NOT EXISTS idx_matches_creator ON matches(created_by_email)`, (err) => {
        if (err) {
            console.error('Error creating creator index:', err.message);
        } else {
            console.log('✓ Created index for match creators');
        }
    });

    console.log('Authentication migration completed successfully!');
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err);
    } else {
        console.log('Database connection closed.');
    }
});
