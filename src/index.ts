import cors from 'cors'
import express from 'express'
import cookieParser from "cookie-parser";
import {RequestMiddleware} from "./middlewares/request.middleware";
import {connect} from 'mongoose'
import {ApiRouter} from "./routes/ApiRouter/ApiRouter";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'

dayjs.extend(utc)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)

const app = express()
const port = 9090
app.use(express.json())
app.use(RequestMiddleware)
app.use(cors({origin: ['http://localhost:8080', 'http://localhost:8080/', 'http://localhost:8081/', 'http://localhost:8081'], credentials: true}))
app.use(cookieParser())
app.use('/api', ApiRouter)

const start = async (times: number) => {
	try {
		await connect('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.5.4', {
			dbName: 'calendar'
		})
		app.listen(port, async () => {
			console.log(`server has been started without errors on port ${port}`)
		})
	} catch (e) {
	}
}

start(1)
	.catch(e => start(2))
	.catch(e => start(3))
	.catch(() => console.log('После 3 попыток запуска, запустить сервер не удалось'))