CREATE TABLE `oc_passby_cloudflare_links_queue` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `sLink` varchar(255) NOT NULL COMMENT '链接',
  `sResponse` longtext NOT NULL COMMENT '响应内容',
  `sSiteId` varchar(255) NOT NULL DEFAULT '' COMMENT '站点ID',
  `sFlag` varchar(255) NOT NULL COMMENT '标记',
  `iSort` tinyint(1) NOT NULL DEFAULT '1' COMMENT '优先级，越大越优先',
  `iIsDone` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已处理, 0: 未处理; 1: 处理中; 2: 处理成功; 3: 处理失败',
  `iCreateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `iUpdateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_sSiteId` (`sSiteId`),
  KEY `idx_iIsDone` (`iIsDone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='cloudflare 任务队列表';