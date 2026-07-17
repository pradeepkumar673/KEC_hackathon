import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @route  POST /api/auth/register
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, weight, height, age, gender, goal, activityLevel } = req.body;

  if (!name || !email || !password || !weight || !height || !age || !gender || !goal || !activityLevel) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  const user = await User.create({
    name,
    email,
    password,
    weight,
    height,
    age,
    gender,
    goal,
    activityLevel,
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    weight: user.weight,
    height: user.height,
    age: user.age,
    gender: user.gender,
    goal: user.goal,
    activityLevel: user.activityLevel,
    token: generateToken(user._id),
  });
});

// @route  POST /api/auth/login
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    weight: user.weight,
    height: user.height,
    age: user.age,
    gender: user.gender,
    goal: user.goal,
    activityLevel: user.activityLevel,
    token: generateToken(user._id),
  });
});

// @route  GET /api/auth/me  (protected)
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(req.user);
});
