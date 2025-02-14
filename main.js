import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import pLimit from 'p-limit';
import retry from 'async-retry';
import logger from './logger.js';
import config from './config.js'; // 假设有一个配置文件

// 初始化配置
const limit = pLimit(config.concurrency || 5); // 限制并发数
puppeteer.use(StealthPlugin());

// 浏览器实例管理
let browser;
let lastRestart = Date.now();

const initializeBrowser = async () => {
    if (!browser || Date.now() - lastRestart > config.browserRestartInterval) {
        if (browser) await browser.close();
        browser = await puppeteer.launch({
            headless: 'new',
            // headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--disable-web-security',
                '--ignore-certificate-errors',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-zygote',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-background-networking',
                `--js-flags="--max-old-space-size=${config.memoryLimit || 4096}"`,
            ],
        });
        lastRestart = Date.now();
    }
};

// 获取页面内容
const getUrlHtml = async (url, options = {}) => {
    await initializeBrowser();
    const page = await browser.newPage();

    try {
        await page.setJavaScriptEnabled(true);
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
        page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // 拦截不必要的请求
        await page.setRequestInterception(true);

        page.on('request', (req) => {
            options.allowRequestTypes || ['document'].includes(req.resourceType()) ? req.continue() : req.abort();
        });

        await page.goto(url, {
            waitUntil: options.waitUntil || 'domcontentloaded',
            timeout: config.timeout.pageLoad || 120000,
        });

        // // 确保页面完全加载
        // await page.waitForFunction(() => document.readyState === 'complete', {
        //     timeout: config.timeout.selector || 30000,
        // });

        return await page.content();
    } catch (error) {
        logger.error(`Error fetching ${url}: ${error.message}`);
        throw error;
    } finally {
        await page.close();
    }
};

// 处理任务
const processTask = async (item) => {
    return retry(
        async () => {
            if(item.url) {
                const html = await getUrlHtml(item.url, item.options); // networkidle2
                logger.info(`Fetched: ${item.url}`);
    
                const formdata = new FormData();
    
                formdata.append('html', html);
                formdata.append('id', item.id);
                formdata.append('status', true);
                // formdata.append('signature', createHMAC(item)); // 添加请求签名
    
                await axios.post(config.endpoints.push, formdata, {
                    proxy: false,
                    timeout: config.timeout.request || 10000,
                });
    
                logger.info(`Uploaded: ${item.url}`);
            }
        },
        {
            retries: config.retry.attempts || 3,
            factor: config.retry.factor || 2,
            minTimeout: config.retry.minTimeout || 1000,
        }
    );
};

// 主循环
const main = async () => {
    while (true) {
        try {
            const formdata = new FormData();
            formdata.append('flag', config.flag);
            const response = await axios.post(config.endpoints.pull, formdata, {
                proxy: false,
                timeout: config.timeout.request || 10000,
            });

            console.log(response.data);
            

            const tasks = response.data.map((item) => limit(() => processTask(item)));
            await Promise.all(tasks);

            // 添加基础间隔避免高频请求
            await new Promise((resolve) => setTimeout(resolve, config.taskInterval || 5000));
        } catch (error) {
            logger.error(`Error fetching task list: ${error.message}`);
            // 指数退避
            const delay = Math.min(2 ** 3 * 1000, 60000);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
};


const maxRetries = 5; // 设置最大重试次数
let retryCount = 0;

const startMain = async () => {
    try {
        await main();  // 尝试执行 main()
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        
        if (retryCount < maxRetries) {
            retryCount++;
            logger.info(`Retrying... Attempt ${retryCount}/${maxRetries}`);
            await new Promise((resolve) => setTimeout(resolve, 10000)); // 等待 10 秒后重试
            startMain(); // 递归重试
        } else {
            logger.error(`Max retries reached. Giving up.`);
        }
    }
};

startMain(); // 启动第一次执行


// 启动程序
// main().catch(async (error) => {
//     logger.error(`Fatal error: ${error.message}`);
//     // process.exit(1);

//        // 等待 10 秒后继续运行
//        await new Promise((resolve) => setTimeout(resolve, 10000));

//        // 重新调用 main() 继续执行
//        main().catch((error) => {
//            logger.error(`Error during retry: ${error.message}`);
//        });
// });

// 工具函数
// const createHMAC = (data) => {
//     const hmac = crypto.createHmac('sha256', config.hmacSecret);
//     hmac.update(data);
//     return hmac.digest('hex');
// };

// 监控与清理
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    if (browser) await browser.close();
    process.exit();
});

// 内存监控
setInterval(() => {
    const usage = process.memoryUsage();
    logger.debug(`Memory usage: RSS ${Math.round(usage.rss / 1024 / 1024)}MB, Heap ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);    
}, 60000);