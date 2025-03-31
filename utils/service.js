const {ignoreKeyPoints, keypointsLocations} = require('./keypoints-locations');

// Function to draw keypoints on image
function drawKeypoints(ctx, keypoints, fillColor) {
    ctx.fillStyle = fillColor || 'red'; // Color of keypoints
    keypoints?.forEach(({ y, x, score }) => {
        if (score > 0.1) { // Draw only high-confidence keypoints
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI); // Draw circle
            ctx.fill();
        }
    });
}

// Function to draw skeleton connections
function drawSkeletonLines(ctx, keypoints, strokeColor) {
    const adjacentKeyPoints = [
        [0, 1], [1, 3], [3, 5], [0, 2], [2, 4], [4, 6], 
        [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12], 
        [11, 13], [13, 15], [12, 14], [14, 16]
    ];
    
    ctx.strokeStyle = strokeColor || "blue";
    ctx.lineWidth = 2;

    adjacentKeyPoints.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];
        if (kp1?.score > 0.2 && kp2?.score > 0.2) {
            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.stroke();
        }
    });
}

function removeSelectedKeypoints(keypoints) {
    return Array.isArray(keypoints) && keypoints.length > 0 ?
    keypoints.filter(keypoint => !ignoreKeyPoints.includes(keypoint.name)) :
    []
}

function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * (180.0 / Math.PI));
    if (angle > 180.0) {
        angle = 360.0 - angle;
    }
    return angle;
}

function evaluateAngles(keypoints) {
    const angles = {};
    
    const leftShoulder = keypoints.find(p => p.name === keypointsLocations.left_shoulder);
    const rightShoulder = keypoints.find(p => p.name === keypointsLocations.right_shoulder);

    const leftElbow = keypoints.find(p => p.name === keypointsLocations.left_elbow);
    const rightElbow = keypoints.find(p => p.name === keypointsLocations.right_elbow);

    const leftWrist = keypoints.find(p => p.name === keypointsLocations.left_wrist);
    const rightWrist = keypoints.find(p => p.name === keypointsLocations.right_wrist);

    const leftHip = keypoints.find(p => p.name === keypointsLocations.left_hip);
    const rightHip = keypoints.find(p => p.name === keypointsLocations.right_hip);

    const leftKnee = keypoints.find(p => p.name === keypointsLocations.left_knee);
    const rightKnee = keypoints.find(p => p.name === keypointsLocations.right_knee);

    const leftAnkle = keypoints.find(p => p.name === keypointsLocations.left_ankle);
    const rightAnkle = keypoints.find(p => p.name === keypointsLocations.right_ankle);
    
    if (leftShoulder && leftElbow && leftWrist) {
        angles.leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    }
    if (rightShoulder && rightElbow && rightWrist) {
        angles.rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    }
    if (leftHip && leftShoulder && leftElbow) {
        angles.leftShoulderAngle = calculateAngle(leftHip, leftShoulder, leftElbow);
    }
    if (rightHip && rightShoulder && rightElbow) {
        angles.rightShoulderAngle = calculateAngle(rightHip, rightShoulder, rightElbow);
    }

    if (leftShoulder && leftHip && leftKnee) {
        angles.leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
    }

    if (rightShoulder && rightHip && rightKnee) {
        angles.rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
    }

    if (leftHip && leftKnee && leftAnkle) {
        angles.leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    }

    if (rightHip && rightKnee && rightAnkle) {
        angles.rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    }
    
    return angles;
}

function compareAngles(userAngle, expectedAngle) {
    const tolerance = 10;

    if (Math.abs(userAngle - expectedAngle) <= tolerance) {
        console.log("Great shot!");
        return "Great Shot";
    } else {
        console.log("Adjust your elbow angle for better timing.");
        return "could be improve";
    }
}

module.exports = {
    drawKeypoints,
    drawSkeletonLines,
    removeSelectedKeypoints,
    calculateAngle,
    evaluateAngles,
    compareAngles
};