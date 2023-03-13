import express from "express";
import {AuthMiddleware} from "../../middlewares/auth.middleware";


const route = express.Router()

route.use(AuthMiddleware)

export const OnlyAuthRouter = route