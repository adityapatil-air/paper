# Research Paper Review Platform

A comprehensive React-based platform for academic research paper submission, review, and publication. Built with React, Tailwind CSS, and React Router.

## Features

### 🏠 Landing Page
- Browse published research papers
- Search and filter papers by title, authors, keywords, and category
- Clean, academic-styled interface
- Responsive design for all devices

### 👤 User Authentication
- Secure login and registration system
- Role-based access control (Author, Reviewer, Admin)
- Demo accounts for testing different user types
- Form validation and error handling

### 📝 Author Dashboard
- Submit new research papers
- Track submission status and payment
- View submission history
- Upload PDF files and metadata
- Payment processing simulation

### 👥 Reviewer Dashboard
- View assigned papers for review
- Submit detailed reviews with ratings and recommendations
- Track review progress and deadlines
- View completed review history

### ⚙️ Admin Dashboard
- Manage all paper submissions
- Assign reviewers to papers
- Publish accepted papers
- Monitor review progress
- System statistics and analytics

## Technology Stack

- **Frontend**: React 18
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Context API
- **Icons**: Unicode emojis and symbols
- **Build Tool**: Create React App

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd research-paper-review-platform
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Demo Accounts

The platform includes pre-configured demo accounts for testing:

### Author Account
- **Email**: author@example.com
- **Password**: password123
- **Features**: Submit papers, track status, make payments

### Reviewer Account
- **Email**: reviewer@example.com
- **Password**: password123
- **Features**: Review assigned papers, submit feedback

### Admin Account
- **Email**: admin@example.com
- **Password**: password123
- **Features**: Manage submissions, assign reviewers, publish papers

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.js       # Navigation header
│   ├── Footer.js       # Site footer
│   ├── PaperCard.js    # Paper display component
│   ├── LoadingSpinner.js
│   ├── Alert.js        # Notification component
│   └── ProtectedRoute.js # Route protection
├── contexts/           # React Context providers
│   └── AuthContext.js  # Authentication state
├── data/               # Mock data and APIs
│   └── mockData.js     # Sample data and API functions
├── pages/              # Page components
│   ├── Landing.js      # Home page
│   ├── Login.js        # Login page
│   ├── Register.js     # Registration page
│   ├── AuthorDashboard.js
│   ├── ReviewerDashboard.js
│   └── AdminDashboard.js
├── App.js              # Main app component
├── index.js            # App entry point
└── index.css           # Global styles
```

## Key Features

### Responsive Design
- Mobile-first approach
- Tailwind CSS for consistent styling
- Clean academic aesthetic
- Accessible color schemes

### Role-Based Access
- Authors can submit and track papers
- Reviewers can review assigned papers
- Admins can manage the entire process
- Protected routes based on user roles

### Mock Data System
- Comprehensive sample data
- Simulated API calls
- Realistic paper submissions
- Review workflows

### User Experience
- Intuitive navigation
- Clear status indicators
- Progress tracking
- Error handling and validation

## Customization

### Styling
The platform uses Tailwind CSS with custom color schemes. You can modify:
- Color palette in `tailwind.config.js`
- Component styles in `src/index.css`
- Individual component styling

### Data
Mock data is located in `src/data/mockData.js`. You can:
- Add more sample papers
- Modify user accounts
- Extend API functions
- Add new categories

### Features
To add new features:
1. Create new components in `src/components/`
2. Add new pages in `src/pages/`
3. Update routing in `src/App.js`
4. Extend mock APIs in `src/data/mockData.js`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Future Enhancements

- Real backend integration
- File upload functionality
- Email notifications
- Advanced search filters
- Citation tracking
- Analytics dashboard
- Mobile app version
