import pino from 'pino';
import dayjs from 'dayjs';

const logFileName = `./log/logs_${dayjs().format('YYYY-MM-DD')}.txt`;

const logger = pino({
    level: 'debug',
    transport: {
        target: 'pino-pretty',
        options: {
            destination: logFileName,
            colorize: false,
        }
    }
});

export default logger;
