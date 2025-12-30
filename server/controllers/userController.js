const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');


const createToken = (_id) => {
    const jwtkey = process.env.JWT_SECRET_KEY;
    return jwt.sign({ id: _id }, jwtkey, { expiresIn: '17h' });
}




const registerUser = async (req, res) => {

try{
    const { name, email, password } = req.body;

    let user = await userModel.findOne({ email });
   
    if (user) {
        return res.status(400).json({ message: 'User already exists' });
    }

    if(!name || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    if(!validator.isEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email' });
    }

    user = new userModel({
        name,
        email,
        password
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    const token = createToken(user._id);
    res.status(201).json({ _id: user.id, name, email, token });
}catch(err){
  console.error("Error in registerUser:", err);
  res.status(500).json({ message: 'Server error' });
   
}
};

module.exports = {
    registerUser
};