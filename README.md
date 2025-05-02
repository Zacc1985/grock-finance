# Grock Finance

A smart personal finance management application powered by AI and natural language processing. This application helps track spending, manage budgets, and provide intelligent financial insights with a unique Grock-themed UI inspired by Mobile Legends.

## Features

- Natural Language Processing for expense tracking
- AI-powered financial insights and recommendations
- Budget management and scheduling
- Machine learning for spending pattern analysis
- Custom Grock-themed UI using v0.dev
- Real-time financial tracking and analysis

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Prisma (Database ORM)
- AI/ML Integration
- Authentication
- v0.dev for UI components

## Getting Started

1. Clone the repository
```bash
git clone [your-repo-url]
cd grock-finance
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file with the following variables:
```
DATABASE_URL=
NEXT_PUBLIC_API_KEY=
AI_API_KEY=
```

## Deployment

This project is deployed on Render. Follow these steps to deploy:

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the following:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment Variables (add all from .env.local)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/) 