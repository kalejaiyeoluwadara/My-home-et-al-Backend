const User = require('../models/User');
const ProductCategory = require('../models/ProductCategory');
const Product = require('../models/Product')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendVerificationEmail = require('../utils/sendVerificationEmail');




const userController = {
    signUp: async (req, res) => {
        //SignUp is done with email and password
        try {
            const {email, password, firstname, lastname, referralCode} = req.body;

            //Check if user already exists in the database with the email
            const existingUser = await User.findOne({email});

            if (existingUser) {
                return res.status(400).json({error: 'An account with this email already exists'})
            }
            
            //Generate 5 digit otp
            const otp = crypto.randomInt(10000, 100000);
            const otpExpiry = Date.now() + 10 * 60 * 1000;

            const saltHash = 12;
            const hashedPassword = await bcrypt.hash(password, saltHash);
            const newReferralCode = crypto.randomBytes(3).toString('hex').toUpperCase();

            const user = new User({
                email,
                firstname,
                lastname,
                password: hashedPassword,
                otp,
                otpExpiry,
                referralCode: newReferralCode,
                points: 100,
                referredBy: referralCode ? referralCode : null
            });
            
            //send Email OTP
            await sendVerificationEmail(email, otp)

            user.isVerified = false;
            await user.save(); 


            res.json({message: `We sent an OTP to ${email}, please verify `, referralCode: newReferralCode})
            
        } catch (error) {
            return res.status(500).json({error: error.message})
        }
    },
    verifyOtp: async (req, res) => {
        try {
            const {email, otp} = req.body;

            //Find user by email
            const user = await User.findOne({email});

            if (!user) {
                return res.status(400).json({error: 'User not found'})
            }
            if(user.otp !== parseInt(otp)){
                return res.status(400).json({error: 'Invalid OTP'})
            }
            if (Date.now() > user.otpExpiry) {
                return res.status(400).json({error: 'OTP expired'})
            }

            //If OTP is valid, clear OTP and OTP EXPIRY
            user.otp = null;
            user.otpExpiry = null;
            user.isVerified = true
            await user.save();

            res.json({message: 'OTP verifed successfully'})
        } catch (error) {
            return res.status(500).json({error: error.message})
        }
    },
    resendOtp: async(req, res) => {
        try {
            const {email} = req.body;

            //Check if user exists with the email
            const existingUser = await User.findOne({email});

            if(!existingUser){
                return res.status(404).json({error: 'User does not exist'})
            }

            //If User exists, regenerate 5-digit otp
            const otp = crypto.randomInt(10000, 100000);
            const otpExpiry = Date.now() + 10 * 60 * 1000;

            //Resend Mail
            await sendVerificationEmail(email, otp)

            //Set the New Otp and it's expiry time
            existingUser.otp = otp;
            existingUser.otpExpiry = otpExpiry;

            //Re-save User to the database
            await existingUser.save()


        } catch (error) {
            return res.status(500).json({error: error.message})
        }
    },
    forgotPassword: async (req, res) => {
        try {
            const {email} = req.body;

            const user = await User.findOne({email});

            if(!user){
                return res.status(404).json({error: 'User does not exist'})
            }

            //If User exists, generate 5-digit otp
            const otp = crypto.randomInt(10000, 100000);
            const otpExpiry = Date.now() + 10 * 60 * 1000;

            //Send mail
            await sendEmail(email, otp);

            //Set the New OTP and it's expiry time
            user.otp = otp;
            user.otpExpiry = otpExpiry;

            //Save newly added Otp
            await user.save();
            res.json({message: `An OTP has been sent to ${email}`})

        } catch (error) {
            return res.status(500).json({error: error.message})
        }
    },
    resetPassword: async (req, res) => {
        try {
            const {email, otp, password} = req.body;
            
            const user = await User.findOne({email});

            if(!user){
                return res.status(404).json({error: 'User not found'})
            };
            if(user.otp !== parseInt(otp)){
                return res.status(400).json({error: 'Invalid OTP'})
            }
            if (Date.now() > user.otpExpiry) {
                return res.status(400).json({error: 'OTP expired'})
            }

            const saltHash = 12

            const hashNewPassword = await bcrypt.hash(password, saltHash);

            user.password = hashNewPassword;
            user.otp = null;
            user.otpExpiry = null;

            await user.save()

            res.json({message: 'Password updated successfully'})

        } catch (error) {
            return res.status()
        }
    },
    signIn: async (req, res) => {
        //SignIn is done with email and password
        try {
            const {email, password} = req.body;

            const user = await User.findOne({email});

            if (!user) {
                return res.status(422).json({error: 'Invalid email or password, please retry'})
            }
            const passwordMatch = await bcrypt.compare(password, user.password);

            if(!passwordMatch){
                return res.status(422).json({error: 'invalid email or password, please retry'})
            }

            if(user.isVerified !== true){
                return res.status(422).json({error: 'User email has not been verified'})
            }

            //Generate token
            const token = jwt.sign(
                {id: user._id},
                process.env.JWT_SECRET,
                {expiresIn: '6h'}
            )

            const userProfile = {
                id: user._id,
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname
            }

            res.json({token, userProfile})
        } catch (error) {
            return res.status(500).json({error: 'Ooops!! an error occured, please refresh'})
        }
    },
    addSavedItem: async (req, res) => {
        try {
            const userId = req.user._id;
            const productId = req.params.id;

            // Find the user by ID
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            //Check if product exists
            const product = await Product.findById(productId);
            if(!product){
                return res.status(404).json({error: 'Product Not found'})
            }

            // Initialize savedItems if it's undefined
            if (!user.savedItems) {
                user.savedItems = [];
            }

                //Add Saved items if not already added
            if(!user.savedItems.includes(productId)){
                user.savedItems.push(productId)
                await user.save()
            }

            res.status(200).json({message: 'Product added to savedItems', savedItems: user.savedItems})
        } catch (error) {
            return res.status(500).json({error: error.message})
        }
    },
    removeSavedItem: async (req, res) => {
        try {
            const userId = req.user._id;
            const {productId} = req.body

            //Find user
            const user = await User.findById(userId);
            if(!user){
                return res.status(404).json({error: 'User not found'})
            }

            //Remove product from saved items
            user.savedItems = user.savedItems.filter(item => item.toString() !== productId);

            await user.save();

            res.status(200).json({message: 'Product removed from savedItems', savedItems: user.savedItems})
        } catch (error) {
            return res.status(500).json({error: 'Ooops!! an error occured, please retry'})
        }
    },
    getSavedItems: async (req, res) => {
        try {
            const userId = req.user._id;

            //Find user by id and populate savedItems
            const user = await user.findById(userId).populate('savedItems');
            if(!user){
                return res.status(404).json({error: 'User not found, therefore savedItems can\'t not be retrieved'})
            }

            res.status(200).json({savedItems: user.savedItems})
        } catch (error) {
            return res.status(500).json({error: 'Ooops!! an error occured, please retry'})
        }
    },
    viewAccountProfile: async (req, res) => {
        try {
            const userId = req.user._id
            const profile = await User.findById(userId);

            if (!profile) {
                return res.status(404).json({error: 'Not Found'})
            }
            res.json(profile)
        } catch (error) {
            return res.status(500).json({error: 'Ooops!! an error occured, please refresh'})
        }
    },
    
    getActiveUsers: async (req, res) => {
        try {
            
        } catch (error) {
            return res.status(500).json({error: 'Ooops!! an error occured, please refresh'})
        }
    },
    editAccountProfile: async (req, res) => {
        try {
            const userId = req.userId
            const { firstName, lastName, email, password} = req.body;

            const updatedProfile = await User.findByIdAndUpdate(
                userId,
                {firstName, lastName, email, password},
                {new: true}
            );
            
            if (!updatedProfile) {
                return res.status(404).json({error: 'Profile not found'})
            }

            res.json({mesage: 'Your Profile has been sucessfully updated'})
        } catch (error) {
            return res.status(500).json({error: 'Ooops!! an error occured, please refresh'}) 
        }
    },
    deleteAccount: async (req, res) => {
        try {

            const {password} = req.body;
            const userId = req.userId;

            const profile = await User.findById(userId);

            if (!profile){
                return res.status(404).json({error: 'Not Found'})
            }
            if(profile.password !== password){
                return res.status(400).json({error: 'Invalid Password'})
            }
            
            await User.findByIdAndDelete(userId);
            res.json({message: 'Account Deleted Successfully'})
            
        } catch (error) {
            return res.status(500).json({error: 'Ooops!! an error occured, please refresh'})
        }
    },
    getProductCategories: async (req, res) => {
        try {
            const productCategories = await ProductCategory.find();

            if(!productCategories){
                return res.status(404).json({error: 'No Product Category found'})
            }
            res.json(productCategories)
        } catch (error) {
            return res.status(500).json({error: 'Ooops!! an error occured, please refresh'})
        }
    },
    handlePurchaseAndReferralReward: async (userId) => {
        try {
            const user = await User.findById(userId);
            
            if (!user) {
                throw new Error('User not found');
            }
    
            if (!user.hasMadePurchase) {
                // This is the user's first purchase
                user.hasMadePurchase = true;
    
                // Check if the user was referred by someone
                if (user.referredBy) {
                    const referrer = await User.findOne({ referralCode: user.referredBy });
                    
                    if (referrer) {
                        // Add 400 points to the referrer
                        referrer.points += 400;
                        await referrer.save();
                    }
                }
    
                await user.save();
            }
    
            return user;
        } catch (error) {
            console.error('Error handling purchase and referral reward:', error);
            throw error;
        }
    },
    fetchAllUsers: async (req, res) => {
        try {
            const users = await User.find();
            if(!users){
                return res.status(404).json({error: 'No users found'})
            }
            res.json(users)
        } catch (error) {
            return res.status(500).json({error: error.message})
        }
    }
}
module.exports = userController;