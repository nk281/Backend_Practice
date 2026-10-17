import {asyncHandler} from '../utils/asynchandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/User.model.js';
import {uploadToCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';

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
     console.log("email", email);

     if(
          [fullname, email, password, username].some((field) => field?.trim() === "")
     ){
          throw new ApiError("All fields are required", 400);
     }

     const ExistedUser = await User.findOne({$or: [{email}, {username}]});
     if(ExistedUser){
          throw new ApiError("User already exists", 400);
     }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
     throw new ApiError("Avatar is required", 400);
    }

    if(!coverImageLocalPath){
     throw new ApiError("Cover image is required", 400);
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);
     const coverImage = await uploadToCloudinary(coverImageLocalPath);

     if(!avatar){
          throw new ApiError("Avatar upload failed", 500);
     }

     const user = await User.create({
          fullname,
          email,
          password,
          username,
          avatar: avatar.url,
          coverImage: coverImage?.url || ""
     });

    const createdUser = await User.findById(user._id).select(
     "-password -refreshToken"
    )

    if(!createdUser){
     throw new ApiError("User creation failed", 500);
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User created successfully"))

})


export { registerUser };
