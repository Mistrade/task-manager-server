import express from "express";
import {AuthMiddleware} from "../../middlewares/auth.middleware";


const route = express.Router()

route.use(AuthMiddleware)
route.get('/hello', (req: express.Request, res: express.Response) => {
})


export const OnlyAuthRouter = route