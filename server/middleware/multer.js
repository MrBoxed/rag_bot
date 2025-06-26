const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storage = multer.memoryStorage();
const upload = multer({ storage });

const UPLOAD_DIR = 'uploads/';

function UploadFileForRAG() {

    try {
        // Ensure uploads/ exists
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true }); // Create directory (and parent dirs if needed)
        }

    } catch (err) {
        console.error("Error creating upload directory:", err);
    }

    // ::: CONFIGURING MULTER ::::
    const customStorage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, UPLOAD_DIR);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, `${uniqueSuffix}_${file.originalname}`);
        }
    });

    return multer({ storage: customStorage });
}

module.exports = {
    UploadFileForRAG,
    upload
};
