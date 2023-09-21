import userModel from '../../../../DB/model/user.model.js'
import { sendEmail } from '../../../services/email.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../../../services/asyncHandler.js';
import { findById, findByIdAndDelete, findOneAndUpdate, findOne, find, findByIdAndUpdate, create, findOneAndDelete } from '../../../../DB/DBMethods.js';
import { paginate } from '../../../services/pagination.js';
import cloudinary from '../../../services/cloudinary.js'
import adminModel from '../../../../DB/model/admin.model.js';
import cartModel from '../../../../DB/model/cart.model.js';
import storesModel from '../../../../DB/model/store.model.js';
import productModel from '../../../../DB/model/product.model.js';

const adminpopulate = [
  {
    path: "adminId",
    select: ["userName", "email", 'profilePic']
  },
];
const allUserpopulate = [
  {
    path: "wishlist",
  },
  {
    path: "storeId",
    populate: [
      { path: "storeProduct" },
    ]
  },
  {
    path: "cartId",
  },

];
const userpopulate = [
  {
    path: "wishlist",
    populate: [
      { path: "brandId" },
      { path: "categoryId" },
      { path: "subCategoryId" }
    ]
  },
  {
    path: "storeId",
    populate: [
      { path: "storeProduct" },
    ]
  },
  {
    path: "cartId",
    populate: {
      path: "products.productId"
    }
  },
  {
    path: "chats",
    populate: [
      {
        path: "messages",
        populate: [
          {
            path: "sender",
          },
          {
            path: "receiver",
          },
        ]

      },
      { path: "userId" },
      { path: "storeId" },

    ]
  },
];
export const signUp = asyncHandler(async (req, res, next) => {
  const { userName, email, password } = req.body;

  const user = await findOne({ model: userModel, condition: { email } })
  if (user) {
    res.status(409).json({ message: 'this email already register' })

  } else {
    let addUser = new userModel({ userName, email, password, confirmEmail: true });
    // let token = jwt.sign({ id: addUser.id, isLoggedIn: true }, process.env.emailToken, { expiresIn: '1h' })
    // let refreshToken = jwt.sign({ id: addUser._id, isLoggedIn: true }, process.env.emailToken, { expiresIn: 60 * 60 * 24 })

    // let link = `${req.protocol}://${req.headers.host}/auth/confirmEmail/${token}`
    // let refreshLink = `${req.protocol}://${req.headers.host}/auth/refreshToken/${refreshToken}`

    // let message = `please verify your email <a href="${link}" > here </a>
    //                         <br/>
    //                         to refresh token please click <a href="${refreshLink}" > here </a>
    //                         `
    // let emailRes = await sendEmail(email, "confirm to register", message);

    // if (emailRes.accepted.length) {
      let savedUser = await addUser.save()
      res.status(201).json({ message: "added successfully", savedUser })
    // } else {
    //   res.status(404).json({ message: 'invalid email' })

    // }
  }

})
export const confirmEmail = asyncHandler(async (req, res, next) => {
  let { token } = req.params
  let decoded = jwt.verify(token, process.env.emailToken)
  if (!decoded && !decoded.id) {
    res.status(400).json({ message: 'invalid token data' })

  } else {
    const updatedUser = await findOneAndUpdate({ model: userModel, condition: { _id: decoded.id, confirmEmail: false }, data: { confirmEmail: true }, options: { new: true } })
    if (updatedUser) {
      res.redirect("https://ziadal3tar.github.io/Ecommerce-Z-store")
    } else {
      res.status(404).json({ message: 'invalid data token' })

    }
  }

})
export const resendConfirmEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params
  let decoded = jwt.verify(token, process.env.emailToken)
  if (!token) {
    res.status(400).json({ message: 'invalid token data' })

  } else {
    const email = await findById({ model: userModel, condition: { _id: decoded.id }, select: "email" })
    let token = jwt.sign({ id: decoded.id, isLoggedIn: true }, process.env.emailToken, { expiresIn: '1h' })
    let refreshToken = jwt.sign({ id: decoded._id, isLoggedIn: true }, process.env.emailToken, { expiresIn: 60 * 60 * 24 })

    let link = `${req.protocol}://${req.headers.host}/auth/confirmEmail/${token}`
    let refreshLink = `${req.protocol}://${req.headers.host}/auth/refreshToken/${refreshToken}`

    let message = `please verify your email <a href="${link}" > here </a>
                        <br/>
                        to refresh token please click <a href="${refreshLink}" > here </a>
                        `
    await sendEmail(email, "confirm to register", message);

  }
})
export const logIn = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await findOne({ model: userModel, condition: { email } })
  if (!user) {
    res.status(404).json({ message: 'You have to register first' })

  } else {
    let compare = bcrypt.compareSync(password, user.password, parseInt(process.env.SALTROUND))
    if (compare) {
      if (!user.confirmEmail) {
        res.status(400).json({ message: 'You have to confirm email first' })

      } else {
        let token = jwt.sign({ id: user._id, isLoggedIn: true }, process.env.tokenSignature, { expiresIn: 60 * 60 * 24 * 2 })
        res.status(200).json({ message: "welcome", token, id: user._id })
      }
    } else {
      res.status(400).json({ message: 'In-valid password' })

    }
  }
})

export const allUser = asyncHandler(async (req, res, next) => {
  // let { limit, skip } = paginate(req.query.page, req.query.size)

  const users = await find({ model: userModel, populate: [...allUserpopulate] })
  if (!users) {
    res.status(404).json({ message: 'no users' })

  } else {
    res.status(200).json({ message: "All users", users })
  }
})
export const removeUser = asyncHandler(async (req, res, next) => {
  const { _id } = req.params
  const user = await findById({ model: userModel, condition: { _id }, })
  if (user) {
    if (user.role == "Admin") {
      let removeFromAdmin = await findOneAndDelete({ model: adminModel, condition: { adminId: _id } })
      if (!removeFromAdmin) {
        return res.status(400).json({ message: 'User Not Removed From Admins Model' })

      }
    }
    if (user.cart) {
      let deletedCart = await findOneAndDelete({ model: cartModel, condition: { userId: _id } })
      if (!deletedCart) {
        return res.status(400).json({ message: "User's Cart Not Deleted" })
      }
    }
    if (user.storeId) {
      let storeId = user.storeId
      let store = await findById({ model: storesModel, condition: storeId })
      if (store.storeProduct.length != 0) {
        for (let i = 0; i < store.storeProduct.length; i++) {
          const element = store.storeProduct[i];
          let removeProduct = await findByIdAndDelete({ model: productModel, condition: element })

        }
      }
      let deletedStore = await findByIdAndDelete({ model: storesModel, condition: storeId })
      if (!deletedStore) {
        return res.status(400).json({ message: "User's Store Not Deleted" })
      }
    }
    const deletedUser = await findByIdAndDelete({ model: userModel, condition: { _id } })
    if (deletedUser && user.public_id) {
      await cloudinary.uploader.destroy(user.public_id)
      res.status(200).json({ message: "deleted", deletedUser })
    } else {
      res.status(400).json({ message: "user not deleted" })
    }
  } else {
    res.status(400).json({ message: "user not found" })

  }
})

export const blockUser = asyncHandler(async (req, res, next) => {
  const { _id } = req.params

  const user = await findById({ model: userModel, condition: { _id } })
  if (!user) {
    res.status(404).json({ message: "User not found" })

  } else {
    if (!user.confirmEmail) {
      res.status(400).json({ message: "User not confirmed" })

    } else {
      const updatedRole = await findByIdAndUpdate({ model: userModel, condition: _id, data: { blocked: !user.blocked }, options: { new: true } })
      res.json({ message: "Done", updatedRole })
    }
  }

})
export const updateRole = asyncHandler(async (req, res, next) => {
  let { userId } = req.body

  const user = await findById({ model: userModel, condition: { _id: userId } })
  if (!user) {
    res.status(404).json({ message: "User not found" })

  } else {
    if (!user.confirmEmail) {
      res.status(400).json({ message: "User not confirmed" })

    } else {
      const updatedRole = await findByIdAndUpdate({ model: userModel, condition: userId, data: { role: "Admin" }, options: { new: true } })
      res.json({ message: "Admin is added", updatedRole })
    }
  }

})
export const getUser = asyncHandler(async (req, res, next) => {
  const { token } = req.params
  let decoded = jwt.verify(token, process.env.tokenSignature)
  const user = await findById({ model: userModel, condition: decoded.id, populate: [...userpopulate] })
  if (!user) {
    res.status(404).json({ message: "user not found" })

  } else {
    res.status(200).json({ message: "user", user })
  }
})
export const getUserById = asyncHandler(async (req, res, next) => {
  const { _id } = req.params

  const user = await findById({ model: userModel, condition: _id, populate: [...userpopulate] })
  if (!user) {
    res.status(404).json({ message: "User not found" })

  } else {
    res.status(200).json({ message: "user", user })
  }
})
export const editProfilePic = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    res.status(422).json({ message: "you have to upload an image" })

  } else {
    let { id } = req.body
    let { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
      folder: "usersImages"
    })
    const result = await findByIdAndUpdate({ model: userModel, condition: id, data: { profilePic: secure_url, public_id } })
    if (!result) {

      await cloudinary.uploader.destroy(public_id)

    } else {
      if (result.public_id) {
        await cloudinary.uploader.destroy(result.public_id)
      }
      res.status(201).json({ message: "created", result })
    }
  }
})
export const addAdmin = asyncHandler(async (req, res, next) => {
  const { _id } = req.params
  let admin = await findOne({ model: adminModel, condition: { adminId: _id } })
  if (admin) {
    let updateRole = await findByIdAndUpdate({ model: userModel, condition: { _id }, data: { role: "User" } })
    let removeAdmin = await findByIdAndDelete({ model: adminModel, condition: admin._id })
    res.status(200).json({ message: "removed", updateRole })

  } else {
    const user = await findByIdAndUpdate({ model: userModel, condition: { _id }, data: { role: "Admin" } })
    if (user) {
      req.body.adminId = user._id
      const addAdmin = await create({ model: adminModel, data: req.body })
      res.status(200).json({ message: "added", addAdmin })
    } else {
      res.status(400).json({ message: "user not found" })

    }
  }
})
export const removeAdmin = asyncHandler(async (req, res, next) => {
  const { _id } = req.params
  let admin = await findOne({ model: adminModel, condition: { adminId: _id } })
  if (admin) {

    const user = await findByIdAndUpdate({ model: userModel, condition: { _id }, data: { role: "User" } })
    if (user) {
      const deleteUser = await findByIdAndDelete({ model: adminModel, condition: _id })
      res.status(200).json({ message: "deleted", deleteUser })
    } else {
      res.status(400).json({ message: "user not found" })

    }

  } else {
    res.status(200).json({ message: "already admin", admin })

  }
})
export const searchUser = asyncHandler(async (req, res, next) => {

  let allUser = []
  let name = req.body.name

  let _id = req.user._id
  const users = await userModel.find({})
  for (let i = 0; i < users.length; i++) {
    const element = users[i];
    if (element.userName.toLowerCase().includes(name.toLowerCase())) {
      if (element._id != _id) {
        allUser.push(element)
      }
    }
  }
  const unique = [
    ...new Map(allUser.map((m) => [m._id, m])).values(),
  ];
  allUser = unique
  if (allUser == 0) {
    res.status(200).json({ message: "not found", allUser })

  } else {
    res.status(200).json({ message: "users", allUser })

  }
})
export const getAllAdmins = asyncHandler(async (req, res, next) => {
  const admins = await find({ model: adminModel, populate: [...adminpopulate] })
  if (admins) {
    res.status(200).json({ message: "admins", admins })

  } else {
    res.status(404).json({ message: "admins not found" })


  }
})
export const updateUser = asyncHandler(async (req, res, next) => {
  let { id } = req.params
  let user = await findById({ model: userModel, condition: id })
  if (user) {
    if (req.body.type == "email") {
      let newEmail = req.body.email
      if (user.email == newEmail) {
        res.status(404).json({ message: "same email" })

      } else {
        let updatedEmail = await findByIdAndUpdate({ model: userModel, condition: id, data: { email: newEmail }, options: { new: true } })
        res.status(200).json({ message: "email is updated", updatedEmail })
      }

    } else if (req.body.type == "password") {
      let SALTROUND = parseInt(process.env.SALTROUND)
      let { oldPassword, newPassword, confirmNewPassword } = req.body
      let compare = bcrypt.compareSync(oldPassword, user.password, SALTROUND)
      if (compare) {
        let compare = bcrypt.compareSync(user.password, newPassword, SALTROUND)
        if (compare) {
          res.status(404).json({ message: "inter new password" })

        } else {
          let hashPassword = bcrypt.hashSync(newPassword, SALTROUND)
          let updatedPassword = await findByIdAndUpdate({ model: userModel, condition: id, data: { password: hashPassword }, options: { new: true } })
          res.status(200).json({ message: "password is updated", updatedPassword })
        }
      } else {
        res.status(404).json({ message: "password is incorrect" })

      }
    }
  } else {
    res.status(404).json({ message: "user not found" })

  }
})
export const sendEmaiil = asyncHandler(async (req, res, next) => {
  const { text, email } = req.body
  let message = ` ${text} from  ${email}`
  let emailRes = await sendEmail(email, "confirm to register", message);
  if (emailRes.accepted.length) {
    res.status(201).json({ message: "sended" })
  } else {
    res.status(404).json({ message: "invalid email" })

  }
}
)
