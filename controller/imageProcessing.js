const tf = require('@tensorflow/tfjs-node');
const multer = require("multer");
const poseDetection = require('@tensorflow-models/pose-detection');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const catchAsync = require('../utils/catchAsync');
const path = require('path');
const { drawKeypoints, drawSkeletonLines, removeSelectedKeypoints } = require('../utils/service');

const storage = multer.memoryStorage();

exports.upload = multer({ storage: storage });

// Pose estimation function
async function estimatePose(imageBuffer, outputPath) {

    let image = await loadImage(imageBuffer);

    if (image.width === 0 || image.height === 0) {
        throw new Error("Loaded image has invalid dimensions.");
    }

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    });

    if (!detector) {
        console.error("MoveNet detector failed to initialize!");
        return;
    }
    const imageTensor = tf.node.decodeImage(imageBuffer);
    // Estimate pose
    const poses = await detector.estimatePoses(imageTensor);

    if (poses.length === 0) {
        console.log("No poses detected!");
        return;
    }

    const filterKeypoints = removeSelectedKeypoints(poses[0].keypoints);

    // Draw keypoints
    drawKeypoints(ctx, filterKeypoints);
    drawSkeletonLines(ctx, filterKeypoints);

    // Save the image
    const filename = `${outputPath}/pose_result_${Date.now()}.png`;
    const out = fs.createWriteStream(filename);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => console.log(`Saved image with keypoints: ${outputPath}`));
}

exports.processImage = catchAsync(async (req, res) => {

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No image uploaded" });
    }
    // const filePath = path.join(__dirname, '../person_1.jpg');

    const imageBuffer = req.files[0].buffer;
    // const imageBuffer = fs.readFileSync(filePath);
  
    await estimatePose(imageBuffer, "outputs")

    res.status(200).json({
        status: 'Success',
        data: {
        "responseData" : 'test',
        },
    });
});