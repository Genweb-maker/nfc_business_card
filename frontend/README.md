# NFC Business Card - Frontend

This is the Next.js frontend for the NFC Business Card application.

## Features

- 🔐 Firebase Authentication
- 👤 User Profile Management
- 📱 NFC Sharing (on supported devices)
- 📊 QR Code Generation and Scanning
- 👥 Connection Management
- 📊 Dashboard with Statistics
- 📱 Responsive Design
- 🎨 Modern UI with Tailwind CSS

## Prerequisites

- Node.js 18+ 
- The backend server running on port 3000

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3001`

## Backend Integration

The frontend is configured to connect to the backend API running on `http://localhost:3000/api`. Make sure your backend server is running before starting the frontend.

## Environment Variables

The Firebase configuration is currently hardcoded in the app. For production, you should move these to environment variables:

Create a `.env.local` file:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Build for Production

```bash
npm run build
npm start
```

## Technologies Used

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Firebase** - Authentication
- **QR Code Libraries** - QR generation and scanning
- **Web NFC API** - NFC functionality (Chrome/Edge on Android)

## NFC Support

NFC functionality requires:
- HTTPS (or localhost for development)
- Chrome or Edge browser on Android
- Device with NFC capability
- NFC enabled in device settings

## Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/          # React components
├── contexts/           # React contexts (Auth)
├── lib/               # Utilities and API functions
└── styles/            # Global styles
```

## Available Scripts

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
