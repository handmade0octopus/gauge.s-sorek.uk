import express from 'express';
import mime from 'mime-types';
import * as path from "node:path";
import {WORKING_DIR} from "./index";
import * as fs from "node:fs";
import {upload} from "./multer";

const router = express.Router();

router.post('/edit', express.urlencoded({extended: true}), upload.single('data'), async (req, res) => {
    try {
        const filePath = req.file.originalname;
        const fileBuffer = req.file.buffer;
        const contentType = req.file.mimetype;

        if (contentType.startsWith('text')) {
            const fileContent = fileBuffer.toString('utf8');
            fs.writeFileSync(path.join(WORKING_DIR, filePath), fileContent);
        } else {
            fs.writeFileSync(path.join(WORKING_DIR, filePath), fileBuffer);
        }

        res.status(200).send();
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

router.put('/edit', upload.none(), async (req, res) => {
    try {
        const filePath = req.body.path;
        const fullPath = path.join(WORKING_DIR, filePath);

        // If the path contains a dot, treat it as a file
        if (path.basename(filePath).includes('.')) {
            fs.writeFileSync(fullPath, '', { flag: 'w' });
        } else {
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        }

        res.status(200).send();
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

// TODO: check if it should also delete directories
router.delete('/edit', upload.none(), async (req, res) => {
    try {
        const filePath = req.body.path;
        fs.unlinkSync(path.join(WORKING_DIR, filePath));
        res.status(200).send();
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

interface DirEntry {
    name: string;
    type: 'file' | 'dir';
}

router.get('/list', async (req, res) => {
    try {
        const dirPath = req.query.dir as string;
        const dirEntries = fs.readdirSync(path.join(WORKING_DIR, dirPath), {withFileTypes: true});

        const entries: DirEntry[] = dirEntries.map(entry => ({
            name: entry.name,
            type: entry.isDirectory() ? 'dir' : 'file'
        }));

        res.status(200).json(entries);
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

router.get('*', async (req, res) => {
    try {
        const filePath = decodeURI(req.path);
        const absolutePath = path.join(WORKING_DIR, filePath);

        if (!fs.existsSync(absolutePath) || !fs.lstatSync(absolutePath).isFile()) {
            return res.status(404).send('File not found');
        }

        const mimeType = mime.contentType(path.basename(absolutePath)) || 'application/octet-stream';
        const fileContent = fs.readFileSync(absolutePath);

        res.setHeader('Content-Type', mimeType);
        res.status(200).send(fileContent);
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

export default router;
