const express = require("express");
const cors = require("cors");
const AppError = require('./utils/appError');
const vidoeProcessingRouter = require('./routes/videoProcessing');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/poseEstimate', vidoeProcessingRouter);

app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  });

module.exports = app;
