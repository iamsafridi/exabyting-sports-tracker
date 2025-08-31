const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database', 'sports_tracker.db');

// Ensure database directory exists
const fs = require('fs');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    // Create matches table
    db.run(`
        CREATE TABLE IF NOT EXISTS matches (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            match_date DATE NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            carry_over_amount DECIMAL(10,2) DEFAULT 0,
            total_collected DECIMAL(10,2) DEFAULT 0,
            total_expenses DECIMAL(10,2) DEFAULT 0,
            final_balance DECIMAL(10,2) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ended_at DATETIME NULL,
            created_by TEXT DEFAULT 'system',
            created_by_email TEXT,
            created_by_name TEXT
        )
    `);

    // Create participants table
    db.run(`
        CREATE TABLE IF NOT EXISTS participants (
            id TEXT PRIMARY KEY,
            match_id TEXT NOT NULL,
            name TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            paid BOOLEAN DEFAULT 0,
            date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
            payment_date DATETIME NULL,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE
        )
    `);

    // Create expenses table
    db.run(`
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            match_id TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'Others',
            description TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            expense_date DATE NOT NULL,
            date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
            added_by TEXT DEFAULT 'system',
            FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE
        )
    `);

    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_participants_match_id ON participants(match_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_match_id ON expenses(match_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_matches_active ON matches(is_active)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_matches_creator ON matches(created_by_email)`);

    console.log('Database initialized successfully!');
    console.log('Tables created: matches, participants, expenses');
    console.log('Database location:', DB_PATH);
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err);
    } else {
        console.log('Database connection closed.');
    }
});
