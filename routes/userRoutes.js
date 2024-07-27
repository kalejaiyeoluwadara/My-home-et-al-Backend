const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController')
const authenticateUser = require('../middlewares/authenticateUsers');


//Public Routes
router.post('/sign-up', userController.signUp);
router.post('/sign-in', userController.signIn);
router.post('/verify-otp', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);
router.get('/product-categories', userController.getProductCategories)
router.get('/all-users', userController.fetchAllUsers)




//Private Routes
router.get('/:id',authenticateUser, userController.viewAccountProfile);
router.post('/forgot-pass', authenticateUser, userController.forgotPassword);
router.post('/reset-pass', authenticateUser, userController.resetPassword);
router.get('/saved-items', authenticateUser, userController.getSavedItems );
router.post('/save-item/:id', authenticateUser, userController.addSavedItem);
router.put('/edit-account/:id', authenticateUser, userController.editAccountProfile);
router.delete('/saved-item', authenticateUser, userController.removeSavedItem);
router.delete('/delete-account', authenticateUser, userController.deleteAccount);








module.exports = router