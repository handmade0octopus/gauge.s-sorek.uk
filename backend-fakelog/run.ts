import { spawn } from 'child_process';

// Function to start the app
function startApp() {
    const app = spawn('ts-node', ['src/index.ts'], { stdio: 'inherit' });

    app.on('exit', async (code: number) => {
        console.log(`App exited with code ${code}. Restarting in ${code} sec...`);
        await new Promise(resolve => setTimeout(resolve, code * 1000));

        startApp();
    });
}

startApp();
