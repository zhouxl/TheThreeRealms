# TheThreeRealms · 云上道观

**山间文昌殿** — 一个以温暖、静谧、治愈为美术方向的 Web 3D 单人可玩原型。

> 当前状态：可探索的程序化 3D **灰盒原型**，不是最终美术制作版本；不含多人、登录、支付或真实宗教仪式服务。

## 快速启动

需要 Node.js 20.19+。

```bash
npm install
npm run dev
```

打开终端显示的本地地址（通常为 `http://localhost:5173`）。

```bash
npm test       # Node 原生测试，无浏览器依赖
npm run build  # TypeScript 检查和 Vite 构建
npm run preview
```

## V1.4：首次内置可动画 GLB 技术角色

仓库现已包含真实二进制 GLB：`public/models/traveler-tech-demo.glb`（**低多边形技术验证资产，不是最终美术**）。不需要下载额外模型，运行 `npm run dev` 即默认加载并显示该小旅人。它是 glTF 2.0 带蒙皮的模型，包含 11 个关节、`IncenseGrip` 手持香挂点，以及 `Idle`、`Walk`、`HoldIncense`、`Bow`、`PlaceIncense` 动画。

如果希望恢复 V1.2 程序化角色以作对比，创建 `.env.local` 并设置 `VITE_TRAVELER_GLB_URL=`（空值），然后重启开发服务器。

正式美术师制作的 GLB 可以替换技术验证模型：
`VITE_TRAVELER_GLB_URL=/models/traveler.glb`，文件放入 `public/models/` 并符合 `docs/ASSET_CONTRACT.md` 契约。文昌帝君仍为程序化占位，`VITE_DEITY_GLB_URL` 未配置时不会加载外部文件。

GLB 由纯 JavaScript 生成器可重复生成：`npm run assets:demo`。此命令**会覆盖** `public/models/traveler-tech-demo.glb`，请勿把正式艺术资产保存在此文件名下。测试会验证提交的二进制与生成器一致。

## 已实现

- 单场景文昌殿灰盒：12.6 × 9.6 m 大殿、12.6 × 7.2 m 前庭、殿前香炉、神像、供案、左侧签台、右侧福牌架。
- 1.55 m 国风小旅人：第三人称跟随、键盘/触摸移动、简单的障碍与地形碰撞。
- PC 通过拖动场景调整镜头、WASD / 方向键移动、E 互动；手机通过方向键和滑动操作。
- 上香：取香 → 点香 → 静心 → **可见程序化行礼**（约 1.8 秒）→ **可见程序化插香**（约 2.4 秒）→ 完成。香与细烟随持香点移动，在插香释放节点转移到炉口，动作结束且存档成功才显示完成；真实 GLB 骨骼动画与 IK 留待后续。
- 求签：32 支原创签诗，随机抽取后结果固定，支持阅读及历史记录。
- 摆福：6 种模板、60 字以内的祝愿、30 个固定挂点，支持私有存储与删除。
- 浏览器 IndexedDB 私有记录（无后端），重新打开可恢复，清除站点数据后会丢失。
- 本地记录 ID 优先使用 `crypto.randomUUID()`，在普通 HTTP 局域网调试地址下兼容回退至 `crypto.getRandomValues()`。
- 纯逻辑单元测试和 GitHub Actions CI 配置。

## 项目结构

```text
src/
  App.tsx                 # 页面 HUD、仪式界面与记录 UI
  styles.css              # 温暖木质视觉设计
  game/
    World.tsx             # 程序化 3D 场景、第三人称镜头与关节式仪式占位动画
    incenseMotion.ts      # 行礼/插香纯函数时间线、姿态和释放节点
    assets.ts             # GLB URL、契约与剪辑映射规则
    GLBTraveler.tsx       # 正式旅人模型可选加载、动画剪辑与持香节点
    GLBDeity.tsx          # 静态文昌帝君 GLB 渲染
    AssetBoundary.tsx     # 加载或验证失败时回退灰盒
    rules.ts             # 世界比例、碰撞与交互规则（纯函数）
    fortuneData.ts       # 32 支原创签文
    db.ts                # IndexedDB 记录
    id.ts                # HTTP / HTTPS 兼容的本地 UUID
 tests/rules.test.mjs     # 无依赖逻辑测试
```

## 本地存档排障

如果在上香、求签或挂福时显示存档失败，请打开浏览器开发者工具的 Console 查看真实异常；界面不会再把所有错误都归结为权限。上香写入失败时会保留在「插香」步骤，可直接重试，不会错误地显示保存成功。

通过 `http://192.168.x.x:5173` 等局域网地址访问时，浏览器可能不提供 `crypto.randomUUID()`，项目已提供基于 `crypto.getRandomValues()` 的 UUID v4 兼容方案。请注意：浏览器无痕模式、关闭第三方或站点存储、磁盘空间耗尽、清除站点数据等仍可能影响 IndexedDB；私人纪念只存当前浏览器，不会自动同步。

## V1.2 动作验证

运行 `npm run dev`，到前庭香炉旁：取香 → 点香 → 静心 → 点击「行礼」观察旅人弯腰再起身 → 点击「插香 · 完成」观察手与香向炉口移动；香在释放节点从手中消失并出现在炉中。按钮播放期间禁用，取消不会写入新记录，插香完成后才保存。可在「纪念」查看数量并刷新验证。

这一阶段只有**程序化网格的可见动作**，没有真实 GLB 骨骼资产。正式资产的方向、骨骼挂点与动画事件见 `docs/ASSET_CONTRACT.md`。需要在桌面浏览器与手机实际检查穿模、镜头位置和动作节奏。

## V1.3：导入自己的 GLB 模型（已实现）

项目支持**可选的**正式 GLB 渲染器和骨骼动画适配器；V1.4 默认使用内置技术验证角色 GLB，文昌帝君尚无正式 GLB 文件。

要试用自制模型：

1. 用 Blender 等 DCC 软件导出 `traveler.glb`，大小约 1.55m，角色向本地 -Z 方向，根节点在脚底，GLB 中必须有 `IncenseGrip` 节点及 `Idle`、`Walk`、`Bow`、`PlaceIncense` 动画剪辑。具体制作合同见 `docs/ASSET_CONTRACT.md`。
2. 导出文昌帝君静态模型 `wenchang.glb`，含底座高度约 2.85m，面向前庭 +Z。
3. 放到 `public/models/traveler.glb` 和 `public/models/wenchang.glb`。
4. 复制 `.env.example` 到 `.env.local`，设置：

   ```dotenv
   VITE_TRAVELER_GLB_URL=/models/traveler.glb
   VITE_DEITY_GLB_URL=/models/wenchang.glb
   ```

5. 重启 `npm run dev`（Vite 的环境变量在启动时读取），到香炉边检查待机、行走、行礼、插香以及烟雾是否跟随手持香。动画剪辑的**实际时长**会按统一游戏时间线采样，在插香释放点保持记录提交规则。

模型下载失败、缺少强制骨骼锚点或关键动画时会在开发者 Console 记录异常，并自动显示程序化回退角色。禁用 GLB 只需清空环境变量并重启开发服务器。外部模型的版权、许可和纹理应由资产提供方核实。

## 下一阶段：替换成正式 GLB 美术

根据已确定的文昌殿美术设计 V0.3–V1.0：

- 文昌帝君：木雕彩绘坐像，左手托卷、右手持笔，总高度 2.85m（含底座）。
- 小旅人：1.55m、4.8 头身、国风常服，支持待机、行走、上香、摇签和挂福动作。
- 模型单位：1 unit = 1m，Y-up，glTF / GLB，PBR 材质。
- 交互动作以动画事件绑定和握持锚点驱动，取代现在的占位操作。
- 待办：镜头遮挡处理、正式角色碰撞系统、模型 LOD、移动性能实测、声音、文化审校及跨浏览器 E2E 测试。

## 内容与隐私

场景和签文为原创的文化游戏内容，不提供现实结果预测。用户书写的愿望只保存在当前浏览器，不会上传服务器或展示给其他玩家；删除本地站点数据后无法恢复。

## 发布前注意

游戏初版的礼仪、造像和内容需要文化审校；在目标市场发布前应进行宗教信息服务与隐私合规评估。
