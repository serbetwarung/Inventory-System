# Inventory System

A modern web-based inventory management system built with React.js frontend and Python backend.

## Features

- Product management (add, edit, delete)
- Stock tracking and updates
- Sales reporting and analytics
- User-friendly interface
- Real-time inventory updates

## Tech Stack

### Frontend
- React.js
- Material-UI
- React Router
- Axios for API calls

### Backend
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL

## Project Structure
```
inventory-system/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
└── backend/           # Python backend application
    ├── requirements.txt
    └── src/
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- PostgreSQL

### Installation

1. Clone the repository
```bash
git clone https://github.com/serbetwarung/Inventory-System.git
cd Inventory-System
```

2. Setup Frontend
```bash
cd frontend
npm install
npm start
```

3. Setup Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
