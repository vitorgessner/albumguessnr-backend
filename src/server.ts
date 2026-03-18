import config from './config/config.js';
import { getApp } from './app.js';

const app = getApp();

const port = config.port;

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
