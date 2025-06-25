# LiQid Screenplay Writer

A collaborative screenplay writing application built with React, TypeScript, and Firebase.

## Running on StackBlitz

This project is configured to run on StackBlitz. You can open it directly in StackBlitz by clicking the button below:

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/YOUR_USERNAME/YOUR_REPO)

### StackBlitz Configuration

The project includes several StackBlitz-specific configurations:

- `.stackblitzrc` - Sets environment variables and startup commands
- `stackblitz.config.js` - Configures the StackBlitz environment
- `stackblitz.js` - Provides StackBlitz-specific initialization code

### Firebase in StackBlitz

When running in StackBlitz, the application:

1. Disables Firebase Analytics to avoid issues
2. Skips connecting to the Firestore emulator
3. Uses optimized Firestore settings for the StackBlitz environment

Note that you'll still need to authenticate with Firebase to use the full functionality of the application.

## Features

- Screenplay formatting and editing
- Real-time collaboration
- Project management
- User authentication
- Offline support

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Local Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Firebase Configuration

This project uses Firebase for authentication, database, storage, and analytics. The Firebase configuration is already set up in the project.

## Building for Production

To build the project for production, run:

```bash
npm run build
```

The build output will be in the `dist` directory.

## License

[MIT](LICENSE)
