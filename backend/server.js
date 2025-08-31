const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
require('dotenv').config();

const { passport, requireAuth, checkDomain, generateToken } = require('./auth');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const db = new Database();

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:8080',
    credentials: true
}));
app.use(express.json());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Initialize database connection
async function initializeDatabase() {
    try {
        await db.connect();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

// MATCH ENDPOINTS

// Get all matches (Public)
app.get('/api/matches', async (req, res) => {
    try {
        const matches = await db.getAllMatches();
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// Get current active match (Public)
app.get('/api/matches/current', async (req, res) => {
    try {
        const currentMatch = await db.getCurrentMatch();
        res.json(currentMatch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch current match' });
    }
});

// Create new match (Protected)
app.post('/api/matches', requireAuth, checkDomain, async (req, res) => {
    try {
        const { name, date, carryOverAmount = 0 } = req.body;
        
        if (!name || !date) {
            return res.status(400).json({ error: 'Match name and date are required' });
        }

        // End any currently active match first
        await db.endActiveMatch();
        
        const matchId = uuidv4();
        const match = {
            id: matchId,
            name,
            date,
            carryOverAmount: parseFloat(carryOverAmount) || 0,
            isActive: true,
            createdByEmail: req.user.email,
            createdByName: req.user.firstName || req.user.name
        };
        
        await db.createMatch(match);
        
        console.log(`Match "${name}" created by ${req.user.firstName || req.user.name} (${req.user.email})`);
        
        res.status(201).json({ match, message: 'Match created successfully' });
        res.status(201).json({
            ...newMatch,
            isActive: Boolean(newMatch.is_active),
            carryOverAmount: parseFloat(newMatch.carry_over_amount),
            totalCollected: parseFloat(newMatch.total_collected),
            finalBalance: parseFloat(newMatch.final_balance)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create match' });
    }
});

// End match and calculate remaining money for carry-over
app.post('/api/matches/:id/end', async (req, res) => {
    try {
        const { id } = req.params;
        
        const endedMatch = await db.endMatch(id);
        const summary = await db.getFinancialSummary(id);
        
        res.json({
            match: {
                ...endedMatch,
                isActive: Boolean(endedMatch.is_active),
                carryOverAmount: parseFloat(endedMatch.carry_over_amount),
                totalCollected: parseFloat(endedMatch.total_collected),
                totalExpenses: parseFloat(endedMatch.total_expenses),
                finalBalance: parseFloat(endedMatch.final_balance)
            },
            summary
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to end match' });
    }
});

// PARTICIPANT ENDPOINTS

// Get participants for a match (Public)
app.get('/api/participants', async (req, res) => {
    try {
        const { matchId } = req.query;
        
        let targetMatchId = matchId;
        if (!targetMatchId) {
            const currentMatch = await db.getCurrentMatch();
            if (!currentMatch) {
                return res.json([]);
            }
            targetMatchId = currentMatch.id;
        }
        
        const participants = await db.getParticipantsByMatch(targetMatchId);
        res.json(participants);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

// Add participant (Protected)
app.post('/api/participants', requireAuth, checkDomain, async (req, res) => {
    try {
        const { name, amount, matchId } = req.body;
        
        if (!name || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Name and valid amount are required' });
        }
        
        let targetMatchId = matchId;
        
        // If no matchId provided, use current active match
        if (!targetMatchId) {
            const currentMatch = await db.getCurrentMatch();
            if (!currentMatch) {
                return res.status(400).json({ error: 'No active match found. Please create a match first.' });
            }
            targetMatchId = currentMatch.id;
        }
        
        // Check if participant already exists in this match
        const existingParticipants = await db.getParticipantsByMatch(targetMatchId);
        const existingParticipant = existingParticipants.find(p => 
            p.name.toLowerCase() === name.toLowerCase()
        );
        
        if (existingParticipant) {
            return res.status(400).json({ error: 'Participant already exists in this match' });
        }
        
        const participantData = {
            id: uuidv4(),
            match_id: targetMatchId,
            name: name.trim(),
            amount: parseFloat(amount)
        };
        
        const newParticipant = await db.addParticipant(participantData);
        
        res.status(201).json(newParticipant);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add participant' });
    }
});

// Update participant payment status
app.put('/api/participants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { paid } = req.body;
        
        const updatedParticipant = await db.updateParticipantPayment(id, paid);
        
        if (!updatedParticipant) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        
        res.json(updatedParticipant);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update participant' });
    }
});

// Delete participant
app.delete('/api/participants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.deleteParticipant(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        
        res.json({ message: 'Participant deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete participant' });
    }
});

// EXPENSE ENDPOINTS

// Get expenses for a match (Public)
app.get('/api/expenses', async (req, res) => {
    try {
        const { matchId } = req.query;
        
        let targetMatchId = matchId;
        if (!targetMatchId) {
            const currentMatch = await db.getCurrentMatch();
            if (!currentMatch) {
                return res.json([]);
            }
            targetMatchId = currentMatch.id;
        }
        
        const expenses = await db.getExpensesByMatch(targetMatchId);
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

// Add expense (Protected)
app.post('/api/expenses', requireAuth, checkDomain, async (req, res) => {
    try {
        const { category, description, amount, expenseDate, matchId } = req.body;
        
        if (!description || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Description and valid amount are required' });
        }
        
        let targetMatchId = matchId;
        
        // If no matchId provided, use current active match
        if (!targetMatchId) {
            const currentMatch = await db.getCurrentMatch();
            if (!currentMatch) {
                return res.status(400).json({ error: 'No active match found. Please create a match first.' });
            }
            targetMatchId = currentMatch.id;
        }
        
        const expenseData = {
            id: uuidv4(),
            match_id: targetMatchId,
            category: category || 'Others',
            description: description.trim(),
            amount: parseFloat(amount),
            expense_date: expenseDate || moment().format('YYYY-MM-DD')
        };
        
        const newExpense = await db.addExpense(expenseData);
        
        res.status(201).json(newExpense);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add expense' });
    }
});

// Delete expense
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.deleteExpense(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// FINANCIAL REPORT ENDPOINTS

// Get financial summary for a match (Public)
app.get('/api/summary', async (req, res) => {
    try {
        const { matchId } = req.query;
        
        let targetMatchId = matchId;
        if (!targetMatchId) {
            const currentMatch = await db.getCurrentMatch();
            if (!currentMatch) {
                return res.status(404).json({ error: 'No active match found' });
            }
            targetMatchId = currentMatch.id;
        }
        
        const summary = await db.getFinancialSummary(currentMatch.id);
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate financial summary' });
    }
});

// BULK OPERATIONS

// Mark all participants as paid for current match
app.post('/api/participants/mark-all-paid', async (req, res) => {
    try {
        const { matchId } = req.body;
        
        let targetMatchId = matchId;
        if (!targetMatchId) {
            const currentMatch = await db.getCurrentMatch();
            if (!currentMatch) {
                return res.status(400).json({ error: 'No active match found' });
            }
            targetMatchId = currentMatch.id;
        }
        
        const participants = await db.getParticipantsByMatch(targetMatchId);
        await db.markAllParticipantsPaid(targetMatchId);
        
        res.json({ message: `${participants.length} participants marked as paid` });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark all as paid' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Authentication routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}?error=auth_failed` }),
    (req, res) => {
        // Generate JWT token
        const token = generateToken(req.user);
        res.redirect(`${process.env.CLIENT_URL}?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
    }
);

app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Session destruction failed' });
            }
            res.redirect(`${process.env.CLIENT_URL}?logout=success`);
        });
    });
});

app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Session destruction failed' });
            }
            res.redirect(`${process.env.CLIENT_URL}?logout=success`);
        });
    });
});

app.get('/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: req.user, authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await db.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nShutting down gracefully...');
    await db.close();
    process.exit(0);
});

// Start server
app.listen(PORT, async () => {
    console.log(`🏆 Sports Money Tracker Backend running on port ${PORT}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    await initializeDatabase();
    console.log('✅ Server ready to accept connections!');
});
