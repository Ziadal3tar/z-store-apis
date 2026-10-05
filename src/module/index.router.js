import orderRouter from './order/order.router.js';
import reviewRouter from './review/review.router.js';
import notificationRouter from './notification/notification.router.js';
import authRouter from './auth/auth.router.js'
import categoryRouter from './category/category.router.js'
import subCategoryRouter from'./subcategory/subCategory.router.js'
import brandRouter from'./brand/brand.router.js'
import productRouter from'./product/product.router.js'
import wishlistRouter from'./wishList/wishList.router.js'
import couponRouter from'./coupon/coupon.router.js'
import cartRouter from'./cart/cart.router.js'
import storeRouter from'./store/store.routes.js'
import chatRouter from'./chat/chat.routes.js'
import newsletterRouter from './newsletter/newsletter.router.js'
import contactRouter from './contact/contact.router.js'



export{
    authRouter,
    categoryRouter,
    subCategoryRouter,
    brandRouter,
    productRouter,
    wishlistRouter,
    couponRouter,
    cartRouter,
    storeRouter,
    chatRouter,
    orderRouter,
    reviewRouter,
    notificationRouter,
    newsletterRouter,
    contactRouter
}