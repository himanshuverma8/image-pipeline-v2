import './types';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { loggerMiddleware } from './middleware/logger';
import healthRoute from './routes/health.routes';
import { errorHandler } from './middleware/errorHandler';


const app = express();

app.use(cors());
app.use(helmet());

app.use(express.json());

//request middleware and logger middleware

app.use(requestIdMiddleware);
app.use(loggerMiddleware);

app.use('/api', healthRoute);

//run the error middleware

app.use(errorHandler);


app.listen(env.PORT, () => {
    console.log(`server ruuning on port number ${env.PORT}`);
})