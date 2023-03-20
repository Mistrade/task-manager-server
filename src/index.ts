import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import { connect } from 'mongoose';
import { ApiRouter } from './routes/public/api.router';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import morgan from 'morgan';

dayjs.extend(utc);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const app = express();
const port = 9090;
app.use(express.json());
// const logStream = fs.createWriteStream(
//   path.join(__dirname, 'logs/access.log'),
//   {
//     flags: 'a',
//   }
// );
app.use(morgan('combined'));
app.use(
  cors({
    origin: [
      'http://80.249.145.220',
      'http://80.249.145.220/*',
      'http://80.249.145.220:8080',
      'http://80.249.145.220:8080/*',
      'http://localhost:8080',
      'http://localhost:8080/',
      'http://localhost:8081/',
      'http://localhost:8081',
    ],
    credentials: true,
  })
);
app.use(cookieParser());
app.use('/api', ApiRouter);

const start = async (times: number) => {
  try {
    await connect(
      'mongodb://admin:admin@db_mongo:27017/admin?authSource=admin',
      (err) => {
        if (err) {
          console.log('Connection error: ', err);
          throw err;
        }
        console.log('Connected');
        app.listen(port, async () => {
          console.log(
            `server has been started without errors on port ${port} updated 909090856475364235465786`
          );
        });
      }
    );
  } catch (e) {
    console.error(e);
  }
};

start(1)
  .catch((e) => start(2))
  .catch((e) => start(3))
  .catch(() =>
    console.log('После 3 попыток запуска, запустить сервер не удалось')
  );
