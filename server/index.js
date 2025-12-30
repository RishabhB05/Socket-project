const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoute = require('./routes/userRoute');




const app = express();
require('dotenv').config();

app.use(cors());
app.use(express.json());
app.use('/api/users', userRoute);





app.get('/', (req, res) => {
  res.send('Hello World!');
});









const PORT = process.env.PORT || 5000;
const uri = process.env.ATLAS_URI;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


if (!uri) {
  console.error("MongoDB connection error: ATLAS_URI is missing in environment");
  process.exit(1);
}

mongoose.connect(uri).then(() => {
    console.log("MongoDB database connection established successfully");
}).catch((err) => {
    console.error("MongoDB connection error:", err.message);
});