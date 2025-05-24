# 体育赛事数据爬虫

这是一个用于抓取体育赛事数据的爬虫脚本，支持 JavaScript (Puppeteer) 和 Java (Selenium) 两种实现。脚本支持通过 Cloudflare 验证，并能从目标网站获取体育赛事数据。

## JavaScript 版本

### 安装

1. 确保您已安装 Node.js (版本 14 或更高)
2. 克隆本仓库或下载源码
3. 安装依赖:

```bash
npm install
```

### 使用方法

#### 基本用法

```bash
node scrape.js
```

这将使用默认配置运行爬虫，获取赛事列表。

#### 获取特定比赛详情

```bash
node scrape.js --matchId 51123881
```

这将获取指定ID的比赛详情数据。

#### 使用命令行参数

您可以通过命令行参数覆盖默认配置:

```bash
node scrape.js --sid 1 --date 48h --language en-us
```

#### 使用环境变量

您也可以使用环境变量设置参数:

```bash
SID=1 DATE=48h LANGUAGE=en-us node scrape.js
```

## Java 版本

### 安装

1. 确保您已安装 JDK 11 或更高版本
2. 确保您已安装 Maven
3. 下载 Chrome WebDriver 并设置路径

### 构建

使用 Maven 构建项目:

```bash
mvn clean package
```

这将生成一个可执行的 JAR 文件 `target/sports-scraper-1.0-SNAPSHOT-jar-with-dependencies.jar`。

### 运行

```bash
java -jar target/sports-scraper-1.0-SNAPSHOT-jar-with-dependencies.jar
```

#### 使用命令行参数

您可以通过命令行参数覆盖默认配置:

```bash
java -jar target/sports-scraper-1.0-SNAPSHOT-jar-with-dependencies.jar --sid 1 --date 48h --language en-us
```

#### 使用系统属性

您也可以使用系统属性设置参数:

```bash
java -DSID=1 -DDATE=48h -DLANGUAGE=en-us -jar target/sports-scraper-1.0-SNAPSHOT-jar-with-dependencies.jar
```

### WebDriver 设置

在 `Scraper.java` 中取消注释并修改以下行，指向您的 ChromeDriver 路径:

```java
System.setProperty("webdriver.chrome.driver", "/path/to/chromedriver");
```

或者，您可以将 ChromeDriver 添加到系统 PATH 中。

## 配置参数

脚本支持以下配置参数:

### API 参数

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `sid` | 体育类型ID | `1` |
| `inplay` | 是否只显示进行中的比赛 | `false` |
| `date` | 时间范围 | `24h` |
| `language` | 语言 | `zh-cn` |
| `matchId` | 比赛ID，用于获取特定比赛详情 | `''` (空字符串) |

### 浏览器配置

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `headless` | 是否使用无头模式 | `true` |
| `userAgent` | 用户代理字符串 | iOS Safari |

### 网站配置

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `mainSite` | 主站URL | `https://hg22984.com` |
| `apiBaseUrl` | API基础URL | `https://0036jdpm96ugqo29-api.qdzjdlev30201.app` |

### 超时配置

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `pageTimeout` | 页面加载超时(毫秒) | `60000` |
| `cfTimeout` | Cloudflare验证等待时间(毫秒) | `5000` |

## API 端点

脚本使用以下 API 端点:

| 常量 | 端点 | 描述 |
|------|------|------|
| `INPLAY_URL` | `/product/business/sport/tournament/info` | 获取正在进行的比赛列表 |
| `UPCOMING_URL` | `/product/business/sport/tournament/info` | 获取即将进行的比赛列表 |
| `MATCH_DETAIL_URL` | `/product/business/sport/inplay/match` | 获取进行中比赛的详情 |
| `PREMATCH_DETAIL_URL` | `/product/business/sport/prematch/match` | 获取未开始比赛的详情 |

## 示例

### 获取不同体育类型的数据

```bash
# JavaScript版本 - 篮球数据
node scrape.js --sid 2

# Java版本 - 篮球数据
java -jar target/sports-scraper-1.0-SNAPSHOT-jar-with-dependencies.jar --sid 2
```

### 获取不同时间范围的数据

```bash
# JavaScript版本 - 获取未来48小时的比赛
node scrape.js --date 48h

# Java版本 - 获取未来48小时的比赛
java -jar target/sports-scraper-1.0-SNAPSHOT-jar-with-dependencies.jar --date 48h
```

### 获取特定比赛详情

```bash
# 获取ID为51123881的比赛详情
node scrape.js --matchId 51123881 --inplay false
```

### 使用可视化模式

```bash
# JavaScript版本 - 在有界面的浏览器中运行
node scrape.js --headless false

# Java版本 - 在有界面的浏览器中运行
java -jar target/sports-scraper-1.0-SNAPSHOT-jar-with-dependencies.jar --headless false
```

## 注意事项

- 此脚本依赖于网站结构和API，如果网站更改可能需要更新脚本
- 请合理使用此脚本，避免频繁请求导致IP被封
- 请遵守相关网站的使用条款和法律法规
- Java 版本需要 Chrome 浏览器和对应的 ChromeDriver

## 许可

MIT 

# 体育赛事数据爬取工具

这是一个使用 Puppeteer 爬取体育赛事数据的 Node.js 工具，支持绕过 Cloudflare 验证并访问多个体育 API 接口。

## 功能特点

- ✅ 绕过 Cloudflare JS 挑战验证
- ✅ 支持获取进行中和即将开始的比赛列表
- ✅ 支持获取比赛详细信息（包括赔率、视频流等）
- ✅ **批量处理模式** - 自动获取所有比赛列表并批量获取详情
- ✅ **🔴 实时监控模式** - 定时监控比赛状态变化，智能检测进球、时间等关键变化
- ✅ 统一的 API 接口调用
- ✅ 可配置的参数和环境变量
- ✅ 支持命令行参数
- ✅ 自动数据保存和管理
- ✅ Linux 服务器部署支持

## 支持的 API 接口

1. **比赛列表接口**：
   - 进行中的比赛 (`/product/business/sport/tournament/info?inplay=true`)
   - 即将开始的比赛 (`/product/business/sport/tournament/info?inplay=false`)

2. **比赛详情接口**：
   - 进行中比赛详情 (`/product/business/sport/inplay/match`)
   - 未开始比赛详情 (`/product/business/sport/prematch/match`)

## 批量处理功能 🚀

### 工作流程
1. **获取比赛列表** - 从API获取所有比赛信息
2. **保存基本信息** - 将比赛列表保存到JSON文件
3. **批量获取详情** - 逐个调用详情API获取完整数据
4. **数据整合** - 生成包含基本信息和详细信息的完整数据文件

### 数据结构
```json
{
  "summary": {
    "totalMatches": 38,
    "processedMatches": 3,
    "successCount": 3,
    "errorCount": 0,
    "fetchTime": "2025-05-24T06:34:17.732Z"
  },
  "tournaments": { /* 完整的比赛列表数据 */ },
  "matchDetails": [
    {
      "basicInfo": {
        "iid": 3810286,
        "name": "奥克兰-vs-墨尔本胜利",
        "tournamentName": "澳大利亚甲组联赛 - 附加赛",
        "inplay": true,
        "home": { /* 主队信息 */ },
        "away": { /* 客队信息 */ }
      },
      "detailInfo": {
        "data": {
          /* 完整的比赛详情，包括：*/
          "detail": { /* 实时比分、时间等 */ },
          "market": { /* 赔率数据 */ },
          "videos": [ /* 视频流地址 */ ],
          "anchors": [ /* 直播主播信息 */ ]
        }
      },
      "fetchTime": "2025-05-24T06:34:17.732Z"
    }
  ]
}
```

## 安装和使用

### 安装依赖
```bash
npm install puppeteer
```

### 基本使用

#### 1. 批量处理模式（推荐）🔥
```bash
# 批量获取进行中的比赛及详情（限制5场比赛）
node scrape.js --batchMode true --inplay true --maxMatches 5

# 批量获取即将开始的比赛及详情
node scrape.js --batchMode true --inplay false --maxMatches 10

# 使用apiType=batch简化命令
node scrape.js --apiType batch --inplay true --maxMatches 3
```

#### 2. 单独获取比赛列表
```bash
# 获取进行中的比赛
node scrape.js --apiType inplay

# 获取即将开始的比赛
node scrape.js --apiType upcoming
```

#### 3. 获取特定比赛详情
```bash
# 获取进行中比赛详情
node scrape.js --matchId 3810286 --inplay true

# 获取未开始比赛详情
node scrape.js --matchId 3821280 --inplay false
```

### 批量处理配置参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--batchMode` | 启用批量处理模式 | `false` | `--batchMode true` |
| `--maxMatches` | 最大处理比赛数量 | `10` | `--maxMatches 5` |
| `--requestDelay` | 请求间隔(毫秒) | `1000` | `--requestDelay 2000` |
| `--saveToFile` | 是否保存到文件 | `true` | `--saveToFile true` |
| `--outputDir` | 输出目录 | `./output` | `--outputDir ./data` |

### 生成的文件说明

批量模式会在 `output/` 目录下生成以下文件：

1. **`tournaments_TIMESTAMP.json`** - 原始比赛列表数据
2. **`matches_basic_TIMESTAMP.json`** - 提取的比赛基本信息
3. **`match_ID_detail.json`** - 单个比赛的详情数据  
4. **`complete_data_TIMESTAMP.json`** - 完整的整合数据（主要文件）

### 配置参数

#### API 参数
- `--sid`: 体育类型ID (默认: 1)
- `--inplay`: 是否获取进行中的比赛 (默认: false)
- `--date`: 日期范围 (默认: "24h")
- `--language`: 语言 (默认: "zh-cn")
- `--matchId`: 特定比赛ID
- `--apiType`: API类型 (auto/inplay/upcoming/match-detail/batch)

#### 浏览器配置
- `--headless`: 无头模式 (默认: true)
- `--userAgent`: 用户代理字符串

#### 网站配置
- `--mainSite`: 主站地址 (默认: https://hg22984.com)
- `--apiBaseUrl`: API基础地址

#### 超时配置
- `--pageTimeout`: 页面超时时间 (默认: 60000ms)
- `--cfTimeout`: Cloudflare验证等待时间 (默认: 5000ms)

### 环境变量配置

所有命令行参数都可以通过环境变量设置：

```bash
export BATCH_MODE=true
export INPLAY=true
export MAX_MATCHES=5
export REQUEST_DELAY=2000
export OUTPUT_DIR=./data
node scrape.js
```

## Linux 服务器部署

### 1. 安装 Node.js
```bash
# 使用 nvm 安装最新 LTS 版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
```

### 2. 安装系统依赖
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libgtk-3-0 \
  libgbm1 \
  libasound2

# CentOS/RHEL
sudo yum install -y \
  nss \
  atk \
  at-spi2-atk \
  cups-libs \
  libdrm \
  gtk3 \
  libgbm \
  alsa-lib
```

### 3. 配置定时任务
```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每小时批量获取比赛数据）
0 * * * * cd /path/to/spider-puppeteer && node scrape.js --batchMode true --inplay true --maxMatches 20 >> /var/log/spider.log 2>&1

# 每15分钟获取进行中比赛的最新数据
*/15 * * * * cd /path/to/spider-puppeteer && node scrape.js --batchMode true --inplay true --maxMatches 50 >> /var/log/spider-live.log 2>&1
```

### 4. 监控和日志
```bash
# 查看日志
tail -f /var/log/spider.log

# 检查输出文件
ls -la /path/to/spider-puppeteer/output/

# 查看最新的完整数据
ls -t /path/to/spider-puppeteer/output/complete_data_*.json | head -1
```

## 实际应用场景

### 1. 体育数据分析
```bash
# 获取所有进行中的比赛数据用于实时分析
node scrape.js --batchMode true --inplay true --maxMatches 100
```

### 2. 赔率监控
```bash
# 定期获取特定比赛的赔率变化
node scrape.js --matchId 3810286 --inplay true
```

### 3. 数据备份
```bash
# 每日备份所有比赛数据
node scrape.js --batchMode true --inplay false --maxMatches 200 --outputDir ./backup/$(date +%Y%m%d)
```

## 错误处理

脚本包含完善的错误处理机制：

- **网络错误**：自动重试机制
- **API限制**：请求间隔控制
- **数据解析错误**：错误日志记录
- **文件写入错误**：权限检查和目录创建

## 技术特点

- **智能绕过检测**：模拟真实浏览器行为
- **数据完整性**：多重验证确保数据准确性
- **高效处理**：批量处理减少重复的验证过程
- **灵活配置**：支持多种参数组合满足不同需求
- **生产就绪**：支持服务器部署和定时任务

## 注意事项

1. **请求频率**：建议设置适当的 `requestDelay` 避免被限制
2. **数据存储**：批量处理会生成大量文件，注意磁盘空间
3. **网络稳定性**：确保网络连接稳定，特别是在服务器环境
4. **合规使用**：请遵守网站的服务条款和robots.txt
5. **资源管理**：长时间运行时注意内存和CPU使用情况

## 性能优化建议

- 根据服务器性能调整 `maxMatches` 参数
- 在网络条件良好时可以减少 `requestDelay`
- 定期清理旧的输出文件释放磁盘空间
- 使用日志轮转管理日志文件大小 

## 实时监控功能 🔴

### 核心特性
- **定时监控**：按设定间隔自动获取比赛数据
- **状态对比**：智能检测比赛状态变化（比分、时间、阶段等）
- **变化提醒**：实时发现并报告比赛关键变化
- **历史记录**：保存完整的监控历史和变化记录
- **选择性监控**：支持监控特定比赛或全部进行中比赛

### 工作原理
1. **初始化** - 设置监控参数和目标比赛
2. **循环监控** - 按间隔定时获取比赛数据
3. **状态比较** - 与上次数据比较检测变化
4. **变化记录** - 记录所有检测到的变化
5. **数据保存** - 生成监控会话和最终报告

### 使用方法

#### 1. 监控所有进行中的比赛
```bash
# 每30秒监控一次，持续2小时
node scrape.js --apiType monitor --monitorInterval 30000 --monitorDuration 7200000

# 简化命令
node scrape.js --apiType monitor
```

#### 2. 监控特定比赛
```bash
# 监控指定比赛ID
node scrape.js --apiType monitor --monitorMatches 3810286,3718800

# 单个比赛监控
node scrape.js --apiType monitor --monitorMatches 3810286
```

#### 3. 自定义监控参数
```bash
# 每15秒检查一次，持续30分钟，请求间隔2秒
node scrape.js --apiType monitor \
  --monitorInterval 15000 \
  --monitorDuration 1800000 \
  --requestDelay 2000
```

### 监控配置参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--monitorMode` | 启用监控模式 | `false` | `--monitorMode true` |
| `--monitorInterval` | 监控间隔(毫秒) | `30000` | `--monitorInterval 15000` |
| `--monitorDuration` | 监控持续时间(毫秒) | `7200000` | `--monitorDuration 3600000` |
| `--monitorMatches` | 监控的比赛ID列表 | `[]` | `--monitorMatches 123,456` |
| `--autoDiscoverMatches` | 自动发现进行中比赛 | `true` | `--autoDiscoverMatches false` |

### 监控数据结构

#### 监控报告
```json
{
  "startTime": "2025-05-24T06:45:18.598Z",
  "endTime": "2025-05-24T06:45:53.652Z",
  "config": {
    "interval": 10000,
    "duration": 30000,
    "targetMatches": ["3810286"]
  },
  "sessions": [
    {
      "sessionId": 1,
      "timestamp": "2025-05-24T06:45:18.947Z",
      "monitoredMatches": [
        {
          "matchId": 3810286,
          "matchName": "奥克兰-vs-墨尔本胜利",
          "currentState": {
            "score": "0-0",
            "time": "43:15", 
            "period": "1h"
          },
          "hasChanges": false
        }
      ],
      "changes": [
        {
          "matchId": 3810286,
          "matchName": "奥克兰-vs-墨尔本胜利",
          "changes": {
            "score": { "from": "0-0", "to": "1-0" },
            "time": { "from": "42:15", "to": "43:15" }
          },
          "timestamp": "2025-05-24T06:45:18.947Z"
        }
      ],
      "duration": 1656
    }
  ],
  "summary": {
    "totalSessions": 3,
    "totalChanges": 0,
    "monitoredMatchesCount": 1,
    "averageSessionDuration": 1682.33,
    "changesPerSession": 0.00
  }
}
```

### 生成的监控文件

实时监控会在 `output/` 目录下生成：

1. **`monitor_session_TIMESTAMP.json`** - 每次监控会话的数据
2. **`monitor_report_TIMESTAMP.json`** - 完整的监控报告（主要文件）

### 检测的变化类型

| 变化类型 | 说明 | 示例 |
|----------|------|------|
| **比分变化** | 检测进球得分 | `"0-0" → "1-0"` |
| **时间变化** | 检测比赛时间推进 | `"42:15" → "43:15"` |
| **阶段变化** | 检测比赛阶段转换 | `"1h" → "2h"` |
| **红黄牌变化** | 检测罚牌情况 | `"0-1" → "1-1"` |

### 实际应用场景

#### 1. 体育数据实时跟踪
```bash
# 监控重要比赛，每10秒更新
node scrape.js --apiType monitor \
  --monitorMatches 3810286 \
  --monitorInterval 10000 \
  --monitorDuration 5400000
```

#### 2. 赔率变化监控
```bash
# 长期监控多场比赛
node scrape.js --apiType monitor \
  --monitorInterval 60000 \
  --maxMatches 20
```

#### 3. 比赛结果通知
```bash
# 监控关键比赛直到结束
node scrape.js --apiType monitor \
  --monitorMatches 3810286 \
  --monitorDuration 10800000
```

### 监控模式优势

- **🔍 精确检测**：准确识别比赛状态的每一个变化
- **📊 数据完整**：保存完整的监控历史和变化轨迹
- **⚡ 实时响应**：快速发现比赛关键时刻
- **🎯 灵活配置**：支持多种监控策略和参数组合
- **💾 持久化存储**：所有监控数据自动保存备份

### 服务器部署监控

#### 长期监控服务
```bash
# 创建监控脚本
cat > monitor_service.sh << 'EOF'
#!/bin/bash
cd /path/to/spider-puppeteer
while true; do
    node scrape.js --apiType monitor \
      --monitorDuration 3600000 \
      --monitorInterval 30000 \
      --maxMatches 50 >> /var/log/sports-monitor.log 2>&1
    sleep 60
done
EOF

chmod +x monitor_service.sh
nohup ./monitor_service.sh &
```

#### 定时监控任务
```bash
# 每小时启动监控（持续45分钟）
0 * * * * cd /path/to/spider-puppeteer && node scrape.js --apiType monitor --monitorDuration 2700000 >> /var/log/hourly-monitor.log 2>&1

# 重要比赛时段加密监控
*/5 19-23 * * * cd /path/to/spider-puppeteer && node scrape.js --apiType monitor --monitorInterval 5000 --monitorDuration 300000 >> /var/log/peak-monitor.log 2>&1
``` 

## 数据库存储功能 🗄️

### 核心特性
- **MySQL数据库集成**：将爬取的数据直接保存到MySQL数据库
- **智能数据映射**：自动将API数据映射到数据库表结构
- **重复数据处理**：使用 `INSERT ... ON DUPLICATE KEY UPDATE` 避免重复数据
- **批量保存**：支持批量插入提高性能
- **实时更新**：监控模式中自动更新比赛状态变化
- **统计分析**：提供详细的数据库统计信息

### 数据库表结构

系统使用以下主要数据表：

| 表名 | 用途 | 主要字段 |
|------|------|----------|
| `match_info` | 比赛基本信息 | `iid`, `name`, `home_name`, `away_name`, `score`, `inplay`, `kickoff_time` |
| `match_detail` | 比赛详细状态 | `match_id`, `score`, `period`, `time`, `red_card`, `yellow_card` |
| `match_media` | 比赛媒体信息 | `match_id`, `type`, `source`, `info` |

### 数据库配置

通过环境变量或命令行参数配置数据库连接：

```bash
# 数据库连接信息已内置，无需额外配置
# 数据库：rm-3nsaxs0kq75fk89n5ko.mysql.rds.aliyuncs.com:3306/sports_api
```

### 使用方法

#### 1. 启用数据库存储
```bash
# 同时保存到文件和数据库
node scrape.js --apiType inplay --saveToDatabase true

# 仅保存到数据库，不生成文件
node scrape.js --apiType inplay --databaseOnly true
```

#### 2. 批量模式 + 数据库
```bash
# 批量获取比赛列表和详情，保存到数据库
node scrape.js --apiType batch --inplay true --maxMatches 10 --saveToDatabase true

# 仅保存到数据库
node scrape.js --apiType batch --inplay true --maxMatches 10 --databaseOnly true
```

#### 3. 监控模式 + 数据库
```bash
# 实时监控并更新数据库
node scrape.js --apiType monitor --saveToDatabase true --monitorInterval 30000

# 监控特定比赛并保存到数据库
node scrape.js --apiType monitor --saveToDatabase true --monitorMatches 3810286,3718800
```

### 数据库参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--saveToDatabase` | 启用数据库存储 | `false` | `--saveToDatabase true` |
| `--databaseOnly` | 仅保存数据库（不生成文件） | `false` | `--databaseOnly true` |

### 数据查询工具

系统提供了数据查询脚本：

```bash
# 查看数据库统计和最近数据
node database_query.js

# 查看数据库表结构
node check_database.js
```

### 数据库统计示例

系统会自动显示数据库统计信息：

```
📊 数据库统计信息:
┌────────────────────┬────────┐
│ 总比赛数           │ 155935 │
│ 进行中比赛         │ 113664 │
│ 有详情的比赛       │ 155622 │
│ 有媒体信息的比赛   │ 112282 │
│ 最近更新时间       │        │
└────────────────────┴────────┘
```

### 数据自动更新

- **比赛基本信息**：每次爬取时自动更新比赛状态、比分等
- **比赛详情**：监控模式下实时更新比赛进展
- **状态变化**：自动检测并记录比分、时间、阶段变化
- **去重处理**：基于 `iid` (比赛ID) 避免重复记录

### 性能优化

- **批量插入**：使用批量操作提高插入性能
- **连接池**：自动管理数据库连接
- **异步处理**：非阻塞式数据库操作
- **错误处理**：完善的异常处理和重试机制

### 错误处理

系统提供完善的数据库错误处理：

```bash
✅ 比赛信息已保存: 奥克兰-vs-墨尔本胜利 (ID: 155875)
⚠️ 数据库保存失败: Duplicate entry error
❌ 数据库连接失败: Connection timeout
``` 