// Global state management
let participants = [];
let expenses = [];
let currentMatch = null;
let matches = [];
let currentFilter = 'all';
let currentUser = null;
let authToken = null;
const API_BASE = 'https://exasports-81yidtyio-shahid-afridis-projects-826a9584.vercel.app/api';
const AUTH_BASE_URL = 'https://exasports-81yidtyio-shahid-afridis-projects-826a9584.vercel.app/auth';
const USE_API = true; // Set to false to use localStorage fallback

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Check for authentication token in URL (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    
    if (token && userParam) {
        try {
            authToken = token;
            currentUser = JSON.parse(decodeURIComponent(userParam));
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            showApp(true); // Show with authenticated user
        } catch (error) {
            console.error('Error parsing user data:', error);
            showApp(false); // Show without authentication
        }
    } else {
        // Check for stored authentication
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('currentUser');
        
        if (storedToken && storedUser) {
            try {
                authToken = storedToken;
                currentUser = JSON.parse(storedUser);
                
                // Verify token is still valid
                verifyAuthentication().then(valid => {
                    showApp(valid);
                });
            } catch (error) {
                console.error('Error loading stored auth:', error);
                showApp(false);
            }
        } else {
            // Always show app in public mode by default
            showApp(false);
        }
    }
    
    // Handle authentication errors
    const error = urlParams.get('error');
    if (error === 'auth_failed') {
        showToast('Authentication failed. Please try again.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Add event listeners
    document.getElementById('participantName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addParticipant();
        }
    });
    
    document.getElementById('participantAmount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addParticipant();
        }
    });
    
    // Add event listeners for expense form
    document.getElementById('expenseAmount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addExpense();
        }
    });
    
    document.getElementById('expenseDescription').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addExpense();
        }
    });
    
    // Set today's date as default for expense date
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    
    // Set today's date as default for match date
    document.getElementById('matchDate').value = new Date().toISOString().split('T')[0];
});

// Authentication and UI functions
function showLoginPrompt(message) {
    showToast(message || 'Please log in to perform this action');
    // Show login screen
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContent').style.display = 'none';
}

function showApp(isAuthenticated) {
    const loginScreen = document.getElementById('loginScreen');
    const appContent = document.getElementById('appContent');
    const userInfo = document.getElementById('userInfo');
    const loginPrompt = document.getElementById('loginPrompt');
    
    if (isAuthenticated && currentUser) {
        // Show authenticated state
        loginScreen.style.display = 'none';
        appContent.style.display = 'block';
        userInfo.style.display = 'flex';
        loginPrompt.style.display = 'none';
        
        // Update user info display
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userEmail').textContent = currentUser.email;
        
        // Enable all action buttons
        document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
            btn.disabled = false;
        });
    } else {
        // Show public/unauthenticated state
        loginScreen.style.display = 'none';
        appContent.style.display = 'block';
        userInfo.style.display = 'none';
        loginPrompt.style.display = 'flex';
        
        // Disable action buttons that require authentication
        const protectedButtons = document.querySelectorAll('[onclick*="createNewMatch"], [onclick*="addParticipant"], [onclick*="addExpense"], [onclick*="toggleMatchForm"], [onclick*="toggleExpenseForm"]');
        protectedButtons.forEach(btn => {
            btn.disabled = false; // Keep enabled but will show login prompt when clicked
        });
    }
    
    // Initialize the app
    initializeApp();
}

async function verifyAuthentication() {
    if (!authToken) return false;
    
    try {
        const response = await fetch(`${AUTH_BASE_URL}/verify`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            credentials: 'include'
        });
        return response.ok;
    } catch (error) {
        console.error('Auth verification failed:', error);
        return false;
    }
}

function login() {
    console.log('Login button clicked, redirecting to:', `${AUTH_BASE_URL}/google`);
    window.location.href = `${AUTH_BASE_URL}/google`;
}

function logout() {
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Clear global state
    authToken = null;
    currentUser = null;
    
    // Show public app state immediately
    showApp(false);
    
    // Call logout endpoint to clear server session
    fetch(`${AUTH_BASE_URL}/logout`, {
        method: 'GET',
        credentials: 'include'
    }).then(() => {
        showToast('Logged out successfully');
    }).catch((error) => {
        console.error('Logout error:', error);
        showToast('Logged out locally');
    });
}

// Initialize the application
async function initializeApp() {
    try {
        // Check if backend is running
        const healthCheck = await fetch(`${API_BASE}/health`);
        if (!healthCheck.ok) {
            throw new Error('Backend not available');
        }
        
        await loadCurrentMatch();
        await loadData();
        updateDisplay();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast('Backend service is not running. Please start the backend server.');
    }
}

// API helper functions
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    };
    
    // Add auth token if available
    if (authToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const config = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, config);
        
        // Handle authentication errors for write operations
        if (response.status === 401 && options.method && options.method !== 'GET') {
            showLoginPrompt('Authentication required for this action.');
            return;
        }
        
        if (response.status === 403 && options.method && options.method !== 'GET') {
            showToast('Access denied. Only @exabyting.com emails are allowed.', 'error');
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        
        // For read operations, try to continue without auth
        if (!options.method || options.method === 'GET') {
            console.log('Read operation failed, but continuing...');
            return null;
        }
        
        throw error;
    }
}

// Load current match from backend
async function loadCurrentMatch() {
    try {
        currentMatch = await apiRequest('/matches/current');
        if (currentMatch) {
            // Convert database fields to frontend format
            currentMatch.isActive = Boolean(currentMatch.is_active);
            currentMatch.carryOverAmount = parseFloat(currentMatch.carry_over_amount || 0);
            currentMatch.date = currentMatch.match_date;
        }
        updateMatchDisplay();
    } catch (error) {
        console.error('Failed to load current match:', error);
        currentMatch = null;
        updateMatchDisplay();
    }
}

// Load all data from backend
async function loadData() {
    try {
        if (currentMatch) {
            [participants, expenses] = await Promise.all([
                apiRequest('/participants'),
                apiRequest('/expenses')
            ]);
        } else {
            participants = [];
            expenses = [];
        }
    } catch (error) {
        console.error('Failed to load data:', error);
        showToast('Failed to load data from server');
    }
}

// Add participant function
async function addParticipant() {
    // Check authentication first
    if (!currentUser || !authToken) {
        showLoginPrompt('Please log in to add participants');
        return;
    }

    const nameInput = document.getElementById('participantName');
    const amountInput = document.getElementById('participantAmount');
    
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    
    // Validation
    if (!name) {
        showToast('Please enter a participant name');
        nameInput.focus();
        return;
    }
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount');
        amountInput.focus();
        return;
    }
    
    if (!currentMatch) {
        showToast('Please create a match first');
        return;
    }
    
    try {
        const newParticipant = await apiRequest('/participants', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                amount: amount
            })
        });
        
        // Clear inputs
        nameInput.value = '';
        amountInput.value = '';
        nameInput.focus();
        
        // Reload data and update display
        await loadData();
        updateDisplay();
        showToast(`${name} added successfully`);
    } catch (error) {
        showToast(error.message || 'Failed to add participant');
    }
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Toggle payment status
async function togglePayment(id) {
    const participant = participants.find(p => p.id === id);
    if (participant) {
        try {
            await apiRequest(`/participants/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    paid: !participant.paid
                })
            });
            
            // Reload data and update display
            await loadData();
            updateDisplay();
            showToast(`${participant.name} marked as ${!participant.paid ? 'paid' : 'pending'}`);
        } catch (error) {
            showToast(error.message || 'Failed to update payment status');
        }
    }
}

// Delete participant
async function deleteParticipant(id) {
    const participant = participants.find(p => p.id === id);
    if (participant && confirm(`Are you sure you want to remove ${participant.name}?`)) {
        try {
            await apiRequest(`/participants/${id}`, {
                method: 'DELETE'
            });
            
            // Reload data and update display
            await loadData();
            updateDisplay();
            showToast(`${participant.name} removed`);
        } catch (error) {
            showToast(error.message || 'Failed to delete participant');
        }
    }
}

// Filter participants
function filterParticipants(filter) {
    currentFilter = filter;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    updateParticipantsList();
}

// Mark all as paid
async function markAllPaid() {
    if (participants.length === 0) {
        showToast('No participants to update');
        return;
    }
    
    if (confirm('Mark all participants as paid?')) {
        try {
            await apiRequest('/participants/mark-all-paid', {
                method: 'POST',
                body: JSON.stringify({})
            });
            
            // Reload data and update display
            await loadData();
            updateDisplay();
            showToast('All participants marked as paid');
        } catch (error) {
            showToast(error.message || 'Failed to mark all as paid');
        }
    }
}

// Mark all as pending
async function markAllPending() {
    if (participants.length === 0) {
        showToast('No participants to update');
        return;
    }
    
    if (confirm('Mark all participants as pending?')) {
        try {
            // Since there's no bulk mark as pending API, we'll update each participant
            const updatePromises = participants.filter(p => p.paid).map(p => 
                apiRequest(`/participants/${p.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ paid: false })
                })
            );
            
            await Promise.all(updatePromises);
            
            // Reload data and update display
            await loadData();
            updateDisplay();
            showToast('All participants marked as pending');
        } catch (error) {
            showToast(error.message || 'Failed to mark all as pending');
        }
    }
}

// Clear all participants
async function clearAll() {
    if (participants.length === 0) {
        showToast('No participants to clear');
        return;
    }
    
    if (confirm('Are you sure you want to clear all participants? This action cannot be undone.')) {
        try {
            // Delete all participants
            const deletePromises = participants.map(p => 
                apiRequest(`/participants/${p.id}`, { method: 'DELETE' })
            );
            
            await Promise.all(deletePromises);
            
            // Reload data and update display
            await loadData();
            updateDisplay();
            showToast('All participants cleared');
        } catch (error) {
            showToast(error.message || 'Failed to clear all participants');
        }
    }
}

// Toggle expense form visibility
function toggleExpenseForm() {
    const form = document.getElementById('expenseForm');
    const isVisible = form.style.display !== 'none';
    form.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        document.getElementById('expenseDescription').focus();
    }
}

// Add expense function
async function addExpense() {
    const categoryInput = document.getElementById('expenseCategory');
    const descriptionInput = document.getElementById('expenseDescription');
    const amountInput = document.getElementById('expenseAmount');
    const dateInput = document.getElementById('expenseDate');
    
    const category = categoryInput.value;
    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const expenseDate = dateInput.value;
    
    // Validation
    if (!description) {
        showToast('Please enter expense description');
        descriptionInput.focus();
        return;
    }
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount');
        amountInput.focus();
        return;
    }
    
    if (!currentMatch) {
        showToast('Please create a match first');
        return;
    }
    
    try {
        await apiRequest('/expenses', {
            method: 'POST',
            body: JSON.stringify({
                category: category,
                description: description,
                amount: amount,
                expenseDate: expenseDate
            })
        });
        
        // Clear inputs
        descriptionInput.value = '';
        amountInput.value = '';
        categoryInput.selectedIndex = 0;
        
        // Hide form
        document.getElementById('expenseForm').style.display = 'none';
        
        // Reload data and update display
        await loadData();
        updateDisplay();
        showToast(`Expense "${description}" added successfully`);
    } catch (error) {
        showToast(error.message || 'Failed to add expense');
    }
}

// Delete expense
async function deleteExpense(id) {
    const expense = expenses.find(e => e.id === id);
    if (expense && confirm(`Are you sure you want to remove expense "${expense.description}"?`)) {
        try {
            await apiRequest(`/expenses/${id}`, {
                method: 'DELETE'
            });
            
            // Reload data and update display
            await loadData();
            updateDisplay();
            showToast(`Expense "${expense.description}" removed`);
        } catch (error) {
            showToast(error.message || 'Failed to delete expense');
        }
    }
}

// Update all displays
function updateDisplay() {
    updateStats();
    updateParticipantsList();
    updateExpensesList();
    updateSummary();
    updateFinancialReport();
}

// Update statistics
function updateStats() {
    const totalParticipants = participants.length;
    const paidCount = participants.filter(p => p.paid).length;
    const pendingCount = totalParticipants - paidCount;
    const totalCollected = participants.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
    
    document.getElementById('totalParticipants').textContent = totalParticipants;
    document.getElementById('paidCount').textContent = paidCount;
    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('totalCollected').textContent = `৳${totalCollected}`;
}

// Update participants list
function updateParticipantsList() {
    const participantsList = document.getElementById('participantsList');
    const emptyState = document.getElementById('emptyState');
    
    // Filter participants based on current filter
    let filteredParticipants = participants;
    if (currentFilter === 'paid') {
        filteredParticipants = participants.filter(p => p.paid);
    } else if (currentFilter === 'pending') {
        filteredParticipants = participants.filter(p => !p.paid);
    }
    
    if (filteredParticipants.length === 0) {
        participantsList.style.display = 'none';
        emptyState.style.display = 'block';
        
        // Update empty state message based on filter
        const emptyStateH3 = emptyState.querySelector('h3');
        const emptyStateP = emptyState.querySelector('p');
        
        if (currentFilter === 'paid' && participants.length > 0) {
            emptyStateH3.textContent = 'No paid participants';
            emptyStateP.textContent = 'None of the participants have paid yet';
        } else if (currentFilter === 'pending' && participants.length > 0) {
            emptyStateH3.textContent = 'No pending participants';
            emptyStateP.textContent = 'All participants have paid!';
        } else {
            emptyStateH3.textContent = 'No participants added yet';
            emptyStateP.textContent = 'Add your first player to start tracking payments';
        }
    } else {
        participantsList.style.display = 'block';
        emptyState.style.display = 'none';
        
        participantsList.innerHTML = filteredParticipants.map(participant => `
            <div class="participant-item">
                <div class="participant-info">
                    <div class="participant-avatar" style="background-color: ${getAvatarColor(participant.name)}">
                        ${participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="participant-details">
                        <h4>${escapeHtml(participant.name)}</h4>
                        <p>৳${participant.amount}</p>
                    </div>
                </div>
                <div class="participant-actions">
                    <span class="status-badge ${participant.paid ? 'status-paid' : 'status-pending'}">
                        ${participant.paid ? 'Paid' : 'Pending'}
                    </span>
                    <button class="action-btn toggle-btn" onclick="togglePayment('${participant.id}')" title="Toggle payment status">
                        <i class="fas ${participant.paid ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteParticipant('${participant.id}')" title="Delete participant">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Update summary
function updateSummary() {
    const totalExpected = participants.reduce((sum, p) => sum + p.amount, 0);
    const totalCollected = participants.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalExpected - totalCollected;
    
    document.getElementById('totalExpected').textContent = `৳${totalExpected}`;
    document.getElementById('amountCollected').textContent = `৳${totalCollected}`;
    document.getElementById('remainingAmount').textContent = `৳${remaining}`;
    
    // Color coding for remaining amount
    const remainingElement = document.getElementById('remainingAmount');
    if (remaining === 0) {
        remainingElement.style.color = '#059669'; // Success color
    } else if (remaining > 0) {
        remainingElement.style.color = '#d97706'; // Warning color
    }
}

// Generate avatar color based on name
function getAvatarColor(name) {
    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
        '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
        '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
        '#ec4899', '#f43f5e'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update expenses list
function updateExpensesList() {
    const expensesList = document.getElementById('expensesList');
    const expensesEmpty = document.getElementById('expensesEmpty');
    
    if (expenses.length === 0) {
        expensesList.style.display = 'none';
        expensesEmpty.style.display = 'block';
    } else {
        expensesList.style.display = 'block';
        expensesEmpty.style.display = 'none';
        
        expensesList.innerHTML = expenses.map(expense => `
            <div class="expense-item">
                <div class="expense-info">
                    <div class="expense-category">${escapeHtml(expense.category)}</div>
                    <div class="expense-details">
                        <h4>${escapeHtml(expense.description)}</h4>
                        <p>Added on ${new Date(expense.dateAdded).toLocaleDateString('en-GB')}</p>
                    </div>
                </div>
                <div class="expense-actions">
                    <div class="expense-amount">৳${expense.amount}</div>
                    <button class="action-btn delete-btn" onclick="deleteExpense('${expense.id}')" title="Delete expense">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Update financial report
function updateFinancialReport() {
    const totalExpected = participants.reduce((sum, p) => sum + p.amount, 0);
    const totalCollected = participants.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalCollected - totalExpenses;
    
    // Update report cards
    document.getElementById('reportCollections').textContent = `৳${totalCollected}`;
    document.getElementById('reportExpected').textContent = `৳${totalExpected}`;
    document.getElementById('reportCollected').textContent = `৳${totalCollected}`;
    document.getElementById('reportTotalExpenses').textContent = `৳${totalExpenses}`;
    document.getElementById('reportBalance').textContent = `৳${balance}`;
    
    // Update expense breakdown
    const expenseBreakdown = document.getElementById('expenseBreakdown');
    const expensesByCategory = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
    }, {});
    
    expenseBreakdown.innerHTML = Object.entries(expensesByCategory)
        .map(([category, amount]) => `
            <span>${category}: <span>৳${amount}</span></span>
        `).join('');
    
    // Update balance status
    const balanceStatus = document.getElementById('balanceStatus');
    const balanceElement = document.getElementById('reportBalance');
    
    if (balance > 0) {
        balanceStatus.textContent = `৳${balance} surplus remaining`;
        balanceStatus.className = 'report-status balance-positive';
    } else if (balance < 0) {
        balanceStatus.textContent = `৳${Math.abs(balance)} over budget`;
        balanceStatus.className = 'report-status balance-negative';
    } else {
        balanceStatus.textContent = 'Perfect balance maintained!';
        balanceStatus.className = 'report-status balance-zero';
    }
}

// Generate comprehensive report
function generateReport() {
    const totalExpected = participants.reduce((sum, p) => sum + p.amount, 0);
    const totalCollected = participants.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalCollected - totalExpenses;
    const pendingCollection = totalExpected - totalCollected;
    
    const reportData = {
        reportDate: new Date().toISOString(),
        summary: {
            totalParticipants: participants.length,
            paidParticipants: participants.filter(p => p.paid).length,
            pendingParticipants: participants.filter(p => !p.paid).length,
            totalExpected: totalExpected,
            totalCollected: totalCollected,
            pendingCollection: pendingCollection,
            totalExpenses: totalExpenses,
            finalBalance: balance
        },
        participants: participants.map(p => ({
            name: p.name,
            amount: p.amount,
            status: p.paid ? 'Paid' : 'Pending',
            dateAdded: p.dateAdded
        })),
        expenses: expenses.map(e => ({
            category: e.category,
            description: e.description,
            amount: e.amount,
            dateAdded: e.dateAdded
        }))
    };
    
    // Generate text report
    let reportText = `OFFICE SPORTS FINANCIAL TRANSPARENCY REPORT\n`;
    reportText += `Generated on: ${new Date().toLocaleString('en-GB')}\n`;
    reportText += `=`.repeat(60) + '\n\n';
    
    reportText += `📊 FINANCIAL SUMMARY\n`;
    reportText += `-`.repeat(30) + '\n';
    reportText += `Total Participants: ${reportData.summary.totalParticipants}\n`;
    reportText += `Paid: ${reportData.summary.paidParticipants} | Pending: ${reportData.summary.pendingParticipants}\n\n`;
    
    reportText += `💰 COLLECTIONS\n`;
    reportText += `Expected Amount: ৳${reportData.summary.totalExpected}\n`;
    reportText += `Collected Amount: ৳${reportData.summary.totalCollected}\n`;
    reportText += `Pending Collection: ৳${reportData.summary.pendingCollection}\n\n`;
    
    reportText += `💸 EXPENSES\n`;
    reportText += `Total Expenses: ৳${reportData.summary.totalExpenses}\n\n`;
    
    if (expenses.length > 0) {
        reportText += `Expense Breakdown:\n`;
        expenses.forEach(expense => {
            reportText += `  • ${expense.category}: ${expense.description} - ৳${expense.amount}\n`;
        });
        reportText += '\n';
    }
    
    reportText += `💳 FINAL BALANCE\n`;
    reportText += `Balance: ৳${reportData.summary.finalBalance}`;
    if (balance > 0) {
        reportText += ` (Surplus)\n`;
    } else if (balance < 0) {
        reportText += ` (Over Budget)\n`;
    } else {
        reportText += ` (Balanced)\n`;
    }
    
    reportText += '\n' + '='.repeat(60) + '\n';
    reportText += `\n👥 PARTICIPANT DETAILS\n`;
    reportText += `-`.repeat(30) + '\n';
    participants.forEach(p => {
        reportText += `${p.name}: ৳${p.amount} [${p.paid ? 'PAID' : 'PENDING'}]\n`;
    });
    
    if (expenses.length > 0) {
        reportText += `\n💸 EXPENSE DETAILS\n`;
        reportText += `-`.repeat(30) + '\n';
        expenses.forEach(e => {
            const date = new Date(e.dateAdded).toLocaleDateString('en-GB');
            reportText += `${date} | ${e.category} | ${e.description}: ৳${e.amount}\n`;
        });
    }
    
    // Download as text file
    const dataBlob = new Blob([reportText], {type: 'text/plain'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sports-financial-report-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('Financial report generated and downloaded!');
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Match Management Functions

// Toggle match form visibility
function toggleMatchForm() {
    // Check authentication first
    if (!currentUser || !authToken) {
        showLoginPrompt('Please log in to create a match');
        return;
    }

    const form = document.getElementById('newMatchForm');
    const isVisible = form.style.display !== 'none';
    form.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        document.getElementById('matchName').focus();
    }
}

// Create new match
async function createNewMatch() {
    // Check authentication first
    if (!currentUser || !authToken) {
        showLoginPrompt('Please log in to create a match');
        return;
    }

    const nameInput = document.getElementById('matchName');
    const dateInput = document.getElementById('matchDate');
    const carryOverInput = document.getElementById('carryOverInput');
    
    const name = nameInput.value.trim();
    const date = dateInput.value;
    const carryOverAmount = parseFloat(carryOverInput.value) || 0;
    
    // Validation
    if (!name) {
        showToast('Please enter a match name');
        nameInput.focus();
        return;
    }
    
    if (!date) {
        showToast('Please select a match date');
        dateInput.focus();
        return;
    }
    
    try {
        const newMatch = await apiRequest('/matches', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                date: date,
                carryOverAmount: carryOverAmount
            })
        });
        
        // Clear form
        nameInput.value = '';
        dateInput.value = new Date().toISOString().split('T')[0];
        carryOverInput.value = '0';
        
        // Hide form
        document.getElementById('newMatchForm').style.display = 'none';
        
        // Reload current match and data
        await loadCurrentMatch();
        await loadData();
        updateDisplay();
        
        showToast(`Match "${name}" created successfully`);
    } catch (error) {
        showToast(error.message || 'Failed to create match');
    }
}

// End current match
async function endCurrentMatch() {
    if (!currentMatch) {
        showToast('No active match to end');
        return;
    }
    
    if (confirm(`Are you sure you want to end the match "${currentMatch.name}"? This will calculate the final balance and make it available for the next match.`)) {
        try {
            const result = await apiRequest(`/matches/${currentMatch.id}/end`, {
                method: 'POST'
            });
            
            const finalBalance = result.match.finalBalance;
            let message = `Match "${currentMatch.name}" ended successfully.`;
            
            if (finalBalance > 0) {
                message += ` Final balance: ৳${finalBalance} (available for next match)`;
            } else if (finalBalance < 0) {
                message += ` Over budget by: ৳${Math.abs(finalBalance)}`;
            } else {
                message += ` Perfect balance achieved!`;
            }
            
            // Reload current match and data
            await loadCurrentMatch();
            await loadData();
            updateDisplay();
            
            showToast(message);
        } catch (error) {
            showToast(error.message || 'Failed to end match');
        }
    }
}

// Update match display
function updateMatchDisplay() {
    const matchNameElement = document.getElementById('currentMatchName');
    const matchDateElement = document.getElementById('currentMatchDate');
    const carryOverElement = document.getElementById('carryOverInfo');
    const carryOverAmountElement = document.getElementById('carryOverAmount');
    const endMatchBtn = document.getElementById('endMatchBtn');
    
    if (currentMatch) {
        matchNameElement.textContent = currentMatch.name;
        matchDateElement.textContent = `Match Date: ${new Date(currentMatch.date).toLocaleDateString('en-GB')}`;
        
        if (currentMatch.carryOverAmount > 0) {
            carryOverElement.style.display = 'block';
            carryOverAmountElement.textContent = `৳${currentMatch.carryOverAmount}`;
        } else {
            carryOverElement.style.display = 'none';
        }
        
        endMatchBtn.style.display = 'inline-flex';
    } else {
        matchNameElement.textContent = 'No active match';
        matchDateElement.textContent = 'Please create a match to start tracking';
        carryOverElement.style.display = 'none';
        endMatchBtn.style.display = 'none';
    }
}

// Toggle match history
function toggleMatchHistory() {
    const historyDiv = document.getElementById('matchHistory');
    const isVisible = historyDiv.style.display !== 'none';
    
    if (isVisible) {
        historyDiv.style.display = 'none';
    } else {
        loadMatchHistory();
        historyDiv.style.display = 'block';
    }
}

// Load and display match history
async function loadMatchHistory() {
    try {
        const matches = await apiRequest('/matches');
        const historyList = document.getElementById('matchHistoryList');
        
        if (matches.length === 0) {
            historyList.innerHTML = '<p>No previous matches found.</p>';
            return;
        }
        
        historyList.innerHTML = matches.map(match => {
            const matchDate = new Date(match.match_date).toLocaleDateString('en-GB');
            const isActive = Boolean(match.is_active);
            const finalBalance = parseFloat(match.final_balance || 0);
            
            return `
                <div class="match-history-item ${isActive ? 'active-match' : ''}">
                    <div class="match-info">
                        <h4>${match.name}</h4>
                        <p>Date: ${matchDate}</p>
                        ${!isActive ? `<p>Final Balance: ৳${finalBalance}</p>` : '<p class="active-badge">Active Match</p>'}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load match history:', error);
        document.getElementById('matchHistoryList').innerHTML = '<p>Failed to load match history.</p>';
    }
}

// Export data to JSON (bonus feature)
function exportData() {
    if (participants.length === 0) {
        showToast('No data to export');
        return;
    }
    
    const dataStr = JSON.stringify({
        exportDate: new Date().toISOString(),
        currentMatch: currentMatch,
        participants: participants,
        expenses: expenses
    }, null, 2);
    
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sports-money-tracker-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(dataBlob);
    
    showToast('Data exported successfully');
}

// Remove localStorage functions since we're using database
// These functions are no longer needed but kept for compatibility
function saveToStorage() {
    // No longer needed - data is saved to database via API
}

function loadFromStorage() {
    // No longer needed - data is loaded from database via API
}

// Import data from JSON (bonus feature)
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.participants && Array.isArray(data.participants)) {
                showToast('Import functionality requires manual data entry in the new database system');
            } else {
                showToast('Invalid file format');
            }
        } catch (error) {
            showToast('Error reading file');
        }
    };
    reader.readAsText(file);
}
