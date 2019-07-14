import 'dotenv/config';
import app from './app';

app.listen(`${process.env.APP_URL}`.split(':').reverse()[0]);
