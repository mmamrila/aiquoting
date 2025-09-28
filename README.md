# AI Radio Quoting Tool

An AI-powered quoting system for two-way radio and surveillance systems. This application demonstrates the feasibility of using AI to handle complex quoting processes for radio equipment, including Motorola MOTOTRBO systems, accessories, and installation services.

## Features

🤖 **AI Conversational Interface**
- Natural language processing for quote requests
- Intelligent system recommendations
- Contextual follow-up questions
- Quote generation from chat interactions

📋 **Comprehensive Parts Database**
- 50+ realistic Motorola radio parts and accessories
- Accurate pricing based on 2024 market research
- Categories: Portable Radios, Mobile Radios, Repeaters, Batteries, Accessories
- Technical specifications and compatibility information

💼 **Quote Management**
- Professional PDF quote generation
- Quote status tracking (Draft, Sent, Approved, Rejected)
- Client information management
- Labor cost calculations
- Tax and discount handling

🏢 **Industry-Specific Solutions**
- Pre-configured scenarios for Education, Warehousing, Construction, Healthcare
- Coverage area calculations
- User count recommendations
- Special requirements handling

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm package manager

### Installation

1. **Install all dependencies:**
```bash
npm run install-all
```

2. **Initialize the database with sample data:**
```bash
node server/initDatabase.js
```

3. **Start the application:**
```bash
npm run dev
```

4. **Open your browser to:**
```
http://localhost:3000
```

The application will start with:
- Frontend React app on port 3000
- Backend API server on port 5000
- SQLite database with sample data

## Usage Guide

### AI Chat Interface

The main feature is the conversational AI that can handle various quoting scenarios:

**Simple Requests:**
- "I need 3 new batteries for my Motorola XPR7550"
- "Battery replacement for 10 radios"

**Complex Installations:**
- "Mobile radio installation for forklift"
- "1 repeater and 25 radios for school district"
- "Complete system for 350,000 sq ft warehouse"

**Industry-Specific:**
- "Radio system for construction company with 5 job sites"
- "Hospital communication system for 120 users"

### Test Scenarios

The application includes realistic test scenarios:

1. **Lincoln Elementary School**: 25 users, emergency communication needs
2. **Metro Warehouse Solutions**: 45 users, 350k sq ft coverage, forklift mounting
3. **Sunrise Construction**: 35 users, multi-site, rugged environment
4. **Regional Medical Center**: 120 users, campus-wide coverage

### Sample Parts Included

- **Portable Radios**: XPR 3300e, XPR 3500e, XPR 7550e, XPR 7580e IS
- **Mobile Radios**: XPR 2500 series (various power levels)
- **Repeaters**: SLR 5700, DR 3000
- **Batteries**: PMNN4468, PMNN4476, PMNN4491, PMNN4600
- **Accessories**: Speaker mics, antennas, chargers, installation kits
- **Services**: FCC licensing, programming, site surveys

## Application Structure

```
radio-quoting-tool/
├── server/                 # Backend API (Node.js/Express)
│   ├── database/          # SQLite database and seeding
│   ├── routes/            # API endpoints (parts, clients, quotes, AI)
│   └── server.js          # Main server file
├── client/                # Frontend (React)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.js         # Main application
│   │   └── index.js       # React entry point
│   └── public/            # Static assets
└── package.json           # Root dependencies and scripts
```

## API Endpoints

- `GET /api/parts` - Retrieve parts catalog
- `POST /api/parts/search` - Search parts by criteria
- `GET /api/clients` - Retrieve client list
- `POST /api/quotes` - Create new quote
- `GET /api/quotes/:id/pdf` - Download quote PDF
- `POST /api/ai/chat` - AI conversation endpoint
- `POST /api/ai/recommend` - System recommendations

## Key Features Demonstration

### 1. AI Decision Making
The AI can handle complex decision trees:
- Frequency band selection (UHF vs VHF)
- Power level recommendations
- System type determination (Basic/Single-Site/Multi-Site)
- Compatibility checking
- Licensing requirements

### 2. Realistic Pricing
All pricing is based on 2024 market research:
- XPR 2500 Mobile: $872-$1,013
- XPR 7550e Portable: $875
- SLR 5700 Repeater: $4,650
- Labor rates: $85/hour
- FCC licensing: $800 (10-year)

### 3. Professional Output
- PDF quote generation with company branding
- Detailed line items with SKUs
- Labor calculations
- Tax and discount application
- Professional formatting

## Technology Stack

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, Axios, CSS3
- **PDF Generation**: PDFKit
- **Database**: SQLite with realistic seed data
- **AI Logic**: Custom decision engine with natural language processing

## Limitations & Next Steps

This is a feasibility prototype. For production use, consider:

1. **NetSuite Integration**: API connection to live inventory
2. **Advanced AI**: Integration with ChatGPT/Claude for enhanced NLP
3. **User Authentication**: Role-based access control
4. **Real-time Sync**: Live inventory and pricing updates
5. **Mobile App**: Teams integration or mobile interface
6. **Advanced Reporting**: Analytics and quote tracking

## Testing the Feasibility

Try these test cases to evaluate AI capabilities:

1. **Battery Replacement**: "I need new batteries for 5 XPR radios"
2. **Vehicle Installation**: "Install mobile radio in delivery truck"
3. **School System**: "Radio system for elementary school, 25 staff"
4. **Warehouse**: "Need radios for 200,000 sq ft warehouse"
5. **Construction**: "Multi-site system for construction company"

Each scenario will demonstrate the AI's ability to:
- Ask clarifying questions
- Make technical recommendations
- Calculate accurate pricing
- Generate professional quotes

## Support

For questions about this prototype or to discuss production implementation:

- Review the code structure in the respective directories
- Test various scenarios through the AI chat interface
- Examine the realistic parts database and pricing
- Generate sample quotes to evaluate output quality

This prototype demonstrates the feasibility of AI-driven quoting for complex radio systems, providing a foundation for full-scale implementation with your existing NetSuite environment.