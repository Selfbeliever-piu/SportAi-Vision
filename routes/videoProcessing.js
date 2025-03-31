const express = require('express');
const { upload: imageUpload, processImage } = require('../controller/imageProcessing');
const {upload, processVideo} = require('../controller/videoProcessing');


const router = express.Router();

router.post('/processImage', imageUpload.array('image', 1), processImage);
router.post("/uploadVideo", upload.array('video', 1), processVideo);

module.exports = router;