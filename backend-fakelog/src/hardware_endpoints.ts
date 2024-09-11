import express from "express";
import * as process from "node:process";

const router = express.Router();

async function restartServer(durationSec: number) {
    process.exit(durationSec); // exit code is a way to tell how much to wait before restarting
}

router.get('/restart', async (req, res) => {
    try {
        await restartServer(3);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.toString());
    }
});

// Because it's just a fake-log, there's no difference between the two restart endpoints
router.get('/restartToWifi', async (req, res) => {
    try {
        await restartServer(3);
    } catch (error) {
        console.error(error);
        res.status(500).send(error.toString());
    }
});

export default router;