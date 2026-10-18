import {asyncHandler} from '../utils/asynchandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadToCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"; 
import { JsonWebTokenError } from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId) => {
     try {
          const user = await User.findById(userId);
          if(!user){
               throw new ApiError(404, "User not found");
          }

          const accessToken = user.generateAccessToken();
          const refreshToken = user.generateRefreshToken();

          user.refreshToken = refreshToken;
          await user.save({ validateBeforeSave: false });

          return {accessToken, refreshToken};
     } catch (error) {
          if (error instanceof ApiError) throw error;
          throw new ApiError(500, "Failed to generate tokens");
     }
}

const registerUser = asyncHandler(async (req, res) => {
     //get user details from frontend
     //validation of user details - not empty
     //check if user already exists: username or email
     //check for image upload, and avatar
     //upload them to cloudinary and get the url
     //create user object - create entry in the database
     //remove password and refresh token from the response
     //check for user creation 
     //return response


     const {fullname, email, password, username} = req.body
     if(
          [fullname, email, password, username].some((field) => typeof field !== "string" || field.trim() === "")
     ){
          throw new ApiError(400, "All fields are required");
     }

     const normalizedEmail = email.trim().toLowerCase();
     const normalizedUsername = username.trim().toLowerCase();
     const ExistedUser = await User.findOne({$or: [{email: normalizedEmail}, {username: normalizedUsername}]});
     if(ExistedUser){
          throw new ApiError(409, "User already exists");
     }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
     throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);
     const coverImage = coverImageLocalPath ? await uploadToCloudinary(coverImageLocalPath) : null;

     if(!avatar){
          throw new ApiError(500, "Avatar upload failed");
     }

     const user = await User.create({
          fullname,
          email: normalizedEmail,
          password,
          username: normalizedUsername,
          avatar: avatar.url,
          coverImage: coverImage?.url || ""
     });

    const createdUser = await User.findById(user._id).select(
     "-password -refreshToken"
    )

    if(!createdUser){
     throw new ApiError(500, "User creation failed");
    }

     return res.status(201).json(new ApiResponse(201, createdUser, "User created successfully"))

})

const loginUser = asyncHandler(async (req, res) => {
     const {email, password, username} = req.body

     if((!username && !email) || typeof password !== "string" || !password ||
          (username !== undefined && typeof username !== "string") ||
          (email !== undefined && typeof email !== "string")){
          throw new ApiError(400, "Username or email and password are required");
     }

     const conditions = [];
     if (email) conditions.push({email: email.trim().toLowerCase()});
     if (username) conditions.push({username: username.trim().toLowerCase()});
     const user = await User.findOne({$or: conditions});

     if(!user){
          throw new ApiError(404, "User does not exist");
     }

     const isPasswordValid = await user.isPasswordCorrect(password);

     if(!isPasswordValid){
          throw new ApiError(401, "Invalid credentials");
     }

     const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

     const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

     const options = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
     }
      return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User logged in successfully"))

})

const logoutUser = asyncHandler(async (req, res) => {
     await User.findByIdAndUpdate(
          req.user._id,
          {
               $unset: { refreshToken: 1 }
          },
          {
               new: true
          }
     )

     const options = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
     }

     return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(incomingRefreshToken){
     throw new ApiError(401, "Unauthorized Request")
    }

    try {
     const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
     )
 
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
      throw new ApiError(401, "Invalid Refresh Token")
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh token is expired or used")
     }
 
     const options = {
      httpOnly: true,
      secure: true
     }
 
     const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
 
     return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(
      new ApiResponse(
           200,
           {accessToken, refreshToken: newRefreshToken},
           "Access token refreshed..."
      )
     )
    } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

   


export { registerUser, loginUser, logoutUser, refreshAccessToken };
