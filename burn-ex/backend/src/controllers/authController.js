import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @route  POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, weight, height, age, gender, goal, activityLevel } = req.body;

    if (!name || !email || !password || !weight || !height || !age || !gender || !goal || !activityLevel) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
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
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// @route  POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
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
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// @route  GET /api/auth/me  (protected)
export const getMe = async (req, res) => {
  res.status(200).json(req.user);
};
