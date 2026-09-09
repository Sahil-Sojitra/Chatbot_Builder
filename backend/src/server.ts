import { connectDatabase } from './database/connection.js';
import app from './app.js';
import { env } from './config/env.js';

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });

  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

void startServer();