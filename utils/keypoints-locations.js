const keypointsLocations = {
    nose: "nose",
    left_eye : 'left_eye',
    right_eye: "right_eye",
    left_ear: "left_ear",
    right_ear: "right_ear",
    left_shoulder: "left_shoulder",
    right_shoulder: "right_shoulder",
    left_elbow: "left_elbow",
    right_elbow: "right_elbow",
    left_wrist: "left_wrist",
    right_wrist: "right_wrist",
    left_hip: "left_hip",
    right_hip: "right_hip",
    left_knee: "left_knee",
    right_knee: "right_knee",
    left_ankle: "left_ankle",
    right_ankle: "right_ankle"
}

const ignoreKeyPoints = [keypointsLocations.nose, keypointsLocations.left_eye, keypointsLocations.right_eye, keypointsLocations.left_ear, keypointsLocations.right_ear]

module.exports = {
    keypointsLocations,
    ignoreKeyPoints
};