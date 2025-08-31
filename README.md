# Office Sports Money Tracker - Bangladesh Edition 🏇⚽🇧🇩

A comprehensive responsive web application designed for Bangladeshi offices to track money collection AND expenses for cricket/football matches. Maintain complete financial transparency with your team!

## Features ✨

### 💰 Money Collection Management
- **Add Participants**: Easily add players with their names and payment amounts in BDT (৳)
- **Track Payment Status**: Mark participants as paid or pending with visual indicators
- **Real-time Statistics**: View total participants, paid count, pending count, and total collected
- **Filtering**: Filter participants by All, Paid, or Pending status
- **Bulk Actions**: Mark all as paid/pending or clear all participants

### 💸 Expense Tracking & Transparency
- **Add Match Expenses**: Track all match-related spending (Ground rent, Refreshments, Equipment, etc.)
- **Expense Categories**: Predefined categories for common expenses
- **Expense History**: View all expenses with dates and categories
- **Financial Transparency**: Real-time balance calculation (Collections - Expenses)

### 📊 Financial Reporting
- **Live Financial Dashboard**: See collections, expenses, and remaining balance at a glance
- **Comprehensive Reports**: Generate detailed financial transparency reports
- **Downloadable Reports**: Export financial summaries as text files
- **Balance Status**: Know if you have surplus, deficit, or perfect balance

### 📱 Technical Features
- **Bangladesh-focused**: BDT (৳) currency and local context
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Data Persistence**: All data saved locally in your browser (no server required)
- **Visual Feedback**: Toast notifications and colorful avatars for better UX

## How to Use 🚀

### Getting Started
1. Open `index.html` in any modern web browser
2. The app will load with an empty participant list

### Adding Participants
1. Enter the participant's name in the "Enter player name" field
2. Enter the amount they need to pay in the "Amount (৳)" field
3. Click "Add Player" or press Enter
4. The participant will be added to the list with a "Pending" status

### Managing Payments
- **Mark as Paid**: Click the checkmark (✓) button next to a participant
- **Mark as Pending**: Click the undo (↶) button next to a paid participant
- **Delete Participant**: Click the trash (🗑️) button to remove a participant
- **Bulk Actions**: Use the buttons at the top to mark all as paid/pending or clear all

### Managing Expenses 🔍
- **Add Expense**: Click "Add Expense" button in the Match Expenses section
- **Select Category**: Choose from Ground Rent, Refreshments, Equipment, Transportation, Referee, or Others
- **Enter Details**: Provide description and amount in BDT (৳)
- **Track Spending**: All expenses are automatically added to the financial report
- **Delete Expenses**: Remove incorrect entries with the trash button

### Financial Transparency & Reporting 📊
- **Real-time Dashboard**: View collections vs expenses with live balance updates
- **Expense Breakdown**: See spending by category (Ground, Refreshments, etc.)
- **Balance Status**: Instantly know if you have surplus money or are over budget
- **Generate Reports**: Download comprehensive financial transparency reports
- **Filter Views**: Use filter buttons (All/Paid/Pending) to view specific participant groups

## Features in Detail 📋

### Statistics Dashboard
- **Total Players**: Number of participants added
- **Paid**: Number of participants who have paid
- **Pending**: Number of participants yet to pay
- **Collected**: Total amount collected so far (in BDT ৳)

### Financial Transparency Report
- **Collections Section**: Shows expected vs collected amounts
- **Expenses Section**: Displays total spending with category breakdown
- **Balance Section**: Real-time calculation of remaining funds
- **Status Indicators**: Visual cues for surplus, deficit, or balanced budget

### Payment Summary
- **Total Amount Expected**: Sum of all participant amounts
- **Amount Collected**: Total from participants marked as paid
- **Remaining to Collect**: Outstanding amount (color-coded)
- **Net Balance**: Collections minus expenses for true financial picture

### Responsive Design
- **Desktop**: Full-width layout with optimal spacing
- **Tablet**: Adapted layout for medium screens
- **Mobile**: Stacked layout with touch-friendly buttons

## Technical Details 🛠️

### Technologies Used
- **HTML5**: Semantic structure with Bangladesh-focused design
- **CSS3**: Modern responsive styling with CSS Grid and Flexbox
- **Vanilla JavaScript**: No external dependencies, pure JS functionality
- **Local Storage**: Browser-based data persistence for both collections and expenses
- **Font Awesome**: Rich icon set for intuitive UX
- **Inter Font**: Modern, readable typography
- **BDT Currency Support**: Native Bangladeshi Taka (৳) symbol integration

### Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

### Data Storage
- All data is stored locally in your browser using localStorage
- Data persists between browser sessions
- No data is sent to external servers
- Data is specific to the domain/file location

## Tips for Best Use 💡

### For Collections
1. **Set Standard Amount**: Decide on a fixed amount per person before the match
2. **Mobile Collection**: Use your phone to mark payments as "Paid" on the spot
3. **Regular Updates**: Update payment status immediately to avoid confusion

### For Expense Tracking
1. **Record Immediately**: Add expenses right after spending to avoid forgetting
2. **Use Proper Categories**: Choose the right category for better expense analysis
3. **Include Details**: Add clear descriptions for transparency
4. **Generate Reports**: Share financial reports with all participants for transparency

### Data Management
1. **Regular Backups**: Since data is stored locally, consider taking screenshots
2. **Same Device**: Always use the same browser on the same device to access your data
3. **Clear Browser Data**: Be careful when clearing browser data as it will remove all data
4. **Share Reports**: Use the "Generate Report" feature to create transparency documents

## Troubleshooting 🔧

### Data Not Saving
- Ensure you're using a modern browser with localStorage support
- Check if browser is in private/incognito mode (localStorage may be disabled)

### App Not Loading Properly
- Make sure all files (index.html, styles.css, script.js) are in the same folder
- Check browser console for any error messages
- Ensure you have an internet connection for external fonts and icons

### Mobile Issues
- For best mobile experience, add the page to your home screen
- Use landscape mode on small phones for better visibility

## File Structure 📁

```
sports-money-tracker/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Perfect For Bangladesh Context 🇧🇩

### Common Office Sports Scenarios
- **Weekly Cricket**: Track collections for regular office cricket matches
- **Football Tournaments**: Manage finances for inter-department tournaments
- **Annual Sports Day**: Handle larger events with multiple expense categories
- **Team Outings**: Track both collections and expenses for comprehensive events

### Typical Expenses You Can Track
- **Ground Rent**: Sports complex or field rental costs
- **Refreshments**: Snacks, drinks, lunch for players and spectators
- **Equipment**: Balls, stumps, jerseys, trophies
- **Transportation**: Bus or van rental for team transport
- **Referee**: Payment for match officials
- **Others**: Any additional match-related expenses

## Future Enhancements 🚀

Potential features for future versions:
- Export to Excel/CSV format
- Multiple simultaneous events tracking
- SMS/WhatsApp integration for payment reminders
- Photo upload for expense receipts
- Team WhatsApp report sharing
- Bengali language support

## License 📄

This project is open source and available under the MIT License. Feel free to modify and use it for your own purposes.

---

**Happy Tracking! 🏆**

Perfect for office cricket/football matches, team outings, group events, and any scenario where you need to track money collection from multiple people.
