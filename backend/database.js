const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database', 'sports_tracker.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

class Database {
    constructor() {
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.initializeTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async initializeTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Create matches table
                this.db.run(`
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
                        created_by TEXT DEFAULT 'system'
                    )
                `);

                // Create participants table
                this.db.run(`
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
                this.db.run(`
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

                // Create indexes
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_participants_match_id ON participants(match_id)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_match_id ON expenses(match_id)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_matches_active ON matches(is_active)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date)`, (err) => {
                    if (err) reject(err);
                    else {
                        console.log('Database tables initialized successfully');
                        resolve();
                    }
                });
            });
        });
    }

    // Generic query methods
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Match methods
    async createMatch(matchData) {
        const { id, name, match_date, carry_over_amount = 0 } = matchData;
        
        // First, deactivate all existing matches
        await this.run('UPDATE matches SET is_active = 0');
        
        // Create new match
        const sql = `
            INSERT INTO matches (id, name, match_date, is_active, carry_over_amount, total_collected, final_balance, created_by_email, created_by_name)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)
        `;
        const { createdByEmail, createdByName } = matchData;
        await this.run(sql, [id, name, match_date, carry_over_amount, carry_over_amount, carry_over_amount, createdByEmail, createdByName]);
        
        return this.get('SELECT * FROM matches WHERE id = ?', [id]);
    }

    async getCurrentMatch() {
        return this.get('SELECT * FROM matches WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1');
    }

    async getAllMatches() {
        return this.all('SELECT * FROM matches ORDER BY match_date DESC');
    }

    async getMatchById(id) {
        return this.get('SELECT * FROM matches WHERE id = ?', [id]);
    }

    async endMatch(matchId) {
        const match = await this.getMatchById(matchId);
        if (!match) throw new Error('Match not found');

        // Calculate final totals
        const participants = await this.getParticipantsByMatch(matchId);
        const expenses = await this.getExpensesByMatch(matchId);

        const totalCollected = participants
            .filter(p => p.paid)
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const finalBalance = (totalCollected + parseFloat(match.carry_over_amount)) - totalExpenses;

        // Update match
        const sql = `
            UPDATE matches 
            SET is_active = 0, ended_at = CURRENT_TIMESTAMP, 
                total_collected = ?, total_expenses = ?, final_balance = ?
            WHERE id = ?
        `;
        await this.run(sql, [totalCollected + parseFloat(match.carry_over_amount), totalExpenses, finalBalance, matchId]);

        return this.getMatchById(matchId);
    }

    async getLastMatchBalance() {
        const lastMatch = await this.get(`
            SELECT final_balance FROM matches 
            WHERE is_active = 0 AND ended_at IS NOT NULL 
            ORDER BY ended_at DESC LIMIT 1
        `);
        return lastMatch ? parseFloat(lastMatch.final_balance) : 0;
    }

    // Participant methods
    async addParticipant(participantData) {
        const { id, match_id, name, amount } = participantData;
        const sql = `
            INSERT INTO participants (id, match_id, name, amount, date_added, last_updated)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        await this.run(sql, [id, match_id, name, amount]);
        return this.get('SELECT * FROM participants WHERE id = ?', [id]);
    }

    async getParticipantsByMatch(matchId) {
        return this.all('SELECT * FROM participants WHERE match_id = ? ORDER BY date_added', [matchId]);
    }

    async updateParticipantPayment(participantId, paid) {
        const paymentDate = paid ? new Date().toISOString() : null;
        const sql = `
            UPDATE participants 
            SET paid = ?, payment_date = ?, last_updated = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        await this.run(sql, [paid ? 1 : 0, paymentDate, participantId]);
        return this.get('SELECT * FROM participants WHERE id = ?', [participantId]);
    }

    async deleteParticipant(participantId) {
        return this.run('DELETE FROM participants WHERE id = ?', [participantId]);
    }

    async markAllParticipantsPaid(matchId) {
        const sql = `
            UPDATE participants 
            SET paid = 1, payment_date = CURRENT_TIMESTAMP, last_updated = CURRENT_TIMESTAMP
            WHERE match_id = ?
        `;
        return this.run(sql, [matchId]);
    }

    // Expense methods
    async addExpense(expenseData) {
        const { id, match_id, category, description, amount, expense_date } = expenseData;
        const sql = `
            INSERT INTO expenses (id, match_id, category, description, amount, expense_date, date_added)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        await this.run(sql, [id, match_id, category, description, amount, expense_date]);
        return this.get('SELECT * FROM expenses WHERE id = ?', [id]);
    }

    async getExpensesByMatch(matchId) {
        return this.all('SELECT * FROM expenses WHERE match_id = ? ORDER BY expense_date DESC, date_added DESC', [matchId]);
    }

    async deleteExpense(expenseId) {
        return this.run('DELETE FROM expenses WHERE id = ?', [expenseId]);
    }

    // Financial summary methods
    async getFinancialSummary(matchId) {
        const match = await this.getMatchById(matchId);
        if (!match) throw new Error('Match not found');

        const participants = await this.getParticipantsByMatch(matchId);
        const expenses = await this.getExpensesByMatch(matchId);

        const totalExpected = participants.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalCollected = participants
            .filter(p => p.paid)
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const availableAmount = totalCollected + parseFloat(match.carry_over_amount);
        const balance = availableAmount - totalExpenses;
        const pendingCollection = totalExpected - totalCollected;

        // Group expenses by category
        const expensesByCategory = expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + parseFloat(expense.amount);
            return acc;
        }, {});

        return {
            match,
            totalParticipants: participants.length,
            paidParticipants: participants.filter(p => p.paid).length,
            pendingParticipants: participants.filter(p => !p.paid).length,
            totalExpected,
            totalCollected,
            pendingCollection,
            totalExpenses,
            carryOverAmount: parseFloat(match.carry_over_amount),
            availableAmount,
            balance,
            expensesByCategory,
            participants,
            expenses
        };
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) console.error('Error closing database:', err);
                    else console.log('Database connection closed');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = Database;
