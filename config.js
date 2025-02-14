export default {
    flag: 'cf_001',
    concurrency: 5, // 并发数
    memoryLimit: 2048, // 内存限制 (MB)
    browserRestartInterval: 1000 * 60 * 60, // 浏览器重启间隔 (ms)
    timeout: {
        pageLoad: 120000, // 页面加载超时
        // selector: 30000, // 选择器等待超时
        // request: 10000, // 请求超时
    },
    retry: {
        attempts: 3, // 重试次数
        factor: 2, // 重试间隔因子
        minTimeout: 1000, // 最小重试间隔
    },
    endpoints: {
        pull: 'http://47.242.199.152/Ir2025/NetworkPassByCloudFalreBase/pullCrontab', // 拉取任务接口
        push: 'http://47.242.199.152/Ir2025/NetworkPassByCloudFalreBase/pushCrontab', // 推送结果接口
    },
    taskInterval: 1000, // 任务间隔 (ms)
};