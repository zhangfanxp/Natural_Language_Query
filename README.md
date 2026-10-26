# Wren 企业智能问数

基于 [WrenAI](https://github.com/Canner/WrenAI) 的企业自然语言问数应用。Next.js 提供网页和应用 API；本机 Python 服务负责 Wren 语义模型构建、查询规划和数据库查询。每个数据源对应一个 Wren 项目；跨库问题由应用分别查询相关数据源，再将结果交给在线 LLM 汇总。除企业 MySQL 外，也可导入项目附带的 Jaffle Shop DuckDB 示例库。

## 系统要求

- macOS 服务器。
- Node.js 20.9 或更高版本。
- Python 3.11–3.13；推荐 Python 3.12。当前 Wren 依赖不支持 Python 3.14。
- Apple Command Line Tools 和 Homebrew。首次安装前需要准备 `mysqlclient` 编译依赖，命令见下方“安装”和“首次部署”步骤。
- MySQL 数据库可从运行本应用的 Mac 访问。建议使用只读账号，并授予读取业务表及读取数据库结构所需的权限。
- 可访问的 OpenAI Chat Completions 兼容 LLM API，例如阿里云百炼、NVIDIA Build 或其他兼容服务。
- 安装和运行时需要网络可访问 npm/PyPI、MySQL 主机及配置的 LLM API。

应用默认监听：

| 服务 | 地址 | 用途 |
| --- | --- | --- |
| Next.js | `0.0.0.0:3000` | 浏览器页面和应用 API |
| Python / Wren | `127.0.0.1:8765` | 本机查询服务，仅供 Next.js 调用 |
| MySQL | 通常为 `3306` | MySQL 数据库；按实际连接配置访问 |

Python 服务默认只绑定本机回环地址，不需要向局域网客户端开放 `8765`。

## 安装

Wren 的 MySQL connector 需要编译 `mysqlclient`，所以首次安装时先准备 `pkg-config` 和 MySQL client 开发文件，再运行项目安装脚本：

```bash
cd /项目所在路径/Natural_Language_Query
brew install pkg-config mysql-client
export PKG_CONFIG_PATH="$(brew --prefix mysql-client)/lib/pkgconfig${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
bash scripts/install-mac.sh
```

`mysql-client` 提供编译 Wren MySQL connector 所需的头文件和客户端库；如果服务器已经安装 MySQL Server，不需要因此再安装一套 Server。

Python 依赖清单将 DuckDB 限定在 `2.0` 以下。Wren 0.16 使用 DuckDB 的 `fetch_arrow_table()` 接口；DuckDB 1.5 已将该接口标记为弃用，2.0 中不再提供。随项目提供的 Jaffle 测试库使用 DuckDB 1.5 兼容存储格式，避免与查询服务版本不匹配。

脚本会优先选择 Python 3.12、3.13 或 3.11。如果 Mac 上安装了多个 Python 版本，可指定路径：

```bash
PYTHON_BIN=/opt/homebrew/bin/python3.12 bash scripts/install-mac.sh
```

安装成功后，`node_modules/` 和 `python/.venv/` 会保存在本机，不应提交到代码仓库。

## 本机开发

推荐用一个命令启动 Next.js 和 Python/Wren 两个开发服务：

```bash
npm run dev:all
```

浏览器访问 `http://localhost:3000`。按 `Control + C` 会停止两个服务。

也可以分别在两个终端启动：

终端一：

```bash
PATH="$PWD/python/.venv/bin:$PATH" WREN_HOME="$PWD/data/wren-home" python/.venv/bin/uvicorn service:app \
  --app-dir python --host 127.0.0.1 --port 8765
```

终端二：

```bash
npm run dev
```

开发模式下，本机回环地址和当前网卡的局域网 IPv4 地址已加入 Next.js 开发资源允许列表。其他主机名或公网 IP 如需用于开发调试，可在启动前设置额外主机名/IP（不要带协议和端口）：

```bash
NEXT_ALLOWED_DEV_ORIGINS="203.0.113.10" npm run dev:all
```

`NEXT_ALLOWED_DEV_ORIGINS` 仅用于开发模式。生产模式不使用 Next.js 开发资源的来源检查。

## 生产部署

### 首次部署

建议将项目放在稳定的本机目录，确保运行服务的 macOS 用户对项目目录有读写权限。不要用 `npm run dev:all` 作为生产启动命令；它启动开发服务器并启用热更新。

在项目根目录安装运行依赖并构建生产版本：

```bash
brew install pkg-config mysql-client
export PKG_CONFIG_PATH="$(brew --prefix mysql-client)/lib/pkgconfig${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
bash scripts/install-mac.sh
npm run build
```

生产运行需要 **Python/Wren 和 Next.js 两个进程同时运行**。可以先用两个终端验证构建结果。

终端一启动 Python/Wren：

```bash
cd /项目所在路径/Natural_Language_Query
PATH="$PWD/python/.venv/bin:$PATH" WREN_HOME="$PWD/data/wren-home" python/.venv/bin/uvicorn service:app \
  --app-dir python --host 127.0.0.1 --port 8765
```

终端二启动 Next.js：

```bash
cd /项目所在路径/Natural_Language_Query
npm run start
```

Next.js 默认监听 `0.0.0.0:3000`，局域网设备可访问 `http://<Mac局域网IP>:3000`。这适合内网验证；直接通过公网 IP 使用 HTTP 会使登录信息和会话在网络上传输时没有 TLS 保护。

### 使用 launchd 常驻运行

项目提供用户级 LaunchAgent 安装和卸载脚本。它会分别启动两个服务、在服务退出时重新拉起，并将日志写入 `data/logs/`。先停止开发服务并完成生产构建，然后以项目所属的普通 macOS 用户运行：

```bash
bash scripts/install-launchd.sh
```

LaunchAgent 会在该用户登录后启动，适合保持用户会话运行的 Mac 服务器。若 Mac 重启后要求在用户登录前提供服务，需要额外配置系统级 LaunchDaemon；当前脚本不安装系统级服务。检查服务状态和日志：

```bash
launchctl print "gui/$(id -u)/com.wren-system.web"
launchctl print "gui/$(id -u)/com.wren-system.python"
tail -f data/logs/wren-web.log data/logs/wren-python.log
```

重新启动任一服务：

```bash
launchctl kickstart -k "gui/$(id -u)/com.wren-system.web"
launchctl kickstart -k "gui/$(id -u)/com.wren-system.python"
```

停止并移除 LaunchAgent（不会删除应用数据）：

```bash
bash scripts/uninstall-launchd.sh
```

默认 Next.js 监听 `0.0.0.0:3000`，可从局域网直连。如果要从公网正式提供服务，建议配置域名和 HTTPS 反向代理（例如 Caddy 或 Nginx），只让代理接受公网的 HTTPS 请求，并将 Next.js 限制在本机回环地址：

```bash
WREN_WEB_HOST=127.0.0.1 bash scripts/install-launchd.sh
```

这样代理可以访问 `127.0.0.1:3000`，外部客户端不能直接连接该端口。Python/Wren 始终只监听 `127.0.0.1:8765`；不要将 `8765` 对外开放。MySQL 也只需允许应用服务器访问。Next.js [自托管指南](https://nextjs.org/docs/app/guides/self-hosting)建议通过反向代理接收外部流量；证书、DNS、路由器端口转发和 macOS 防火墙规则仍需按服务器网络单独配置。

### 发布新版本

更新代码时先停止 LaunchAgent，再安装依赖、构建并重新启动：

```bash
bash scripts/uninstall-launchd.sh
git pull
npm ci
python/.venv/bin/python -m pip install -r python/requirements.txt
npm run build
bash scripts/install-launchd.sh
```

部署前备份 `data/` 和 `user.json`，特别是 `data/master.key`。升级期间服务会暂停；如果不通过 Git 更新代码，可用发布包替换项目文件，再执行依赖安装和构建步骤。Next.js 的 `next start` 必须使用先前 `next build` 生成的生产构建。

## 首次设置和日常使用

1. 首次访问 `http://localhost:3000/setup`，设置管理员 `admin` 的登录密码。密码至少 8 位，保存为 scrypt 哈希。
2. 登录后进入“系统设置 → LLM 设置”，填写服务商、API Base URL、模型名和 API Key，测试连接后保存。服务商示例：
   - 阿里云百炼：按控制台提供的兼容模式地址、模型名和 API Key 填写。
   - NVIDIA Build：通常使用 `https://integrate.api.nvidia.com/v1`，具体模型名以所选模型的官方页面为准。
   - 其他服务：填写该服务提供的 OpenAI Chat Completions 兼容信息。
3. 进入“系统设置 → 数据源”，添加一个或多个 MySQL 数据库。保存时应用会验证连接、读取表字段结构，并自动创建/更新 Wren 语义模型。也可以导入项目附带的 Jaffle Shop DuckDB 测试数据库；Setup 页面和此处都提供导入选项。
4. 在“数据字典”补充表、字段的业务含义和指标口径；在“企业业务口径”补充时间、状态、统计规则等说明。
5. 配置多个数据库时，在“跨库关联”中指定稳定的关联字段，例如 OA 员工编号与销售订单业务员编号。
6. 进入“智能问数”输入自然语言问题。可选择全部或指定数据源。回答会展示查询结果，并可展开查看相应 SQL。

所有登录用户目前都可访问已配置的全部数据源，系统没有按用户隔离数据库权限。查询所需的结果行会发送给配置的在线 LLM 以生成自然语言回答。

### Jaffle Shop 测试数据库

项目包含 `sample-data/jaffle_shop.duckdb`。首次 Setup 时勾选“导入 Jaffle Shop 测试数据库”，或在“系统设置 → 数据源”点击“导入测试数据库”。应用会将数据库复制到被 Git 忽略的 `data/sample-databases/jaffle_shop/`，读取表结构并自动生成 Wren 模型。示例库包含客户、订单、支付等 8 张表；它是用于熟悉流程的演示数据，不代表企业实际业务数据，也不会连接或修改 MySQL。升级时，Python 服务会自动将此前随项目提供的 DuckDB 2.0 格式副本替换为兼容版本。

## 账号管理

首次 Setup 会在项目根目录生成 `user.json`。其他用户可直接编辑该文件；密码必须使用与应用兼容的 scrypt 哈希，不能写明文密码。运行以下命令生成哈希：

```bash
npm run user:hash
```

按提示输入密码，然后将生成的 `passwordHash` 写入 `users` 数组。例如：

```json
{
  "version": 1,
  "users": [
    {
      "username": "admin",
      "passwordHash": "scrypt$16384$8$1$替换为命令生成的值",
      "role": "admin",
      "enabled": true
    },
    {
      "username": "zhangsan",
      "passwordHash": "scrypt$16384$8$1$替换为命令生成的值",
      "role": "user",
      "enabled": true
    }
  ]
}
```

应用会读取 `user.json`；新增、修改或停用用户不需要修改数据库。`role` 使用 `admin` 或 `user`，停用账号可将 `enabled` 设为 `false`。

## 本机数据、备份和 Git 忽略

| 路径 | 内容 |
| --- | --- |
| `user.json` | 登录账号和密码哈希 |
| `data/app-config.json` | 数据源、LLM、数据字典、跨库关联和业务口径配置；密钥字段为加密值 |
| `data/master.key` | 用于本机 AES-GCM 加密凭据的密钥 |
| `data/wren-home/profiles.yml` | Wren 数据库连接配置；权限限制为当前 Mac 用户可读写 |
| `data/wren-projects/` | 各数据源的模型定义、关系及 Wren 编译结果，例如 `target/mdl.json` |
| `data/sample-databases/jaffle_shop/` | 导入后的 DuckDB 测试库副本 |
| `sample-data/jaffle_shop.duckdb` | 随项目提供、可提交到仓库的 DuckDB 示例数据源 |

`.gitignore` 已排除 `data/`、`user.json`、依赖目录、构建输出和 Python 缓存。不要把这些本机配置和凭据提交到仓库。备份/迁移时，应将 `data/` 和 `user.json` 作为受保护的本机数据一起备份；尤其要保留 `data/master.key`，否则无法解密现有配置中的数据库和 LLM 凭据。将备份放在受控的安全位置。

## 故障排查

- **提示 Wren 模型未同步**：确认 Python/Wren 服务已启动；再到“系统设置”重新保存相应数据源，或重新保存该数据源的数据字典。保存流程会自动运行模型构建。成功后项目目录下应有 `target/mdl.json`。
- **测试数据库报 DuckDB storage version 69 错误**：拉取最新代码并重启 Python/Wren 服务。随项目提供的测试库已调整为 DuckDB 1.5 兼容格式；服务启动时会自动迁移原版测试库副本。
- **无法连接本机 Wren 服务**：确认 `python/.venv/bin/uvicorn` 正在监听 `127.0.0.1:8765`。生产环境也需要单独启动这个服务。
- **MySQL 连接成功但无法读取表结构**：检查数据库名、账号权限和 MySQL 网络访问规则；账号需能读取目标业务表和数据库元数据。
- **LLM 测试超时**：检查 Mac 到 LLM API 的网络、API Base URL、模型名和服务商端点状态。模型托管服务也可能因排队或维护而响应较慢。
- **Python 依赖安装失败**：确认使用 Python 3.11、3.12 或 3.13；推荐使用 Python 3.12 后重新运行安装脚本。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `bash scripts/install-mac.sh` | 安装 JavaScript 和 Python 依赖 |
| `npm run dev:all` | 同时启动 Next.js 和本机 Python/Wren 开发服务 |
| `npm run build` | 构建 Next.js 生产版本 |
| `npm run start` | 启动 Next.js 生产服务；仍需单独运行 Python/Wren |
| `npm run user:hash` | 生成可写入 `user.json` 的密码哈希 |
