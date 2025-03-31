const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const poseDetection = require("@tensorflow-models/pose-detection");
const tf = require("@tensorflow/tfjs-node");
const catchAsync = require('../utils/common');
const { createCanvas, loadImage } = require('canvas');
const { execSync } = require("child_process");
const { drawKeypoints, drawSkeletonLines, removeSelectedKeypoints, evaluateAngles } = require("../utils/service")

const storage = multer.memoryStorage();
// Set up Multer for video upload
exports.upload = multer({ storage: storage });

function getVideoFPS(videoPath) {
    try {
        const output = execSync(
            `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1 ${videoPath}`
        ).toString().trim();

        const fpsString = output.replace("r_frame_rate=", "").trim();

        // Convert frame rate string (e.g., "30000/1001") to a decimal number
        if (fpsString.includes("/")) {
            const [numerator, denominator] = fpsString.split("/").map(Number);
            return numerator / denominator; // Convert fraction to a number
        }

        return parseFloat(fpsString);
    } catch (error) {
        console.error("Error getting video FPS:", error);
        return null;
    }
}

// Function to extract frames from video
async function extractFrames(videoPath, outputDir) {
    let fps = getVideoFPS(videoPath); // Get original FPS

    if (!fps || isNaN(fps) || fps <= 0) {
        console.error("Failed to determine FPS. Using default 1 FPS.");
        fps = 1; // Fallback if FPS extraction fails
    }

    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .output(`${outputDir}/frame-%04d.jpg`)
            .fps(fps)
            .on("end", () => resolve(outputDir))
            .on("error", reject)
            .run();
    });
}

function createVideoFromFrames(outputDir, outputVideoPath, fps = 30) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(`${outputDir}/frame-%04d.jpg`)  // Ensure correct numbering
            .inputFPS(fps)
            .videoCodec('libx264')
            .outputOptions('-loglevel', 'debug')
            .output(outputVideoPath)
            .on("start", cmd => console.log("FFmpeg command:", cmd))
            .on("end", () => {
                console.log("Video processing complete:", outputVideoPath);
                resolve(outputVideoPath);
            })
            .on("error", (err) => {
                console.error("FFmpeg Error:", err);
                reject(err);
            })
            .run();
    });
}


// Function to draw skeleton on images
async function drawSkeletonOnFrame(outputDir, frame, keypoints) {
    const imagePath = path.join(outputDir, frame);
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0, image.width, image.height);
    drawKeypoints(ctx, keypoints);
    drawSkeletonLines(ctx, keypoints, "red");

    // Save modified image
    const out = fs.createWriteStream(imagePath);
    const stream = canvas.createJPEGStream();
    stream.pipe(out);
    await new Promise(resolve => out.on('finish', resolve));
}

// API to process video and compute angles
exports.processVideo = catchAsync(async (req, res) => {

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No video uploaded" });
    }

    // Generate a temporary video path
    const fileName = req.files[0].originalname.split('.')[0];
    const videoPath = path.join(__dirname, `../temp_${fileName}.mp4`);
    
    // Write video buffer to disk
    await fs.promises.writeFile(videoPath, req.files[0].buffer);

    const outputDir = path.join(__dirname, `../frames/${fileName}`);
    const processedVideoPath = path.join(__dirname, `../processed_${fileName}.mp4`); 
    await fs.promises.mkdir(outputDir, { recursive: true });

    // Extract frames
    await extractFrames(videoPath, outputDir);

    // Load pose detection model
    const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);

    // Process each frame
    const frameFiles = (await fs.promises.readdir(outputDir))
    .filter(file => file.endsWith('.jpg')) // Keep only PNG images
    .sort((a, b) => { 
        // Extract numbers from filenames and sort numerically
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numA - numB;
    });

    const results = await Promise.all(frameFiles.map(async (frame) => {
        const imageBuffer = await fs.promises.readFile(path.join(outputDir, frame));
        let angles = []

        const imageTensor = tf.node.decodeImage(imageBuffer);
    
        const poses = await detector.estimatePoses(imageTensor);
        imageTensor.dispose(); // Free memory
    
        if (poses.length > 0) {
            const keypoints = removeSelectedKeypoints(poses[0]?.keypoints);
            angles = evaluateAngles(keypoints);
            await drawSkeletonOnFrame(outputDir, frame, keypoints);

            return { frame, angles };
        }
        return { frame, angles };
    }));

    // **Recreate video with skeleton overlay**
    await createVideoFromFrames(outputDir, processedVideoPath);

    // Remove the frames folder after processing
    await fs.promises.rm(outputDir, { recursive: true, force: true });


    // Send video and results in response
    res.setHeader('Content-Type', 'video/mp4');
    const videoStream = fs.createReadStream(processedVideoPath);
    videoStream.pipe(res);
    
    res.json({
        success: true,
        angles: results,
        processedVideo: `/processed_${fileName[0]}.mp4` // Assuming it's hosted statically
    });

});
